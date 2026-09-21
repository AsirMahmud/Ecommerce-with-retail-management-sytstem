from rest_framework import viewsets, mixins, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from apps.authentication.permissions import IsAdminUserRole, IsManagerOrAdmin
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from django.db import models, transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from decimal import Decimal
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


class OnlinePreorderPagination(PageNumberPagination):
    page_size = 15
    page_size_query_param = 'page_size'
    max_page_size = 100


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
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = OnlinePreorder.objects.all().order_by('-created_at')
    permission_classes = [IsAuthenticated]
    pagination_class = OnlinePreorderPagination

    def paginate_queryset(self, queryset):
        if self.request.query_params.get('no_pagination') == 'true':
            return None
        return super().paginate_queryset(queryset)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OnlinePreorderCreateSerializer
        return OnlinePreorderSerializer

    def get_queryset(self):
        qs = OnlinePreorder.objects.all().select_related('conversion__sale')

        # Filter by status (single or comma-separated list)
        status_filter = self.request.query_params.get('status')
        if status_filter and status_filter != 'all':
            if ',' in status_filter:
                statuses = [s.strip() for s in status_filter.split(',') if s.strip()]
                qs = qs.filter(status__in=statuses)
            else:
                qs = qs.filter(status=status_filter)

        # Filter by courier partner
        courier_filter = self.request.query_params.get('courier_partner') or self.request.query_params.get('courier')
        if courier_filter and courier_filter != 'all':
            if courier_filter.upper() == 'STEADFAST':
                qs = qs.filter(
                    models.Q(courier_partner__iexact='STEADFAST') |
                    (models.Q(courier_partner__isnull=True) & models.Q(steadfast_consignment_id__isnull=False) & ~models.Q(steadfast_consignment_id=""))
                )
            else:
                qs = qs.filter(courier_partner__iexact=courier_filter)

        # Filter by delivery status (courier shipment lifecycle status)
        delivery_status = self.request.query_params.get('delivery_status') or self.request.query_params.get('courier_status')
        if delivery_status and delivery_status.lower() != 'all':
            deliv_lower = delivery_status.lower().strip()
            if deliv_lower in ['today_delivered', 'delivered_today']:
                today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
                deliv_kws = ['delivered', 'completed', 'delivered_approval_pending']
                q_del = models.Q()
                for kw in deliv_kws:
                    q_del |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
                q_today_del = q_del & (
                    models.Q(courier_delivered_at__gte=today_start) |
                    (models.Q(courier_delivered_at__isnull=True) & (
                        models.Q(courier_dispatched_at__gte=today_start) |
                        models.Q(created_at__gte=today_start)
                    ))
                )
                qs = qs.filter(q_today_del)
            elif deliv_lower in ['today_picked', 'picked_today']:
                today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
                has_consignment = (
                    (models.Q(courier_consignment_id__isnull=False) & ~models.Q(courier_consignment_id="")) |
                    (models.Q(steadfast_consignment_id__isnull=False) & ~models.Q(steadfast_consignment_id=""))
                )
                q_today_picked = (
                    models.Q(courier_dispatched_at__gte=today_start) |
                    (has_consignment & models.Q(courier_dispatched_at__isnull=True, created_at__gte=today_start))
                )
                qs = qs.filter(q_today_picked)
            elif deliv_lower in ['not_dispatched', 'unassigned', 'pending_dispatch']:
                qs = qs.filter(
                    (models.Q(courier_consignment_id__isnull=True) | models.Q(courier_consignment_id="")) &
                    (models.Q(steadfast_consignment_id__isnull=True) | models.Q(steadfast_consignment_id=""))
                )
            elif deliv_lower in ['in_review', 'review', 'booked']:
                review_kws = ['in_review', 'review', 'pending', 'pickup_requested', 'accepted', 'created', 'ready_for_pickup', 'order_placed']
                q_rev = models.Q()
                for kw in review_kws:
                    q_rev |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
                qs = qs.filter(q_rev)
            elif deliv_lower in ['in_transit', 'transit', 'on_the_road']:
                transit_kws = ['in_transit', 'transit', 'picked', 'picked_up', 'pickup_in_progress', 'in_process', 'waiting for pickup', 'dispatch', 'dispatched', 'assigned_for_delivery', 'out_for_delivery', 'in_sorting_hub']
                q_tr = models.Q()
                for kw in transit_kws:
                    q_tr |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
                qs = qs.filter(q_tr)
            elif deliv_lower in ['delivered', 'completed', 'delivered_completed']:
                deliv_kws = ['delivered', 'completed', 'delivered_approval_pending']
                q_del = models.Q()
                for kw in deliv_kws:
                    q_del |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
                qs = qs.filter(q_del)
            elif deliv_lower in ['cancelled_returned', 'cancelled', 'returned', 'cancel', 'return', 'failed']:
                ret_kws = ['cancel', 'cancelled', 'return', 'returned', 'return_pending', 'failed', 'delivery_failed', 'returned_to_merchant', 'pickup cancel', 'paid return', 'partial_delivered', 'hold']
                q_ret = models.Q()
                for kw in ret_kws:
                    q_ret |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
                qs = qs.filter(q_ret)
            else:
                # Direct / exact match for courier-specific raw status (e.g. 'delivered_approval_pending', 'partial_delivered', 'Pickup_Requested')
                qs = qs.filter(
                    models.Q(courier_status__iexact=delivery_status) |
                    models.Q(steadfast_status__iexact=delivery_status) |
                    models.Q(courier_status__icontains=delivery_status) |
                    models.Q(steadfast_status__icontains=delivery_status)
                )

        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        # Multi-field search
        search = self.request.query_params.get('search')
        if search:
            search = search.strip()
            id_query = models.Q()
            cleaned_search = search.lstrip('#')
            if cleaned_search.isdigit():
                id_query = models.Q(id=int(cleaned_search))

            qs = qs.filter(
                id_query |
                models.Q(customer_name__icontains=search) |
                models.Q(customer_phone__icontains=search) |
                models.Q(customer_email__icontains=search) |
                models.Q(notes__icontains=search) |
                models.Q(steadfast_consignment_id__icontains=search) |
                models.Q(steadfast_tracking_code__icontains=search) |
                models.Q(courier_consignment_id__icontains=search) |
                models.Q(courier_tracking_code__icontains=search)
            )

        # Dynamic ordering
        ordering = self.request.query_params.get('ordering', '-created_at')
        allowed_orderings = [
            'created_at', '-created_at',
            'total_amount', '-total_amount',
            'id', '-id',
            'status', '-status'
        ]
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('-created_at')

        return qs

    @action(detail=False, methods=['get'], url_path='metrics')
    def metrics(self, request):
        """
        Global summary metrics across all online preorders.
        Provides instant counts by status, revenue, delivery rates, and courier distribution.
        """
        qs = OnlinePreorder.objects.all()

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        total_orders = qs.count()

        status_aggregates = qs.aggregate(
            pending=Count('id', filter=models.Q(status='PENDING')),
            confirmed=Count('id', filter=models.Q(status='CONFIRMED')),
            hold=Count('id', filter=models.Q(status='HOLD')),
            delivered=Count('id', filter=models.Q(status='DELIVERED')),
            completed=Count('id', filter=models.Q(status='COMPLETED')),
            returned=Count('id', filter=models.Q(status='RETURNED')),
            cancelled=Count('id', filter=models.Q(status='CANCELLED')),
            total_revenue=Sum('total_amount'),
            completed_revenue=Sum('total_amount', filter=models.Q(status='COMPLETED')),
            delivered_revenue=Sum('total_amount', filter=models.Q(status='DELIVERED')),
            total_profit=Sum('profit', filter=models.Q(status='COMPLETED')),
        )

        completed_count = status_aggregates['completed'] or 0
        delivered_count = status_aggregates['delivered'] or 0
        returned_count = status_aggregates['returned'] or 0
        cancelled_count = status_aggregates['cancelled'] or 0
        total_rev = status_aggregates['total_revenue'] or Decimal('0.00')
        comp_rev = status_aggregates['completed_revenue'] or Decimal('0.00')

        avg_order_value = (comp_rev / completed_count) if completed_count > 0 else (
            (total_rev / total_orders) if total_orders > 0 else Decimal('0.00')
        )

        courier_counts = qs.values('courier_partner').annotate(count=Count('id'))
        courier_map = {item['courier_partner'] or 'UNASSIGNED': item['count'] for item in courier_counts}

        dispatched_or_closed = completed_count + delivered_count + returned_count
        fulfillment_rate = round((((completed_count + delivered_count) / dispatched_or_closed) * 100), 1) if dispatched_or_closed > 0 else 0.0
        return_rate = round(((returned_count / dispatched_or_closed) * 100), 1) if dispatched_or_closed > 0 else 0.0
        cancellation_rate = round(((cancelled_count / total_orders) * 100), 1) if total_orders > 0 else 0.0

        # Delivery status metrics breakdown
        not_dispatched_q = (
            (models.Q(courier_consignment_id__isnull=True) | models.Q(courier_consignment_id="")) &
            (models.Q(steadfast_consignment_id__isnull=True) | models.Q(steadfast_consignment_id=""))
        )
        not_dispatched_count = qs.filter(not_dispatched_q).exclude(status__in=['CANCELLED', 'RETURNED']).count()

        transit_kws = ['in_transit', 'transit', 'picked', 'picked_up', 'pickup_in_progress', 'in_process', 'waiting for pickup', 'dispatch', 'dispatched', 'assigned_for_delivery', 'out_for_delivery', 'in_sorting_hub']
        q_tr = models.Q()
        for kw in transit_kws:
            q_tr |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
        in_transit_qs = qs.filter(q_tr)
        in_transit_count = in_transit_qs.count()
        in_transit_cod_amount = float(in_transit_qs.aggregate(cod_sum=Sum('total_amount'))['cod_sum'] or Decimal('0.00'))

        deliv_kws = ['delivered', 'completed', 'delivered_approval_pending']
        q_del = models.Q()
        for kw in deliv_kws:
            q_del |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
        delivered_courier_qs = qs.filter(q_del)
        delivered_courier_count = delivered_courier_qs.count()
        delivered_courier_cod_amount = float(delivered_courier_qs.aggregate(cod_sum=Sum('total_amount'))['cod_sum'] or Decimal('0.00'))

        ret_kws = ['cancel', 'cancelled', 'return', 'returned', 'return_pending', 'failed', 'delivery_failed', 'returned_to_merchant', 'pickup cancel', 'paid return', 'partial_delivered']
        q_ret = models.Q()
        for kw in ret_kws:
            q_ret |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
        returned_courier_qs = qs.filter(q_ret)
        cancelled_returned_count = returned_courier_qs.count()
        returned_courier_cod_amount = float(returned_courier_qs.aggregate(cod_sum=Sum('total_amount'))['cod_sum'] or Decimal('0.00'))

        review_kws = ['in_review', 'review', 'pending', 'pickup_requested', 'accepted', 'created', 'ready_for_pickup', 'order_placed']
        q_rev = models.Q()
        for kw in review_kws:
            q_rev |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
        in_review_count = qs.filter(q_rev).count()

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_orders = qs.filter(created_at__gte=today_start).count()

        # Today Picked (Sent Today) = Dispatched / handed over to courier today
        has_consignment = (
            (models.Q(courier_consignment_id__isnull=False) & ~models.Q(courier_consignment_id="")) |
            (models.Q(steadfast_consignment_id__isnull=False) & ~models.Q(steadfast_consignment_id=""))
        )
        q_today_picked = (
            models.Q(courier_dispatched_at__gte=today_start) |
            (has_consignment & models.Q(courier_dispatched_at__isnull=True, created_at__gte=today_start))
        )
        today_picked_qs = qs.filter(q_today_picked)
        today_picked_aggregates = today_picked_qs.aggregate(
            count=Count('id'),
            cod_sum=Sum('total_amount')
        )
        today_picked_count = today_picked_aggregates['count'] or 0
        today_picked_cod_amount = float(today_picked_aggregates['cod_sum'] or Decimal('0.00'))

        # Today Delivered: Delivered parcels today strictly based on courier delivery status (not order status)
        q_today_del = q_del & (
            models.Q(courier_delivered_at__gte=today_start) |
            (models.Q(courier_delivered_at__isnull=True) & (
                models.Q(courier_dispatched_at__gte=today_start) |
                models.Q(created_at__gte=today_start)
            ))
        )

        today_del_qs = qs.filter(q_today_del)
        today_del_aggregates = today_del_qs.aggregate(
            count=Count('id'),
            cod_sum=Sum('total_amount')
        )
        today_delivered_count = today_del_aggregates['count'] or 0
        today_delivered_cod_amount = float(today_del_aggregates['cod_sum'] or Decimal('0.00'))

        return Response({
            'total_orders': total_orders,
            'today_orders': today_orders,
            'today_picked_count': today_picked_count,
            'today_picked_cod_amount': today_picked_cod_amount,
            'today_delivered_count': today_delivered_count,
            'today_delivered_cod_amount': today_delivered_cod_amount,
            'in_transit_count': in_transit_count,
            'in_transit_cod_amount': in_transit_cod_amount,
            'delivered_courier_count': delivered_courier_count,
            'delivered_courier_cod_amount': delivered_courier_cod_amount,
            'returned_courier_count': cancelled_returned_count,
            'returned_courier_cod_amount': returned_courier_cod_amount,
            'status_breakdown': {
                'PENDING': status_aggregates['pending'] or 0,
                'CONFIRMED': status_aggregates['confirmed'] or 0,
                'HOLD': status_aggregates['hold'] or 0,
                'DELIVERED': status_aggregates['delivered'] or 0,
                'COMPLETED': status_aggregates['completed'] or 0,
                'RETURNED': status_aggregates['returned'] or 0,
                'CANCELLED': status_aggregates['cancelled'] or 0,
            },
            'delivery_breakdown': {
                'all': total_orders,
                'not_dispatched': not_dispatched_count,
                'in_review': in_review_count,
                'in_transit': in_transit_count,
                'delivered': delivered_courier_count,
                'cancelled_returned': cancelled_returned_count,
                'today_delivered': today_delivered_count,
                'today_picked': today_picked_count,
            },
            'financials': {
                'total_revenue': float(total_rev),
                'completed_revenue': float(comp_rev),
                'average_order_value': float(avg_order_value),
                'total_profit': float(status_aggregates['total_profit'] or Decimal('0.00')),
            },
            'rates': {
                'fulfillment_rate': fulfillment_rate,
                'return_rate': return_rate,
                'cancellation_rate': cancellation_rate,
            },
            'couriers': courier_map,
        })

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

        # Automated inventory stock synchronization on status transitions
        if old_status != 'CANCELLED' and new_status == 'CANCELLED':
            self._restore_preorder_stock(updated_instance, reason="cancelled")
        elif old_status == 'CANCELLED' and new_status not in ['CANCELLED', 'RETURNED']:
            self._deduct_preorder_stock(updated_instance, reason="reactivated")
        elif old_status != 'RETURNED' and new_status == 'RETURNED':
            self._restore_preorder_stock(updated_instance, reason="returned")

    def perform_destroy(self, instance):
        """
        Perform deletion of an online preorder.
        If stock was deducted and not yet restored, restore it to inventory before deletion.
        Related OnlineConversion will be automatically deleted via CASCADE.
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Deleting online preorder #{instance.id} - {instance.customer_name}")
        if instance.is_stock_deducted and not instance.is_stock_restored:
            self._restore_preorder_stock(instance, reason="cancelled")
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

    @action(detail=True, methods=["post"], url_path="start-verification")
    def start_verification(self, request, pk=None):
        """
        Initialize a verification session for this online preorder.
        """
        verification = self._get_or_create_verification(request, pk)
        serializer = OnlinePreorderVerificationSerializer(verification, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="verification")
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

    @action(detail=True, methods=["post"], url_path="verify-scan")
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

    @action(detail=True, methods=["post"], url_path="complete-verification")
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

    @action(detail=True, methods=["post"], url_path="skip-verification")
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

    def _restore_preorder_stock(self, order, reason="returned"):
        """
        Helper to restore items in an online preorder back to inventory variations and products.
        """
        from .stock_utils import restore_preorder_stock
        restore_preorder_stock(order, reason=reason)

    def _deduct_preorder_stock(self, order, reason="new"):
        """
        Helper to deduct items in an online preorder from inventory variations and products.
        """
        from .stock_utils import deduct_preorder_stock
        deduct_preorder_stock(order, reason=reason)

    @action(detail=True, methods=["post"], url_path="process-return")
    @transaction.atomic
    def process_return(self, request, pk=None):
        """
        Process return for an online preorder:
        1. Set status to RETURNED and update returned_at
        2. Automatically restore inventory stock for all items in order and log StockMovement(movement_type='IN')
        3. Delivery charge handling:
           - If return_delivery_charge_paid_by_customer is True: no expense is added
           - If return_delivery_charge_paid_by_customer is False and return_charge_amount > 0:
             create an Expense under category "Courier Return Charges"
        """
        from decimal import Decimal
        order = self.get_object()

        if order.status == "RETURNED" and order.is_stock_restored:
            return Response(
                {"detail": "This order has already been processed as returned and restocked."},
                status=status.HTTP_400_BAD_REQUEST
            )

        customer_paid = request.data.get("return_delivery_charge_paid_by_customer", True)
        if isinstance(customer_paid, str):
            customer_paid = customer_paid.lower() in ["true", "1", "yes"]

        charge_amount = Decimal(str(request.data.get("return_charge_amount", 0) or 0))
        reason = request.data.get("return_reason", "").strip()

        order.status = "RETURNED"
        order.return_delivery_charge_paid_by_customer = customer_paid
        order.return_charge_amount = charge_amount
        order.return_reason = reason
        order.returned_at = timezone.now()

        # 1. Restore stock
        self._restore_preorder_stock(order)

        # 2. Expense handling if store bears the return delivery fee
        if not customer_paid and charge_amount > Decimal("0.00"):
            from apps.expenses.models import Expense, ExpenseCategory
            category, _ = ExpenseCategory.objects.get_or_create(
                name="Courier Return Charges",
                defaults={
                    "color": "#EF4444",
                    "description": "Courier return charges borne by store for returned online orders"
                }
            )
            expense = Expense.objects.create(
                description=f"Return Courier Charge for Preorder #{order.id} ({order.customer_name})",
                amount=charge_amount,
                date=timezone.now().date(),
                category=category,
                payment_method="OTHER",
                status="PAID",
                reference_number=f"RET-ORD-{order.id}",
                notes=f"Order #{order.id} returned by customer without paying delivery charge. Return reason: {reason}"
            )
            order.return_expense = expense

        order.save()

        return Response({
            "success": True,
            "message": "Order marked as RETURNED and stock restocked to inventory successfully.",
            "order": OnlinePreorderSerializer(order, context={"request": request}).data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="set-hold")
    def set_hold(self, request, pk=None):
        """
        Put preorder on HOLD with hold reason.
        """
        order = self.get_object()
        reason = request.data.get("hold_reason", "").strip()
        order.status = "HOLD"
        order.hold_reason = reason
        order.save(update_fields=["status", "hold_reason", "updated_at"])

        return Response({
            "success": True,
            "message": "Order put on HOLD successfully.",
            "order": OnlinePreorderSerializer(order, context={"request": request}).data
        }, status=status.HTTP_200_OK)

    # --- Steadfast Courier Actions ---

    @action(detail=True, methods=["post"], url_path="dispatch-steadfast")
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

    @action(detail=True, methods=["get"], url_path="steadfast-status")
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
        order.save(update_fields=update_fields)

        return Response({
            "success": True,
            "status": order.steadfast_status,
            "data": res.get("data"),
            "order": OnlinePreorderSerializer(order, context={"request": request}).data
        })

    # --- Multi-Courier Fraud Check Endpoints ---

    @action(detail=True, methods=["get"], url_path="courier-fraud-check")
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

    @action(detail=False, methods=["get"], url_path="courier-fraud-check")
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
    @action(detail=True, methods=["get"], url_path="steadfast-fraud-check")
    def steadfast_fraud_check_detail(self, request, pk=None):
        from .courier_services import CourierManager
        order = self.get_object()
        res = CourierManager.check_fraud(phone=order.customer_phone, provider="STEADFAST", order=order)
        return Response(res, status=status.HTTP_200_OK if res.get("success") else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"], url_path="steadfast-fraud-check")
    def steadfast_fraud_check_phone(self, request):
        from .courier_services import CourierManager
        phone = request.query_params.get("phone", "")
        if not phone:
            return Response({"detail": "Phone parameter is required."}, status=status.HTTP_400_BAD_REQUEST)
        res = CourierManager.check_fraud(phone=phone, provider="STEADFAST")
        return Response(res, status=status.HTTP_200_OK if res.get("success") else status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], url_path="bulk-dispatch-steadfast")
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

    @action(detail=True, methods=["post"], url_path="dispatch-courier")
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

    @action(detail=True, methods=["get"], url_path="courier-status")
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

    @action(detail=False, methods=["post"], url_path="sync-courier-status")
    def sync_courier_status(self, request):
        """
        Synchronize live status from couriers (Steadfast, Pathao, etc.) for dispatched orders.
        Optional body: { "order_ids": [1, 2, ...] }
        """
        from .courier_services import CourierManager
        order_ids = request.data.get("order_ids")
        res = CourierManager.sync_orders_status(order_ids=order_ids)
        return Response(res, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"], url_path="courier-parcels")
    def courier_parcels(self, request):
        """
        List all orders dispatched to courier partners with statistics.
        Filtered by courier_partner, status, search, date range.
        """
        base_qs = OnlinePreorder.objects.filter(
            models.Q(courier_consignment_id__isnull=False) & ~models.Q(courier_consignment_id="") |
            models.Q(steadfast_consignment_id__isnull=False) & ~models.Q(steadfast_consignment_id="")
        )

        # Calculate provider-level counts across all booked parcels
        steadfast_q = models.Q(courier_partner__iexact='STEADFAST') | (
            models.Q(courier_partner__isnull=True) & models.Q(steadfast_consignment_id__isnull=False) & ~models.Q(steadfast_consignment_id="")
        )
        provider_counts = {
            "ALL": base_qs.count(),
            "STEADFAST": base_qs.filter(steadfast_q).count(),
            "PATHAO": base_qs.filter(courier_partner__iexact='PATHAO').count(),
            "REDX": base_qs.filter(courier_partner__iexact='REDX').count(),
            "CARRYBEE": base_qs.filter(courier_partner__iexact='CARRYBEE').count(),
        }

        qs = base_qs

        partner = request.query_params.get("courier") or request.query_params.get("courier_partner")
        partner_qs = base_qs
        if partner and partner.upper() != "ALL":
            if partner.upper() == 'STEADFAST':
                partner_qs = partner_qs.filter(steadfast_q)
            else:
                partner_qs = partner_qs.filter(courier_partner__iexact=partner.upper())

        qs = partner_qs

        status_param = request.query_params.get("status")
        if status_param and status_param != "all":
            status_lower = status_param.lower()
            if status_lower in ['today_delivered', 'delivered_today']:
                today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
                deliv_keywords = ['delivered', 'completed', 'delivered_approval_pending']
                q_del = models.Q()
                for kw in deliv_keywords:
                    q_del |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
                q_today_del = q_del & (
                    models.Q(courier_delivered_at__gte=today_start) |
                    (models.Q(courier_delivered_at__isnull=True) & (
                        models.Q(courier_dispatched_at__gte=today_start) |
                        models.Q(created_at__gte=today_start)
                    ))
                )
                qs = qs.filter(q_today_del)
            elif status_lower in ['today_picked', 'picked_today']:
                today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
                q_today_picked = (
                    models.Q(courier_dispatched_at__gte=today_start) |
                    models.Q(courier_dispatched_at__isnull=True, created_at__gte=today_start)
                )
                qs = qs.filter(q_today_picked)
            elif status_lower in ['in_transit', 'transit']:
                transit_keywords = ['in_transit', 'transit', 'picked', 'in_process', 'waiting for pickup', 'dispatch', 'pending', 'created', 'in_review']
                q_status = models.Q()
                for kw in transit_keywords:
                    q_status |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
                qs = qs.filter(q_status)
            elif status_lower in ['delivered', 'completed']:
                deliv_keywords = ['delivered', 'completed', 'delivered_approval_pending']
                q_status = models.Q()
                for kw in deliv_keywords:
                    q_status |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
                qs = qs.filter(q_status)
            elif status_lower in ['cancelled', 'returned', 'cancel', 'return', 'failed']:
                cancel_keywords = ['cancel', 'return', 'failed', 'pickup cancel', 'paid return']
                q_status = models.Q()
                for kw in cancel_keywords:
                    q_status |= models.Q(courier_status__icontains=kw) | models.Q(steadfast_status__icontains=kw)
                qs = qs.filter(q_status)
            elif status_lower in ['in_review', 'review']:
                q_status = models.Q(courier_status__icontains='review') | models.Q(steadfast_status__icontains='review') | models.Q(courier_status__icontains='pending')
                qs = qs.filter(q_status)
            else:
                qs = qs.filter(
                    models.Q(courier_status__icontains=status_param) |
                    models.Q(steadfast_status__icontains=status_param)
                )

        search = request.query_params.get("search")
        if search:
            search = search.strip()
            qs = qs.filter(
                models.Q(customer_name__icontains=search) |
                models.Q(customer_phone__icontains=search) |
                models.Q(courier_consignment_id__icontains=search) |
                models.Q(courier_tracking_code__icontains=search) |
                models.Q(steadfast_consignment_id__icontains=search) |
                models.Q(steadfast_tracking_code__icontains=search) |
                models.Q(id__icontains=search)
            )

        # Calculate overarching metrics on partner_qs so table filters do not erase the KPI deck
        all_partner_orders = list(partner_qs)
        total_booked = len(all_partner_orders)
        
        in_transit_orders = [
            o for o in all_partner_orders 
            if str(o.courier_status or o.steadfast_status).lower() in ['in_review', 'pending', 'created', 'in_transit', 'picked', 'in_process', 'waiting for pickup']
        ]
        in_transit = len(in_transit_orders)
        in_transit_cod = sum(float(o.total_amount or 0) for o in in_transit_orders)

        delivered_orders = [
            o for o in all_partner_orders 
            if str(o.courier_status or o.steadfast_status or '').lower() in ['delivered', 'completed', 'delivered_approval_pending']
        ]
        delivered = len(delivered_orders)
        delivered_cod = sum(float(o.total_amount or 0) for o in delivered_orders)

        cancelled_orders = [
            o for o in all_partner_orders 
            if str(o.courier_status or o.steadfast_status or '').lower() in ['cancelled', 'returned', 'failed', 'pickup cancel', 'paid return']
        ]
        cancelled = len(cancelled_orders)
        cancelled_cod = sum(float(o.total_amount or 0) for o in cancelled_orders)

        total_cod = sum(float(o.total_amount or 0) for o in all_partner_orders)

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Today Picked (Sent Today) = Dispatched / handed over to courier today
        today_picked_orders = [
            o for o in all_partner_orders
            if (o.courier_dispatched_at and o.courier_dispatched_at >= today_start)
            or (not o.courier_dispatched_at and o.created_at >= today_start)
        ]
        today_picked_count = len(today_picked_orders)
        today_picked_cod = sum(float(o.total_amount or 0) for o in today_picked_orders)

        # Today Delivered = Deliveries completed today strictly based on courier status
        today_delivered_orders = [
            o for o in all_partner_orders
            if str(o.courier_status or o.steadfast_status or '').lower() in ['delivered', 'completed', 'delivered_approval_pending']
            and (
                (o.courier_delivered_at and o.courier_delivered_at >= today_start)
                or (not o.courier_delivered_at and (
                    (o.courier_dispatched_at and o.courier_dispatched_at >= today_start)
                    or o.created_at >= today_start
                ))
            )
        ]
        today_delivered_count = len(today_delivered_orders)
        today_delivered_cod = sum(float(o.total_amount or 0) for o in today_delivered_orders)

        all_courier_orders = list(qs.order_by('-created_at'))
        serialized = OnlinePreorderSerializer(all_courier_orders, many=True, context={'request': request}).data

        return Response({
            "summary": {
                "total_booked": total_booked,
                "in_transit": in_transit,
                "in_transit_cod_amount": in_transit_cod,
                "delivered": delivered,
                "delivered_cod_amount": delivered_cod,
                "cancelled": cancelled,
                "cancelled_cod_amount": cancelled_cod,
                "total_cod_amount": total_cod,
                "today_picked_count": today_picked_count,
                "today_picked_cod_amount": today_picked_cod,
                "today_delivered_count": today_delivered_count,
                "today_delivered_cod_amount": today_delivered_cod,
            },
            "provider_counts": provider_counts,
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
    permission_classes = [IsAdminUserRole]

    def get_queryset(self):
        from .models import CourierSetting
        # Ensure all 4 providers exist in DB
        for code in ['STEADFAST', 'PATHAO', 'REDX', 'CARRYBEE']:
            CourierSetting.objects.get_or_create(provider=code)
        return CourierSetting.objects.all().order_by('provider')

    @action(detail=False, methods=['get'], url_path='active', permission_classes=[IsAuthenticated])
    def active_couriers(self, request):
        """
        Returns only the active couriers that have valid credentials configured.
        """
        from .courier_services import CourierManager
        active_list = CourierManager.get_active_couriers()
        return Response(active_list)

    @action(detail=True, methods=['post'], url_path='test-connection', permission_classes=[IsAdminUserRole])
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



