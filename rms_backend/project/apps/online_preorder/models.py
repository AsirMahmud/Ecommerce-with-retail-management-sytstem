from django.db import models
from django.utils import timezone
from django.conf import settings
from decimal import Decimal


class OnlinePreorder(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('DELIVERED', 'Delivered'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    customer_name = models.CharField(max_length=200)
    customer_phone = models.CharField(max_length=20)
    customer_email = models.EmailField(blank=True)
    items = models.JSONField(default=list, blank=True)
    shipping_address = models.JSONField(null=True, blank=True)
    delivery_charge = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    delivery_method = models.CharField(max_length=30, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    coupon = models.ForeignKey('ecommerce.Coupon', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    coupon_code = models.CharField(max_length=50, blank=True)
    coupon_interaction_mode = models.CharField(max_length=10, blank=True)
    original_subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    automatic_discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    coupon_discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    final_merchandise_subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True)
    expected_delivery_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Optional denormalized fields
    quantity = models.IntegerField(default=0)
    profit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    def __str__(self):
        return f"OnlinePreorder #{self.id} - {self.customer_name}"

    def save(self, *args, **kwargs):
        # Calculate total if items provided and total not explicitly set
        if self.items:
            items_subtotal = sum(
                float(item.get('quantity', 0)) * float(item.get('unit_price', 0)) - float(item.get('discount', 0) or 0)
                for item in self.items
            )
            delivery = float(self.delivery_charge or 0)
            merchandise_total = self.final_merchandise_subtotal if (
                self.coupon_id or self.final_merchandise_subtotal > 0
            ) else Decimal(str(items_subtotal))
            self.total_amount = merchandise_total + Decimal(str(delivery))
            # Best-effort denormalization without inventory dependency
            total_qty = 0
            for item in self.items:
                qty = int(item.get('quantity', 0))
                total_qty += qty
                self.unit_price = Decimal(str(item.get('unit_price', 0) or 0))
                # cost_price/profit unknown without inventory; keep defaults
            self.quantity = total_qty
        super().save(*args, **kwargs)


class OnlineConversion(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    online_preorder = models.OneToOneField(OnlinePreorder, on_delete=models.CASCADE, related_name='conversion')
    sale = models.ForeignKey('sales.Sale', on_delete=models.SET_NULL, null=True, blank=True, related_name='from_online_preorder')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    error_text = models.TextField(blank=True)
    converted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def mark_success(self, sale):
        self.sale = sale
        self.status = 'SUCCESS'
        self.error_text = ''
        self.converted_at = timezone.now()
        self.save(update_fields=['sale', 'status', 'error_text', 'converted_at', 'updated_at'])

    def mark_failed(self, error_text: str):
        self.status = 'FAILED'
        self.error_text = error_text[:1000]
        self.save(update_fields=['status', 'error_text', 'updated_at'])

    def __str__(self) -> str:
        return f"OnlineConversion(online_preorder={self.online_preorder_id}, status={self.status})"


class OnlinePreorderVerification(models.Model):
    """
    Tracks a verification session for an OnlinePreorder before it is delivered.
    """
    STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('SKIPPED', 'Skipped'),
    ]

    online_preorder = models.OneToOneField(
        OnlinePreorder,
        on_delete=models.CASCADE,
        related_name='verification'
    )
    operator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='online_preorder_verifications'
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='IN_PROGRESS')
    total_units = models.IntegerField(default=0)
    verified_units = models.IntegerField(default=0)
    skipped_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    skipped_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Verification #{self.id} for OnlinePreorder #{self.online_preorder_id}"


class OnlinePreorderVerificationItem(models.Model):
    """
    Line-level tracking of ordered vs verified quantities per SKU.
    """
    verification = models.ForeignKey(
        OnlinePreorderVerification,
        on_delete=models.CASCADE,
        related_name='items'
    )
    product = models.ForeignKey(
        'inventory.Product',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='online_preorder_verification_items'
    )
    sku = models.CharField(max_length=64, db_index=True)
    product_name = models.CharField(max_length=255, blank=True)
    ordered_qty = models.IntegerField(default=0)
    verified_qty = models.IntegerField(default=0)

    class Meta:
        unique_together = ('verification', 'sku')

    def __str__(self):
        return f"{self.sku} ({self.verified_qty}/{self.ordered_qty})"


class OnlinePreorderVerificationScanLog(models.Model):
    """
    Optional audit log for each scan event.
    """
    RESULT_CHOICES = [
        ('MATCHED', 'Matched'),
        ('NOT_IN_ORDER', 'Not In Order'),
        ('OVER_SCAN', 'Over Scan'),
    ]

    verification = models.ForeignKey(
        OnlinePreorderVerification,
        on_delete=models.CASCADE,
        related_name='scan_logs'
    )
    sku = models.CharField(max_length=64)
    result = models.CharField(max_length=16, choices=RESULT_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Scan {self.sku} -> {self.result}"

