from rest_framework import serializers
from .models import Customer
from apps.sales.models import Sale, SaleItem
from django.db.models import Sum, Count, Max, Q

class PurchaseHistorySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    date = serializers.DateTimeField()
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    status = serializers.CharField()
    payment_method = serializers.CharField()
    items = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )

class CustomerSerializer(serializers.ModelSerializer):
    total_sales = serializers.SerializerMethodField()
    sales_count = serializers.SerializerMethodField()
    last_sale_date = serializers.SerializerMethodField()
    purchase_history = serializers.SerializerMethodField()
    ranking = serializers.SerializerMethodField()
    is_top_customer = serializers.SerializerMethodField()
    total_due_amount = serializers.SerializerMethodField()
    average_discount = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'total_sales', 'sales_count', 'last_sale_date', 'purchase_history', 'ranking', 'is_top_customer', 'total_due_amount', 'average_discount')
        extra_kwargs = {
            'phone': {'required': True},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'email': {'required': False},
            'address': {'required': False},
            'gender': {'required': False},
            'date_of_birth': {'required': False}
        }

    def get_total_sales(self, obj):
        total = Sale.objects.filter(
            customer=obj,
            status='completed'
        ).aggregate(total=Sum('total'))['total']
        return total or 0.00

    def get_sales_count(self, obj):
        return Sale.objects.filter(
            customer=obj,
            status='completed'
        ).count()

    def get_last_sale_date(self, obj):
        last_sale = Sale.objects.filter(
            customer=obj,
            status='completed'
        ).order_by('-date').first()
        return last_sale.date if last_sale else None

    def get_ranking(self, obj):
        """Get customer ranking based on total sales"""
        return obj.ranking

    def get_is_top_customer(self, obj):
        """Check if customer is in top 5"""
        ranking = self.get_ranking(obj)
        return ranking is not None and ranking <= 5

    def get_total_due_amount(self, obj):
        """Get total due amount for customer"""
        total_due = Sale.objects.filter(
            customer=obj,
            amount_due__gt=0
        ).aggregate(total=Sum('amount_due'))['total']
        return total_due or 0.00

    def get_average_discount(self, obj):
        """Get average discount percentage for customer"""
        sales = Sale.objects.filter(
            customer=obj,
            status='completed',
            total__gt=0
        )
        if sales.exists():
            total_discount = sales.aggregate(total=Sum('discount'))['total'] or 0
            total_sales = sales.aggregate(total=Sum('total'))['total'] or 0
            if total_sales > 0:
                return (total_discount / total_sales) * 100
        return 0.00

    def get_purchase_history(self, obj):
        # Only compute full purchase history for retrieve/detail view to avoid N+1 queries during list/export
        view = self.context.get('view')
        if view and getattr(view, 'action', None) not in [None, 'retrieve']:
            return []

        sales = Sale.objects.filter(
            customer=obj
        ).order_by('-date')
        
        history = []
        for sale in sales:
            items = []
            for item in sale.items.all():
                items.append({
                    'product_name': item.product.name,
                    'size': item.size,
                    'color': item.color,
                    'quantity': item.quantity,
                    'unit_price': str(item.unit_price),
                    'total': str(item.total)
                })
            
            history.append({
                'id': sale.id,
                'date': sale.date,
                'total_amount': str(sale.total),
                'status': sale.status,
                'payment_method': sale.payment_method,
                'discount': str(sale.discount),
                'amount_due': str(sale.amount_due),
                'amount_paid': str(sale.amount_paid),
                'items': items
            })
        
        return history

class TopCustomerSerializer(serializers.ModelSerializer):
    """Serializer for top customers with additional analytics"""
    total_sales = serializers.SerializerMethodField()
    sales_count = serializers.SerializerMethodField()
    average_order_value = serializers.SerializerMethodField()
    last_purchase_date = serializers.SerializerMethodField()
    ranking = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'total_sales', 
                 'sales_count', 'average_order_value', 'last_purchase_date', 'ranking']

    def get_total_sales(self, obj):
        total = Sale.objects.filter(
            customer=obj,
            status='completed'
        ).aggregate(total=Sum('total'))['total']
        return total or 0.00

    def get_sales_count(self, obj):
        return Sale.objects.filter(
            customer=obj,
            status='completed'
        ).count()

    def get_average_order_value(self, obj):
        sales = Sale.objects.filter(
            customer=obj,
            status='completed'
        )
        if sales.exists():
            total = sales.aggregate(total=Sum('total'))['total'] or 0
            return total / sales.count()
        return 0.00

    def get_last_purchase_date(self, obj):
        last_sale = Sale.objects.filter(
            customer=obj,
            status='completed'
        ).order_by('-date').first()
        return last_sale.date if last_sale else None

    def get_ranking(self, obj):
        """Get customer ranking based on total sales"""
        if obj.ranking:
            return obj.ranking
        
        # Calculate ranking if not set
        customers_with_sales = Customer.objects.annotate(
            total_sales=Sum('sale__total', filter=Q(sale__status='completed'))
        ).order_by('-total_sales')
        
        for rank, customer in enumerate(customers_with_sales, 1):
            if customer.id == obj.id:
                return rank
        return None 