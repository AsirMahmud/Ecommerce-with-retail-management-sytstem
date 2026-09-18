from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Sum, F, Q, Count, Avg
from django.utils import timezone
from datetime import datetime, timedelta
from django.db import transaction
from .models import Sale, SaleItem, Payment, Return, ReturnItem, SalePayment, DuePayment
from .serializers import (
    SaleSerializer, SaleItemSerializer, PaymentSerializer,
    ReturnSerializer, ReturnItemSerializer, SalePaymentSerializer,
    DuePaymentSerializer, CompletePaymentSerializer, DuePaymentCompletionSerializer
)
from apps.inventory.models import Product, ProductVariation, StockMovement, InventoryAlert, Category
from apps.customer.models import Customer
from decimal import Decimal

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['invoice_number', 'customer__first_name', 'customer__last_name', 'customer_phone', 'notes']
    ordering_fields = ['date', 'total', 'status']
    ordering = ['-date']
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(
                date__date__range=[start_date, end_date]
            )
        elif start_date:
            queryset = queryset.filter(date__date__gte=start_date)
        elif end_date:
            queryset = queryset.filter(date__date__lte=end_date)
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        # Filter by sale type (channel)
        sale_type = self.request.query_params.get('sale_type')
        if sale_type:
            queryset = queryset.filter(sale_type=sale_type)
        
        # Filter by payment method
        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        
        # Filter by customer phone
        customer_phone = self.request.query_params.get('customer_phone')
        if customer_phone:
            queryset = queryset.filter(customer_phone=customer_phone)
        
        # Filter by payment status
        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            if payment_status == 'fully_paid':
                queryset = queryset.filter(amount_paid__gte=F('total'))
            elif payment_status == 'partially_paid':
                queryset = queryset.filter(amount_paid__gt=0, amount_paid__lt=F('total'))
            elif payment_status in ['unpaid', 'due', 'with_due']:
                queryset = queryset.filter(amount_due__gt=0)
        
        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Return accurate aggregate summary and counts for Sales History ledger"""
        # Filtered queryset based on active query params (status, sale_type, date, etc.)
        queryset = self.filter_queryset(self.get_queryset())
        
        aggregates = queryset.aggregate(
            total_transactions=Count('id'),
            gross_revenue=Sum('total'),
            total_paid=Sum('amount_paid'),
            total_due=Sum('amount_due'),
            total_profit=Sum('total_profit'),
            avg_ticket=Avg('total')
        )
        
        filtered_channel_counts = dict(queryset.order_by().values('sale_type').annotate(c=Count('id')).values_list('sale_type', 'c'))
        filtered_due_count = queryset.filter(amount_due__gt=0).count()
        in_store_count = filtered_channel_counts.get('shop', 0)
        preorder_count = (
            filtered_channel_counts.get('online_preorder', 0) +
            filtered_channel_counts.get('offline_preorder', 0)
        )

        # Base counts with only date & search applied, for the quick-filter pill counters
        base_qs = Sale.objects.all()
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date and end_date:
            base_qs = base_qs.filter(date__date__range=[start_date, end_date])
        elif start_date:
            base_qs = base_qs.filter(date__date__gte=start_date)
        elif end_date:
            base_qs = base_qs.filter(date__date__lte=end_date)
            
        search = request.query_params.get('search')
        if search:
            search_filter = (
                Q(invoice_number__icontains=search) |
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search) |
                Q(customer_phone__icontains=search)
            )
            base_qs = base_qs.filter(search_filter)

        base_status_counts = dict(base_qs.order_by().values('status').annotate(c=Count('id')).values_list('status', 'c'))
        base_channel_counts = dict(base_qs.order_by().values('sale_type').annotate(c=Count('id')).values_list('sale_type', 'c'))
        base_due_count = base_qs.filter(amount_due__gt=0).count()
        base_total_count = base_qs.count()

        base_in_store = base_channel_counts.get('shop', 0)
        base_preorders = (
            base_channel_counts.get('online_preorder', 0) +
            base_channel_counts.get('offline_preorder', 0)
        )

        gross = aggregates['gross_revenue'] or Decimal('0.00')
        paid = aggregates['total_paid'] or Decimal('0.00')
        due = aggregates['total_due'] or Decimal('0.00')
        avg = aggregates['avg_ticket'] or Decimal('0.00')

        return Response({
            'total_transactions': aggregates['total_transactions'] or 0,
            'gross_revenue': float(gross),
            'total_paid': float(paid),
            'total_due': float(due),
            'total_profit': float(aggregates['total_profit'] or Decimal('0.00')),
            'avg_ticket': float(avg),
            'in_store_count': in_store_count,
            'preorder_count': preorder_count,
            'due_count': filtered_due_count,
            'pill_counts': {
                'all': base_total_count,
                'completed': base_status_counts.get('completed', 0),
                'due': base_due_count,
                'in_store': base_in_store,
                'preorders': base_preorders,
                'refunded': base_status_counts.get('refunded', 0),
            }
        })

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            sale = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        try:
            sale = serializer.save()
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def add_payment(self, request, pk=None):
        """Add a payment to an existing sale"""
        sale = self.get_object()
        serializer = CompletePaymentSerializer(data=request.data)
        
        if serializer.is_valid():
            payment_data = serializer.validated_data['payment_data']
            
            # Check if total payment amount doesn't exceed remaining due
            total_payment_amount = sum(Decimal(str(p['amount'])) for p in payment_data)
            if total_payment_amount > sale.amount_due:
                return Response(
                    {'error': f'Payment amount ({total_payment_amount}) exceeds remaining due amount ({sale.amount_due})'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process payments
            payments_created = []
            for payment in payment_data:
                sale_payment = SalePayment.objects.create(
                    sale=sale,
                    amount=Decimal(str(payment['amount'])),
                    payment_method=payment['method'],
                    status='completed',
                    transaction_id=payment.get('transaction_id', ''),
                    notes=payment.get('notes', '')
                )
                payments_created.append(sale_payment)
            
            # Update sale payment status
            sale.update_payment_status()
            
            return Response({
                'message': 'Payments added successfully',
                'payments': SalePaymentSerializer(payments_created, many=True).data,
                'sale': SaleSerializer(sale).data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def split_payment(self, request, pk=None):
        """Process split payment for a sale"""
        sale = self.get_object()
        
        if sale.status == 'completed':
            return Response(
                {'error': 'Cannot modify payments for completed sale'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CompletePaymentSerializer(data=request.data)
        if serializer.is_valid():
            payment_data = serializer.validated_data['payment_data']
            
            # Clear existing payments (if this is a re-payment)
            sale.sale_payments.all().delete()
            
            # Process new payments
            total_payment_amount = Decimal('0.00')
            for payment in payment_data:
                amount = Decimal(str(payment['amount']))
                SalePayment.objects.create(
                    sale=sale,
                    amount=amount,
                    payment_method=payment['method'],
                    status='completed',
                    transaction_id=payment.get('transaction_id', ''),
                    notes=payment.get('notes', '')
                )
                total_payment_amount += amount
            
            # Set payment method
            sale.payment_method = 'split' if len(payment_data) > 1 else payment_data[0]['method']
            sale.save()
            
            # Create due payment if needed
            if total_payment_amount < sale.total:
                DuePayment.objects.create(
                    sale=sale,
                    amount_due=sale.total - total_payment_amount,
                    due_date=datetime.now().date() + timedelta(days=30),
                    notes="Remaining balance from split payment"
                )
            
            # Update payment status
            sale.update_payment_status()
            
            return Response(SaleSerializer(sale).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def payment_status(self, request, pk=None):
        """Get detailed payment status for a sale"""
        sale = self.get_object()
        
        return Response({
            'invoice_number': sale.invoice_number,
            'total': sale.total,
            'amount_paid': sale.amount_paid,
            'amount_due': sale.amount_due,
            'gift_amount': sale.gift_amount,
            'payment_status': sale.payment_status,
            'is_fully_paid': sale.is_fully_paid,
            'payments': SalePaymentSerializer(sale.sale_payments.all(), many=True).data,
            'due_payments': DuePaymentSerializer(sale.due_payments.all(), many=True).data
        })

    @action(detail=False, methods=['get'])
    def due_sales(self, request):
        """Get all sales with pending due amounts"""
        due_sales = Sale.objects.filter(amount_due__gt=0).order_by('-date')
        
        # Apply pagination
        page = self.paginate_queryset(due_sales)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(due_sales, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def create_return(self, request, pk=None):
        sale = self.get_object()
        serializer = ReturnSerializer(data=request.data)
        
        if serializer.is_valid():
            return_order = serializer.save(sale=sale)
            return Response(ReturnSerializer(return_order).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def customer_lookup(self, request):
        """Lookup customer by phone number"""
        phone = request.query_params.get('phone')
        if not phone:
            return Response(
                {'error': 'Phone number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            customer = Customer.objects.get(phone=phone)
            return Response({
                'exists': True,
                'customer': {
                    'id': customer.id,
                    'name': customer.name,
                    'phone': customer.phone,
                    'email': customer.email
                }
            })
        except Customer.DoesNotExist:
            return Response({
                'exists': False,
                'message': 'Customer not found'
            })

    @action(detail=False, methods=['get'])
    def payment_analytics(self, request):
        """Get payment method analytics and due amounts summary"""
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        
        # Payment method distribution
        payment_methods = Sale.objects.filter(
            date__date__gte=start_of_month,
            status__in=['completed', 'partially_paid']
        ).values('payment_method').annotate(
            count=Count('id'),
            total_amount=Sum('amount_paid')
        ).order_by('-total_amount')
        
        # Due amounts summary
        due_summary = Sale.objects.filter(amount_due__gt=0).aggregate(
            total_due=Sum('amount_due'),
            count_due_sales=Count('id')
        )
        
        # Gift card usage
        gift_payments = SalePayment.objects.filter(
            payment_method='gift',
            status='completed',
            payment_date__date__gte=start_of_month
        ).aggregate(
            total_gift_amount=Sum('amount'),
            gift_transactions=Count('id')
        )
        
        # Overdue payments (more than 30 days)
        overdue_date = today - timedelta(days=30)
        overdue_payments = DuePayment.objects.filter(
            status='pending',
            due_date__lt=overdue_date
        ).aggregate(
            overdue_amount=Sum('amount_due'),
            overdue_count=Count('id')
        )
        
        return Response({
            'payment_methods': list(payment_methods),
            'due_summary': due_summary,
            'gift_payments': gift_payments,
            'overdue_payments': overdue_payments
        })

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        today = timezone.now().date()
        start_of_month = today.replace(day=1)

        # Get filters from query params
        status_filter = request.query_params.get('status', 'completed')
        payment_method = request.query_params.get('payment_method')
        customer_phone = request.query_params.get('customer_phone')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        period = request.query_params.get('period', '7d')

        # Helper to build filtered Sale queryset
        def filtered_sales(date_from=None, date_to=None):
            qs = Sale.objects.filter(status=status_filter)
            
            # Exclude gifted sales from revenue calculations unless specifically requested
            if status_filter != 'gifted':
                qs = qs.exclude(status='gifted')
            
            if payment_method:
                qs = qs.filter(payment_method=payment_method)
            if customer_phone:
                qs = qs.filter(customer_phone=customer_phone)
            if date_from and date_to:
                qs = qs.filter(date__date__range=[date_from, date_to])
            return qs

        # Today's sales
        today_sales_qs = filtered_sales(date_from=today, date_to=today)
        today_sales = today_sales_qs.aggregate(
            total_sales=Sum('total'),
            total_transactions=Count('id'),
            total_profit=Sum('total_profit'),
            total_loss=Sum('total_loss'),
            total_discount=Sum('discount'),
            average_transaction_value=Avg('total')
        )
        
        # Count unique customers for today
        today_customers = today_sales_qs.values('customer').distinct().count()
        today_sales['total_customers'] = today_customers

        # Monthly sales
        monthly_sales_qs = filtered_sales(date_from=start_of_month, date_to=today)
        monthly_sales = monthly_sales_qs.aggregate(
            total_sales=Sum('total'),
            total_transactions=Count('id'),
            total_profit=Sum('total_profit'),
            total_loss=Sum('total_loss'),
            total_discount=Sum('discount'),
            average_transaction_value=Avg('total')
        )
        
        # Count unique customers for month
        monthly_customers = monthly_sales_qs.values('customer').distinct().count()
        monthly_sales['total_customers'] = monthly_customers

        # Customer analytics
        customer_analytics = {
            'new_customers_today': Customer.objects.filter(
                created_at__date=today
            ).count(),
            'active_customers_today': today_customers,
            'customer_retention_rate': self._calculate_customer_retention_rate(),
            'top_customers': monthly_sales_qs.values(
                'customer__first_name',
                'customer__last_name',
                'customer__phone'
            ).annotate(
                total_spent=Sum('total'),
                visit_count=Count('id')
            ).order_by('-total_spent')[:5]
        }
        
        # Clean up customer names
        for customer in customer_analytics['top_customers']:
            first_name = customer.get('customer__first_name', '') or ''
            last_name = customer.get('customer__last_name', '') or ''
            customer['customer_name'] = f"{first_name} {last_name}".strip()
            customer.pop('customer__first_name', None)
            customer.pop('customer__last_name', None)

        # Payment method distribution
        payment_method_distribution = monthly_sales_qs.values('payment_method').annotate(
            count=Count('id'),
            total=Sum('total')
        ).order_by('-total')

        # Sales by hour distribution for today
        sales_by_hour = []
        for hour in range(24):
            hour_sales = today_sales_qs.filter(date__hour=hour).aggregate(
                count=Count('id'),
                total=Sum('total')
            )
            sales_by_hour.append({
                'hour': hour,
                'count': hour_sales['count'] or 0,
                'total': float(hour_sales['total'] or 0)
            })

        # Top selling products this month
        top_products = SaleItem.objects.filter(
            sale__in=monthly_sales_qs
        ).values(
            'product__name'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum('total'),
            total_profit=Sum('profit')
        ).order_by('-total_quantity')[:5]

        # Sales trend data
        if start_date and end_date:
            try:
                trend_from = datetime.strptime(start_date, '%Y-%m-%d').date()
                trend_to = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                trend_from = today - timedelta(days=7)
                trend_to = today
        else:
            if period == '7d':
                trend_from = today - timedelta(days=7)
            elif period == '30d':
                trend_from = today - timedelta(days=30)
            elif period == '90d':
                trend_from = today - timedelta(days=90)
            else:
                trend_from = today - timedelta(days=7)
            trend_to = today
            
        sales_trend = filtered_sales(date_from=trend_from, date_to=trend_to).values(
            'date__date'
        ).annotate(
            sales=Sum('total'),
            profit=Sum('total_profit'),
            orders=Count('id')
        ).order_by('date__date')

        # Convert Decimal values to float for JSON serialization
        def convert_decimals(data):
            if isinstance(data, dict):
                return {k: convert_decimals(v) for k, v in data.items()}
            elif isinstance(data, list):
                return [convert_decimals(item) for item in data]
            elif hasattr(data, '_meta') and hasattr(data._meta, 'get_field'):
                # This is a model instance, convert to dict
                return {field.name: convert_decimals(getattr(data, field.name)) for field in data._meta.fields}
            elif str(type(data)) == "<class 'decimal.Decimal'>":
                return float(data) if data is not None else 0.0
            else:
                return data

        # Clean and return response
        response_data = {
            'today': convert_decimals(today_sales),
            'monthly': convert_decimals(monthly_sales),
            'customer_analytics': convert_decimals(customer_analytics),
            'payment_method_distribution': convert_decimals(list(payment_method_distribution)),
            'sales_by_hour': sales_by_hour,
            'top_products': convert_decimals(list(top_products)),
            'sales_trend': convert_decimals(list(sales_trend))
        }

        return Response(response_data)

    def _calculate_customer_retention_rate(self):
        """Calculate customer retention rate (customers who made purchases in both last month and this month)"""
        try:
            today = timezone.now().date()
            current_month_start = today.replace(day=1)
            last_month_end = current_month_start - timedelta(days=1)
            last_month_start = last_month_end.replace(day=1)
            
            # Get customers who made purchases last month (exclude gifted sales)
            last_month_customers = set(Sale.objects.filter(
                date__date__range=[last_month_start, last_month_end],
                status='completed',
                customer__isnull=False
            ).exclude(status='gifted').values_list('customer_id', flat=True))
            
            # Get customers who made purchases this month (exclude gifted sales)
            current_month_customers = set(Sale.objects.filter(
                date__date__range=[current_month_start, today],
                status='completed',
                customer__isnull=False
            ).exclude(status='gifted').values_list('customer_id', flat=True))
            
            # Calculate retention rate
            if len(last_month_customers) == 0:
                return 0.0
                
            retained_customers = len(last_month_customers.intersection(current_month_customers))
            retention_rate = (retained_customers / len(last_month_customers)) * 100
            
            return round(retention_rate, 2)
        except Exception:
            return 0.0

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            
            # Delete associated items and update inventory
            for item in instance.items.all():
                # Restore stock for non-completed sales
                if instance.status in ['pending', 'cancelled']:
                    variation = item.product_variation
                    if variation:
                        variation.stock += item.quantity
                        variation.save()
            
            # Delete the sale
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def delete_all_sales(self, request):
        """Delete all sales data"""
        try:
            # Get count before deletion
            total_count = Sale.objects.count()
            
            # Simple direct deletion of all sales
            Sale.objects.all().delete()
            
            return Response({
                'message': f'Successfully deleted all {total_count} sales',
                'deleted_count': total_count
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['transaction_id', 'sale__invoice_number']
    ordering_fields = ['payment_date', 'amount', 'status']
    ordering = ['-payment_date']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(
                payment_date__range=[start_date, end_date]
            )
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by payment method
        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        
        return queryset

class ReturnViewSet(viewsets.ModelViewSet):
    queryset = Return.objects.all()
    serializer_class = ReturnSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'return_number',
        'sale__invoice_number',
        'sale__customer__phone',
        'sale__customer__first_name',
        'sale__customer__last_name',
        'items__sale_item__product__name'
    ]
    ordering_fields = ['created_at', 'status', 'refund_amount']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = super().get_queryset().select_related('sale', 'sale__customer').prefetch_related('items__sale_item__product').distinct()
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(
                created_at__range=[start_date, end_date]
            )
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        items_data = payload.pop('items', [])
        if not items_data:
            return Response({'error': 'Return must contain at least one item.'}, status=status.HTTP_400_BAD_REQUEST)

        sale_id = payload.get('sale') or payload.get('sale_id')
        if not sale_id:
            return Response({'error': 'sale_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            sale = Sale.objects.select_for_update().get(id=sale_id)
        except Sale.DoesNotExist:
            return Response({'error': f'Sale with id {sale_id} does not exist.'}, status=status.HTTP_404_NOT_FOUND)

        # Validate each item and check returnable quantity
        validated_items = []
        calculated_refund = Decimal('0.00')

        for item_data in items_data:
            item_id = item_data.get('sale_item_id') or item_data.get('sale_item') or item_data.get('id')
            qty = int(item_data.get('quantity', 0))
            item_reason = item_data.get('reason', '') or payload.get('reason', 'Customer return')

            if qty <= 0:
                return Response({'error': f'Invalid quantity {qty} for item {item_id}.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                sale_item = sale.items.get(id=item_id)
            except SaleItem.DoesNotExist:
                return Response({'error': f'Sale item {item_id} does not belong to Sale {sale.invoice_number}.'}, status=status.HTTP_400_BAD_REQUEST)

            # Check already returned quantity
            already_returned = ReturnItem.objects.filter(
                sale_item=sale_item,
                return_order__status__in=['completed', 'approved']
            ).aggregate(total=Sum('quantity'))['total'] or 0

            returnable = sale_item.quantity - already_returned
            if qty > returnable:
                return Response({
                    'error': f'Cannot return {qty} of {sale_item.product.name}. Only {returnable} available to return.'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calculate item net price
            unit_price = sale_item.unit_price
            discount_per_unit = (sale_item.discount / sale_item.quantity) if sale_item.quantity > 0 else Decimal('0.00')
            item_refund = max(Decimal('0.00'), (unit_price - discount_per_unit) * qty)
            calculated_refund += item_refund

            validated_items.append({
                'sale_item': sale_item,
                'quantity': qty,
                'reason': item_reason,
            })

        # Determine refund_amount
        refund_amount = payload.get('refund_amount')
        if refund_amount is not None and str(refund_amount).strip() != '':
            refund_amount = Decimal(str(refund_amount))
        else:
            refund_amount = calculated_refund

        refund_method = payload.get('refund_method', 'cash') or 'cash'
        delivery_charge_paid_by_customer = payload.get('delivery_charge_paid_by_customer', True)
        if isinstance(delivery_charge_paid_by_customer, str):
            delivery_charge_paid_by_customer = delivery_charge_paid_by_customer.lower() in ['true', '1', 'yes']
        return_charge_amount = Decimal(str(payload.get('return_charge_amount', 0) or 0))
        notes = payload.get('notes', '').strip()

        # Create Return record
        return_order = Return.objects.create(
            sale=sale,
            reason=payload.get('reason', 'Customer Return'),
            refund_amount=refund_amount,
            refund_method=refund_method,
            delivery_charge_paid_by_customer=delivery_charge_paid_by_customer,
            return_charge_amount=return_charge_amount,
            notes=notes,
            status='completed',
            processed_date=timezone.now()
        )

        # If delivery_charge_paid_by_customer is False and return_charge_amount > 0: automatically create Expense
        if not delivery_charge_paid_by_customer and return_charge_amount > Decimal("0.00"):
            from apps.expenses.models import Expense, ExpenseCategory
            category, _ = ExpenseCategory.objects.get_or_create(
                name="Courier Return Charges",
                defaults={
                    "color": "#EF4444",
                    "description": "Courier return charges borne by store for returned orders"
                }
            )
            Expense.objects.create(
                description=f"Return Courier Charge for Return #{return_order.return_number} (Invoice {sale.invoice_number})",
                amount=return_charge_amount,
                date=timezone.now().date(),
                category=category,
                payment_method="OTHER",
                status="PAID",
                reference_number=f"RET-{return_order.return_number}",
                notes=f"Store return #{return_order.return_number} for sale #{sale.invoice_number} returned without customer paying return delivery fee. Notes: {notes}"
            )

        # Create ReturnItems and restore stock
        for v_item in validated_items:
            sale_item = v_item['sale_item']
            qty = v_item['quantity']
            reason = v_item['reason']

            ReturnItem.objects.create(
                return_order=return_order,
                sale_item=sale_item,
                quantity=qty,
                reason=reason
            )

            # Restore inventory stock to variation and product
            variation = sale_item.get_variation()
            if variation:
                variation.stock += qty
                variation.save()
                sale_item.product.save()  # Recalculates total product stock from all variations
                StockMovement.objects.create(
                    product=sale_item.product,
                    variation=variation,
                    movement_type='IN',
                    quantity=qty,
                    reference_number=return_order.return_number,
                    notes=f"Store return {return_order.return_number} for sale {sale.invoice_number}"
                )
            else:
                sale_item.product.stock_quantity += qty
                sale_item.product.save()
                StockMovement.objects.create(
                    product=sale_item.product,
                    variation=None,
                    movement_type='IN',
                    quantity=qty,
                    reference_number=return_order.return_number,
                    notes=f"Store return {return_order.return_number} for sale {sale.invoice_number}"
                )

        # Check if sale is now fully refunded
        all_returned = True
        for si in sale.items.all():
            total_ret = ReturnItem.objects.filter(
                sale_item=si,
                return_order__status__in=['completed', 'approved']
            ).aggregate(total=Sum('quantity'))['total'] or 0
            if total_ret < si.quantity:
                all_returned = False
                break

        if all_returned:
            sale.status = 'refunded'
            sale.save(update_fields=['status', 'updated_at'])

        return Response(ReturnSerializer(return_order).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        return_order = self.get_object()
        if return_order.status != 'pending':
            return Response(
                {'error': 'Only pending returns can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return_order.status = 'approved'
        return_order.processed_by = request.user
        return_order.processed_date = timezone.now()
        return_order.save()
        
        return Response(self.get_serializer(return_order).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return_order = self.get_object()
        if return_order.status != 'pending':
            return Response(
                {'error': 'Only pending returns can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return_order.status = 'rejected'
        return_order.processed_by = request.user
        return_order.processed_date = timezone.now()
        return_order.save()
        
        return Response(self.get_serializer(return_order).data)

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        return_order = self.get_object()
        serializer = ReturnItemSerializer(data=request.data)
        
        if serializer.is_valid():
            item = serializer.save(return_order=return_order)
            return Response(ReturnItemSerializer(item).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SalePaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing individual sale payments"""
    queryset = SalePayment.objects.all()
    serializer_class = SalePaymentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['transaction_id', 'sale__invoice_number', 'notes']
    ordering_fields = ['payment_date', 'amount', 'status']
    ordering = ['-payment_date']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by sale
        sale_id = self.request.query_params.get('sale_id')
        if sale_id:
            queryset = queryset.filter(sale_id=sale_id)
        
        # Filter by payment method
        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter gift payments only
        gift_only = self.request.query_params.get('gift_only')
        if gift_only and gift_only.lower() == 'true':
            queryset = queryset.filter(is_gift_payment=True)
        
        return queryset

class DuePaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing due payments"""
    queryset = DuePayment.objects.all()
    serializer_class = DuePaymentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['sale__invoice_number', 'notes']
    ordering_fields = ['due_date', 'amount_due', 'status']
    ordering = ['due_date']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter overdue
        overdue = self.request.query_params.get('overdue')
        if overdue and overdue.lower() == 'true':
            queryset = queryset.filter(
                due_date__lt=timezone.now().date(),
                status='pending'
            )
        
        # Filter by customer
        customer_phone = self.request.query_params.get('customer_phone')
        if customer_phone:
            queryset = queryset.filter(sale__customer_phone=customer_phone)
        
        return queryset

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def make_payment(self, request, pk=None):
        """Make a payment towards a due amount"""
        due_payment = self.get_object()
        
        if due_payment.status == 'completed':
            return Response(
                {'error': 'This due payment is already completed'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = DuePaymentCompletionSerializer(data=request.data)
        if serializer.is_valid():
            amount = serializer.validated_data['amount']
            payment_method = serializer.validated_data['payment_method']
            notes = serializer.validated_data.get('notes', '')
            transaction_id = serializer.validated_data.get('transaction_id', '')
            
            if amount > due_payment.remaining_amount:
                return Response(
                    {'error': f'Payment amount ({amount}) exceeds remaining due amount ({due_payment.remaining_amount})'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                # Add payment to due amount
                payment = due_payment.add_payment(
                    amount=amount,
                    payment_method=payment_method,
                    notes=notes
                )
                payment.transaction_id = transaction_id
                payment.save()
                
                return Response({
                    'message': 'Payment added successfully',
                    'payment': SalePaymentSerializer(payment).data,
                    'due_payment': DuePaymentSerializer(due_payment).data,
                    'sale': SaleSerializer(due_payment.sale).data
                })
            
            except ValueError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of all due payments"""
        today = timezone.now().date()
        
        summary = {
            'total_due': DuePayment.objects.filter(status='pending').aggregate(
                total=Sum('amount_due') - Sum('amount_paid')
            )['total'] or Decimal('0.00'),
            'overdue_amount': DuePayment.objects.filter(
                status='pending',
                due_date__lt=today
            ).aggregate(
                total=Sum('amount_due') - Sum('amount_paid')
            )['total'] or Decimal('0.00'),
            'due_this_week': DuePayment.objects.filter(
                status='pending',
                due_date__range=[today, today + timedelta(days=7)]
            ).aggregate(
                total=Sum('amount_due') - Sum('amount_paid')
            )['total'] or Decimal('0.00'),
            'pending_count': DuePayment.objects.filter(status='pending').count(),
            'overdue_count': DuePayment.objects.filter(
                status='pending',
                due_date__lt=today
            ).count()
        }
        
        return Response(summary) 