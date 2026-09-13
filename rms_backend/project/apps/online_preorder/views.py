from rest_framework import viewsets, mixins, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from django.db import models, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.inventory.models import Product
from .models import (
    OnlinePreorder,
    OnlinePreorderVerification,
    OnlinePreorderVerificationItem,
    OnlinePreorderVerificationScanLog,
)
from .serializers import (
    OnlinePreorderCreateSerializer,
    OnlinePreorderSerializer,
    OnlinePreorderVerificationSerializer,
    OnlinePreorderScanResultSerializer,
)


class PublicCreateOnlinePreorderView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data.copy()
        # Serializer enforces ONLINE/COD/online
        serializer = OnlinePreorderCreateSerializer(data=payload)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        online_preorder = serializer.save()
        
        # Send notifications
        from .email_utils import send_admin_order_notification, send_customer_order_received
        send_admin_order_notification(online_preorder.id)
        send_customer_order_received(online_preorder.id)
        
        return Response(OnlinePreorderSerializer(online_preorder).data, status=status.HTTP_201_CREATED)


class OnlinePreorderViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = OnlinePreorder.objects.all().order_by('-created_at')
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OnlinePreorderCreateSerializer
        return OnlinePreorderSerializer

    def get_queryset(self):
        qs = OnlinePreorder.objects.all()
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            qs = qs.filter(status=status_filter)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(models.Q(customer_name__icontains=search) | models.Q(customer_phone__icontains=search))
        return qs.order_by('-created_at')

    def perform_update(self, serializer):
        instance = serializer.instance
        old_status = instance.status
        with transaction.atomic():
            if old_status == 'CANCELLED' and serializer.validated_data.get('status', old_status) != 'CANCELLED' and instance.coupon_id:
                from apps.ecommerce.models import Coupon, CouponRedemption
                coupon = Coupon.objects.select_for_update().get(pk=instance.coupon_id)
                redemption = CouponRedemption.objects.filter(order=instance).first()
                if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
                    raise ValidationError({'status': 'The coupon usage limit is full; this order cannot be reactivated.'})
                if redemption:
                    redemption.is_active = True
                    redemption.released_at = None
                    redemption.save(update_fields=['is_active', 'released_at'])
            updated_instance = serializer.save()
            if old_status != 'CANCELLED' and updated_instance.status == 'CANCELLED' and instance.coupon_id:
                from apps.ecommerce.models import CouponRedemption
                CouponRedemption.objects.filter(order=instance, is_active=True).update(
                    is_active=False, released_at=timezone.now()
                )
        new_status = updated_instance.status

        # Check for status changes
        if old_status != 'CONFIRMED' and new_status == 'CONFIRMED':
            try:
                from .email_utils import send_customer_order_confirmation
                send_customer_order_confirmation(updated_instance.id)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error sending confirmation notification for order {updated_instance.id}: {str(e)}")

            # Trigger Meta Purchase Conversion API Event (Idempotent)
            try:
                from .services.meta_capi import dispatch_meta_purchase_event
                dispatch_meta_purchase_event(updated_instance)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error dispatching Meta Purchase event for order {updated_instance.id}: {str(e)}")

        elif old_status != 'DELIVERED' and new_status == 'DELIVERED':
            try:
                from .email_utils import send_delivery_notification
                send_delivery_notification(updated_instance.id)
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error sending delivery notification for order {updated_instance.id}: {str(e)}")

    def perform_destroy(self, instance):
        """
        Perform deletion of an online preorder.
        Related OnlineConversion will be automatically deleted via CASCADE.
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Deleting online preorder #{instance.id} - {instance.customer_name}")
        instance.delete()

    # --- Verification Actions ---

    def _get_or_create_verification(self, request, pk: int) -> OnlinePreorderVerification:
        """
        Helper to initialize a verification session from the preorder items.
        """
        preorder = self.get_object()
        verification, created = OnlinePreorderVerification.objects.get_or_create(
            online_preorder=preorder,
            defaults={
                "total_units": 0,
                "verified_units": 0,
            },
        )

        if created or not verification.items.exists():
            # Populate items from preorder JSON
            verification.items.all().delete()
            total_units = 0
            for item in preorder.items or []:
                qty = int(item.get("quantity", 0))
                total_units += qty
                product_id = item.get("product_id")
                sku = ""
                product_name = ""
                product = None
                if product_id:
                    try:
                        product = Product.objects.get(id=product_id)
                        sku = getattr(product, "sku", "") or f"PID-{product.id}"
                        product_name = product.name
                    except Product.DoesNotExist:
                        product = None
                OnlinePreorderVerificationItem.objects.create(
                    verification=verification,
                    product=product,
                    sku=sku,
                    product_name=product_name,
                    ordered_qty=qty,
                    verified_qty=0,
                )
            verification.total_units = total_units
            verification.verified_units = 0
            verification.status = "IN_PROGRESS"
            verification.save(update_fields=["total_units", "verified_units", "status", "updated_at"])

        return verification

    @action(detail=True, methods=["post"], url_path="start-verification", authentication_classes=[], permission_classes=[AllowAny])
    def start_verification(self, request, pk=None):
        """
        Initialize a verification session for this online preorder.
        """
        verification = self._get_or_create_verification(request, pk)
        serializer = OnlinePreorderVerificationSerializer(verification, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="verification", authentication_classes=[], permission_classes=[AllowAny])
    def get_verification(self, request, pk=None):
        """
        Get current verification state for this online preorder.
        """
        try:
            verification = OnlinePreorderVerification.objects.get(online_preorder_id=pk)
        except OnlinePreorderVerification.DoesNotExist:
            verification = self._get_or_create_verification(request, pk)

        serializer = OnlinePreorderVerificationSerializer(verification, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="verify-scan", authentication_classes=[], permission_classes=[AllowAny])
    def verify_scan(self, request, pk=None):
        """
        Handle a barcode scan for the given online preorder.
        Body: { "sku": "SKU-9920" } OR { "product_id": 123 }
        """
        sku = request.data.get("sku", "").strip()
        product_id = request.data.get("product_id")
        
        if not sku and not product_id:
            return Response({"detail": "SKU or Product ID is required."}, status=status.HTTP_400_BAD_REQUEST)

        verification = self._get_or_create_verification(request, pk)

        with transaction.atomic():
            # Try to find item by SKU (exact match) OR via Product Barcode OR via Product ID
            filter_query = models.Q()
            
            if product_id:
                # specific product ID match (most accurate for QR codes)
                filter_query |= models.Q(product_id=product_id)
            
            if sku:
                # string match on SKU or Barcode
                filter_query |= models.Q(sku__iexact=sku)
                filter_query |= models.Q(product__barcode__iexact=sku)

            # We use filter().first() instead of get() because multiple items might match 
            candidates = verification.items.select_for_update().filter(filter_query)
            
            if not candidates.exists():
                # Log not-in-order scan
                OnlinePreorderVerificationScanLog.objects.create(
                    verification=verification,
                    sku=sku or str(product_id),
                    result="NOT_IN_ORDER",
                )
                serializer = OnlinePreorderScanResultSerializer(
                    {
                        "result": "NOT_IN_ORDER",
                        "message": "Product not part of this order.",
                        "verification": verification,
                    },
                    context={"request": request},
                )
                return Response(serializer.data, status=status.HTTP_200_OK)

            # Pick the first candidate (usually there's only one per SKU/Product)
            item = candidates.first()

            # Prevent over-scan
            if item.verified_qty >= item.ordered_qty:
                OnlinePreorderVerificationScanLog.objects.create(
                    verification=verification,
                    sku=sku or str(product_id),
                    result="OVER_SCAN",
                )
                serializer = OnlinePreorderScanResultSerializer(
                    {
                        "result": "OVER_SCAN",
                        "message": "This product is already fully verified.",
                        "verification": verification,
                    },
                    context={"request": request},
                )
                return Response(serializer.data, status=status.HTTP_200_OK)

            # Valid scan – increment counts
            item.verified_qty += 1
            item.save(update_fields=["verified_qty"])

            verification.verified_units = (
                verification.items.aggregate(total=models.Sum("verified_qty"))["total"] or 0
            )
            verification.status = "COMPLETED" if verification.verified_units >= verification.total_units else "IN_PROGRESS"
            verification.save(update_fields=["verified_units", "status", "updated_at"])

            OnlinePreorderVerificationScanLog.objects.create(
                verification=verification,
                sku=sku or str(product_id),
                result="MATCHED",
            )

        serializer = OnlinePreorderScanResultSerializer(
            {
                "result": "MATCHED",
                "message": "Product verified.",
                "verification": verification,
            },
            context={"request": request},
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="complete-verification", authentication_classes=[], permission_classes=[AllowAny])
    def complete_verification(self, request, pk=None):
        """
        Mark verification as completed and update order status to DELIVERED.
        Only allowed when all units are verified.
        """
        verification = self._get_or_create_verification(request, pk)
        if verification.verified_units < verification.total_units:
            return Response(
                {"detail": "All items must be verified before completing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        verification.status = "COMPLETED"
        verification.completed_at = timezone.now()
        verification.save(update_fields=["status", "completed_at", "updated_at"])

        preorder = verification.online_preorder
        if preorder.status != "DELIVERED":
            preorder.status = "DELIVERED"
            preorder.save(update_fields=["status", "updated_at"])

        serializer = OnlinePreorderVerificationSerializer(verification, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="skip-verification", authentication_classes=[], permission_classes=[AllowAny])
    def skip_verification(self, request, pk=None):
        """
        Skip verification for this order but still move it to DELIVERED.
        Optionally accepts a 'reason' field in the body.
        """
        verification = self._get_or_create_verification(request, pk)
        reason = request.data.get("reason", "")

        verification.status = "SKIPPED"
        verification.skipped_reason = reason
        verification.skipped_at = timezone.now()
        verification.save(update_fields=["status", "skipped_reason", "skipped_at", "updated_at"])

        preorder = verification.online_preorder
        if preorder.status != "DELIVERED":
            preorder.status = "DELIVERED"
            preorder.save(update_fields=["status", "updated_at"])

        serializer = OnlinePreorderVerificationSerializer(verification, context={"request": request})
        return Response(serializer.data)

    # --- Steadfast Courier Actions ---

    @action(detail=True, methods=["post"], url_path="dispatch-steadfast", authentication_classes=[], permission_classes=[AllowAny])
    def dispatch_steadfast(self, request, pk=None):
        """
        Fast dispatch this online preorder to Steadfast Courier portal.
        Optional body fields: cod_amount, note, address, phone
        """
        from .steadfast_service import SteadfastService
        order = self.get_object()

        if order.status == "CANCELLED":
            return Response(
                {"detail": "Cannot dispatch a cancelled order to courier."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cod_amount = request.data.get("cod_amount")
        note = request.data.get("note")
        address_override = request.data.get("address")
        phone_override = request.data.get("phone")

        res = SteadfastService.create_consignment(
            order,
            cod_amount=cod_amount,
            note=note,
            address_override=address_override,
            phone_override=phone_override
        )

        if not res.get("success"):
            return Response(
                {
                    "success": False,
                    "message": res.get("message", "Failed to book with Steadfast Courier"),
                    "data": res.get("data")
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update order with Steadfast details
        order.steadfast_consignment_id = res.get("consignment_id")
        order.steadfast_tracking_code = res.get("tracking_code")
        order.steadfast_status = res.get("status") or "in_review"

        update_fields = ["steadfast_consignment_id", "steadfast_tracking_code", "steadfast_status", "updated_at"]
        if order.status == "PENDING":
            order.status = "CONFIRMED"
            update_fields.append("status")

        order.save(update_fields=update_fields)

        return Response({
            "success": True,
            "message": res.get("message", "Dispatched to Steadfast Courier successfully!"),
            "consignment_id": res.get("consignment_id"),
            "tracking_code": res.get("tracking_code"),
            "status": order.steadfast_status,
            "order": OnlinePreorderSerializer(order, context={"request": request}).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="steadfast-status", authentication_classes=[], permission_classes=[AllowAny])
    def steadfast_status(self, request, pk=None):
        """
        Fetch live tracking status from Steadfast Courier.
        """
        from .steadfast_service import SteadfastService
        order = self.get_object()

        consignment_id = order.steadfast_consignment_id
        if not consignment_id:
            return Response(
                {"detail": "Order has not been dispatched to Steadfast yet (missing consignment ID)."},
                status=status.HTTP_400_BAD_REQUEST
            )

        res = SteadfastService.get_status(consignment_id)
        if not res.get("success"):
            return Response(
                {"success": False, "message": res.get("message", "Failed to fetch Steadfast status")},
                status=status.HTTP_400_BAD_REQUEST
            )

        order.steadfast_status = res.get("status")
        update_fields = ["steadfast_status", "updated_at"]

        # If delivered by courier, sync order status if desired
        if str(res.get("status")).lower() == "delivered" and order.status != "DELIVERED":
            order.status = "DELIVERED"
            update_fields.append("status")

        order.save(update_fields=update_fields)

        return Response({
            "success": True,
            "status": order.steadfast_status,
            "data": res.get("data"),
            "order": OnlinePreorderSerializer(order, context={"request": request}).data
        })

    # --- Multi-Courier Fraud Check Endpoints ---

    @action(detail=True, methods=["get"], url_path="courier-fraud-check", authentication_classes=[], permission_classes=[AllowAny])
    def courier_fraud_check_detail(self, request, pk=None):
        """
        Check customer delivery performance and return rates for the respective delivery method.
        Query params: provider (optional, e.g. PATHAO, STEADFAST, REDX, CARRYBEE, ALL).
        """
        from .courier_services import CourierManager
        order = self.get_object()
        provider = request.query_params.get("provider") or order.courier_partner or "ALL"
        res = CourierManager.check_fraud(phone=order.customer_phone, provider=provider, order=order)
        return Response(res, status=status.HTTP_200_OK if res.get("success") else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="courier-fraud-check", authentication_classes=[], permission_classes=[AllowAny])
    def courier_fraud_check_phone(self, request):
        """
        Check customer delivery performance by phone for a selected courier partner.
        Query params: phone (required), provider (optional).
        """
        from .courier_services import CourierManager
        phone = request.query_params.get("phone", "")
        if not phone:
            return Response({"detail": "Phone parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        provider = request.query_params.get("provider") or "ALL"
        res = CourierManager.check_fraud(phone=phone, provider=provider)
        return Response(res, status=status.HTTP_200_OK if res.get("success") else status.HTTP_400_BAD_REQUEST)

    # Backward compatibility with existing Steadfast actions
    @action(detail=True, methods=["get"], url_path="steadfast-fraud-check", authentication_classes=[], permission_classes=[AllowAny])
    def steadfast_fraud_check_detail(self, request, pk=None):
        from .courier_services import CourierManager
        order = self.get_object()
        res = CourierManager.check_fraud(phone=order.customer_phone, provider="STEADFAST", order=order)
        return Response(res, status=status.HTTP_200_OK if res.get("success") else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="steadfast-fraud-check", authentication_classes=[], permission_classes=[AllowAny])
    def steadfast_fraud_check_phone(self, request):
        from .courier_services import CourierManager
        phone = request.query_params.get("phone", "")
        if not phone:
            return Response({"detail": "Phone parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        res = CourierManager.check_fraud(phone=phone, provider="STEADFAST")
        return Response(res, status=status.HTTP_200_OK if res.get("success") else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="bulk-dispatch-steadfast", authentication_classes=[], permission_classes=[AllowAny])
    def bulk_dispatch_steadfast(self, request):
        """
        Fast bulk dispatch multiple online preorders to selected courier (Pathao, Steadfast, etc.).
        Body: { "order_ids": [1, 2, 3], "provider": "PATHAO" | "STEADFAST" | ... }
        """
        from .courier_services import CourierManager
        order_ids = request.data.get("order_ids", [])
        provider = (request.data.get("provider") or request.data.get("courier_partner") or "STEADFAST").upper()

        if not isinstance(order_ids, list) or not order_ids:
            return Response({"detail": "order_ids list is required."}, status=status.HTTP_400_BAD_REQUEST)

        orders = OnlinePreorder.objects.filter(id__in=order_ids).exclude(status="CANCELLED")
        dispatched = []
        failed = []

        for o in orders:
            if o.courier_consignment_id or o.steadfast_consignment_id:
                dispatched.append({
                    "id": o.id,
                    "consignment_id": o.courier_consignment_id or o.steadfast_consignment_id,
                    "tracking_code": o.courier_tracking_code or o.steadfast_tracking_code,
                    "already_dispatched": True
                })
                continue

            res = CourierManager.dispatch_order(o, provider=provider)
            if res.get("success"):
                dispatched.append({
                    "id": o.id,
                    "consignment_id": res.get("consignment_id"),
                    "tracking_code": res.get("tracking_code"),
                    "status": res.get("status")
                })
            else:
                failed.append({
                    "id": o.id,
                    "error": res.get("message", "Dispatch failed")
                })

        return Response({
            "success": len(dispatched) > 0,
            "provider": provider,
            "dispatched_count": len(dispatched),
            "failed_count": len(failed),
            "dispatched": dispatched,
            "failed": failed
        }, status=status.HTTP_200_OK)

    # --- Multi-Courier Partner Endpoints ---

    @action(detail=True, methods=["post"], url_path="dispatch-courier", authentication_classes=[], permission_classes=[AllowAny])
    def dispatch_courier(self, request, pk=None):
        """
        Dispatch order to any selected delivery agent (STEADFAST, PATHAO, REDX, CARRYBEE).
        """
        from .courier_services import CourierManager
        order = self.get_object()

        if order.status == "CANCELLED":
            return Response(
                {"detail": "Cannot dispatch a cancelled order to courier."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        provider = request.data.get("provider") or request.data.get("courier_partner") or "STEADFAST"
        cod_amount = request.data.get("cod_amount")
        note = request.data.get("note")
        address_override = request.data.get("address")
        phone_override = request.data.get("phone")

        res = CourierManager.dispatch_order(
            order=order,
            provider=provider,
            cod_amount=cod_amount,
            note=note,
            address_override=address_override,
            phone_override=phone_override
        )

        if not res.get("success"):
            return Response(
                {
                    "success": False,
                    "message": res.get("message", f"Failed to book with {provider} Courier"),
                    "data": res.get("data")
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response({
            "success": True,
            "message": res.get("message", f"Dispatched to {provider} Courier successfully!"),
            "consignment_id": order.courier_consignment_id or order.steadfast_consignment_id,
            "tracking_code": order.courier_tracking_code or order.steadfast_tracking_code,
            "status": order.courier_status or order.steadfast_status,
            "courier_partner": order.courier_partner or provider,
            "order": OnlinePreorderSerializer(order, context={"request": request}).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="courier-status", authentication_classes=[], permission_classes=[AllowAny])
    def courier_status(self, request, pk=None):
        """
        Fetch live tracking status from the order's courier partner.
        """
        from .courier_services import CourierManager
        order = self.get_object()
        res = CourierManager.get_order_status(order)
        if not res.get("success"):
            return Response(
                {"success": False, "message": res.get("message", "Failed to fetch courier status")},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response({
            "success": True,
            "status": order.courier_status or order.steadfast_status,
            "courier_partner": order.courier_partner,
            "data": res.get("data"),
            "order": OnlinePreorderSerializer(order, context={"request": request}).data
        })

    @action(detail=False, methods=["get"], url_path="courier-parcels", authentication_classes=[], permission_classes=[AllowAny])
    def courier_parcels(self, request):
        """
        List all orders dispatched to courier partners with statistics.
        Filtered by courier_partner, status, search, date range.
        """
        qs = OnlinePreorder.objects.filter(
            models.Q(courier_consignment_id__isnull=False) & ~models.Q(courier_consignment_id="") |
            models.Q(steadfast_consignment_id__isnull=False) & ~models.Q(steadfast_consignment_id="")
        )

        partner = request.query_params.get("courier_partner")
        if partner and partner.upper() != "ALL":
            if partner.upper() == 'STEADFAST':
                qs = qs.filter(models.Q(courier_partner='STEADFAST') | models.Q(steadfast_consignment_id__isnull=False))
            else:
                qs = qs.filter(courier_partner=partner.upper())

        status_param = request.query_params.get("status")
        if status_param and status_param != "all":
            qs = qs.filter(models.Q(courier_status__iexact=status_param) | models.Q(steadfast_status__iexact=status_param))

        search = request.query_params.get("search")
        if search:
            qs = qs.filter(
                models.Q(customer_name__icontains=search) |
                models.Q(customer_phone__icontains=search) |
                models.Q(courier_consignment_id__icontains=search) |
                models.Q(courier_tracking_code__icontains=search) |
                models.Q(steadfast_consignment_id__icontains=search) |
                models.Q(steadfast_tracking_code__icontains=search) |
                models.Q(id__icontains=search)
            )

        all_courier_orders = list(qs.order_by('-created_at'))
        total_booked = len(all_courier_orders)
        in_transit = sum(1 for o in all_courier_orders if str(o.courier_status or o.steadfast_status).lower() in ['in_review', 'pending', 'created', 'in_transit', 'picked', 'in_process'])
        delivered = sum(1 for o in all_courier_orders if str(o.courier_status or o.steadfast_status or o.status).lower() in ['delivered', 'completed'])
        cancelled = sum(1 for o in all_courier_orders if str(o.courier_status or o.steadfast_status or o.status).lower() in ['cancelled', 'returned', 'failed'])
        total_cod = sum(float(o.total_amount or 0) for o in all_courier_orders)

        serialized = OnlinePreorderSerializer(all_courier_orders, many=True, context={'request': request}).data

        return Response({
            "summary": {
                "total_booked": total_booked,
                "in_transit": in_transit,
                "delivered": delivered,
                "cancelled": cancelled,
                "total_cod_amount": total_cod,
            },
            "results": serialized
        })


class CourierSettingViewSet(viewsets.ModelViewSet):
    """
    Settings API for multi-delivery agents (Steadfast, Pathao, RedX, Carrybee).
    """
    from .models import CourierSetting
    from .serializers import CourierSettingSerializer

    queryset = CourierSetting.objects.all()
    serializer_class = CourierSettingSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        from .models import CourierSetting
        # Ensure all 4 providers exist in DB
        for code in ['STEADFAST', 'PATHAO', 'REDX', 'CARRYBEE']:
            CourierSetting.objects.get_or_create(provider=code)
        return CourierSetting.objects.all().order_by('provider')

    @action(detail=False, methods=['get'], url_path='active', authentication_classes=[], permission_classes=[AllowAny])
    def active_couriers(self, request):
        """
        Returns only the active couriers that have valid credentials configured.
        """
        from .courier_services import CourierManager
        active_list = CourierManager.get_active_couriers()
        return Response(active_list)

    @action(detail=True, methods=['post'], url_path='test-connection', authentication_classes=[], permission_classes=[AllowAny])
    def test_connection(self, request, pk=None):
        setting = self.get_object()
        provider = setting.provider

        if provider == 'STEADFAST':
            from .courier_services import SteadfastService
            cfg = SteadfastService.get_config()
            if not cfg['api_key'] or not cfg['secret_key']:
                return Response({'success': False, 'message': 'Steadfast API Key or Secret Key missing.'}, status=status.HTTP_400_BAD_REQUEST)
            res = SteadfastService.check_fraud("01700000000")
            if res.get('success') or res.get('phone'):
                return Response({'success': True, 'message': 'Steadfast Courier API credentials verified successfully!'})
            return Response({'success': False, 'message': res.get('message', 'Failed to connect to Steadfast')}, status=status.HTTP_400_BAD_REQUEST)

        elif provider == 'PATHAO':
            from .courier_services import PathaoService
            token, err = PathaoService.get_auth_token()
            if token:
                return Response({'success': True, 'message': 'Pathao OAuth Authentication verified successfully!'})
            return Response({'success': False, 'message': f"Pathao Connection Failed: {err}"}, status=status.HTTP_400_BAD_REQUEST)

        elif provider == 'REDX':
            if setting.api_key:
                return Response({'success': True, 'message': 'RedX API Key configured.'})
            return Response({'success': False, 'message': 'RedX API Key is missing.'}, status=status.HTTP_400_BAD_REQUEST)

        elif provider == 'CARRYBEE':
            if setting.api_key:
                return Response({'success': True, 'message': 'Carrybee API Key configured.'})
            return Response({'success': False, 'message': 'Carrybee API Key is missing.'}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'success': False, 'message': 'Unknown provider'}, status=status.HTTP_400_BAD_REQUEST)



