from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Sum, Count, F, Q, Max
from django.utils import timezone
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from decimal import Decimal
from .models import DashboardMetrics
from rest_framework.permissions import AllowAny, IsAuthenticated
from apps.authentication.permissions import IsManagerOrAdmin
from apps.sales.models import Sale, SaleItem, Return
from apps.expenses.models import Expense, ExpenseCategory
from apps.customer.models import Customer
from apps.inventory.models import Product, StockMovement
from apps.supplier.models import Supplier
from apps.online_preorder.models import OnlinePreorder

# Store business timezone
BUSINESS_TIMEZONE = ZoneInfo('Asia/Dhaka')

def resolve_period_dates(period, start_date_str=None, end_date_str=None):
    now_local = datetime.now(BUSINESS_TIMEZONE)
    today = now_local.date()

    if period == 'yesterday':
        target_date = today - timedelta(days=1)
        start = datetime.combine(target_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        end = datetime.combine(target_date, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        prior_date = target_date - timedelta(days=1)
        prior_start = datetime.combine(prior_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        prior_end = datetime.combine(prior_date, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        label = "Yesterday"
    elif period in ['7d', 'last_7_days']:
        start_date = today - timedelta(days=6)
        start = datetime.combine(start_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        end = datetime.combine(today, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        prior_end = start - timedelta(seconds=1)
        prior_start = datetime.combine(start_date - timedelta(days=7), time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        label = "Last 7 Days"
    elif period in ['30d', 'last_30_days']:
        start_date = today - timedelta(days=29)
        start = datetime.combine(start_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        end = datetime.combine(today, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        prior_end = start - timedelta(seconds=1)
        prior_start = datetime.combine(start_date - timedelta(days=30), time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        label = "Last 30 Days"
    elif period == 'this_month':
        start_date = today.replace(day=1)
        start = datetime.combine(start_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        end = datetime.combine(today, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        last_month_end = start_date - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        days_in = (today - start_date).days
        prior_target_end = min(last_month_start + timedelta(days=days_in), last_month_end)
        prior_start = datetime.combine(last_month_start, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        prior_end = datetime.combine(prior_target_end, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        label = "This Month"
    elif period == 'last_month':
        last_month_end = today.replace(day=1) - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)
        start = datetime.combine(last_month_start, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        end = datetime.combine(last_month_end, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        prior_end_date = last_month_start - timedelta(days=1)
        prior_start_date = prior_end_date.replace(day=1)
        prior_start = datetime.combine(prior_start_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        prior_end = datetime.combine(prior_end_date, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        label = "Last Month"
    elif period == 'custom' and start_date_str and end_date_str:
        try:
            s_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            e_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            start = datetime.combine(s_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
            end = datetime.combine(e_date, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
            duration_days = max(1, (e_date - s_date).days + 1)
            prior_end = start - timedelta(seconds=1)
            prior_start = datetime.combine(s_date - timedelta(days=duration_days), time.min).replace(tzinfo=BUSINESS_TIMEZONE)
            label = f"{start_date_str} to {end_date_str}"
        except Exception:
            start = datetime.combine(today, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
            end = datetime.combine(today, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
            prior_date = today - timedelta(days=1)
            prior_start = datetime.combine(prior_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
            prior_end = datetime.combine(prior_date, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
            label = "Today"
    else:  # 'today' is default
        start = datetime.combine(today, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        end = datetime.combine(today, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        prior_date = today - timedelta(days=1)
        prior_start = datetime.combine(prior_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        prior_end = datetime.combine(prior_date, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        label = "Today"

    return start, end, prior_start, prior_end, label


class DashboardStatsView(APIView):
    def get(self, request):
        now_local = datetime.now(BUSINESS_TIMEZONE)
        today = now_local.date()

        # Dynamic date range resolution
        period = request.query_params.get('period', 'today').lower()
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        period_start, period_end, prior_start, prior_end, period_label = resolve_period_dates(
            period, start_date_str, end_date_str
        )

        start_of_today = datetime.combine(today, time.min).replace(tzinfo=BUSINESS_TIMEZONE)
        end_of_today = datetime.combine(today, time.max).replace(tzinfo=BUSINESS_TIMEZONE)
        start_of_month_date = today.replace(day=1)
        start_of_month = datetime.combine(start_of_month_date, time.min).replace(tzinfo=BUSINESS_TIMEZONE)

        # -------------------------------------------------------------
        # 1. PRIMARY PERIOD & PRIOR PERIOD CORE METRICS (PoP)
        # -------------------------------------------------------------
        current_sales_agg = Sale.objects.filter(
            date__gte=period_start,
            date__lte=period_end,
            status='completed'
        ).aggregate(
            total=Sum('total'),
            total_profit=Sum('total_profit'),
            total_loss=Sum('total_loss'),
            count=Count('id')
        )
        current_sales_total = current_sales_agg['total'] or Decimal('0.00')
        current_profit_total = current_sales_agg['total_profit'] or Decimal('0.00')
        current_orders_count = current_sales_agg['count'] or 0
        current_aov = (current_sales_total / current_orders_count) if current_orders_count > 0 else Decimal('0.00')

        current_expenses = Expense.objects.filter(
            date__gte=period_start.date(),
            date__lte=period_end.date(),
            status__in=['APPROVED', 'PAID']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        current_net_profit = current_profit_total - current_expenses

        # Prior period core metrics
        prior_sales_agg = Sale.objects.filter(
            date__gte=prior_start,
            date__lte=prior_end,
            status='completed'
        ).aggregate(
            total=Sum('total'),
            total_profit=Sum('total_profit'),
            count=Count('id')
        )
        prior_sales_total = prior_sales_agg['total'] or Decimal('0.00')
        prior_profit_total = prior_sales_agg['total_profit'] or Decimal('0.00')
        prior_orders_count = prior_sales_agg['count'] or 0
        prior_aov = (prior_sales_total / prior_orders_count) if prior_orders_count > 0 else Decimal('0.00')

        prior_expenses = Expense.objects.filter(
            date__gte=prior_start.date(),
            date__lte=prior_end.date(),
            status__in=['APPROVED', 'PAID']
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

        def calc_pct_growth(curr, prior):
            curr_f = float(curr)
            prior_f = float(prior)
            if prior_f > 0:
                return round(((curr_f - prior_f) / prior_f) * 100, 1)
            elif curr_f > 0:
                return 100.0
            return 0.0

        sales_growth = calc_pct_growth(current_sales_total, prior_sales_total)
        profit_growth = calc_pct_growth(current_profit_total, prior_profit_total)
        expenses_growth = calc_pct_growth(current_expenses, prior_expenses)
        orders_growth = calc_pct_growth(current_orders_count, prior_orders_count)
        aov_growth = calc_pct_growth(current_aov, prior_aov)

        # Returns & refunds in period
        returns_in_period = Return.objects.filter(
            created_at__gte=period_start,
            created_at__lte=period_end
        ).aggregate(
            count=Count('id'),
            refund_total=Sum('refund_amount')
        )
        return_count = returns_in_period['count'] or 0
        refund_amount = returns_in_period['refund_total'] or Decimal('0.00')
        return_rate = round(float((refund_amount / current_sales_total * 100) if current_sales_total > 0 else 0.0), 2)

        pop_comparison = {
            'period_label': period_label,
            'sales_growth': sales_growth,
            'profit_growth': profit_growth,
            'expenses_growth': expenses_growth,
            'orders_growth': orders_growth,
            'aov_growth': aov_growth,
            'current_sales': float(current_sales_total),
            'current_profit': float(current_profit_total),
            'current_expenses': float(current_expenses),
            'current_net_profit': float(current_net_profit),
            'current_orders': current_orders_count,
            'current_aov': round(float(current_aov), 2),
            'prior_sales': float(prior_sales_total),
            'prior_profit': float(prior_profit_total),
            'prior_expenses': float(prior_expenses),
            'prior_orders': prior_orders_count,
            'prior_aov': round(float(prior_aov), 2),
            'return_count': return_count,
            'refund_amount': float(refund_amount),
            'return_rate': return_rate,
        }

        # -------------------------------------------------------------
        # 2. OMNI-CHANNEL BREAKDOWN (POS vs Online Preorders vs Offline)
        # -------------------------------------------------------------
        channel_name_map = {
            'shop': 'In-Store POS',
            'online_preorder': 'Online Ecommerce',
            'offline_preorder': 'Custom Preorders',
        }
        channel_counts = {
            'shop': {'count': 0, 'total': Decimal('0.00'), 'profit': Decimal('0.00')},
            'online_preorder': {'count': 0, 'total': Decimal('0.00'), 'profit': Decimal('0.00')},
            'offline_preorder': {'count': 0, 'total': Decimal('0.00'), 'profit': Decimal('0.00')},
        }
        sales_by_channel_qs = Sale.objects.filter(
            date__gte=period_start,
            date__lte=period_end,
            status='completed'
        ).values('sale_type').annotate(
            total=Sum('total'),
            profit=Sum('total_profit'),
            count=Count('id')
        )
        for row in sales_by_channel_qs:
            stype = row['sale_type']
            if stype in channel_counts:
                channel_counts[stype]['count'] = row['count']
                channel_counts[stype]['total'] = row['total'] or Decimal('0.00')
                channel_counts[stype]['profit'] = row['profit'] or Decimal('0.00')

        channel_breakdown = []
        for stype, d in channel_counts.items():
            rev = float(d['total'])
            cnt = d['count']
            pct = round((rev / float(current_sales_total) * 100), 1) if current_sales_total > 0 else 0.0
            aov = round(rev / cnt, 2) if cnt > 0 else 0.0
            channel_breakdown.append({
                'channel': stype,
                'name': channel_name_map.get(stype, stype.title()),
                'revenue': rev,
                'orders': cnt,
                'profit': float(d['profit']),
                'percentage': pct,
                'aov': aov,
            })

        # -------------------------------------------------------------
        # 3. PAYMENT METHOD DISTRIBUTION
        # -------------------------------------------------------------
        payment_display_names = {
            'cash': 'Cash',
            'card': 'Credit / Debit Card',
            'mobile': 'Mobile (bKash / Nagad)',
            'gift': 'Gift Card',
            'split': 'Split Payment',
            'credit': 'Customer Credit',
        }
        payment_qs = Sale.objects.filter(
            date__gte=period_start,
            date__lte=period_end,
            status='completed'
        ).values('payment_method').annotate(
            total=Sum('total'),
            count=Count('id')
        ).order_by('-total')

        payment_methods = []
        for p in payment_qs:
            pm = p['payment_method']
            tot = float(p['total'] or 0)
            pct = round((tot / float(current_sales_total) * 100), 1) if current_sales_total > 0 else 0.0
            payment_methods.append({
                'method': pm,
                'name': payment_display_names.get(pm, pm.title()),
                'total': tot,
                'count': p['count'],
                'percentage': pct,
            })

        # -------------------------------------------------------------
        # 4. HOURLY SALES PROFILE / PEAK TRAFFIC HEATMAP
        # -------------------------------------------------------------
        hourly_data = {h: {'hour': h, 'label': f"{h:02d}:00", 'total': 0.0, 'orders': 0} for h in range(24)}
        period_sales_all = Sale.objects.filter(
            date__gte=period_start,
            date__lte=period_end,
            status='completed'
        ).values('date', 'total')

        for s in period_sales_all:
            h = s['date'].astimezone(BUSINESS_TIMEZONE).hour
            hourly_data[h]['total'] += float(s['total'] or 0)
            hourly_data[h]['orders'] += 1

        hourly_sales = list(hourly_data.values())

        # -------------------------------------------------------------
        # 5. INVENTORY HEALTH & CAPITAL RISK VALUATION
        # -------------------------------------------------------------
        inv_summary = Product.objects.aggregate(
            total_stock=Sum('stock_quantity'),
            total_retail_val=Sum(F('stock_quantity') * F('selling_price')),
            total_cost_val=Sum(F('stock_quantity') * F('cost_price'))
        )
        total_retail_val = inv_summary['total_retail_val'] or Decimal('0.00')
        total_cost_val = inv_summary['total_cost_val'] or Decimal('0.00')
        potential_gross_profit = total_retail_val - total_cost_val
        total_stock_units = inv_summary['total_stock'] or 0

        out_of_stock_count = Product.objects.filter(stock_quantity=0).count()
        low_stock_count = Product.objects.filter(
            stock_quantity__gt=0,
            stock_quantity__lte=F('minimum_stock')
        ).count()
        healthy_stock_count = Product.objects.filter(
            stock_quantity__gt=F('minimum_stock')
        ).count()

        # Dead / Slow-moving stock (Products with stock > 0 but 0 sales in past 30 days)
        thirty_days_ago = now_local - timedelta(days=30)
        active_product_ids = SaleItem.objects.filter(
            sale__date__gte=thirty_days_ago,
            sale__status='completed'
        ).values_list('product_id', flat=True).distinct()

        dead_stock_qs = Product.objects.filter(stock_quantity__gt=0).exclude(id__in=active_product_ids)
        dead_stock_count = dead_stock_qs.count()
        dead_stock_capital = dead_stock_qs.aggregate(
            total=Sum(F('stock_quantity') * F('cost_price'))
        )['total'] or Decimal('0.00')

        dead_stock_items = [
            {
                'name': p.name,
                'stock': p.stock_quantity,
                'cost_value': float(p.stock_quantity * (p.cost_price or 0)),
                'selling_price': float(p.selling_price or 0),
            }
            for p in dead_stock_qs.order_by('-stock_quantity')[:5]
        ]

        inventory_health = {
            'total_stock_units': total_stock_units,
            'total_retail_value': float(total_retail_val),
            'total_cost_value': float(total_cost_val),
            'potential_profit': float(potential_gross_profit),
            'healthy_count': healthy_stock_count,
            'low_stock_count': low_stock_count,
            'out_of_stock_count': out_of_stock_count,
            'dead_stock_count': dead_stock_count,
            'dead_stock_capital': float(dead_stock_capital),
            'dead_stock_samples': dead_stock_items,
        }

        # -------------------------------------------------------------
        # 6. ECOMMERCE & COURIER FULFILLMENT PERFORMANCE
        # -------------------------------------------------------------
        period_preorders = OnlinePreorder.objects.filter(
            created_at__gte=period_start,
            created_at__lte=period_end
        )
        preorder_count_period = period_preorders.count()
        preorder_amount_period = period_preorders.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

        period_status_breakdown = {
            'PENDING': 0,
            'CONFIRMED': 0,
            'DELIVERED': 0,
            'COMPLETED': 0,
            'CANCELLED': 0,
            'HOLD': 0,
            'RETURNED': 0,
        }
        for s_row in period_preorders.values('status').annotate(count=Count('id')):
            st = s_row['status']
            if st in period_status_breakdown:
                period_status_breakdown[st] = s_row['count']

        completed_courier = period_status_breakdown['COMPLETED']
        returned_courier = period_status_breakdown['RETURNED']
        in_transit_courier = period_status_breakdown['DELIVERED']
        resolved_deliveries = completed_courier + returned_courier
        courier_success_rate = round((completed_courier / resolved_deliveries * 100), 1) if resolved_deliveries > 0 else (100.0 if completed_courier > 0 else 0.0)
        courier_return_rate = round((returned_courier / resolved_deliveries * 100), 1) if resolved_deliveries > 0 else 0.0

        # Marketing attribution: UTM Campaign & Source
        marketing_sources = []
        utm_qs = period_preorders.exclude(
            Q(utm_source__isnull=True) | Q(utm_source='')
        ).values('utm_source').annotate(
            orders=Count('id'),
            revenue=Sum('total_amount')
        ).order_by('-orders')[:5]

        for u in utm_qs:
            marketing_sources.append({
                'source': u['utm_source'],
                'orders': u['orders'],
                'revenue': float(u['revenue'] or 0),
            })

        courier_performance = {
            'period_orders': preorder_count_period,
            'period_amount': float(preorder_amount_period),
            'status_breakdown': period_status_breakdown,
            'completed_count': completed_courier,
            'returned_count': returned_courier,
            'in_transit_count': in_transit_courier,
            'success_rate': courier_success_rate,
            'return_rate': courier_return_rate,
            'marketing_sources': marketing_sources,
        }

        # -------------------------------------------------------------
        # 7. CUSTOMER INSIGHTS & RETENTION
        # -------------------------------------------------------------
        new_customers_period = Customer.objects.filter(
            created_at__gte=period_start,
            created_at__lte=period_end
        ).count()

        # Top VIP Spenders in this period
        top_spenders_qs = Sale.objects.filter(
            date__gte=period_start,
            date__lte=period_end,
            status='completed',
            customer__isnull=False
        ).values(
            'customer_id',
            'customer__first_name',
            'customer__last_name',
            'customer__phone'
        ).annotate(
            total_spent=Sum('total'),
            orders_count=Count('id')
        ).order_by('-total_spent')[:5]

        top_spenders = [
            {
                'id': row['customer_id'],
                'name': f"{row['customer__first_name'] or ''} {row['customer__last_name'] or ''}".strip() or "Valued Customer",
                'phone': row['customer__phone'] or "N/A",
                'total_spent': float(row['total_spent'] or 0),
                'orders_count': row['orders_count'],
            }
            for row in top_spenders_qs
        ]

        customer_insights = {
            'new_customers': new_customers_period,
            'top_spenders': top_spenders,
        }

        # -------------------------------------------------------------
        # 8. BACKWARD COMPATIBLE METRICS (Today, Monthly, General Counts)
        # -------------------------------------------------------------
        today_preorders = OnlinePreorder.objects.filter(
            created_at__gte=start_of_today,
            created_at__lte=end_of_today
        )
        today_preorders_count = today_preorders.count()
        today_preorders_amount = today_preorders.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

        today_status_breakdown = {
            'PENDING': 0, 'CONFIRMED': 0, 'DELIVERED': 0, 'COMPLETED': 0, 'CANCELLED': 0,
        }
        for s_item in today_preorders.values('status').annotate(count=Count('id')):
            if s_item['status'] in today_status_breakdown:
                today_status_breakdown[s_item['status']] = s_item['count']

        all_status_breakdown = {
            'PENDING': 0, 'CONFIRMED': 0, 'DELIVERED': 0, 'COMPLETED': 0, 'CANCELLED': 0,
        }
        for s_item in OnlinePreorder.objects.values('status').annotate(count=Count('id')):
            if s_item['status'] in all_status_breakdown:
                all_status_breakdown[s_item['status']] = s_item['count']

        total_preorders_count = OnlinePreorder.objects.count()
        total_preorders_amount = OnlinePreorder.objects.aggregate(total=Sum('total_amount'))['total'] or Decimal('0.00')

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

        total_customers = Customer.objects.count()
        total_products = Product.objects.count()
        total_suppliers = Supplier.objects.count()

        # Sales Trend for selected period
        sales_qs = Sale.objects.filter(
            date__gte=period_start,
            date__lte=period_end,
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

        # Expense Trend for selected period
        expense_trend = Expense.objects.filter(
            date__gte=period_start.date(),
            date__lte=period_end.date()
        ).values('date').annotate(amount=Sum('amount')).order_by('date')

        # Top products for selected period
        top_products = SaleItem.objects.filter(
            sale__date__gte=period_start,
            sale__date__lte=period_end,
            sale__status='completed'
        ).values('product__name').annotate(
            total_sales=Sum('quantity'),
            total_revenue=Sum('total'),
            total_profit=Sum('profit')
        ).order_by('-total_sales')[:6]

        # Expense categories for selected period
        expense_categories = ExpenseCategory.objects.filter(
            expenses__date__gte=period_start.date(),
            expenses__date__lte=period_end.date()
        ).annotate(
            amount=Sum('expenses__amount')
        ).values('name', 'amount').order_by('-amount')

        low_stock_items = Product.objects.filter(
            Q(stock_quantity__lte=F('minimum_stock'))
        ).values('name', 'stock_quantity', 'minimum_stock')[:6]

        recent_suppliers = Supplier.objects.filter(is_active=True)[:6]
        
        return Response({
            # New Advanced Analytics Payload
            'period': {
                'key': period,
                'label': period_label,
                'start_date': period_start.isoformat(),
                'end_date': period_end.isoformat(),
            },
            'pop_comparison': pop_comparison,
            'channel_breakdown': channel_breakdown,
            'payment_methods': payment_methods,
            'hourly_sales': hourly_sales,
            'inventory_health': inventory_health,
            'courier_performance': courier_performance,
            'customer_insights': customer_insights,

            # Existing/Compatible Payload
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


class ActivityLogView(APIView):
    permission_classes = [IsAuthenticated, IsManagerOrAdmin]

    def get(self, request):
        limit = int(request.query_params.get('limit', 100))
        category_filter = request.query_params.get('category', 'all').lower()
        search_query = request.query_params.get('search', '').lower().strip()
        role_filter = request.query_params.get('role', 'all').lower()

        now = timezone.now()
        yesterday = now - timedelta(hours=24)

        activities = []

        # 1. SALES
        if category_filter in ['all', 'sales']:
            sales_qs = Sale.objects.select_related('customer').order_by('-date')[:limit]
            for s in sales_qs:
                cust_name = f"{s.customer.first_name} {s.customer.last_name}".strip() if s.customer else (s.customer_phone or "Walk-in Customer")
                is_online = s.sale_type == 'online_preorder'
                action_name = "Sale Completed" if s.status == 'completed' else f"Sale {s.status.capitalize()}"
                activities.append({
                    'id': f"sale-{s.id}",
                    'user': {
                        'name': "Online Checkout" if is_online else "Store Cashier",
                        'email': "pos@rawstitch.com",
                        'role': "Cashier" if not is_online else "System",
                        'initials': "OC" if is_online else "SC"
                    },
                    'category': "Sales",
                    'action': action_name,
                    'description': f"POS transaction of ৳{s.total:,.2f} via {s.get_payment_method_display()} ({cust_name})",
                    'target': f"{s.invoice_number} (৳{s.total:,.2f})",
                    'diff': {
                        'before': 'Pending',
                        'after': s.status.capitalize()
                    },
                    'ipAddress': "192.168.1.102" if not is_online else "Web Store",
                    'device': "POS Terminal 01" if not is_online else "Online Storefront",
                    'timestamp': (s.date or s.created_at).isoformat(),
                    'raw_time': s.date or s.created_at
                })

        # 2. ONLINE PREORDERS
        if category_filter in ['all', 'sales', 'preorders']:
            preorders_qs = OnlinePreorder.objects.order_by('-created_at')[:limit]
            for po in preorders_qs:
                is_dispatched = bool(po.courier_consignment_id or po.steadfast_consignment_id)
                action = f"Preorder {po.status.capitalize()}"
                if is_dispatched:
                    action = f"Dispatched ({po.courier_partner or 'STEADFAST'})"
                
                trk = po.courier_tracking_code or po.steadfast_tracking_code or po.courier_consignment_id or ""
                desc = f"Online preorder #{po.id} for {po.customer_name} (৳{po.total_amount})"
                if is_dispatched and trk:
                    desc += f" • Tracking: {trk}"

                activities.append({
                    'id': f"preorder-{po.id}",
                    'user': {
                        'name': po.customer_name or "Online Customer",
                        'email': po.customer_email or "order@rawstitch.com",
                        'role': "Admin" if is_dispatched else "System",
                        'initials': "".join([p[0] for p in (po.customer_name or "OC").split()[:2]]).upper() or "PO"
                    },
                    'category': "Sales",
                    'action': action,
                    'description': desc,
                    'target': f"Preorder #{po.id}",
                    'diff': {
                        'before': "Checkout",
                        'after': po.status
                    },
                    'ipAddress': po.ip_address or "Customer Online IP",
                    'device': "Ecommerce Portal",
                    'timestamp': po.created_at.isoformat(),
                    'raw_time': po.created_at
                })

        # 3. STOCK MOVEMENTS (INVENTORY)
        if category_filter in ['all', 'inventory']:
            sm_qs = StockMovement.objects.select_related('product').order_by('-created_at')[:limit]
            for sm in sm_qs:
                m_type = sm.get_movement_type_display()
                diff_sign = "+" if sm.movement_type in ['IN', 'GIFT'] else "-"
                activities.append({
                    'id': f"stock-{sm.id}",
                    'user': {
                        'name': "Inventory Lead",
                        'email': "inventory@rawstitch.com",
                        'role': "Inventory Lead",
                        'initials': "IL"
                    },
                    'category': "Inventory",
                    'action': f"Stock {m_type}",
                    'description': sm.notes or f"{m_type} recorded for {sm.product.name}",
                    'target': f"SKU-{sm.product.sku or sm.product.id} ({sm.product.name})",
                    'diff': {
                        'before': "Previous Stock",
                        'after': f"{diff_sign}{sm.quantity} units"
                    },
                    'ipAddress': "192.168.1.105",
                    'device': "Warehouse Scanner",
                    'timestamp': sm.created_at.isoformat(),
                    'raw_time': sm.created_at
                })

        # 4. RETURNS
        if category_filter in ['all', 'returns']:
            returns_qs = Return.objects.select_related('sale').order_by('-created_at')[:limit]
            for ret in returns_qs:
                activities.append({
                    'id': f"return-{ret.id}",
                    'user': {
                        'name': "Store Cashier",
                        'email': "returns@rawstitch.com",
                        'role': "Cashier",
                        'initials': "SC"
                    },
                    'category': "Returns",
                    'action': f"Return {ret.status.capitalize()}",
                    'description': f"Return ticket for {ret.sale.invoice_number}: {ret.reason or 'Customer return'}",
                    'target': f"{ret.return_number} (Refund ৳{ret.refund_amount})",
                    'diff': {
                        'before': "Active Sale",
                        'after': f"Refund ৳{ret.refund_amount}"
                    },
                    'ipAddress': "192.168.1.102",
                    'device': "POS Terminal 01",
                    'timestamp': ret.created_at.isoformat(),
                    'raw_time': ret.created_at
                })

        # 5. EXPENSES / PRICING
        if category_filter in ['all', 'pricing', 'expenses']:
            exp_qs = Expense.objects.select_related('category').order_by('-created_at')[:limit]
            for exp in exp_qs:
                cat_name = exp.category.name if exp.category else "General"
                activities.append({
                    'id': f"expense-{exp.id}",
                    'user': {
                        'name': "Finance Admin",
                        'email': "finance@rawstitch.com",
                        'role': "Admin",
                        'initials': "FA"
                    },
                    'category': "Pricing",
                    'action': "Expense Logged",
                    'description': f"{exp.description} (Category: {cat_name})",
                    'target': f"EXP #{exp.id} (৳{exp.amount:,.2f})",
                    'diff': {
                        'before': "Scheduled",
                        'after': f"৳{exp.amount:,.2f} ({exp.status})"
                    },
                    'ipAddress': "192.168.1.100",
                    'device': "Backoffice Terminal",
                    'timestamp': exp.created_at.isoformat(),
                    'raw_time': exp.created_at
                })

        # Sort all aggregated activities by timestamp descending
        activities.sort(key=lambda x: x['raw_time'], reverse=True)

        # 24h Metrics Calculation across the DB
        sales_24h_count = Sale.objects.filter(date__gte=yesterday).count()
        preorders_24h_count = OnlinePreorder.objects.filter(created_at__gte=yesterday).count()
        stock_24h_count = StockMovement.objects.filter(created_at__gte=yesterday).count()
        expenses_24h_count = Expense.objects.filter(created_at__gte=yesterday).count()
        returns_24h_count = Return.objects.filter(created_at__gte=yesterday).count()
        total_logged_24h = sales_24h_count + preorders_24h_count + stock_24h_count + expenses_24h_count + returns_24h_count

        # Filters applied to the sorted list
        filtered = []
        for a in activities:
            # Category match
            if category_filter != 'all' and a['category'].lower() != category_filter:
                continue

            # Role match
            if role_filter != 'all' and a['user']['role'].lower() != role_filter:
                continue

            # Search match
            if search_query:
                text_to_search = f"{a['action']} {a['description']} {a['user']['name']} {a.get('target', '')}".lower()
                if search_query not in text_to_search:
                    continue

            # Clean raw_time before JSON serialization
            del a['raw_time']
            filtered.append(a)

        final_slice = filtered[:limit]

        return Response({
            'metrics': {
                'total_24h': total_logged_24h,
                'sales_24h': sales_24h_count + preorders_24h_count,
                'stock_24h': stock_24h_count,
                'expenses_and_other_24h': expenses_24h_count + returns_24h_count,
            },
            'count': len(filtered),
            'results': final_slice
        }) 