import requests
import logging
from django.conf import settings
from django.utils import timezone
from .models import CourierSetting, OnlinePreorder

logger = logging.getLogger(__name__)


class BaseCourierService:
    @classmethod
    def clean_phone(cls, phone):
        if not phone:
            return ""
        digits = ''.join(filter(str.isdigit, str(phone)))
        if digits.startswith('8801') and len(digits) == 13:
            digits = digits[2:]
        return digits

    @classmethod
    def format_address(cls, shipping_address):
        if not shipping_address:
            return "Customer Address"
        if isinstance(shipping_address, str):
            cleaned = shipping_address.strip()
            return cleaned if cleaned else "Customer Address"
        if isinstance(shipping_address, dict):
            parts = []
            for k in ['address', 'place', 'thana', 'city_corporation', 'union', 'upazila', 'district', 'division', 'city', 'area']:
                val = shipping_address.get(k)
                if val and str(val).strip():
                    s = str(val).strip()
                    if s not in parts:
                        parts.append(s)
            return ", ".join(parts) if parts else "Customer Address"
        return "Customer Address"


class SteadfastService(BaseCourierService):
    @classmethod
    def get_config(cls):
        setting = CourierSetting.objects.filter(provider='STEADFAST').first()
        api_key = (setting.api_key if setting and setting.api_key else None) or getattr(settings, 'STEADFAST_API_KEY', '')
        secret_key = (setting.secret_key if setting and setting.secret_key else None) or getattr(settings, 'STEADFAST_SECRET_KEY', '')
        base_url = (setting.base_url if setting and setting.base_url else None) or getattr(settings, 'STEADFAST_BASE_URL', 'https://portal.packzy.com/api/v1')
        if 'portal.steadfast.com.bd' in base_url:
            base_url = base_url.replace('portal.steadfast.com.bd', 'portal.packzy.com')
        return {
            'api_key': api_key,
            'secret_key': secret_key,
            'base_url': base_url.rstrip('/')
        }

    @classmethod
    def get_headers(cls):
        cfg = cls.get_config()
        return {
            'Api-Key': cfg['api_key'],
            'Secret-Key': cfg['secret_key'],
            'Content-Type': 'application/json'
        }

    @classmethod
    def create_consignment(cls, order, cod_amount=None, note=None, address_override=None, phone_override=None):
        cfg = cls.get_config()
        url = f"{cfg['base_url']}/create_order"

        address_str = address_override.strip() if address_override else cls.format_address(order.shipping_address)
        raw_phone = phone_override or order.customer_phone or ""
        recipient_phone = cls.clean_phone(raw_phone)
        cod = float(cod_amount) if cod_amount is not None else float(order.total_amount or 0)
        order_note = note if note is not None else (order.notes or f"Online Preorder #{order.id}")

        payload = {
            "invoice": str(order.id),
            "recipient_name": order.customer_name or "Valued Customer",
            "recipient_phone": recipient_phone,
            "recipient_address": address_str,
            "cod_amount": cod,
            "note": order_note
        }

        try:
            logger.info(f"Posting to Steadfast API: {payload}")
            response = requests.post(url, json=payload, headers=cls.get_headers(), timeout=12)
            try:
                data = response.json()
            except Exception:
                data = {"message": response.text or f"HTTP {response.status_code}"}

            if response.status_code == 200 and (data.get('status') == 200 or data.get('consignment')):
                consignment = data.get('consignment', {})
                return {
                    'success': True,
                    'consignment_id': str(consignment.get('consignment_id', '')),
                    'tracking_code': str(consignment.get('tracking_code', '')),
                    'status': consignment.get('status', 'in_review'),
                    'message': data.get('message', 'Booking successful'),
                    'raw': data
                }
            else:
                error_msg = data.get('message') or f"Steadfast Error Code {response.status_code}"
                if data.get('errors') and isinstance(data['errors'], dict):
                    details = []
                    for field, errs in data['errors'].items():
                        err_text = ", ".join(errs) if isinstance(errs, list) else str(errs)
                        details.append(f"{field}: {err_text}")
                    if details:
                        error_msg = f"{error_msg} ({'; '.join(details)})"
                return {
                    'success': False,
                    'message': error_msg,
                    'data': data
                }
        except Exception as e:
            logger.error(f"Steadfast API exception: {str(e)}")
            return {'success': False, 'message': f"Failed to connect to Steadfast Courier: {str(e)}"}

    @classmethod
    def get_status(cls, consignment_id):
        cfg = cls.get_config()
        url = f"{cfg['base_url']}/status_by_cid/{consignment_id}"
        try:
            response = requests.get(url, headers=cls.get_headers(), timeout=10)
            data = response.json() if response.status_code == 200 else {}
            delivery_status = data.get('delivery_status') or data.get('status') or 'unknown'
            return {'success': True, 'status': delivery_status, 'data': data}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    @classmethod
    def check_fraud(cls, phone):
        from .steadfast_service import SteadfastService as ExternalSteadfastService
        return ExternalSteadfastService.check_fraud(phone)


class PathaoService(BaseCourierService):
    @classmethod
    def get_config(cls):
        setting = CourierSetting.objects.filter(provider='PATHAO').first()
        base_url = (setting.base_url if setting and setting.base_url else None) or 'https://api-hermes.pathao.com'
        return {
            'api_key': setting.api_key if setting else '',
            'client_id': setting.client_id if setting else '',
            'client_secret': setting.client_secret if setting else '',
            'username': setting.username if setting else '',
            'password': setting.password if setting else '',
            'store_id': setting.store_id if setting else '',
            'base_url': base_url.rstrip('/')
        }

    @classmethod
    def get_auth_token(cls):
        cfg = cls.get_config()
        if cfg.get('api_key'):
            return cfg['api_key'], None

        if not (cfg['client_id'] and cfg['client_secret']):
            return None, "Pathao credentials (API token or Client ID & Client Secret) are missing."

        from django.core.cache import cache
        cache_key = f"pathao_auth_token_{cfg['client_id']}"
        cached_token = cache.get(cache_key)
        if cached_token:
            return cached_token, None

        url = f"{cfg['base_url']}/aladdin/api/v1/issue-token"
        payload = {
            "client_id": cfg['client_id'],
            "client_secret": cfg['client_secret'],
            "grant_type": "password" if cfg.get('username') else "client_credentials"
        }
        if cfg.get('username'):
            payload["username"] = cfg['username']
        if cfg.get('password'):
            payload["password"] = cfg['password']

        try:
            res = requests.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=15)
            data = res.json()
            token = data.get('access_token')
            if token:
                expires_in = int(data.get('expires_in', 86400 * 7))
                cache.set(cache_key, token, timeout=max(expires_in - 300, 3600 * 12))
                return token, None
            return None, data.get('message') or "Failed to authenticate with Pathao"
        except Exception as e:
            return None, str(e)

    @classmethod
    def create_consignment(cls, order, cod_amount=None, note=None, address_override=None, phone_override=None):
        cfg = cls.get_config()
        token, err = cls.get_auth_token()
        if not token:
            return {'success': False, 'message': f"Pathao Auth Failed: {err}"}

        url = f"{cfg['base_url']}/aladdin/api/v1/orders"
        address_str = address_override.strip() if address_override else cls.format_address(order.shipping_address)
        raw_phone = phone_override or order.customer_phone or ""
        recipient_phone = cls.clean_phone(raw_phone)
        cod = float(cod_amount) if cod_amount is not None else float(order.total_amount or 0)
        order_note = note if note is not None else (order.notes or f"Online Preorder #{order.id}")

        payload = {
            "store_id": int(cfg['store_id']) if cfg['store_id'] and str(cfg['store_id']).isdigit() else 1,
            "merchant_order_id": str(order.id),
            "recipient_name": order.customer_name or "Customer",
            "recipient_phone": recipient_phone,
            "recipient_address": address_str,
            "delivery_type": 48,
            "item_type": 2, # Parcel
            "special_instruction": order_note,
            "item_quantity": max(int(order.quantity or 1), 1),
            "item_weight": 0.5,
            "amount_to_collect": cod,
        }

        try:
            logger.info(f"Posting to Pathao API: {payload}")
            res = requests.post(url, json=payload, headers={
                'Authorization': f"Bearer {token}",
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }, timeout=12)
            try:
                data = res.json()
            except Exception:
                data = {"message": res.text or f"HTTP {res.status_code}"}

            if res.status_code in [200, 201] and data.get('type') == 'success':
                consignment = data.get('data', {})
                consignment_id = str(consignment.get('consignment_id', ''))
                return {
                    'success': True,
                    'consignment_id': consignment_id,
                    'tracking_code': consignment_id,
                    'status': consignment.get('order_status', 'Pending'),
                    'message': data.get('message', 'Pathao order created successfully'),
                    'raw': data
                }
            else:
                msg = data.get('message') or f"Pathao Error Code {res.status_code}"
                if data.get('errors'):
                    msg += f": {str(data['errors'])}"
                return {'success': False, 'message': msg, 'data': data}
        except Exception as e:
            return {'success': False, 'message': f"Pathao exception: {str(e)}"}

    @classmethod
    def get_status(cls, consignment_id):
        cfg = cls.get_config()
        token, err = cls.get_auth_token()
        if not token:
            return {'success': False, 'message': err}

        url = f"{cfg['base_url']}/aladdin/api/v1/orders/{consignment_id}/info"
        try:
            res = requests.get(url, headers={'Authorization': f"Bearer {token}"}, timeout=10)
            data = res.json()
            if res.status_code == 200 and data.get('data'):
                order_info = data['data']
                return {
                    'success': True,
                    'status': order_info.get('order_status') or 'unknown',
                    'data': order_info
                }
            return {'success': False, 'message': data.get('message', 'Failed to fetch Pathao status')}
        except Exception as e:
            return {'success': False, 'message': str(e)}


class RedXService(BaseCourierService):
    @classmethod
    def get_config(cls):
        setting = CourierSetting.objects.filter(provider='REDX').first()
        base_url = (setting.base_url if setting and setting.base_url else None) or 'https://openapi.redx.com.bd'
        return {
            'api_key': setting.api_key if setting else '',
            'base_url': base_url.rstrip('/')
        }

    @classmethod
    def get_headers(cls):
        cfg = cls.get_config()
        return {
            'API-ACCESS-TOKEN': f"Bearer {cfg['api_key']}",
            'Content-Type': 'application/json'
        }

    @classmethod
    def create_consignment(cls, order, cod_amount=None, note=None, address_override=None, phone_override=None):
        cfg = cls.get_config()
        if not cfg['api_key']:
            return {'success': False, 'message': "RedX API Key / Access Token is not configured."}

        url = f"{cfg['base_url']}/v1.0.0-beta/parcels"
        address_str = address_override.strip() if address_override else cls.format_address(order.shipping_address)
        raw_phone = phone_override or order.customer_phone or ""
        recipient_phone = cls.clean_phone(raw_phone)
        cod = float(cod_amount) if cod_amount is not None else float(order.total_amount or 0)
        order_note = note if note is not None else (order.notes or f"Online Preorder #{order.id}")

        payload = {
            "customer_name": order.customer_name or "Customer",
            "customer_phone": recipient_phone,
            "delivery_area": "Dhaka",
            "customer_address": address_str,
            "merchant_invoice_id": str(order.id),
            "cash_collection_amount": cod,
            "parcel_weight": 500,
            "instruction": order_note
        }

        try:
            logger.info(f"Posting to RedX API: {payload}")
            res = requests.post(url, json=payload, headers=cls.get_headers(), timeout=12)
            data = res.json() if res.status_code in [200, 201] else {'message': res.text}
            tracking_id = data.get('tracking_id') or data.get('parcel_id')
            if tracking_id:
                return {
                    'success': True,
                    'consignment_id': str(tracking_id),
                    'tracking_code': str(tracking_id),
                    'status': 'created',
                    'message': 'RedX parcel created successfully',
                    'raw': data
                }
            return {'success': False, 'message': data.get('message', f"RedX status code {res.status_code}"), 'data': data}
        except Exception as e:
            return {'success': False, 'message': f"RedX exception: {str(e)}"}

    @classmethod
    def get_status(cls, tracking_id):
        cfg = cls.get_config()
        url = f"{cfg['base_url']}/v1.0.0-beta/parcels/{tracking_id}"
        try:
            res = requests.get(url, headers=cls.get_headers(), timeout=10)
            data = res.json()
            status_val = data.get('status') or (data.get('parcel') or {}).get('status') or 'unknown'
            return {'success': True, 'status': status_val, 'data': data}
        except Exception as e:
            return {'success': False, 'message': str(e)}


class CarrybeeService(BaseCourierService):
    @classmethod
    def get_config(cls):
        setting = CourierSetting.objects.filter(provider='CARRYBEE').first()
        base_url = (setting.base_url if setting and setting.base_url else None) or 'https://api.carrybee.com'
        return {
            'api_key': setting.api_key if setting else '',
            'secret_key': setting.secret_key if setting else '',
            'base_url': base_url.rstrip('/')
        }

    @classmethod
    def create_consignment(cls, order, cod_amount=None, note=None, address_override=None, phone_override=None):
        cfg = cls.get_config()
        if not cfg['api_key']:
            return {'success': False, 'message': "Carrybee API Key is not configured."}

        url = f"{cfg['base_url']}/api/v1/orders/create"
        address_str = address_override.strip() if address_override else cls.format_address(order.shipping_address)
        raw_phone = phone_override or order.customer_phone or ""
        recipient_phone = cls.clean_phone(raw_phone)
        cod = float(cod_amount) if cod_amount is not None else float(order.total_amount or 0)
        order_note = note if note is not None else (order.notes or f"Online Preorder #{order.id}")

        payload = {
            "merchant_order_id": str(order.id),
            "recipient_name": order.customer_name or "Customer",
            "recipient_phone": recipient_phone,
            "recipient_address": address_str,
            "cod_amount": cod,
            "note": order_note
        }

        try:
            res = requests.post(url, json=payload, headers={
                'Authorization': f"Bearer {cfg['api_key']}",
                'Content-Type': 'application/json'
            }, timeout=12)
            data = res.json() if res.status_code == 200 else {'message': res.text}
            if res.status_code == 200 and data.get('tracking_number'):
                track = str(data.get('tracking_number'))
                return {
                    'success': True,
                    'consignment_id': track,
                    'tracking_code': track,
                    'status': data.get('status', 'in_review'),
                    'message': 'Carrybee order booked successfully',
                    'raw': data
                }
            return {'success': False, 'message': data.get('message', 'Carrybee booking failed'), 'data': data}
        except Exception as e:
            return {'success': False, 'message': f"Carrybee exception: {str(e)}"}

    @classmethod
    def get_status(cls, tracking_id):
        cfg = cls.get_config()
        url = f"{cfg['base_url']}/api/v1/orders/track/{tracking_id}"
        try:
            res = requests.get(url, headers={'Authorization': f"Bearer {cfg['api_key']}"}, timeout=10)
            data = res.json()
            return {'success': True, 'status': data.get('status', 'unknown'), 'data': data}
        except Exception as e:
            return {'success': False, 'message': str(e)}


class CourierManager:
    PROVIDERS = {
        'STEADFAST': SteadfastService,
        'PATHAO': PathaoService,
        'REDX': RedXService,
        'CARRYBEE': CarrybeeService,
    }

    TRACKING_URL_TEMPLATES = {
        'STEADFAST': "https://steadfast.com.bd/tracking",
        'PATHAO': "https://merchant.pathao.com/tracking?consignment_id={code}",
        'REDX': "https://redx.com.bd/track-parcel/?trackingId={code}",
        'CARRYBEE': "https://carrybee.com/track",
    }

    @classmethod
    def get_active_couriers(cls):
        """
        Returns all courier settings that are active AND have their required credentials configured.
        """
        active_list = []
        providers = [
            ('STEADFAST', 'Steadfast Courier'),
            ('PATHAO', 'Pathao Courier'),
            ('REDX', 'RedX Courier'),
            ('CARRYBEE', 'Carrybee Courier'),
        ]

        for code, label in providers:
            setting = CourierSetting.objects.filter(provider=code).first()
            has_keys = False
            is_active = False
            is_default = False

            if setting:
                has_keys = setting.has_valid_credentials()
                if has_keys and not setting.is_active:
                    setting.is_active = True
                    setting.save(update_fields=['is_active'])
                is_active = setting.is_active
                is_default = setting.is_default
            elif code == 'STEADFAST':
                # Check environment fallback
                key = getattr(settings, 'STEADFAST_API_KEY', '')
                sec = getattr(settings, 'STEADFAST_SECRET_KEY', '')
                has_keys = bool(key and sec and key != 'default_api_key')
                is_active = has_keys

            if has_keys and is_active:
                active_list.append({
                    'provider': code,
                    'name': label,
                    'is_default': is_default,
                    'tracking_url_template': cls.TRACKING_URL_TEMPLATES.get(code, "")
                })

        return active_list

    @classmethod
    def dispatch_order(cls, order: OnlinePreorder, provider: str, cod_amount=None, note=None, address_override=None, phone_override=None):
        provider = (provider or 'STEADFAST').upper()
        service = cls.PROVIDERS.get(provider)
        if not service:
            return {'success': False, 'message': f"Unsupported courier provider: {provider}"}

        res = service.create_consignment(
            order,
            cod_amount=cod_amount,
            note=note,
            address_override=address_override,
            phone_override=phone_override
        )

        if res.get('success'):
            order.courier_partner = provider
            order.courier_consignment_id = res.get('consignment_id')
            order.courier_tracking_code = res.get('tracking_code')
            order.courier_status = res.get('status') or 'in_review'
            order.courier_dispatched_at = timezone.now()
            order.courier_response = res.get('raw')

            update_fields = [
                'courier_partner', 'courier_consignment_id', 'courier_tracking_code',
                'courier_status', 'courier_dispatched_at', 'courier_response', 'updated_at'
            ]

            # If Steadfast, keep backward-compatibility fields in sync
            if provider == 'STEADFAST':
                order.steadfast_consignment_id = res.get('consignment_id')
                order.steadfast_tracking_code = res.get('tracking_code')
                order.steadfast_status = res.get('status') or 'in_review'
                update_fields.extend(['steadfast_consignment_id', 'steadfast_tracking_code', 'steadfast_status'])

            if order.status == 'PENDING':
                order.status = 'CONFIRMED'
                update_fields.append('status')

            order.save(update_fields=update_fields)

        return res

    @classmethod
    def get_order_status(cls, order: OnlinePreorder):
        provider = (order.courier_partner or 'STEADFAST').upper()
        cid = order.courier_consignment_id or order.steadfast_consignment_id
        if not cid:
            return {'success': False, 'message': 'No courier consignment ID recorded for this order.'}

        service = cls.PROVIDERS.get(provider)
        if not service:
            return {'success': False, 'message': f"No tracking service found for provider {provider}"}

        res = service.get_status(cid)
        if res.get('success'):
            new_status = res.get('status')
            order.courier_status = new_status
            update_fields = ['courier_status', 'updated_at']
            if provider == 'STEADFAST':
                order.steadfast_status = new_status
                update_fields.append('steadfast_status')
            if str(new_status or '').strip().lower() in ['delivered', 'completed', 'delivered_approval_pending']:
                if not order.courier_delivered_at:
                    order.courier_delivered_at = timezone.now()
                    update_fields.append('courier_delivered_at')
            order.save(update_fields=update_fields)

        return res

    @classmethod
    def sync_orders_status(cls, order_ids=None):
        """
        Synchronizes live delivery status from couriers (Steadfast, Pathao, RedX, Carrybee)
        for specified order IDs or all active dispatched orders.
        """
        from django.db.models import Q
        if order_ids:
            orders = OnlinePreorder.objects.filter(id__in=order_ids)
        else:
            orders = OnlinePreorder.objects.filter(
                Q(courier_consignment_id__isnull=False) & ~Q(courier_consignment_id="") |
                Q(steadfast_consignment_id__isnull=False) & ~Q(steadfast_consignment_id="")
            ).exclude(status__in=['CANCELLED', 'RETURNED'])[:60]

        synced = []
        failed = []

        for o in orders:
            try:
                res = cls.get_order_status(o)
                if res.get('success'):
                    synced.append({
                        'id': o.id,
                        'provider': o.courier_partner,
                        'status': o.courier_status or o.steadfast_status
                    })
                else:
                    failed.append({
                        'id': o.id,
                        'message': res.get('message')
                    })
            except Exception as e:
                failed.append({
                    'id': o.id,
                    'message': str(e)
                })

        return {
            'success': True,
            'synced_count': len(synced),
            'failed_count': len(failed),
            'synced': synced,
            'failed': failed
        }

    @classmethod
    def check_fraud(cls, phone: str, provider: str = None, order: OnlinePreorder = None):
        """
        Check customer delivery performance, cancellation rates, and fraud risk
        following the pattern of the respective delivery method (Pathao, Steadfast, RedX, Carrybee).
        """
        clean_p = BaseCourierService.clean_phone(phone)
        if not clean_p and order:
            clean_p = BaseCourierService.clean_phone(order.customer_phone)

        provider = (provider or (order.courier_partner if order else None) or 'ALL').upper()

        provider_labels = {
            'STEADFAST': 'Steadfast Courier',
            'PATHAO': 'Pathao Courier',
            'REDX': 'RedX Courier',
            'CARRYBEE': 'Carrybee Courier',
            'ALL': 'All Delivery Partners',
        }

        from django.db.models import Q
        phone_filters = Q(customer_phone=clean_p) | Q(customer_phone=f"880{clean_p}") | Q(customer_phone=f"+880{clean_p}")
        if len(clean_p) == 11 and clean_p.startswith('01'):
            phone_filters |= Q(customer_phone=clean_p[1:])

        matching_orders = OnlinePreorder.objects.filter(phone_filters)

        # 1. If Steadfast specifically requested, call Steadfast network API
        steadfast_setting = CourierSetting.objects.filter(provider='STEADFAST').first()
        steadfast_api_active = steadfast_setting and (steadfast_setting.is_active or steadfast_setting.has_valid_credentials())

        network_data = None
        if provider == 'STEADFAST':
            try:
                sf_res = SteadfastService.check_fraud(clean_p)
                if sf_res.get('success'):
                    return {
                        'success': True,
                        'provider': 'STEADFAST',
                        'provider_name': 'Steadfast Courier Network',
                        'phone': clean_p,
                        'total_parcels': sf_res.get('total_parcels', 0),
                        'total_delivered': sf_res.get('total_delivered', 0),
                        'total_cancelled': sf_res.get('total_cancelled', 0),
                        'success_rate': sf_res.get('success_rate', 100.0),
                        'risk_level': sf_res.get('risk_level', 'NORMAL'),
                        'fraud_reports': sf_res.get('fraud_reports', []),
                        'network_data': sf_res.get('data'),
                        'source': 'STEADFAST_NETWORK'
                    }
                else:
                    msg = sf_res.get('message', 'Failed to connect to Steadfast Courier')
                    if 'unauthorized' in str(msg).lower() or 'credential' in str(msg).lower() or '401' in str(msg):
                        msg = 'Steadfast API Key or Secret Key is invalid or not configured in Settings.'
                    return {
                        'success': False,
                        'provider': 'STEADFAST',
                        'provider_name': 'Steadfast Courier Network',
                        'phone': clean_p,
                        'message': msg
                    }
            except Exception as e:
                logger.warning(f"Steadfast fraud API check failed: {e}")
                return {
                    'success': False,
                    'provider': 'STEADFAST',
                    'provider_name': 'Steadfast Courier Network',
                    'phone': clean_p,
                    'message': f"Steadfast connection error: {str(e)}"
                }

        # 2. Respective delivery partner or store aggregate check
        if provider != 'ALL':
            scoped_orders = matching_orders.filter(courier_partner=provider)
            if provider == 'STEADFAST':
                scoped_orders = matching_orders.filter(Q(courier_partner='STEADFAST') | Q(steadfast_consignment_id__isnull=False, courier_partner__isnull=True))
        else:
            scoped_orders = matching_orders

        total_parcels = scoped_orders.count()
        delivered_count = sum(1 for o in scoped_orders if str(o.courier_status or o.steadfast_status or o.status).lower() in ['delivered', 'completed', 'verified'])
        cancelled_count = sum(1 for o in scoped_orders if str(o.courier_status or o.steadfast_status or o.status).lower() in ['cancelled', 'returned', 'failed'])

        # Compute breakdown by courier partner
        breakdown = {}
        for code in ['STEADFAST', 'PATHAO', 'REDX', 'CARRYBEE']:
            p_orders = matching_orders.filter(Q(courier_partner=code) | (Q(courier_partner__isnull=True, steadfast_consignment_id__isnull=False) if code == 'STEADFAST' else Q(pk__in=[])))
            if p_orders.exists():
                p_del = sum(1 for o in p_orders if str(o.courier_status or o.steadfast_status or o.status).lower() in ['delivered', 'completed'])
                p_can = sum(1 for o in p_orders if str(o.courier_status or o.steadfast_status or o.status).lower() in ['cancelled', 'returned', 'failed'])
                breakdown[code] = {
                    'name': provider_labels.get(code, code),
                    'total': p_orders.count(),
                    'delivered': p_del,
                    'cancelled': p_can,
                }

        # Also get Steadfast network data if available for additional cross-courier verification
        if provider != 'STEADFAST' and (steadfast_api_active or getattr(settings, 'STEADFAST_API_KEY', '')):
            try:
                sf_res = SteadfastService.check_fraud(clean_p)
                if sf_res.get('success'):
                    network_data = sf_res
            except Exception:
                pass

        success_rate = round((delivered_count / total_parcels * 100), 1) if total_parcels > 0 else 100.0

        # Also get Steadfast network data if available for additional cross-courier verification
        if provider != 'STEADFAST' and (steadfast_api_active or getattr(settings, 'STEADFAST_API_KEY', '')):
            try:
                sf_res = SteadfastService.check_fraud(clean_p)
                if sf_res.get('success'):
                    network_data = sf_res
            except Exception:
                pass

        has_network = bool(network_data and network_data.get('total_parcels', 0) > 0)
        net_parcels = network_data.get('total_parcels', 0) if network_data else 0
        net_success = network_data.get('success_rate', 100.0) if network_data else 100.0
        fraud_reps = (network_data.get('fraud_reports', []) if network_data else [])

        is_new = (total_parcels == 0 and not has_network)

        if total_parcels > 0:
            effective_success = success_rate
        elif has_network:
            effective_success = net_success
        else:
            effective_success = 100.0

        if cancelled_count >= 2 or (total_parcels >= 2 and success_rate < 50.0):
            risk_level = 'HIGH_RISK'
        elif len(fraud_reps) > 0 or (network_data and network_data.get('risk_level') == 'HIGH_RISK'):
            risk_level = 'HIGH_RISK'
        elif (delivered_count >= 1 and success_rate >= 80.0) or (total_parcels == 0 and has_network and net_success >= 80.0):
            risk_level = 'SAFE'
        else:
            risk_level = 'NORMAL'

        # Compute Pathao-style 1 to 5 star rating & trust assessment
        if is_new:
            rating = 5.0
            rating_label = "New Customer (Unrated)"
            recommendation = "New customer with clean record. Standard COD dispatch."
        elif risk_level == 'HIGH_RISK':
            rating = max(1.0, round(1.0 + (effective_success / 100.0) * 1.5, 1))
            rating_label = "Low Rating (High Return Risk)"
            recommendation = "High risk of delivery rejection. Call customer or collect delivery fee in advance."
        elif effective_success >= 90.0:
            rating = min(5.0, round(4.5 + ((effective_success - 90.0) / 10.0) * 0.5, 1))
            rating_label = "Top Rated (Verified Buyer)"
            recommendation = "Excellent delivery track record. Safe to dispatch COD."
        elif effective_success >= 75.0:
            rating = round(3.8 + ((effective_success - 75.0) / 15.0) * 0.6, 1)
            rating_label = "Good Rating (Reliable Buyer)"
            recommendation = "Reliable buyer. Standard order confirmation."
        else:
            rating = round(2.5 + ((effective_success - 50.0) / 25.0) * 1.2, 1)
            rating_label = "Moderate Rating (Caution Advised)"
            recommendation = "Moderate delivery performance. Confirm order before dispatch."

        # If scoped parcels are 0 but network data exists, populate summary fields
        display_parcels = total_parcels if total_parcels > 0 else (net_parcels if provider == 'ALL' or provider == 'PATHAO' else 0)
        display_delivered = delivered_count if total_parcels > 0 else (network_data.get('total_delivered', 0) if (provider == 'ALL' or provider == 'PATHAO') and network_data else 0)
        display_cancelled = cancelled_count if total_parcels > 0 else (network_data.get('total_cancelled', 0) if (provider == 'ALL' or provider == 'PATHAO') and network_data else 0)

        return {
            'success': True,
            'provider': provider,
            'provider_name': provider_labels.get(provider, provider),
            'phone': clean_p,
            'total_parcels': display_parcels,
            'total_delivered': display_delivered,
            'total_cancelled': display_cancelled,
            'success_rate': effective_success,
            'risk_level': risk_level,
            'rating': rating,
            'rating_label': rating_label,
            'trust_score': round(effective_success, 1),
            'recommendation': recommendation,
            'is_new_customer': is_new,
            'fraud_reports': fraud_reps,
            'provider_breakdown': breakdown,
            'network_data': network_data,
            'source': f"{provider}_RECORD"
        }

