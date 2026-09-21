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
        ('HOLD', 'Hold'),
        ('RETURNED', 'Returned'),
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

    # Attribution fields
    fbp = models.CharField(max_length=255, null=True, blank=True)
    fbc = models.CharField(max_length=255, null=True, blank=True)
    fbclid = models.CharField(max_length=255, null=True, blank=True)
    utm_source = models.CharField(max_length=255, null=True, blank=True)
    utm_medium = models.CharField(max_length=255, null=True, blank=True)
    utm_campaign = models.CharField(max_length=255, null=True, blank=True)
    utm_content = models.CharField(max_length=255, null=True, blank=True)
    utm_term = models.CharField(max_length=255, null=True, blank=True)

    # Event Deduplication & Meta CAPI Idempotency
    event_id = models.CharField(max_length=255, null=True, blank=True, unique=True, db_index=True)
    purchase_event_sent = models.BooleanField(default=False)
    purchase_event_sent_at = models.DateTimeField(null=True, blank=True)

    # Technical & Fraud Detection Signals
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    session_id = models.CharField(max_length=255, null=True, blank=True)
    risk_score = models.IntegerField(default=0)
    risk_level = models.CharField(max_length=20, default='LOW')

    # Cancellation & Steadfast courier fields (maintained for backward compatibility)
    cancel_reason = models.CharField(max_length=255, null=True, blank=True)
    is_fake = models.BooleanField(default=False, help_text="Marked as fake order or fake customer")
    steadfast_consignment_id = models.CharField(max_length=100, null=True, blank=True)
    steadfast_status = models.CharField(max_length=100, null=True, blank=True)
    steadfast_tracking_code = models.CharField(max_length=100, null=True, blank=True)

    # Multi-Delivery Agent Courier Partner fields
    courier_partner = models.CharField(max_length=50, null=True, blank=True, help_text="STEADFAST, PATHAO, REDX, CARRYBEE")
    courier_consignment_id = models.CharField(max_length=100, null=True, blank=True)
    courier_tracking_code = models.CharField(max_length=100, null=True, blank=True)
    courier_status = models.CharField(max_length=100, null=True, blank=True)
    courier_dispatched_at = models.DateTimeField(null=True, blank=True)
    courier_delivered_at = models.DateTimeField(null=True, blank=True)
    courier_response = models.JSONField(null=True, blank=True)

    # Return & Hold Management fields
    return_delivery_charge_paid_by_customer = models.BooleanField(default=True, help_text="True if customer paid return delivery fee, False if store bears cost")
    return_charge_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'), help_text="Delivery charge amount counted when store bears return fee")
    return_reason = models.CharField(max_length=255, blank=True, null=True)
    return_expense = models.ForeignKey('expenses.Expense', on_delete=models.SET_NULL, null=True, blank=True, related_name='returned_preorders')
    hold_reason = models.CharField(max_length=255, blank=True, null=True)
    returned_at = models.DateTimeField(null=True, blank=True)
    is_stock_restored = models.BooleanField(default=False, help_text="Whether items in this returned or cancelled order have been restocked to inventory")
    is_stock_deducted = models.BooleanField(default=False, help_text="Whether items in this preorder have had stock deducted from inventory")


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


class MetaEventLog(models.Model):
    """
    Log of Meta CAPI and GTM server event dispatches for auditing, troubleshooting, and idempotency tracking.
    """
    STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('SKIPPED', 'Skipped / Already Sent'),
    ]

    online_preorder = models.ForeignKey(
        OnlinePreorder,
        on_delete=models.CASCADE,
        related_name='meta_event_logs'
    )
    event_id = models.CharField(max_length=255, db_index=True)
    event_name = models.CharField(max_length=100, default='Purchase')
    action_source = models.CharField(max_length=50, default='website')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SUCCESS')
    request_payload = models.JSONField(default=dict, blank=True)
    response_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"MetaEventLog #{self.id} [{self.event_name}] Order #{self.online_preorder_id} - {self.status}"


class CourierSetting(models.Model):
    """
    Settings and credentials for multi-delivery agents (Steadfast, Pathao, RedX, Carrybee).
    Configurable via Settings page in the frontend.
    """
    PROVIDER_CHOICES = [
        ('STEADFAST', 'Steadfast Courier'),
        ('PATHAO', 'Pathao Courier'),
        ('REDX', 'RedX Courier'),
        ('CARRYBEE', 'Carrybee Courier'),
    ]

    provider = models.CharField(max_length=50, choices=PROVIDER_CHOICES, unique=True)
    is_active = models.BooleanField(default=False, help_text="Enable or disable this delivery agent in online preorders")
    is_default = models.BooleanField(default=False, help_text="Default selected courier agent")

    # API Keys & Secrets
    api_key = models.CharField(max_length=255, blank=True, null=True)
    secret_key = models.CharField(max_length=255, blank=True, null=True)
    base_url = models.CharField(max_length=255, blank=True, null=True)

    # Provider specific fields (e.g. Pathao OAuth & Store ID)
    client_id = models.CharField(max_length=255, blank=True, null=True)
    client_secret = models.CharField(max_length=255, blank=True, null=True)
    username = models.CharField(max_length=255, blank=True, null=True)
    password = models.CharField(max_length=255, blank=True, null=True)
    store_id = models.CharField(max_length=100, blank=True, null=True)

    extra_config = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['provider']
        verbose_name = 'Courier Setting'
        verbose_name_plural = 'Courier Settings'

    def __str__(self):
        return f"{self.get_provider_display()} ({'Active' if self.is_active else 'Disabled'})"

    def has_valid_credentials(self) -> bool:
        """Returns True if the required credentials for this courier exist."""
        if self.provider == 'STEADFAST':
            from django.conf import settings
            key = self.api_key or getattr(settings, 'STEADFAST_API_KEY', '')
            sec = self.secret_key or getattr(settings, 'STEADFAST_SECRET_KEY', '')
            return bool((key and sec and key != 'default_api_key') or self.api_key)
        elif self.provider == 'PATHAO':
            # Support both direct Bearer/API token and OAuth client credentials
            return bool(self.api_key or (self.client_id and self.client_secret))
        elif self.provider == 'REDX':
            return bool(self.api_key)
        elif self.provider == 'CARRYBEE':
            return bool(self.api_key)
        return False

    def save(self, *args, **kwargs):
        # If credentials exist and is_active is False, auto-activate by default
        if self.has_valid_credentials() and not self.is_active:
            if 'update_fields' not in kwargs or 'is_active' not in kwargs['update_fields']:
                self.is_active = True
        super().save(*args, **kwargs)



