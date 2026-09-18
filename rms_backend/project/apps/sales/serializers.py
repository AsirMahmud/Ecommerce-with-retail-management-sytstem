from rest_framework import serializers
from .models import Sale, SaleItem, Payment, Return, ReturnItem, SalePayment, DuePayment
from apps.inventory.serializers import ProductSerializer
from apps.customer.serializers import CustomerSerializer
from apps.customer.models import Customer
from apps.inventory.models import Product, ProductVariation
from django.core.exceptions import ValidationError
from django.db.models import Sum
from decimal import Decimal

class SaleItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    size = serializers.CharField(max_length=50)
    color = serializers.CharField(max_length=50)
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        min_value=Decimal('0.01')
    )
    discount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        min_value=Decimal('0.00')
    )

    returned_quantity = serializers.SerializerMethodField()
    returnable_quantity = serializers.SerializerMethodField()

    class Meta:
        model = SaleItem
        fields = [
            'id', 'product', 'product_id', 'size', 'color',
            'quantity', 'unit_price', 'discount', 'total', 'profit', 'loss',
            'returned_quantity', 'returnable_quantity', 'created_at'
        ]
        read_only_fields = ['total', 'profit', 'loss', 'returned_quantity', 'returnable_quantity']

    def get_returned_quantity(self, obj):
        from .models import ReturnItem
        total = ReturnItem.objects.filter(
            sale_item=obj,
            return_order__status__in=['completed', 'approved']
        ).aggregate(total=Sum('quantity'))['total'] or 0
        return total

    def get_returnable_quantity(self, obj):
        return max(0, obj.quantity - self.get_returned_quantity(obj))

    def validate(self, data):
        if data['quantity'] <= 0:
            raise serializers.ValidationError("Quantity must be greater than 0")
        if data['unit_price'] < Decimal('0.00'):
            raise serializers.ValidationError("Unit price cannot be negative")
        if data['discount'] < Decimal('0.00'):
            raise serializers.ValidationError("Discount cannot be negative")
        return data

    def create(self, validated_data):
        # Calculate total
        quantity = validated_data.get('quantity', 0)
        unit_price = validated_data.get('unit_price', 0)
        discount = validated_data.get('discount', 0)
        validated_data['total'] = (quantity * unit_price) - discount
        
        return super().create(validated_data)

class SalePaymentSerializer(serializers.ModelSerializer):
    """Serializer for the new enhanced payment model"""
    class Meta:
        model = SalePayment
        fields = [
            'id', 'sale', 'amount', 'payment_method', 'status',
            'transaction_id', 'payment_date', 'notes', 'is_gift_payment', 'created_at'
        ]
        read_only_fields = ['created_at', 'is_gift_payment']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value

class DuePaymentSerializer(serializers.ModelSerializer):
    """Serializer for due payment tracking"""
    remaining_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = DuePayment
        fields = [
            'id', 'sale', 'amount_due', 'amount_paid', 'remaining_amount',
            'due_date', 'status', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'remaining_amount']

class PaymentSerializer(serializers.ModelSerializer):
    """Legacy payment serializer - keeping for backward compatibility"""
    class Meta:
        model = Payment
        fields = [
            'id', 'sale', 'amount', 'payment_method', 'status',
            'transaction_id', 'payment_date', 'notes', 'created_at'
        ]
        read_only_fields = ['created_at']

class ReturnItemSerializer(serializers.ModelSerializer):
    sale_item = SaleItemSerializer(read_only=True)
    sale_item_id = serializers.PrimaryKeyRelatedField(
        queryset=SaleItem.objects.all(),
        source='sale_item',
        write_only=True
    )
    product_name = serializers.SerializerMethodField()
    sku = serializers.SerializerMethodField()
    size = serializers.SerializerMethodField()
    color = serializers.SerializerMethodField()
    unit_price = serializers.SerializerMethodField()

    class Meta:
        model = ReturnItem
        fields = [
            'id', 'return_order', 'sale_item', 'sale_item_id',
            'product_name', 'sku', 'size', 'color', 'unit_price',
            'quantity', 'reason', 'created_at'
        ]
        read_only_fields = ['created_at']

    def get_product_name(self, obj):
        if obj.sale_item and obj.sale_item.product:
            return obj.sale_item.product.name
        return ""

    def get_sku(self, obj):
        if obj.sale_item and obj.sale_item.product:
            return obj.sale_item.product.sku
        return ""

    def get_size(self, obj):
        return obj.sale_item.size if obj.sale_item else ""

    def get_color(self, obj):
        return obj.sale_item.color if obj.sale_item else ""

    def get_unit_price(self, obj):
        if obj.sale_item and obj.sale_item.unit_price is not None:
            return str(obj.sale_item.unit_price)
        return "0.00"

class ReturnSerializer(serializers.ModelSerializer):
    items = ReturnItemSerializer(many=True, read_only=True)
    sale_id = serializers.PrimaryKeyRelatedField(
        queryset=Sale.objects.all(),
        source='sale',
        write_only=True
    )
    sale_details = serializers.SerializerMethodField()

    class Meta:
        model = Return
        fields = [
            'id', 'sale', 'sale_id', 'sale_details', 'return_number', 'reason', 'status',
            'refund_amount', 'refund_method', 'delivery_charge_paid_by_customer',
            'return_charge_amount', 'notes', 'processed_date', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['return_number', 'created_at', 'updated_at', 'sale_details']

    def get_sale_details(self, obj):
        if not obj.sale:
            return None
        sale = obj.sale
        customer_name = "Walk-in Customer"
        customer_phone = ""
        if sale.customer:
            customer_name = f"{sale.customer.first_name} {sale.customer.last_name}".strip() or "Walk-in Customer"
            customer_phone = sale.customer.phone or ""
        return {
            'id': sale.id,
            'invoice_number': sale.invoice_number,
            'customer_name': customer_name,
            'customer_phone': customer_phone,
            'total': str(sale.total),
            'payment_method': sale.payment_method,
            'date': sale.created_at.isoformat() if sale.created_at else None,
        }

    def create(self, validated_data):
        items_data = validated_data.pop('items', []) or self.context.get('items', [])
        return_order = Return.objects.create(**validated_data)
        
        for item_data in items_data:
            sale_item_id = item_data.get('sale_item_id') or item_data.get('sale_item')
            if isinstance(sale_item_id, SaleItem):
                sale_item = sale_item_id
            else:
                sale_item = SaleItem.objects.get(id=sale_item_id)
            ReturnItem.objects.create(
                return_order=return_order,
                sale_item=sale_item,
                quantity=item_data.get('quantity', 1),
                reason=item_data.get('reason', '')
            )
        
        return return_order

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    payments = PaymentSerializer(many=True, read_only=True)  # Legacy payments
    sale_payments = SalePaymentSerializer(many=True, read_only=True)  # New payment system
    due_payments = DuePaymentSerializer(many=True, read_only=True)
    returns = ReturnSerializer(many=True, read_only=True)
    customer = CustomerSerializer(read_only=True)
    customer_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    customer_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    customer_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    # Payment information for the sale
    payment_data = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        help_text="List of payment methods and amounts for split payments"
    )
    
    subtotal = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00')
    )
    tax = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00')
    )
    discount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        min_value=Decimal('0.00')
    )
    total = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=Decimal('0.00')
    )
    
    # Read-only computed fields
    is_fully_paid = serializers.ReadOnlyField()
    payment_status = serializers.ReadOnlyField()
    total_profit = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    total_loss = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    status = serializers.CharField(default='pending')

    class Meta:
        model = Sale
        fields = [
            'id', 'invoice_number', 'customer', 'customer_id', 'customer_phone', 'customer_name',
            'date', 'sale_type', 'subtotal', 'tax', 'discount', 'total', 'total_profit', 'total_loss',
            'payment_method', 'status', 'amount_paid', 'amount_due', 'gift_amount',
            'is_fully_paid', 'payment_status', 'notes', 'items', 'payments', 'sale_payments',
            'due_payments', 'returns', 'payment_data'
        ]
        read_only_fields = ['invoice_number', 'total', 'total_profit', 'total_loss', 
                           'amount_paid', 'amount_due', 'gift_amount', 'is_fully_paid', 'payment_status']

    def validate(self, data):
        if 'items' not in data or not data['items']:
            raise serializers.ValidationError("At least one item is required")
        
        # Calculate totals
        subtotal = Decimal('0.00')
        for item in data['items']:
            item_total = (item['quantity'] * item['unit_price']) - item['discount']
            if item_total < Decimal('0.00'):
                raise serializers.ValidationError(f"Item total cannot be negative for product {item['product_id']}")
            subtotal += item_total
        
        data['subtotal'] = subtotal
        data['total'] = subtotal + data['tax'] - data['discount']
        
        if data['total'] < Decimal('0.00'):
            raise serializers.ValidationError("Total amount cannot be negative")
        
        # Validate payment data if provided
        payment_data = data.get('payment_data', [])
        if payment_data:
            total_payment_amount = Decimal('0.00')
            valid_payment_methods = ['cash', 'card', 'mobile', 'gift']
            
            for payment in payment_data:
                if 'amount' not in payment or 'method' not in payment:
                    raise serializers.ValidationError("Each payment must have 'amount' and 'method' fields")
                
                try:
                    amount = Decimal(str(payment['amount']))
                    if amount <= 0:
                        raise serializers.ValidationError("Payment amounts must be greater than 0")
                    total_payment_amount += amount
                except (ValueError, TypeError):
                    raise serializers.ValidationError("Invalid payment amount")
                
                if payment['method'] not in valid_payment_methods:
                    raise serializers.ValidationError(f"Invalid payment method: {payment['method']}")
            
            # Payment amount can be less than or equal to total (partial payments allowed)
            if total_payment_amount > data['total']:
                raise serializers.ValidationError("Total payment amount cannot exceed sale total")
        
        return data

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        payment_data = validated_data.pop('payment_data', None)
        customer_phone = validated_data.pop('customer_phone', None)
        customer_name = validated_data.pop('customer_name', None)

        # Find or create customer based on phone number
        if customer_phone:
            customer = Sale.find_or_create_customer(customer_phone, customer_name)
            validated_data['customer'] = customer
            validated_data['customer_phone'] = customer_phone

        # Get payment method and total for automatic payment processing
        payment_method = validated_data.get('payment_method', 'cash')
        total_amount = validated_data.get('total', Decimal('0.00'))

        # If no payment_data provided but payment_method is set, create automatic payment
        # Exclude 'credit' payment method as it represents due sales with no payment
        # Also exclude cases where payment_data is explicitly set to empty array (due sales)
        if payment_data is None and payment_method in ['cash', 'card', 'mobile', 'gift']:
            payment_data = [{
                'method': payment_method,
                'amount': str(total_amount),
                'notes': f'Automatic {payment_method} payment'
            }]

        # Set payment method based on payment data
        if payment_data:
            if len(payment_data) > 1:
                validated_data['payment_method'] = 'split'
            else:
                validated_data['payment_method'] = payment_data[0]['method']
        
        # Initialize payment tracking fields
        validated_data['amount_paid'] = Decimal('0.00')
        validated_data['amount_due'] = validated_data['total']
        validated_data['gift_amount'] = Decimal('0.00')

        # Create the sale first
        sale = Sale.objects.create(**validated_data)
        
        # Create sale items
        for item_data in items_data:
            item_data['sale'] = sale
            SaleItem.objects.create(**item_data)
        
        # Reduce stock immediately when sale is created (regardless of payment status)
        # Items are being taken from inventory whether paid, due, or gifted
        sale._reduce_stock_for_sale_items()
        
        # Process payments if provided
        if payment_data:
            self._process_payments(sale, payment_data)
        
        return sale

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        payment_data = validated_data.pop('payment_data', None)
        
        # Update sale fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()
            # Create new items
            for item_data in items_data:
                SaleItem.objects.create(sale=instance, **item_data)
        
        # Process new payments if provided
        if payment_data:
            self._process_payments(instance, payment_data)
        
        return instance

    def _process_payments(self, sale, payment_data):
        """Process payment data and create SalePayment records"""
        total_payment_amount = Decimal('0.00')
        
        for payment in payment_data:
            amount = Decimal(str(payment['amount']))
            method = payment['method']
            notes = payment.get('notes', '')
            transaction_id = payment.get('transaction_id', '')
            
            # Create payment record
            SalePayment.objects.create(
                sale=sale,
                amount=amount,
                payment_method=method,
                status='completed',
                transaction_id=transaction_id,
                notes=notes
            )
            
            total_payment_amount += amount
        
        # Create due payment record if there's remaining balance
        if total_payment_amount < sale.total:
            remaining_amount = sale.total - total_payment_amount
            from datetime import datetime, timedelta
            
            DuePayment.objects.create(
                sale=sale,
                amount_due=remaining_amount,
                due_date=datetime.now().date() + timedelta(days=30),  # Default 30 days
                notes="Remaining balance from initial sale"
            )
        
        # Update sale payment status
        sale.update_payment_status()

class CompletePaymentSerializer(serializers.Serializer):
    """Serializer for completing payments on existing sales"""
    payment_data = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of payment methods and amounts"
    )
    
    def validate_payment_data(self, value):
        """Validate payment data structure"""
        if not value:
            raise serializers.ValidationError("Payment data is required")
        
        valid_payment_methods = ['cash', 'card', 'mobile', 'gift']
        
        for payment in value:
            if 'amount' not in payment or 'method' not in payment:
                raise serializers.ValidationError("Each payment must have 'amount' and 'method' fields")
            
            try:
                amount = Decimal(str(payment['amount']))
                if amount <= 0:
                    raise serializers.ValidationError("Payment amounts must be greater than 0")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Invalid payment amount")
            
            if payment['method'] not in valid_payment_methods:
                raise serializers.ValidationError(f"Invalid payment method: {payment['method']}")
        
        return value

class DuePaymentCompletionSerializer(serializers.Serializer):
    """Serializer for making payments on due amounts"""
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    payment_method = serializers.ChoiceField(choices=['cash', 'card', 'mobile', 'gift'])
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)
    transaction_id = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than 0")
        return value 