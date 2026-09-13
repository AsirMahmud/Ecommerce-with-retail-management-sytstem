from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, F, Q, Max
from django.utils import timezone
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from decimal import Decimal
from .models import DashboardMetrics
from apps.sales.models import Sale, SaleItem
from apps.expenses.models import Expense, ExpenseCategory
from apps.customer.models import Customer
from apps.inventory.models import Product
from apps.supplier.models import Supplier
from apps.online_preorder.models import OnlinePreorder

# Store business timezone
BUSINESS_TIMEZONE = ZoneInfo('Asia/Dhaka')

class DashboardStatsView(APIView):
    def get(self, request):
        now_local = datetime.now(BUSINESS_TIMEZONE)
        today = now_local.date()

        start_of_today = datetime.combine(today, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        end_of_today = datetime.combine(today, time.max).replace(tzinfo=BUSINESS_TIMEZONE)

        start_of_month_date = today.replace(day=1)
        start_of_month = datetime.combine(start_of_month_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)

        # Get online preorders metrics (filtered by local day range)
        today_preorders = OnlinePreorder.objects.filter(
            created_at__gte=start_of_today,
            created_at__lte=end_of_today
        )
        today_preorders_count = today_preorders.count()
        today_preorders_amount = today_preorders.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

        # Status counts for today
        today_status_breakdown = {
            'PENDING': 0,
            'CONFIRMED': 0,
            'DELIVERED': 0,
            'COMPLETED': 0,
            'CANCELLED': 0,
        }
        for s_item in today_preorders.values('status').annotate(count=Count('id')):
            if s_item['status'] in today_status_breakdown:
                today_status_breakdown[s_item['status']] = s_item['count']

        # Status counts for all time
        all_status_breakdown = {
            'PENDING': 0,
            'CONFIRMED': 0,
            'DELIVERED': 0,
            'COMPLETED': 0,
            'CANCELLED': 0,
        }
        for s_item in OnlinePreorder.objects.values('status').annotate(count=Count('id')):
            if s_item['status'] in all_status_breakdown:
                all_status_breakdown[s_item['status']] = s_item['count']

        total_preorders_count = OnlinePreorder.objects.count()
        total_preorders_amount = OnlinePreorder.objects.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')
        
        # Get today's metrics using Sale model for accurate profit calculation (filtered by local day range)
        today_sales = Sale.objects.filter(
            date__gte=start_of_today,
            date__lte=end_of_today,
            status='completed'
        ).aggregate(
            total=Sum('total'),
            total_profit=Sum('total_profit'),
            total_loss=Sum('total_loss')
        )
        
        today_expenses = Expense.objects.filter(date=today).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Get monthly metrics using Sale model for accurate profit calculation (current month in local time)
        monthly_sales = Sale.objects.filter(
            date__gte=start_of_month,
            date__lte=end_of_today,
            status='completed'
        ).aggregate(
            total=Sum('total'),
            total_profit=Sum('total_profit'),
            total_loss=Sum('total_loss')
        )
        
        monthly_expenses = Expense.objects.filter(
            date__gte=start_of_month_date,
            date__lte=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Get counts
        total_customers = Customer.objects.count()
        total_products = Product.objects.count()
        total_suppliers = Supplier.objects.count()
        
        # Get sales trend using Sale model for accurate profit calculation (current month, grouped by local date)
        sales_qs = Sale.objects.filter(
            date__gte=start_of_month,
            date__lte=end_of_today,
            status='completed'
        ).values('date', 'total', 'total_profit', 'total_loss')

        sales_by_date = {}
        for sale in sales_qs:
            local_date_str = sale['date'].astimezone(BUSINESS_TIMEZONE).date().isoformat()
            if local_date_str not in sales_by_date:
                sales_by_date[local_date_str] = {
                    'date__date': local_date_str,
                    'total': Decimal('0.00'),
                    'profit': Decimal('0.00'),
                    'loss': Decimal('0.00'),
                }
            sales_by_date[local_date_str]['total'] += sale['total'] or Decimal('0.00')
            sales_by_date[local_date_str]['profit'] += sale['total_profit'] or Decimal('0.00')
            sales_by_date[local_date_str]['loss'] += sale['total_loss'] or Decimal('0.00')

        sales_trend = [
            {
                'date__date': d,
                'total': float(data['total']),
                'profit': float(data['profit']),
                'loss': float(data['loss']),
            }
            for d, data in sorted(sales_by_date.items())
        ]
            
        # Get expense trend (current month)
        expense_trend = Expense.objects.filter(
            date__gte=start_of_month_date,
            date__lte=today
        ).values('date')\
            .annotate(amount=Sum('amount'))\
            .order_by('date')
            
        # Get top selling products using SaleItem but with proper profit calculation
        top_products = SaleItem.objects.filter(
            sale__status='completed'
        ).values('product__name')\
            .annotate(
                total_sales=Sum('quantity'),
                total_revenue=Sum('total'),
                total_profit=Sum('profit')  # This uses the properly calculated profit field
            )\
            .order_by('-total_sales')[:5]
        
        # Get expense categories
        expense_categories = ExpenseCategory.objects.annotate(
            amount=Sum('expenses__amount')
        ).values('name', 'amount').order_by('-amount')
        
        # Get low stock items
        low_stock_items = Product.objects.filter(
            Q(stock_quantity__lte=F('minimum_stock'))
        ).values('name', 'stock_quantity', 'minimum_stock')[:5]
        
        # Get recent suppliers
        recent_suppliers = Supplier.objects.filter(is_active=True)[:6]
        
        return Response({
            'today': {
                'sales': today_sales['total'] or 0,
                'expenses': today_expenses,
                'profit': today_sales['total_profit'] or 0,
                'online_preorders_count': today_preorders_count,
                'online_preorders_amount': float(today_preorders_amount),
            },
            'monthly': {
                'sales': monthly_sales['total'] or 0,
                'expenses': monthly_expenses,
                'profit': monthly_sales['total_profit'] or 0,
            },
            'counts': {
                'customers': total_customers,
                'products': total_products,
                'suppliers': total_suppliers,
                'online_preorders': total_preorders_count,
            },
            'online_preorders': {
                'today_count': today_preorders_count,
                'today_amount': float(today_preorders_amount),
                'total_count': total_preorders_count,
                'total_amount': float(total_preorders_amount),
                'today_status_breakdown': today_status_breakdown,
                'status_breakdown': all_status_breakdown,
            },
            'sales_trend': list(sales_trend),
            'expense_trend': list(expense_trend),
            'top_products': [
                {
                    'name': product['product__name'],
                    'total_sales': product['total_sales'] or 0,
                    'total_revenue': product['total_revenue'] or 0,
                    'total_profit': product['total_profit'] or 0
                } for product in top_products
            ],
            'expense_categories': list(expense_categories),
            'low_stock_items': list(low_stock_items),
            'recent_suppliers': [
                {
                    'name': supplier.company_name,
                    'phone': supplier.phone,
                    'email': supplier.email,
                    'address': supplier.address
                } for supplier in recent_suppliers
            ]
        }) 