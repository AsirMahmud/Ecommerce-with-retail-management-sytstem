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

