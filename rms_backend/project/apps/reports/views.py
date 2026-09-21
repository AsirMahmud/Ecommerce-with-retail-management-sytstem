import csv
import logging
from datetime import timedelta, datetime, time
from decimal import Decimal
from zoneinfo import ZoneInfo
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, F, Q, DecimalField, Max, OuterRef, Subquery, Case, When, Value, CharField, DateField
from django.db.models.functions import Coalesce, Cast, TruncDate
from django.utils import timezone

from .models import Report, ReportMetric, ReportDataPoint, SavedReport
from .serializers import (
    ReportSerializer, SavedReportSerializer,
    SalesReportSerializer, ExpenseReportSerializer,
    InventoryReportSerializer, CustomerReportSerializer,
    CategoryReportSerializer, ProfitLossReportSerializer,
    ProductPerformanceReportSerializer,
    TaxReportSerializer, ReturnsReportSerializer,
    DuesAgingReportSerializer, CashReconciliationReportSerializer
)
from apps.sales.models import Sale, SaleItem, Return, ReturnItem, SalePayment, DuePayment
from apps.expenses.models import Expense, ExpenseCategory
from apps.inventory.models import Product, Category, StockMovement
from apps.customer.models import Customer
from apps.preorder.models import Preorder, PreorderProduct
from apps.online_preorder.models import OnlinePreorder
from apps.authentication.permissions import IsAccountantOrAbove

logger = logging.getLogger(__name__)

BUSINESS_TIMEZONE = ZoneInfo('Asia/Dhaka')

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all()
    serializer_class = ReportSerializer
    permission_classes = [IsAccountantOrAbove]

    def _get_date_range(self, request):
        date_from_str = request.query_params.get('date_from')
        date_to_str = request.query_params.get('date_to')

        if not date_from_str or not date_to_str:
            return None, None, Response({"error": "date_from and date_to parameters are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            s_date = datetime.strptime(date_from_str, '%Y-%m-%d').date()
            e_date = datetime.strptime(date_to_str, '%Y-%m-%d').date()
            date_from = datetime.combine(s_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
            date_to = datetime.combine(e_date, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        except ValueError:
            return None, None, Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        return date_from, date_to, None

    @action(detail=False, methods=['get'])
    def overview(self, request):
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error

        # Sales data
        sales = Sale.objects.filter(date__range=[date_from, date_to], status='completed')
        gross_sales = sales.aggregate(total=Sum('subtotal'))['total'] or Decimal('0.00')
        order_discounts = sales.aggregate(total=Sum('discount'))['total'] or Decimal('0.00')
        item_discounts = SaleItem.objects.filter(sale__in=sales).aggregate(total=Sum('discount'))['total'] or Decimal('0.00')
        total_discounts = order_discounts + item_discounts
        total_tax = sales.aggregate(total=Sum('tax'))['total'] or Decimal('0.00')
        total_sales = sales.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        total_orders = sales.count()

        # Returns & refunds
        returns_qs = Return.objects.filter(created_at__range=[date_from, date_to], status__in=['completed', 'approved'])
        total_refunds = returns_qs.aggregate(total=Sum('refund_amount'))['total'] or Decimal('0.00')
        net_sales = max(Decimal('0.00'), total_sales - total_refunds)
        
        # Expense data (Approved + Paid)
        expenses = Expense.objects.filter(
            date__range=[date_from.date(), date_to.date()],
            status__in=['APPROVED', 'PAID']
        )
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # COGS & Profit
        cogs = SaleItem.objects.filter(sale__in=sales).aggregate(
            total=Sum(F('quantity') * F('product__cost_price'))
        )['total'] or Decimal('0.00')

        gross_profit = sales.aggregate(total=Sum('total_profit'))['total'] or Decimal('0.00')
        if total_refunds > 0 and total_sales > 0:
            refund_ratio = min(Decimal('1.0'), total_refunds / total_sales)
            gross_profit = max(Decimal('0.00'), gross_profit * (Decimal('1.0') - refund_ratio))

        net_profit = gross_profit - total_expenses
        profit_margin = (net_profit / net_sales * 100) if net_sales > 0 else Decimal('0.00')

        # Preorder analysis
        preorders = Preorder.objects.filter(created_at__range=[date_from, date_to])
        preorder_status_breakdown = {}
        for status_choice in Preorder.STATUS_CHOICES:
            preorder_status_breakdown[status_choice[0]] = preorders.filter(status=status_choice[0]).count()
        completed_preorders = preorders.filter(status='COMPLETED')
        preorder_total_orders = completed_preorders.count()
        preorder_total_revenue = completed_preorders.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        preorder_profit = completed_preorders.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')

        # Data for charts
        sales_by_date = sales.values('date__date').annotate(date=F('date__date'), total=Sum('total')).order_by('date')
        expenses_by_date = expenses.values('date').annotate(total=Sum('amount')).order_by('date')

        data = {
            "total_sales": total_sales,
            "gross_sales": gross_sales,
            "total_discounts": total_discounts,
            "total_tax": total_tax,
            "total_refunds": total_refunds,
            "net_sales": net_sales,
            "cogs": cogs,
            "gross_profit": gross_profit,
            "total_orders": total_orders,
            "total_expenses": total_expenses,
            "net_profit": net_profit,
            "profit_margin": round(profit_margin, 2),
            "sales_by_date": list(sales_by_date),
            "expenses_by_date": list(expenses_by_date),
            # Preorder analytics
            "preorder_total_orders": preorder_total_orders,
            "preorder_total_revenue": preorder_total_revenue,
            "preorder_profit": preorder_profit,
            "preorder_status_breakdown": preorder_status_breakdown,
        }
        
        return Response(data)

    @action(detail=False, methods=['get'])
    def sales(self, request):
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error
        
        sales = Sale.objects.filter(
            date__range=[date_from, date_to],
            status='completed'
        )

        total_sales = sales.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        gross_sales = sales.aggregate(total=Sum('subtotal'))['total'] or Decimal('0.00')
        order_discounts = sales.aggregate(total=Sum('discount'))['total'] or Decimal('0.00')
        item_discounts = SaleItem.objects.filter(sale__in=sales).aggregate(total=Sum('discount'))['total'] or Decimal('0.00')
        total_discounts = order_discounts + item_discounts
        total_tax = sales.aggregate(total=Sum('tax'))['total'] or Decimal('0.00')

        returns_qs = Return.objects.filter(created_at__range=[date_from, date_to], status__in=['completed', 'approved'])
        total_refunds = returns_qs.aggregate(total=Sum('refund_amount'))['total'] or Decimal('0.00')
        net_sales = max(Decimal('0.00'), total_sales - total_refunds)

        total_orders = sales.count()
        total_items_sold = sales.aggregate(total_items=Sum('items__quantity'))['total_items'] or 0

        average_order_value = total_sales / total_orders if total_orders > 0 else Decimal('0.00')
        average_item_price = total_sales / total_items_sold if total_items_sold > 0 else Decimal('0.00')

        # Sales by date
        sales_by_date = sales.values('date__date').annotate(
            date=F('date__date'),
            total=Sum('total'),
            items_count=Sum('items__quantity')
        ).order_by('date__date')

        # Sales by category
        sales_by_category = SaleItem.objects.filter(
            sale__in=sales
        ).values(
            'product__category__name'
        ).annotate(
            category_name=F('product__category__name'),
            total=Sum('total'),
            items_count=Count('id'),
            quantity_sold=Sum('quantity')
        ).order_by('-total')

        # Sales by channel (Shop POS vs Online Preorder vs Offline Preorder)
        channel_names = {
            'shop': 'Shop POS',
            'online_preorder': 'Online Preorder',
            'offline_preorder': 'Offline Preorder'
        }
        sales_by_channel_qs = sales.values('sale_type').annotate(
            total=Sum('total'),
            orders=Count('id'),
            items=Sum('items__quantity')
        ).order_by('-total')
        sales_by_channel = [
            {
                'channel': channel_names.get(ch['sale_type'], ch['sale_type'] or 'Shop POS'),
                'raw_type': ch['sale_type'],
                'total': ch['total'] or Decimal('0.00'),
                'orders': ch['orders'],
                'items': ch['items'] or 0
            }
            for ch in sales_by_channel_qs
        ]

        # Top products
        top_products = SaleItem.objects.filter(
            sale__in=sales
        ).values(
            'product__name',
            'product__category__name'
        ).annotate(
            product_name=F('product__name'),
            category_name=F('product__category__name'),
            total_sales=Sum('total'),
            quantity_sold=Sum('quantity'),
            average_price=Avg('unit_price'),
            profit=Sum('profit')
        ).order_by('-total_sales')[:10]

        # Payment methods - Accurate tender breakdown from SalePayment
        completed_payments = SalePayment.objects.filter(
            sale__in=sales,
            status='completed'
        ).values('payment_method').annotate(
            total=Sum('amount'),
            orders_count=Count('sale', distinct=True)
        ).order_by('-total')

        payment_methods_dict = {
            p['payment_method'].lower(): {
                'payment_method': p['payment_method'].capitalize(),
                'total': p['total'],
                'orders_count': p['orders_count'],
                'items_count': 0
            }
            for p in completed_payments
        }

        # Fallback for sales without SalePayment records
        sales_without_payments = sales.filter(sale_payments__isnull=True)
        if sales_without_payments.exists():
            legacy_methods = sales_without_payments.values('payment_method').annotate(
                total=Sum('total'),
                orders_count=Count('id')
            )
            for lm in legacy_methods:
                pm_key = (lm['payment_method'] or 'cash').lower()
                if pm_key in payment_methods_dict:
                    payment_methods_dict[pm_key]['total'] += lm['total'] or Decimal('0.00')
                    payment_methods_dict[pm_key]['orders_count'] += lm['orders_count']
                else:
                    payment_methods_dict[pm_key] = {
                        'payment_method': pm_key.capitalize(),
                        'total': lm['total'] or Decimal('0.00'),
                        'orders_count': lm['orders_count'],
                        'items_count': 0
                    }

        payment_methods_list = sorted(list(payment_methods_dict.values()), key=lambda x: x['total'], reverse=True)

        data = {
            'total_sales': total_sales,
            'gross_sales': gross_sales,
            'total_discounts': total_discounts,
            'total_tax': total_tax,
            'total_refunds': total_refunds,
            'net_sales': net_sales,
            'total_orders': total_orders,
            'total_items_sold': total_items_sold,
            'average_order_value': average_order_value,
            'average_item_price': average_item_price,
            'sales_by_date': list(sales_by_date),
            'sales_by_category': list(sales_by_category),
            'sales_by_channel': sales_by_channel,
            'top_products': list(top_products),
            'payment_methods': payment_methods_list
        }

        serializer = SalesReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expenses(self, request):
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error

        status_param = request.query_params.get('status')
        if status_param:
            expenses = Expense.objects.filter(
                date__range=[date_from.date(), date_to.date()],
                status=status_param
            )
        else:
            expenses = Expense.objects.filter(
                date__range=[date_from.date(), date_to.date()],
                status__in=['APPROVED', 'PAID']
            )

        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Expenses by category
        expenses_by_category = expenses.values(
            'category__name'
        ).annotate(
            category_name=F('category__name'),
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')

        # Expenses by date
        expenses_by_date = expenses.annotate(
            expense_date=Cast('date', DateField())
        ).values('expense_date').annotate(
            amount=Sum('amount'),
            count=Count('id')
        ).order_by('expense_date')

        # Simplified expenses over time for charting
        expenses_over_time = [
            {'date': e['expense_date'], 'amount': e['amount']} for e in expenses_by_date
        ]

        data = {
            'total_expenses': total_expenses,
            'expenses_by_category': list(expenses_by_category),
            'expenses_by_date': list(expenses_by_date),
            'expenses_over_time': expenses_over_time,
        }

        serializer = ExpenseReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def inventory(self, request):
        products = Product.objects.filter(is_active=True)
        total_products = products.count()
        
        # Retail Valuation & Cost Valuation
        total_retail_value = products.aggregate(
            total=Sum(F('stock_quantity') * F('selling_price'))
        )['total'] or Decimal('0.00')

        total_cost_value = products.aggregate(
            total=Sum(F('stock_quantity') * F('cost_price'))
        )['total'] or Decimal('0.00')

        potential_profit = total_retail_value - total_cost_value
        unrealized_margin = (potential_profit / total_retail_value * 100) if total_retail_value > 0 else Decimal('0.00')

        # Out of stock and Low stock items
        out_of_stock_count = products.filter(stock_quantity=0).count()
        low_stock_items = products.filter(
            stock_quantity__gt=0,
            stock_quantity__lte=F('minimum_stock')
        ).values(
            'name', 'stock_quantity', 'minimum_stock', 'selling_price'
        ).annotate(
            stock=F('stock_quantity'),
            reorder_level=F('minimum_stock'),
            price=F('selling_price')
        ).order_by('stock_quantity')

        # Dead stock analysis: Products with stock > 0 and no sales in the last 60 days
        sixty_days_ago = timezone.now() - timedelta(days=60)
        recent_sold_product_ids = SaleItem.objects.filter(
            sale__date__gte=sixty_days_ago,
            sale__status='completed'
        ).values_list('product_id', flat=True).distinct()

        dead_stock_products = products.filter(
            stock_quantity__gt=0
        ).exclude(id__in=recent_sold_product_ids)

        dead_stock_count = dead_stock_products.count()
        dead_stock_value = dead_stock_products.aggregate(
            total=Sum(F('stock_quantity') * F('cost_price'))
        )['total'] or Decimal('0.00')

        # Stock by category
        stock_by_category = products.values(
            'category__name'
        ).annotate(
            category_name=F('category__name'),
            total_products=Count('id'),
            total_stock=Sum('stock_quantity'),
            total_value=Sum(F('stock_quantity') * F('selling_price'))
        ).order_by('-total_value')

        # Stock movements
        stock_movements = StockMovement.objects.values(
            'created_at__date', 'movement_type'
        ).annotate(
            date=F('created_at__date'),
            total_quantity=Sum('quantity'),
            total_value=Sum(F('quantity') * F('product__cost_price'))
        ).order_by('-created_at__date')[:30]

        data = {
            'total_products': total_products,
            'total_stock_value': total_retail_value,
            'total_cost_value': total_cost_value,
            'total_retail_value': total_retail_value,
            'potential_profit': potential_profit,
            'unrealized_margin': round(unrealized_margin, 2),
            'out_of_stock_count': out_of_stock_count,
            'dead_stock_count': dead_stock_count,
            'dead_stock_value': dead_stock_value,
            'low_stock_items': list(low_stock_items),
            'stock_by_category': list(stock_by_category),
            'stock_movements': list(stock_movements)
        }

        serializer = InventoryReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def customers(self, request):
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error

        customers = Customer.objects.all()
        total_customers = customers.count()
        new_customers = customers.filter(
            created_at__range=[date_from, date_to]
        ).count()

        # All sales in date range
        all_sales = Sale.objects.filter(date__range=[date_from, date_to])
        total_orders_count = all_sales.count()
        completed_sales = all_sales.filter(status='completed')
        completed_orders_count = completed_sales.count()
        cancelled_sales = all_sales.filter(status='cancelled')
        cancelled_orders_count = cancelled_sales.count()
        overall_cancellation_rate = (Decimal(cancelled_orders_count) / Decimal(total_orders_count) * 100) if total_orders_count > 0 else Decimal('0.00')

        # Calculate total sales and average customer value from completed sales
        total_sales = completed_sales.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        active_customers_count = completed_sales.values('customer').distinct().count()
        average_customer_value = total_sales / active_customers_count if active_customers_count > 0 else Decimal('0.00')

        # Top customers with completed and cancelled orders tracking
        top_customers_qs = all_sales.filter(customer__isnull=False).values('customer_id').annotate(
            first_name=Coalesce(F('customer__first_name'), Value('')),
            last_name=Coalesce(F('customer__last_name'), Value('')),
            phone=Coalesce(F('customer__phone'), Value('')),
            total_orders=Count('id'),
            completed_orders=Count('id', filter=Q(status='completed')),
            cancelled_orders=Count('id', filter=Q(status='cancelled')),
            total_sales=Coalesce(Sum('total', filter=Q(status='completed')), Decimal('0.00')),
            items_purchased=Coalesce(Sum('items__quantity', filter=Q(status='completed')), 0),
            unique_products=Count('items__product', distinct=True, filter=Q(status='completed')),
            last_purchase_date=Cast(Max('date', filter=Q(status='completed')), DateField())
        ).order_by('-total_sales', '-total_orders')[:25]

        top_customers_list = []
        for cust in top_customers_qs:
            tot = cust['total_orders'] or 0
            canc = cust['cancelled_orders'] or 0
            canc_rate = (Decimal(canc) / Decimal(tot) * 100) if tot > 0 else Decimal('0.00')
            top_customers_list.append({
                'first_name': cust['first_name'] or '',
                'last_name': cust['last_name'] or '',
                'phone': cust['phone'] or '',
                'total_orders': tot,
                'completed_orders': cust['completed_orders'] or 0,
                'cancelled_orders': canc,
                'cancellation_rate': round(canc_rate, 2),
                'total_sales': cust['total_sales'] or Decimal('0.00'),
                'items_purchased': cust['items_purchased'] or 0,
                'unique_products': cust['unique_products'] or 0,
                'last_purchase_date': cust['last_purchase_date']
            })

        # Customer acquisition
        customer_acquisition = Customer.objects.filter(
            created_at__range=[date_from, date_to]
        ).annotate(date=TruncDate('created_at')).values('date').annotate(
            new_customers=Count('id')
        ).order_by('date')

        data = {
            'total_customers': total_customers,
            'new_customers': new_customers,
            'total_sales': total_sales,
            'average_customer_value': average_customer_value,
            'total_orders': total_orders_count,
            'completed_orders': completed_orders_count,
            'cancelled_orders': cancelled_orders_count,
            'cancellation_rate': round(overall_cancellation_rate, 2),
            'top_customers': top_customers_list,
            'customer_acquisition': list(customer_acquisition)
        }

        serializer = CustomerReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def categories(self, request):
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error

        categories = Category.objects.all()
        total_categories = categories.count()
        total_products = Product.objects.count()

        # Sales by category
        sales_by_category = SaleItem.objects.filter(
            sale__date__range=[date_from, date_to]
        ).values('product__category__name').annotate(
            category_name=F('product__category__name'),
            total_sales=Sum('total'),
            items_sold=Sum('quantity'),
            unique_products=Count('product', distinct=True)
        ).order_by('-total_sales')

        # Stock by category
        stock_by_category = Product.objects.values(
            'category__name'
        ).annotate(
            category_name=F('category__name'),
            total_products=Count('id'),
            total_stock=Sum('stock_quantity'),
            total_value=Sum(F('stock_quantity') * F('selling_price'))
        ).order_by('-total_value')

        # Top categories by sales
        top_categories = Category.objects.annotate(
            total_sales=Coalesce(Sum(
                'products__saleitem__total',
                filter=Q(products__saleitem__sale__date__range=[date_from, date_to])
            ), Decimal('0.00')),
            items_sold=Coalesce(Sum(
                'products__saleitem__quantity',
                filter=Q(products__saleitem__sale__date__range=[date_from, date_to])
            ), 0),
            product_count=Count('products', distinct=True)
        ).annotate(
            average_price=Case(
                When(items_sold__gt=0, then=F('total_sales') / F('items_sold')),
                default=Decimal('0.0'),
                output_field=DecimalField()
            )
        ).order_by('-total_sales')[:10]

        data = {
            'total_categories': total_categories,
            'total_products': total_products,
            'sales_by_category': list(sales_by_category),
            'stock_by_category': list(stock_by_category),
            'top_categories': top_categories.values(
                'name', 'total_sales', 'items_sold', 'product_count', 'average_price'
            )
        }
        serializer = CategoryReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='profit-loss')
    def profit_loss(self, request):
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error

        # Sales and profit
        sales = Sale.objects.filter(
            date__range=[date_from, date_to],
            status='completed'
        )
        gross_revenue = sales.aggregate(total=Sum('subtotal'))['total'] or Decimal('0.00')
        order_discounts = sales.aggregate(total=Sum('discount'))['total'] or Decimal('0.00')
        item_discounts = SaleItem.objects.filter(sale__in=sales).aggregate(total=Sum('discount'))['total'] or Decimal('0.00')
        total_discounts = order_discounts + item_discounts
        total_revenue = sales.aggregate(total=Sum('total'))['total'] or Decimal('0.00')

        # Returns & refunds
        returns_qs = Return.objects.filter(created_at__range=[date_from, date_to], status__in=['completed', 'approved'])
        total_refunds = returns_qs.aggregate(total=Sum('refund_amount'))['total'] or Decimal('0.00')
        net_revenue = max(Decimal('0.00'), total_revenue - total_refunds)

        # COGS calculation (Unit Cost * Quantity)
        cogs = SaleItem.objects.filter(sale__in=sales).aggregate(
            total=Sum(F('quantity') * F('product__cost_price'))
        )['total'] or Decimal('0.00')

        gross_profit = sales.aggregate(total=Sum('total_profit'))['total'] or Decimal('0.00')
        if total_refunds > 0 and total_revenue > 0:
            refund_ratio = min(Decimal('1.0'), total_refunds / total_revenue)
            gross_profit = max(Decimal('0.00'), gross_profit * (Decimal('1.0') - refund_ratio))

        gross_margin = (gross_profit / net_revenue * 100) if net_revenue > 0 else Decimal('0.00')

        # Expenses (Approved and Paid)
        expenses = Expense.objects.filter(
            date__range=[date_from.date(), date_to.date()],
            status__in=['APPROVED', 'PAID']
        )
        total_expenses = expenses.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        net_profit = gross_profit - total_expenses
        profit_margin = (net_profit / net_revenue * 100) if net_revenue > 0 else Decimal('0.00')

        # Preorder analysis
        preorders = Preorder.objects.filter(created_at__range=[date_from, date_to])
        preorder_status_breakdown = {}
        for status_choice in Preorder.STATUS_CHOICES:
            preorder_status_breakdown[status_choice[0]] = preorders.filter(status=status_choice[0]).count()
        # Only count revenue and profit for COMPLETED preorders
        completed_preorders = preorders.filter(status='COMPLETED')
        preorder_total_orders = completed_preorders.count()
        preorder_total_revenue = completed_preorders.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        preorder_profit = completed_preorders.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')

        # Revenue by date
        revenue_by_date = sales.annotate(
            sale_date=Cast('date', DateField())
        ).values('sale_date').annotate(
            revenue=Sum('total'),
            items_sold=Sum('items__quantity')
        ).order_by('sale_date')

        # Expenses by date
        expenses_by_date = expenses.annotate(
            expense_date=Cast('date', DateField())
        ).values('expense_date').annotate(
            amount=Sum('amount'),
            count=Count('id')
        ).order_by('expense_date')

        # Simplified expenses over time for charting
        expenses_over_time = [
            {'date': str(e['expense_date']), 'amount': e['amount']} for e in expenses_by_date
        ]

        # Combine revenue and expenses by date for charting
        revenue_map = {str(r['sale_date']): r['revenue'] for r in revenue_by_date}
        expense_map = {str(e['expense_date']): e['amount'] for e in expenses_by_date}
        all_dates = set(revenue_map.keys()) | set(expense_map.keys())
        revenue_vs_expense_by_date = []
        for d in sorted(all_dates):
            revenue_vs_expense_by_date.append({
                'date': d,
                'revenue': revenue_map.get(d, Decimal('0.00')),
                'expense': expense_map.get(d, Decimal('0.00'))
            })

        # Profit by category - FIXED: multiply cost_price by quantity
        profit_by_category = SaleItem.objects.filter(
            sale__in=sales
        ).values('product__category__name').annotate(
            category_name=F('product__category__name'),
            revenue=Sum('total'),
            cost=Sum(F('quantity') * F('product__cost_price')),
            profit=Sum('profit'),
            items_sold=Sum('quantity')
        ).order_by('-profit')

        data = {
            'total_revenue': total_revenue,
            'gross_revenue': gross_revenue,
            'total_discounts': total_discounts,
            'total_refunds': total_refunds,
            'net_revenue': net_revenue,
            'cogs': cogs,
            'gross_profit': gross_profit,
            'gross_margin': round(gross_margin, 2),
            'total_expenses': total_expenses,
            'net_profit': net_profit,
            'profit_margin': round(profit_margin, 2),
            'revenue_by_date': list(revenue_by_date),
            'expenses_by_date': list(expenses_by_date),
            'expenses_over_time': expenses_over_time,
            'revenue_vs_expense_by_date': revenue_vs_expense_by_date,
            'profit_by_category': list(profit_by_category),
            # Preorder analytics
            'preorder_total_orders': preorder_total_orders,
            'preorder_total_revenue': preorder_total_revenue,
            'preorder_profit': preorder_profit,
            'preorder_status_breakdown': preorder_status_breakdown,
        }
        serializer = ProfitLossReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='product-performance')
    def product_performance(self, request):
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error

        sales_items = SaleItem.objects.filter(sale__date__range=[date_from, date_to], sale__status='completed')
        
        products = Product.objects.all()
        total_products = products.count()
        total_sales = sales_items.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
        total_profit = sales_items.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')
        average_profit_margin = (total_profit / total_sales * 100) if total_sales > 0 else Decimal('0.00')
        
        # Calculate average profit and average selling price with discount
        total_quantity_sold = sales_items.aggregate(total=Sum('quantity'))['total'] or 0
        total_discounts = sales_items.aggregate(total=Sum('discount'))['total'] or Decimal('0.00')
        
        average_profit = (total_profit / total_quantity_sold) if total_quantity_sold > 0 else Decimal('0.00')
        average_selling_price_with_discount = (total_sales / total_quantity_sold) if total_quantity_sold > 0 else Decimal('0.00')

        # Top performing products
        top_performing_products = sales_items.values(
            'product__id', 'product__name', 'product__category__name'
        ).annotate(
            product_id=F('product__id'),
            product_name=F('product__name'),
            category_name=F('product__category__name'),
            total_sales=Sum('total'),
            quantity_sold=Sum('quantity'),
            total_profit=Sum('profit'),
            total_discount=Sum('discount'),
            average_price=Avg('unit_price')
        ).annotate(
            profit_margin=Case(
                When(total_sales__gt=0, then=(F('total_profit') / F('total_sales')) * 100),
                default=Decimal('0.0'),
                output_field=DecimalField()
            ),
            average_profit=Case(
                When(quantity_sold__gt=0, then=F('total_profit') / F('quantity_sold')),
                default=Decimal('0.0'),
                output_field=DecimalField()
            ),
            average_selling_price_with_discount=Case(
                When(quantity_sold__gt=0, then=F('total_sales') / F('quantity_sold')),
                default=Decimal('0.0'),
                output_field=DecimalField()
            )
        ).order_by('-total_profit')[:10]

        # Low performing products
        low_performing_products = sales_items.values(
            'product__id', 'product__name', 'product__category__name'
        ).annotate(
            product_id=F('product__id'),
            product_name=F('product__name'),
            category_name=F('product__category__name'),
            total_sales=Sum('total'),
            quantity_sold=Sum('quantity'),
            total_profit=Sum('profit'),
            total_discount=Sum('discount'),
            average_price=Avg('unit_price')
        ).annotate(
            profit_margin=Case(
                When(total_sales__gt=0, then=(F('total_profit') / F('total_sales')) * 100),
                default=Decimal('0.0'),
                output_field=DecimalField()
            ),
            average_profit=Case(
                When(quantity_sold__gt=0, then=F('total_profit') / F('quantity_sold')),
                default=Decimal('0.0'),
                output_field=DecimalField()
            ),
            average_selling_price_with_discount=Case(
                When(quantity_sold__gt=0, then=F('total_sales') / F('quantity_sold')),
                default=Decimal('0.0'),
                output_field=DecimalField()
            )
        ).order_by('total_profit')[:10]

        # Sales by product
        sales_by_product = sales_items.values('product__id', 'product__name').annotate(
            product_id=F('product__id'),
            product_name=F('product__name'),
            total_sales=Sum('total'),
            quantity_sold=Sum('quantity'),
            total_discount=Sum('discount'),
            average_price=Avg('unit_price')
        ).annotate(
            average_selling_price_with_discount=Case(
                When(quantity_sold__gt=0, then=F('total_sales') / F('quantity_sold')),
                default=Decimal('0.0'),
                output_field=DecimalField()
            )
        ).order_by('-total_sales')

        # Profit by product
        profit_by_product = sales_items.values('product__id', 'product__name').annotate(
            product_id=F('product__id'),
            product_name=F('product__name'),
            total_sales=Sum('total'),
            total_profit=Sum('profit'),
            quantity_sold=Sum('quantity')
        ).annotate(
            profit_margin=Case(
                When(total_sales__gt=0, then=(F('total_profit') / F('total_sales')) * 100),
                default=Decimal('0.0'),
                output_field=DecimalField()
            ),
            average_profit=Case(
                When(quantity_sold__gt=0, then=F('total_profit') / F('quantity_sold')),
                default=Decimal('0.0'),
                output_field=DecimalField()
            )
        ).order_by('-total_profit')
        
        data = {
            'total_products': total_products,
            'total_sales': total_sales,
            'total_profit': total_profit,
            'average_profit_margin': average_profit_margin,
            'average_profit': average_profit,
            'average_selling_price_with_discount': average_selling_price_with_discount,
            'top_performing_products': list(top_performing_products),
            'low_performing_products': list(low_performing_products),
            'sales_by_product': list(sales_by_product),
            'profit_by_product': list(profit_by_product)
        }
        serializer = ProductPerformanceReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='online-preorder-analytics')
    def online_preorder_analytics(self, request):
        """Get analytics for online preorders including top products and categories"""
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error

        # Get online preorders in date range
        online_preorders = OnlinePreorder.objects.filter(created_at__range=[date_from, date_to])
        
        # Total stats
        total_orders = online_preorders.count()
        completed_orders = online_preorders.filter(status='COMPLETED')
        total_sales_count = completed_orders.count()
        total_revenue = completed_orders.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        total_profit = completed_orders.aggregate(total=Sum('profit'))['total'] or Decimal('0.00')
        average_order_value = total_revenue / total_sales_count if total_sales_count > 0 else Decimal('0.00')

        # Get sales from Sale model with sale_type='online_preorder' for more accurate analytics
        online_sales = Sale.objects.filter(
            date__range=[date_from, date_to],
            status='completed',
            sale_type='online_preorder'
        )
        
        # Top products from online preorder sales
        top_products_qs = SaleItem.objects.filter(
            sale__in=online_sales
        ).values(
            'product__id',
            'product__name',
            'product__category__name'
        ).annotate(
            product_id=F('product__id'),
            product_name=F('product__name'),
            category_name=F('product__category__name'),
            total_sales=Sum('total'),
            quantity_sold=Sum('quantity'),
            total_profit=Sum('profit')
        ).order_by('-total_sales')[:10]

        # Top categories from online preorder sales
        top_categories_qs = SaleItem.objects.filter(
            sale__in=online_sales
        ).values(
            'product__category__name'
        ).annotate(
            category_name=F('product__category__name'),
            total_sales=Sum('total'),
            quantity_sold=Sum('quantity'),
            total_profit=Sum('profit'),
            order_count=Count('sale', distinct=True)
        ).order_by('-total_sales')[:10]

        # Sales by date - convert dates to strings
        sales_by_date = online_sales.annotate(
            sale_date=Cast('date', DateField())
        ).values('sale_date').annotate(
            total=Sum('total'),
            orders_count=Count('id')
        ).order_by('sale_date')
        
        # Convert dates to strings for JSON serialization
        sales_by_date_list = []
        for item in sales_by_date:
            date_str = str(item['sale_date']) if item['sale_date'] else None
            sales_by_date_list.append({
                'date': date_str,
                'total': str(item['total']),
                'orders_count': item['orders_count']
            })

        # Convert QuerySets to lists first
        top_products_list = list(top_products_qs)
        top_categories_list = list(top_categories_qs)
        
        # If no sales exist, try to get data from OnlinePreorder items directly
        if len(top_products_list) == 0 and completed_orders.exists():
            # Extract product data from OnlinePreorder items JSON
            from collections import defaultdict
            product_stats = defaultdict(lambda: {'quantity': 0, 'total': Decimal('0.00'), 'profit': Decimal('0.00'), 'name': '', 'category': ''})
            
            for order in completed_orders:
                if order.items:
                    for item in order.items:
                        product_id = item.get('product_id')
                        if product_id:
                            try:
                                product = Product.objects.get(id=product_id)
                                qty = int(item.get('quantity', 0))
                                unit_price = Decimal(str(item.get('unit_price', 0)))
                                discount = Decimal(str(item.get('discount', 0) or 0))
                                total = (unit_price * qty) - discount
                                cost = Decimal(str(product.cost_price)) * qty
                                profit = total - cost
                                
                                product_stats[product_id]['quantity'] += qty
                                product_stats[product_id]['total'] += total
                                product_stats[product_id]['profit'] += profit
                                product_stats[product_id]['name'] = product.name
                                product_stats[product_id]['category'] = product.category.name if product.category else 'Uncategorized'
                            except Product.DoesNotExist:
                                pass
            
            # Convert to list format
            top_products_list = []
            for product_id, stats in sorted(product_stats.items(), key=lambda x: x[1]['total'], reverse=True)[:10]:
                top_products_list.append({
                    'product_id': product_id,
                    'product_name': stats['name'],
                    'category_name': stats['category'],
                    'total_sales': str(stats['total']),
                    'quantity_sold': stats['quantity'],
                    'total_profit': str(stats['profit'])
                })
        
        # Get top categories from products if no sales
        if len(top_categories_list) == 0 and completed_orders.exists():
            from collections import defaultdict
            category_stats = defaultdict(lambda: {'quantity': 0, 'total': Decimal('0.00'), 'profit': Decimal('0.00'), 'orders': set()})
            
            for order in completed_orders:
                if order.items:
                    for item in order.items:
                        product_id = item.get('product_id')
                        if product_id:
                            try:
                                product = Product.objects.get(id=product_id)
                                category_name = product.category.name if product.category else 'Uncategorized'
                                qty = int(item.get('quantity', 0))
                                unit_price = Decimal(str(item.get('unit_price', 0)))
                                discount = Decimal(str(item.get('discount', 0) or 0))
                                total = (unit_price * qty) - discount
                                cost = Decimal(str(product.cost_price)) * qty
                                profit = total - cost
                                
                                category_stats[category_name]['quantity'] += qty
                                category_stats[category_name]['total'] += total
                                category_stats[category_name]['profit'] += profit
                                category_stats[category_name]['orders'].add(order.id)
                            except Product.DoesNotExist:
                                pass
            
            # Convert to list format
            top_categories_list = []
            for category_name, stats in sorted(category_stats.items(), key=lambda x: x[1]['total'], reverse=True)[:10]:
                top_categories_list.append({
                    'category_name': category_name,
                    'total_sales': str(stats['total']),
                    'quantity_sold': stats['quantity'],
                    'total_profit': str(stats['profit']),
                    'order_count': len(stats['orders'])
                })

        # Status breakdown
        status_breakdown = {}
        for status_choice in OnlinePreorder.STATUS_CHOICES:
            status_breakdown[status_choice[0]] = online_preorders.filter(status=status_choice[0]).count()

        cancelled_orders = online_preorders.filter(status='CANCELLED')
        cancelled_orders_count = cancelled_orders.count()
        cancellation_rate = (Decimal(cancelled_orders_count) / Decimal(total_orders) * 100) if total_orders > 0 else Decimal('0.00')
        
        cancel_reasons_qs = cancelled_orders.exclude(cancel_reason__isnull=True).exclude(cancel_reason='').values('cancel_reason').annotate(count=Count('id')).order_by('-count')[:10]
        cancel_reasons = [{'cancel_reason': item['cancel_reason'], 'count': item['count']} for item in cancel_reasons_qs]

        # Customer analysis for online preorders
        customer_analytics_qs = online_preorders.values('customer_phone').annotate(
            customer_name=Max('customer_name'),
            customer_email=Max('customer_email'),
            customer_address=Max('shipping_address'),
            total_orders=Count('id'),
            completed_orders=Count('id', filter=Q(status='COMPLETED')),
            cancelled_orders=Count('id', filter=Q(status='CANCELLED')),
            pending_orders=Count('id', filter=Q(status__in=['PENDING', 'CONFIRMED', 'DELIVERED'])),
            total_spent=Coalesce(Sum('total_amount', filter=Q(status='COMPLETED')), Decimal('0.00')),
            last_order_date=Cast(Max('created_at'), DateField()),
            last_order_id=Max('id')
        ).order_by('-total_orders', '-total_spent')[:100]

        top_customers_online = []
        for cust in customer_analytics_qs:
            tot = cust['total_orders'] or 0
            canc = cust['cancelled_orders'] or 0
            canc_rate = (Decimal(canc) / Decimal(tot) * 100) if tot > 0 else Decimal('0.00')
            top_customers_online.append({
                'customer_name': cust['customer_name'] or 'Unknown',
                'customer_phone': cust['customer_phone'] or '',
                'customer_email': cust['customer_email'] or '',
                'customer_address': cust['customer_address'] or '',
                'total_orders': tot,
                'completed_orders': cust['completed_orders'] or 0,
                'cancelled_orders': canc,
                'pending_orders': cust['pending_orders'] or 0,
                'cancellation_rate': round(canc_rate, 2),
                'total_spent': str(cust['total_spent'] or '0.00'),
                'last_order_date': str(cust['last_order_date']) if cust['last_order_date'] else None,
                'last_order_id': cust['last_order_id']
            })

        total_unique_customers = online_preorders.values('customer_phone').distinct().count()
        repeat_customers_count = online_preorders.values('customer_phone').annotate(c=Count('id')).filter(c__gt=1).count()
        repeat_rate = (Decimal(repeat_customers_count) / Decimal(total_unique_customers) * 100) if total_unique_customers > 0 else Decimal('0.00')

        # Convert QuerySets to lists and handle None values
        top_products_final = []
        for item in top_products_list:
            top_products_final.append({
                'product_id': item.get('product_id') or 0,
                'product_name': item.get('product_name') or 'Unknown',
                'category_name': item.get('category_name') or 'Uncategorized',
                'total_sales': str(item.get('total_sales', '0.00')),
                'quantity_sold': item.get('quantity_sold', 0),
                'total_profit': str(item.get('total_profit', '0.00'))
            })
        
        top_categories_final = []
        for item in top_categories_list:
            top_categories_final.append({
                'category_name': item.get('category_name') or 'Uncategorized',
                'total_sales': str(item.get('total_sales', '0.00')),
                'quantity_sold': item.get('quantity_sold', 0),
                'total_profit': str(item.get('total_profit', '0.00')),
                'order_count': item.get('order_count', 0)
            })

        data = {
            'total_orders': total_orders,
            'total_sales_count': total_sales_count,
            'cancelled_orders_count': cancelled_orders_count,
            'cancellation_rate': round(cancellation_rate, 2),
            'total_revenue': str(total_revenue),
            'total_profit': str(total_profit),
            'average_order_value': str(average_order_value),
            'top_products': top_products_final,
            'top_categories': top_categories_final,
            'sales_by_date': sales_by_date_list,
            'status_breakdown': status_breakdown,
            'cancel_reasons': cancel_reasons,
            'top_customers': top_customers_online,
            'customer_stats': {
                'total_unique_customers': total_unique_customers,
                'repeat_customers': repeat_customers_count,
                'repeat_rate': round(repeat_rate, 2),
                'cancelled_orders': cancelled_orders_count,
                'cancellation_rate': round(cancellation_rate, 2)
            }
        }

        return Response(data)

    @action(detail=False, methods=['get'])
    def tax(self, request):
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error

        sales = Sale.objects.filter(date__range=[date_from, date_to], status='completed')
        taxable_sales = sales.aggregate(total=Sum('subtotal'))['total'] or Decimal('0.00')
        total_tax_collected = sales.aggregate(total=Sum('tax'))['total'] or Decimal('0.00')

        # Tax refunded on returns
        returns_qs = Return.objects.filter(created_at__range=[date_from, date_to], status__in=['completed', 'approved'])
        tax_refunded = Decimal('0.00')
        for ret in returns_qs.select_related('sale'):
            if ret.sale and ret.sale.subtotal and ret.sale.subtotal > 0 and ret.sale.tax > 0:
                tax_rate = ret.sale.tax / ret.sale.subtotal
                tax_refunded += ret.refund_amount * tax_rate

        tax_refunded = round(tax_refunded, 2)
        net_tax_payable = max(Decimal('0.00'), total_tax_collected - tax_refunded)

        tax_by_date = sales.values('date__date').annotate(
            date=F('date__date'),
            taxable_amount=Sum('subtotal'),
            tax_collected=Sum('tax')
        ).order_by('date__date')

        data = {
            'taxable_sales': taxable_sales,
            'total_tax_collected': total_tax_collected,
            'tax_refunded': tax_refunded,
            'net_tax_payable': net_tax_payable,
            'tax_by_date': list(tax_by_date)
        }
        serializer = TaxReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def returns(self, request):
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error

        returns_qs = Return.objects.filter(created_at__range=[date_from, date_to])
        approved_returns = returns_qs.filter(status__in=['completed', 'approved'])

        total_returns_count = approved_returns.count()
        total_refund_amount = approved_returns.aggregate(total=Sum('refund_amount'))['total'] or Decimal('0.00')
        
        return_items = ReturnItem.objects.filter(return_order__in=approved_returns)
        total_items_returned = return_items.aggregate(total=Sum('quantity'))['total'] or 0

        # Return rate %
        sales = Sale.objects.filter(date__range=[date_from, date_to], status='completed')
        total_sales_count = sales.count()
        return_rate_percentage = (Decimal(total_returns_count) / Decimal(total_sales_count) * 100) if total_sales_count > 0 else Decimal('0.00')

        # Top returned products
        top_returned_products = return_items.values(
            'sale_item__product__id',
            'sale_item__product__name',
            'sale_item__product__category__name'
        ).annotate(
            product_id=F('sale_item__product__id'),
            product_name=F('sale_item__product__name'),
            category_name=F('sale_item__product__category__name'),
            returned_quantity=Sum('quantity'),
            returns_count=Count('id')
        ).order_by('-returned_quantity')[:10]

        # Reasons breakdown
        reasons_breakdown = returns_qs.values('reason').annotate(
            count=Count('id'),
            total_refund=Sum('refund_amount')
        ).order_by('-count')[:10]

        # Returns by date
        returns_by_date = approved_returns.annotate(
            return_date=Cast('created_at', DateField())
        ).values('return_date').annotate(
            date=F('return_date'),
            count=Count('id'),
            refund_amount=Sum('refund_amount')
        ).order_by('return_date')

        data = {
            'total_returns_count': total_returns_count,
            'total_items_returned': total_items_returned,
            'total_refund_amount': total_refund_amount,
            'return_rate_percentage': round(return_rate_percentage, 2),
            'top_returned_products': list(top_returned_products),
            'reasons_breakdown': list(reasons_breakdown),
            'returns_by_date': list(returns_by_date)
        }
        serializer = ReturnsReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='dues-aging')
    def dues_aging(self, request):
        now_local = datetime.now(BUSINESS_TIMEZONE).date()
        
        pending_dues = DuePayment.objects.filter(status='pending', amount_due__gt=F('amount_paid')).select_related('sale', 'sale__customer')
        
        current_due = Decimal('0.00')
        due_1_to_30_days = Decimal('0.00')
        due_31_to_60_days = Decimal('0.00')
        due_60_plus_days = Decimal('0.00')

        aging_customers_map = {}

        for due in pending_dues:
            remaining = due.remaining_amount
            days_overdue = (now_local - due.due_date).days if due.due_date else 0

            if days_overdue <= 0:
                current_due += remaining
                bucket = 'Current'
            elif days_overdue <= 30:
                due_1_to_30_days += remaining
                bucket = '1-30 Days'
            elif days_overdue <= 60:
                due_31_to_60_days += remaining
                bucket = '31-60 Days'
            else:
                due_60_plus_days += remaining
                bucket = '60+ Days'

            cust = due.sale.customer if due.sale else None
            cust_id = cust.id if cust else 0
            cust_name = f"{cust.first_name} {cust.last_name}".strip() if cust else (due.sale.customer_phone or 'Walk-in Customer')
            cust_phone = cust.phone if cust else (due.sale.customer_phone or '')

            if cust_id not in aging_customers_map:
                aging_customers_map[cust_id] = {
                    'customer_id': cust_id,
                    'customer_name': cust_name,
                    'customer_phone': cust_phone,
                    'total_due': Decimal('0.00'),
                    'current': Decimal('0.00'),
                    'days_1_30': Decimal('0.00'),
                    'days_31_60': Decimal('0.00'),
                    'days_60_plus': Decimal('0.00'),
                    'invoices_count': 0
                }

            aging_customers_map[cust_id]['total_due'] += remaining
            aging_customers_map[cust_id]['invoices_count'] += 1
            if bucket == 'Current':
                aging_customers_map[cust_id]['current'] += remaining
            elif bucket == '1-30 Days':
                aging_customers_map[cust_id]['days_1_30'] += remaining
            elif bucket == '31-60 Days':
                aging_customers_map[cust_id]['days_31_60'] += remaining
            else:
                aging_customers_map[cust_id]['days_60_plus'] += remaining

        # Untracked sales with amount_due > 0
        untracked_sales = Sale.objects.filter(amount_due__gt=0, due_payments__isnull=True).exclude(status='cancelled')
        for sale in untracked_sales:
            current_due += sale.amount_due

        total_receivable = current_due + due_1_to_30_days + due_31_to_60_days + due_60_plus_days
        aging_customers = sorted(list(aging_customers_map.values()), key=lambda x: x['total_due'], reverse=True)[:50]

        data = {
            'total_receivable': total_receivable,
            'current_due': current_due,
            'due_1_to_30_days': due_1_to_30_days,
            'due_31_to_60_days': due_31_to_60_days,
            'due_60_plus_days': due_60_plus_days,
            'aging_customers': aging_customers
        }
        serializer = DuesAgingReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def reconciliation(self, request):
        date_from, date_to, error = self._get_date_range(request)
        if error:
            return error

        # Cash sales
        sales = Sale.objects.filter(date__range=[date_from, date_to], status='completed')
        cash_from_payments = SalePayment.objects.filter(
            sale__in=sales,
            payment_method='cash',
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        legacy_cash_sales = sales.filter(
            sale_payments__isnull=True,
            payment_method='cash'
        ).aggregate(total=Sum('total'))['total'] or Decimal('0.00')

        cash_sales = cash_from_payments + legacy_cash_sales

        # Non-cash totals
        non_cash_payments = SalePayment.objects.filter(
            sale__in=sales,
            status='completed'
        ).exclude(payment_method='cash').values('payment_method').annotate(
            total=Sum('amount')
        )
        non_cash_totals = {item['payment_method']: str(item['total']) for item in non_cash_payments}

        # Due payments collected in cash during this period
        due_payments_collected = SalePayment.objects.filter(
            payment_date__range=[date_from, date_to],
            payment_method='cash',
            status='completed',
            sale__due_payments__isnull=False
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        # Cash refunds
        cash_refunds = Return.objects.filter(
            created_at__range=[date_from, date_to],
            status__in=['completed', 'approved']
        ).aggregate(total=Sum('refund_amount'))['total'] or Decimal('0.00')

        # Cash expenses
        cash_expenses = Expense.objects.filter(
            date__range=[date_from.date(), date_to.date()],
            payment_method='CASH',
            status__in=['APPROVED', 'PAID']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        net_cash_in_drawer = (cash_sales + due_payments_collected) - (cash_refunds + cash_expenses)

        data = {
            'cash_sales': cash_sales,
            'cash_refunds': cash_refunds,
            'cash_expenses': cash_expenses,
            'due_payments_collected': due_payments_collected,
            'net_cash_in_drawer': net_cash_in_drawer,
            'non_cash_totals': non_cash_totals
        }
        serializer = CashReconciliationReportSerializer(data)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def export(self, request):
        report_type = request.query_params.get('type', 'sales')
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="report_{report_type}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        writer = csv.writer(response)

        date_from, date_to, _ = self._get_date_range(request)

        if report_type == 'sales':
            writer.writerow(['Invoice Number', 'Date', 'Channel', 'Customer', 'Subtotal', 'Discount', 'Tax', 'Total', 'Profit', 'Payment Method', 'Status'])
            sales = Sale.objects.filter(date__range=[date_from, date_to]).select_related('customer') if date_from and date_to else Sale.objects.all()[:1000]
            for s in sales:
                cust_name = f"{s.customer.first_name} {s.customer.last_name}".strip() if s.customer else (s.customer_phone or 'N/A')
                writer.writerow([s.invoice_number, s.date.strftime('%Y-%m-%d %H:%M'), s.sale_type, cust_name, s.subtotal, s.discount, s.tax, s.total, s.total_profit, s.payment_method, s.status])

        elif report_type == 'inventory':
            writer.writerow(['Product Name', 'SKU', 'Category', 'Cost Price', 'Selling Price', 'Current Stock', 'Stock Value (Retail)', 'Stock Value (Cost)', 'Min Stock Level', 'Status'])
            for p in Product.objects.select_related('category').all():
                cat_name = p.category.name if p.category else 'Uncategorized'
                status_str = 'Out of Stock' if p.stock_quantity == 0 else ('Low Stock' if p.stock_quantity <= p.minimum_stock else 'In Stock')
                writer.writerow([p.name, p.sku, cat_name, p.cost_price, p.selling_price, p.stock_quantity, p.stock_quantity * p.selling_price, p.stock_quantity * p.cost_price, p.minimum_stock, status_str])

        elif report_type == 'expenses':
            writer.writerow(['Description', 'Category', 'Date', 'Amount', 'Payment Method', 'Status', 'Reference'])
            expenses = Expense.objects.filter(date__range=[date_from.date(), date_to.date()]).select_related('category') if date_from and date_to else Expense.objects.all()[:1000]
            for e in expenses:
                writer.writerow([e.description, e.category.name if e.category else '', e.date, e.amount, e.payment_method, e.status, e.reference_number])

        elif report_type == 'profit_loss':
            writer.writerow(['Metric', 'Amount (BDT)'])
            pl_resp = self.profit_loss(request)
            if hasattr(pl_resp, 'data'):
                d = pl_resp.data
                writer.writerow(['Gross Revenue', d.get('gross_revenue', '0.00')])
                writer.writerow(['Total Discounts', d.get('total_discounts', '0.00')])
                writer.writerow(['Total Refunds', d.get('total_refunds', '0.00')])
                writer.writerow(['Net Revenue', d.get('net_revenue', '0.00')])
                writer.writerow(['Cost of Goods Sold (COGS)', d.get('cogs', '0.00')])
                writer.writerow(['Gross Profit', d.get('gross_profit', '0.00')])
                writer.writerow(['Operating Expenses', d.get('total_expenses', '0.00')])
                writer.writerow(['Net Operating Profit', d.get('net_profit', '0.00')])
                writer.writerow(['Net Profit Margin (%)', f"{d.get('profit_margin', '0.00')}%"])

        return response

class SavedReportViewSet(viewsets.ModelViewSet):
    queryset = SavedReport.objects.all()
    serializer_class = SavedReportSerializer
    permission_classes = [IsAccountantOrAbove]

    def perform_create(self, serializer):
        report = Report.objects.get(id=serializer.validated_data['report_id'])
        report.is_saved = True
        report.save()
        serializer.save(report=report) 