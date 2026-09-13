from django.db import models
from django.core.validators import MinValueValidator
from django.utils.text import slugify
import uuid
from django.utils import timezone
from decimal import Decimal
from django.conf import settings
from apps.supplier.models import Supplier
from apps.inventory.models import Category, Product
from django.db.models import Sum

from apps.sales.models import Sale, SaleItem
from apps.sales.serializers import SaleSerializer

class PreorderProduct(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('COMPLETED', 'Completed'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='preorder_products')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='preorder_products')
    estimated_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))],null=True,blank=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    expected_arrival_date = models.DateField()
    max_quantity = models.IntegerField(default=0, validators=[MinValueValidator(0)])  # 0 means unlimited
    current_orders = models.IntegerField(default=0)
    image = models.ImageField(upload_to='preorder_products/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='ACTIVE')
    size_type = models.CharField(max_length=50, null=True, blank=True)
    size_category = models.CharField(max_length=50, null=True, blank=True)
    gender = models.CharField(max_length=6, choices=[('MALE', 'Male'), ('FEMALE', 'Female'), ('UNISEX', 'Unisex')], default='UNISEX')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (Preorder)"

    @property
    def available_quantity(self):
        if self.max_quantity == 0:
            return -1  # Unlimited
        return max(0, self.max_quantity - self.current_orders)

    @property
    def is_available(self):
        return self.is_active and self.status == 'ACTIVE' and (
            self.max_quantity == 0 or self.current_orders < self.max_quantity
        )


class PreorderVariation(models.Model):
    preorder_product = models.ForeignKey(PreorderProduct, on_delete=models.CASCADE, related_name='variations')
    size = models.CharField(max_length=50, default='Standard')
    color = models.CharField(max_length=50, default='Default')
    color_hax = models.CharField(max_length=50, default='#FFFFF')
    max_quantity = models.IntegerField(default=0, validators=[MinValueValidator(0)])  # 0 means unlimited
    current_orders = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('preorder_product', 'size', 'color')

    def __str__(self):
        return f"{self.preorder_product.name} - {self.size} - {self.color} (Preorder)"

    @property
    def available_quantity(self):
        if self.max_quantity == 0:
            return -1  # Unlimited
        return max(0, self.max_quantity - self.current_orders)


class Preorder(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('DEPOSIT_PAID', 'Deposit Paid'),
        ('FULLY_PAID', 'Fully Paid'),
        ('ARRIVED', 'Arrived'),
        ('DELIVERED', 'Delivered'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    customer_name = models.CharField(max_length=200)
    customer_phone = models.CharField(max_length=20)
    customer_email = models.EmailField(blank=True)
    
    items = models.JSONField(default=list, blank=True)  # Store all product/variant snapshots
    deposit_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    quantity = models.IntegerField(default=0)
    profit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        # Get the first product name from items for display
        if self.items:
            try:
                product = Product.objects.get(id=self.items[0].get('product_id'))
                return f"Preorder #{self.id} - {self.customer_name} - {product.name}"
            except Product.DoesNotExist:
                return f"Preorder #{self.id} - {self.customer_name}"
        return f"Preorder #{self.id} - {self.customer_name}"

    def save(self, *args, **kwargs):
        # Calculate total amount if not set
        if not self.total_amount and self.items:
            self.total_amount = sum(item.get('total', 0) for item in self.items)
        # Calculate total quantity and profit using actual Product
        if self.items:
            total_qty = 0
            total_profit = Decimal('0.00')
            unit_price = Decimal('0.00')
            cost_price = Decimal('0.00')
            for item in self.items:
                qty = int(item.get('quantity', 0))
                total_qty += qty
                try:
                    product = Product.objects.get(id=item['product_id'])
                    item_unit_price = Decimal(str(product.selling_price))
                    item_cost_price = Decimal(str(product.cost_price))
                except Product.DoesNotExist:
                    item_unit_price = Decimal('0.00')
                    item_cost_price = Decimal('0.00')
                unit_price = item_unit_price  # last one, or you could average if needed
                cost_price = item_cost_price  # last one, or you could average if needed
                total_profit += (item_unit_price - item_cost_price) * Decimal(str(qty))
            self.quantity = total_qty
            self.unit_price = unit_price
            self.cost_price = cost_price
            self.profit = total_profit
        # Remove the preorder_product dependency - no need to update order counts
        super().save(*args, **kwargs)

    def cancel(self):
        if self.status not in ['CANCELLED', 'DELIVERED', 'COMPLETED']:
            # Remove the preorder_product dependency - no need to update order counts
            self.status = 'CANCELLED'
            self.save()

    def complete_and_convert_to_sale(self):
        """Complete the preorder and convert it to a sale"""
        if self.status not in ['CANCELLED', 'COMPLETED']:
            # Prepare sale data
            sale_data = {
                'customer_phone': self.customer_phone,
                'customer_name': self.customer_name,
                'subtotal': sum(float(item['quantity']) * float(item['unit_price']) for item in self.items),
                'tax': 0,
                'discount': 0,
                'total': sum(float(item['quantity']) * float(item['unit_price']) for item in self.items),
                'payment_method': 'cash',
                'status': 'completed',
                'notes': f"Converted from preorder #{self.id}",
                'items': [
                    {
                        'product_id': item['product_id'],
                        'size': item['size'],
                        'color': item['color'],
                        'quantity': int(item['quantity']),
                        'unit_price': float(item['unit_price']),
                        'discount': float(item.get('discount', 0)),
                    }
                    for item in self.items
                ],
                'payment_data': [{
                    'method': 'cash',
                    'amount': sum(float(item['quantity']) * float(item['unit_price']) for item in self.items),
                    'notes': f"Payment for preorder #{self.id}",
                }],
            }
            # Use SaleSerializer to create the sale and items
            serializer = SaleSerializer(data=sale_data)
            serializer.is_valid(raise_exception=True)
            sale = serializer.save()
            self.status = 'COMPLETED'
            self.save()
            return sale
        return None 