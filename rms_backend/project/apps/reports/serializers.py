from rest_framework import serializers
from .models import Report, ReportMetric, ReportDataPoint, SavedReport
from apps.sales.models import Sale, SaleItem
from apps.expenses.models import Expense
from apps.inventory.models import Product, Category
from apps.customer.models import Customer
from decimal import Decimal

class ReportMetricSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportMetric
        fields = ['id', 'metric_name', 'metric_value', 'metric_type', 'created_at']
        read_only_fields = ['created_at']

class ReportDataPointSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportDataPoint
        fields = ['id', 'date', 'value', 'label', 'category', 'created_at']
        read_only_fields = ['created_at']

class ReportSerializer(serializers.ModelSerializer):
    metrics = ReportMetricSerializer(many=True, read_only=True)
    data_points = ReportDataPointSerializer(many=True, read_only=True)

    class Meta:
        model = Report
        fields = [
            'id', 'name', 'report_type', 'date_from', 'date_to',
            'created_at', 'updated_at', 'is_saved', 'notes',
            'metrics', 'data_points'
        ]
        read_only_fields = ['created_at', 'updated_at']

class SavedReportSerializer(serializers.ModelSerializer):
    report = ReportSerializer(read_only=True)
    report_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = SavedReport
        fields = [
            'id', 'report', 'report_id', 'name', 'description',
            'created_at', 'updated_at', 'is_favorite'
        ]
        read_only_fields = ['created_at', 'updated_at']

class TopProductsSerializer(serializers.Serializer):
    product_name = serializers.CharField()
    category_name = serializers.CharField()
    total_sales = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity_sold = serializers.IntegerField()
    average_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    profit = serializers.DecimalField(max_digits=10, decimal_places=2)

class ExpenseByCategorySerializer(serializers.Serializer):
    category_name = serializers.CharField()
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    count = serializers.IntegerField()

class ExpenseByDateSerializer(serializers.Serializer):
    date = serializers.DateField(source='expense_date')
    total = serializers.DecimalField(max_digits=10, decimal_places=2, source='amount')
    count = serializers.IntegerField()

class ExpenseReportSerializer(serializers.Serializer):
    total_expenses = serializers.DecimalField(max_digits=10, decimal_places=2)
    expenses_by_category = ExpenseByCategorySerializer(many=True)
    expenses_by_date = ExpenseByDateSerializer(many=True)

class InventoryReportSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_stock_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_cost_value = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_retail_value = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    potential_profit = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    unrealized_margin = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    out_of_stock_count = serializers.IntegerField(required=False, default=0)
    dead_stock_count = serializers.IntegerField(required=False, default=0)
    dead_stock_value = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, default=Decimal('0.00'))
    low_stock_items = serializers.ListField(child=serializers.DictField())
    stock_by_category = serializers.ListField(child=serializers.DictField())
    stock_movements = serializers.ListField(child=serializers.DictField())

class SalesByCategorySerializer(serializers.Serializer):
    category_name = serializers.CharField()
    total_sales = serializers.DecimalField(max_digits=10, decimal_places=2)
    items_sold = serializers.IntegerField()
    unique_products = serializers.IntegerField()

class PaymentMethodSerializer(serializers.Serializer):
    payment_method = serializers.CharField()
    total = serializers.DecimalField(max_digits=10, decimal_places=2)
    orders_count = serializers.IntegerField()
    items_count = serializers.IntegerField(required=False, default=0)

class SalesReportSerializer(serializers.Serializer):
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    gross_sales = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_discounts = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_tax = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_refunds = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    net_sales = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_orders = serializers.IntegerField()
    total_items_sold = serializers.IntegerField()
    average_order_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_item_price = serializers.DecimalField(max_digits=15, decimal_places=2)
    sales_by_date = serializers.ListField(child=serializers.DictField())
    sales_by_category = serializers.ListField(child=serializers.DictField())
    sales_by_channel = serializers.ListField(child=serializers.DictField(), required=False)
    top_products = TopProductsSerializer(many=True)
    payment_methods = PaymentMethodSerializer(many=True)

class LowStockItemSerializer(serializers.Serializer):
    name = serializers.CharField()
    stock = serializers.IntegerField()

class StockByCategorySerializer(serializers.Serializer):
    category_name = serializers.CharField()
    total_products = serializers.IntegerField()
    total_stock = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=10, decimal_places=2)

class StockMovementSerializer(serializers.Serializer):
    date = serializers.DateField()
    movement_type = serializers.CharField()
    total_quantity = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=10, decimal_places=2)

class TopCustomersSerializer(serializers.Serializer):
    first_name = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    last_name = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    phone = serializers.CharField(allow_blank=True, allow_null=True, required=False)
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    items_purchased = serializers.IntegerField(required=False, default=0)
    unique_products = serializers.IntegerField(required=False, default=0)
    last_purchase_date = serializers.DateField(allow_null=True, required=False)
    total_orders = serializers.IntegerField(required=False, default=0)
    completed_orders = serializers.IntegerField(required=False, default=0)
    cancelled_orders = serializers.IntegerField(required=False, default=0)
    cancellation_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=Decimal('0.00'))

class CustomerAcquisitionSerializer(serializers.Serializer):
    date = serializers.DateField()
    new_customers = serializers.IntegerField()

class CustomerReportSerializer(serializers.Serializer):
    total_customers = serializers.IntegerField()
    new_customers = serializers.IntegerField()
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_customer_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_orders = serializers.IntegerField(required=False, default=0)
    completed_orders = serializers.IntegerField(required=False, default=0)
    cancelled_orders = serializers.IntegerField(required=False, default=0)
    cancellation_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, default=Decimal('0.00'))
    top_customers = TopCustomersSerializer(many=True)
    customer_acquisition = CustomerAcquisitionSerializer(many=True)

class TopCategoriesSerializer(serializers.Serializer):
    name = serializers.CharField()
    total_sales = serializers.DecimalField(max_digits=10, decimal_places=2)
    items_sold = serializers.IntegerField()
    product_count = serializers.IntegerField()
    average_price = serializers.DecimalField(max_digits=10, decimal_places=2)

class CategoryReportSerializer(serializers.Serializer):
    total_categories = serializers.IntegerField()
    total_products = serializers.IntegerField()
    sales_by_category = SalesByCategorySerializer(many=True)
    stock_by_category = StockByCategorySerializer(many=True)
    top_categories = TopCategoriesSerializer(many=True)

class RevenueByDateSerializer(serializers.Serializer):
    date = serializers.DateField(source='sale_date')
    revenue = serializers.DecimalField(max_digits=10, decimal_places=2)
    items_sold = serializers.IntegerField()

class ProfitByCategorySerializer(serializers.Serializer):
    category_name = serializers.CharField()
    revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    cost = serializers.DecimalField(max_digits=15, decimal_places=2)
    profit = serializers.DecimalField(max_digits=15, decimal_places=2)
    items_sold = serializers.IntegerField()

class ProfitLossReportSerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    gross_revenue = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_discounts = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    total_refunds = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    net_revenue = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    cogs = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    gross_profit = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    gross_margin = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=15, decimal_places=2)
    profit_margin = serializers.DecimalField(max_digits=10, decimal_places=2)
    revenue_by_date = RevenueByDateSerializer(many=True)
    expenses_by_date = ExpenseByDateSerializer(many=True)
    profit_by_category = ProfitByCategorySerializer(many=True)
    revenue_vs_expense_by_date = serializers.ListField(child=serializers.DictField(), required=False)
    preorder_total_orders = serializers.IntegerField(required=False, default=0)
    preorder_total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, default=Decimal('0.00'))
    preorder_profit = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, default=Decimal('0.00'))
    preorder_status_breakdown = serializers.DictField(required=False, default=dict)

class TaxReportSerializer(serializers.Serializer):
    taxable_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_tax_collected = serializers.DecimalField(max_digits=15, decimal_places=2)
    tax_refunded = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_tax_payable = serializers.DecimalField(max_digits=15, decimal_places=2)
    tax_by_date = serializers.ListField(child=serializers.DictField())

class ReturnsReportSerializer(serializers.Serializer):
    total_returns_count = serializers.IntegerField()
    total_items_returned = serializers.IntegerField()
    total_refund_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    return_rate_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    top_returned_products = serializers.ListField(child=serializers.DictField())
    reasons_breakdown = serializers.ListField(child=serializers.DictField())
    returns_by_date = serializers.ListField(child=serializers.DictField())

class DuesAgingReportSerializer(serializers.Serializer):
    total_receivable = serializers.DecimalField(max_digits=15, decimal_places=2)
    current_due = serializers.DecimalField(max_digits=15, decimal_places=2)
    due_1_to_30_days = serializers.DecimalField(max_digits=15, decimal_places=2)
    due_31_to_60_days = serializers.DecimalField(max_digits=15, decimal_places=2)
    due_60_plus_days = serializers.DecimalField(max_digits=15, decimal_places=2)
    aging_customers = serializers.ListField(child=serializers.DictField())

class CashReconciliationReportSerializer(serializers.Serializer):
    cash_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    cash_refunds = serializers.DecimalField(max_digits=15, decimal_places=2)
    cash_expenses = serializers.DecimalField(max_digits=15, decimal_places=2)
    due_payments_collected = serializers.DecimalField(max_digits=15, decimal_places=2)
    net_cash_in_drawer = serializers.DecimalField(max_digits=15, decimal_places=2)
    non_cash_totals = serializers.DictField()

class ProductPerformanceSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    category_name = serializers.CharField()
    total_sales = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=10, decimal_places=2)
    profit_margin = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_profit = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_selling_price_with_discount = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity_sold = serializers.IntegerField()

class SalesByProductSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    total_sales = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity_sold = serializers.IntegerField()
    average_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_selling_price_with_discount = serializers.DecimalField(max_digits=10, decimal_places=2)

class ProfitByProductSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    total_profit = serializers.DecimalField(max_digits=10, decimal_places=2)
    profit_margin = serializers.DecimalField(max_digits=10, decimal_places=2)
    quantity_sold = serializers.IntegerField()
    average_profit = serializers.DecimalField(max_digits=10, decimal_places=2)

class ProductPerformanceReportSerializer(serializers.Serializer):
    total_products = serializers.IntegerField()
    total_sales = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_profit = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_profit_margin = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_profit = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_selling_price_with_discount = serializers.DecimalField(max_digits=10, decimal_places=2)
    top_performing_products = ProductPerformanceSerializer(many=True)
    low_performing_products = ProductPerformanceSerializer(many=True)
    sales_by_product = SalesByProductSerializer(many=True)
    profit_by_product = ProfitByProductSerializer(many=True) 