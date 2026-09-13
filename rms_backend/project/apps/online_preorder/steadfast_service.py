import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

class SteadfastService:
    @staticmethod
    def get_config():
        from .models import CourierSetting
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

    @staticmethod
    def get_headers():
        cfg = SteadfastService.get_config()
        return {
            'Api-Key': cfg['api_key'],
            'Secret-Key': cfg['secret_key'],
            'Content-Type': 'application/json'
        }

    @staticmethod
    def get_base_url():
        return SteadfastService.get_config()['base_url']

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

    @classmethod
    def clean_phone(cls, phone):
        if not phone:
            return ""
        digits = ''.join(filter(str.isdigit, str(phone)))
        if digits.startswith('8801') and len(digits) == 13:
            digits = digits[2:]
        return digits

    @classmethod
    def create_consignment(cls, order, cod_amount=None, note=None, address_override=None, phone_override=None):
        """
        Creates a delivery consignment on Steadfast Courier portal.
        """
        url = f"{cls.get_base_url()}/create_order"
        
        # Build shipping address string
        if address_override and str(address_override).strip():
            address_str = str(address_override).strip()
        else:
            address_str = cls.format_address(order.shipping_address)

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
            response = requests.post(url, json=payload, headers=cls.get_headers(), timeout=10)
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
                    'message': data.get('message', 'Booking successful')
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
            return {
                'success': False,
                'message': f"Failed to connect to Steadfast Courier: {str(e)}"
            }

    @classmethod
    def get_status(cls, consignment_id):
        """
        Fetches live tracking status for a consignment ID.
        """
        url = f"{cls.get_base_url()}/status_by_cid/{consignment_id}"
        try:
            response = requests.get(url, headers=cls.get_headers(), timeout=10)
            try:
                data = response.json()
            except Exception:
                data = {'message': response.text or f"HTTP {response.status_code}"}
            if response.status_code == 200:
                delivery_status = data.get('delivery_status') or data.get('status') or 'unknown'
                return {
                    'success': True,
                    'status': delivery_status,
                    'data': data
                }
            return {'success': False, 'message': data.get('message', 'Status fetch failed'), 'data': data}
        except Exception as e:
            return {'success': False, 'message': str(e)}

    @classmethod
    def check_fraud(cls, phone):
        """
        Queries Steadfast's official Fraud Check endpoint for a phone number.
        Endpoint: GET /fraud_check/{phone}
        """
        clean_phone = cls.clean_phone(phone)
        if not clean_phone:
            return {
                'success': False,
                'message': 'No valid phone number provided for fraud check.'
            }
        url = f"{cls.get_base_url()}/fraud_check/{clean_phone}"
        try:
            response = requests.get(url, headers=cls.get_headers(), timeout=10)
            try:
                data = response.json()
            except Exception:
                data = {'message': response.text or f"HTTP {response.status_code}"}
            if response.status_code == 200:
                total_parcels = data.get('total_parcels', 0)
                total_delivered = data.get('total_delivered', 0)
                total_cancelled = data.get('total_cancelled', 0)
                
                # Calculate success rate percentage
                success_rate = (total_delivered / total_parcels * 100) if total_parcels > 0 else 100.0
                
                # Risk level decision
                if total_parcels >= 3 and success_rate < 50:
                    risk_level = 'HIGH_RISK'
                elif total_parcels >= 1 and success_rate >= 80:
                    risk_level = 'SAFE'
                else:
                    risk_level = 'NORMAL'

                return {
                    'success': True,
                    'phone': clean_phone,
                    'total_parcels': total_parcels,
                    'total_delivered': total_delivered,
                    'total_cancelled': total_cancelled,
                    'success_rate': round(success_rate, 1),
                    'risk_level': risk_level,
                    'data': data
                }
            return {
                'success': False,
                'message': data.get('message', 'Fraud check request failed'),
                'data': data
            }
        except Exception as e:
            return {
                'success': False,
                'message': f"Error calling Steadfast Fraud Check: {str(e)}"
            }

