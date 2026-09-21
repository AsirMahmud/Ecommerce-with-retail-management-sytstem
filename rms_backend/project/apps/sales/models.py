from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from pydantic import ValidationError
from apps.inventory.models import Product, ProductVariation, StockMovement
from apps.customer.models import Customer
import uuid
from decimal import Decimal

def generate_invoice_number():
    return f"INV-{uuid.uuid4().hex[:8].upper()}"

def generate_return_number():
    return f"RET-{uuid.uuid4().hex[:8].upper()}"

class Sale(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('mobile', 'Mobile'),
        ('gift', 'Gift Card'),
        ('split', 'Split Payment'),
        ('credit', 'Credit')
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('partially_paid', 'Partially Paid'),
        ('gifted', 'Gifted'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded')
    ]

    SALE_TYPE_CHOICES = [
        ('shop', 'Shop'),
        ('online_preorder', 'Online Preorder'),
        ('offline_preorder', 'Offline Preorder (Just Preorder)')
    ]
    
    invoice_number = models.CharField(max_length=50, unique=True, default=generate_invoice_number)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    customer_phone = models.CharField(max_length=15, null=True, blank=True)
    date = models.DateTimeField(default=timezone.now)
    sale_type = models.CharField(max_length=20, choices=SALE_TYPE_CHOICES, default='shop')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    tax = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))])
    total = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    total_profit = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))])
    total_loss = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))])
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # New payment tracking fields
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))])
    amount_due = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))])
    gift_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))])
    
    notes = models.TextField(blank=True)
    idempotency_key = models.CharField(max_length=120, unique=True, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Sale {self.invoice_number}"

    @property
    def is_fully_paid(self):
        """Check if the sale is fully paid"""
        return self.amount_paid >= self.total

    @property
    def payment_status(self):
        """Get the payment status based on amount paid"""
        if self.amount_paid >= self.total:
            return 'fully_paid'
        elif self.amount_paid > 0:
            return 'partially_paid'
        else:
            return 'unpaid'

    def update_payment_status(self):
        """Update sale status based on payments"""
        # Store the old status to check if it changed
        old_status = self.status
        
        total_payments = self.sale_payments.filter(status='completed').aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')
        
        self.amount_paid = total_payments
        self.amount_due = self.total - self.amount_paid
        
        # Check if this is entirely a gift payment
        total_gift_payments = self.sale_payments.filter(
            payment_method='gift', 
            status='completed'
        ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
        
        if total_gift_payments >= self.total:
            # This is entirely a gift - set status to "gifted"
            self.status = 'gifted'
        elif self.amount_paid >= self.total:
            self.status = 'completed'
        elif self.amount_paid > 0:
            self.status = 'partially_paid'
        else:
            self.status = 'pending'
        
        self.save(update_fields=['amount_paid', 'amount_due', 'status'])
        
        # Handle stock reduction when status changes to completed or gifted
        # Note: Stock is now reduced at sale creation, so we only need to update movement type for gifts
        if old_status != 'gifted' and self.status == 'gifted':
            self._update_stock_movements_to_gift()

    def _reduce_stock_for_sale_items(self):
        """Reduce stock for all items in this sale when sale is completed or gifted"""
        from apps.inventory.models import StockMovement
        
        for item in self.items.all():
            variation = item.get_variation()
            if variation:
                # Check if stock movement already exists to avoid duplicates
                existing_movement = StockMovement.objects.filter(
                    product=item.product,
                    variation=variation,
                    reference_number=self.invoice_number,
                    movement_type__in=['OUT', 'GIFT']  # Check for both OUT and GIFT types
                ).first()
                
                if not existing_movement:
                    # Determine movement type based on sale status
                    movement_type = 'GIFT' if self.status == 'gifted' else 'OUT'
                    movement_notes = f"{'Gift transaction' if self.status == 'gifted' else 'Sale item'} from {self.invoice_number}"
                    
                    # Create stock movement record
                    StockMovement.objects.create(
                        product=item.product,
                        variation=variation,
                        movement_type=movement_type,
                        quantity=item.quantity,
                        reference_number=self.invoice_number,
                        notes=movement_notes
                    )
                    
                    # Update variation stock
                    variation.stock -= item.quantity
                    variation.save()
                    
                    # Update product stock
                    item.product.stock_quantity -= item.quantity
                    item.product.save()

    def _update_stock_movements_to_gift(self):
        """Update existing stock movements to GIFT type when sale becomes a gift"""
        from apps.inventory.models import StockMovement
        
        # Find and update existing stock movements for this sale
        StockMovement.objects.filter(
            reference_number=self.invoice_number,
            movement_type='OUT'
        ).update(
            movement_type='GIFT',
            notes=f"Gift transaction from {self.invoice_number}"
        )

    def record_gift_as_expense(self):
        """Record gift payments as expenses in the expense system using cost price"""
        from apps.expenses.models import Expense, ExpenseCategory
        
        # Get or create a gift card expense category
        gift_category, created = ExpenseCategory.objects.get_or_create(
            name="Gift Card Payments",
            defaults={
                'description': 'Gift card payments from sales',
                'color': '#10b981'  # Green color
            }
        )
        
        # Calculate expense amount based on cost price of items (not selling price)
        if self.gift_amount > 0:
            cost_price_total = Decimal('0.00')
            
            # Calculate total cost price for all items in this sale
            for item in self.items.all():
                item_cost_price = item.product.cost_price or Decimal('0.00')
                cost_price_total += item_cost_price * item.quantity
            
            # Check if expense already exists for this sale
            existing_expense = Expense.objects.filter(
                reference_number=self.invoice_number,
                category=gift_category
            ).first()
            
            if existing_expense:
                # Update existing expense amount with cost price
                existing_expense.amount = cost_price_total
                existing_expense.save()
            else:
                # Create new expense record using cost price
                Expense.objects.create(
                    description=f"Gift given for sale {self.invoice_number}",
                    amount=cost_price_total,
                    date=timezone.now().date(),
                    category=gift_category,
                    payment_method='OTHER',
                    status='PAID',
                    reference_number=self.invoice_number,
                    notes=f"Gift given for sale {self.invoice_number} - expense based on cost price (₹{cost_price_total}), not selling price (₹{self.gift_amount})"
                )

    @classmethod
    def find_or_create_customer(cls, phone, name=None):
        """Find existing customer by phone or create new one"""
        try:
            customer = Customer.objects.get(phone=phone)
        except Customer.DoesNotExist:
            if name:
                customer = Customer.objects.create(
                    first_name=name.split()[0] if name else '',
                    last_name=' '.join(name.split()[1:]) if name and len(name.split()) > 1 else '',
                    phone=phone,
                    email=f"{phone}@temp.com",  # Temporary email
                    address="To be updated",
                    gender='O'  # Default to Other
                )
            else:
                customer = None
        return customer

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            self.invoice_number = generate_invoice_number()
        super().save(*args, **kwargs)
 
    def calculate_totals(self):
        """Calculate sale totals based on items and discounts"""
        items = self.items.all()
        
        # Calculate subtotal from items (before any discounts)
        self.subtotal = sum(item.unit_price * item.quantity for item in items)
        
        # Calculate total item discounts
        total_item_discounts = sum(item.discount for item in items)
        
        # Calculate total after item discounts but before global discount
        total_after_item_discounts = self.subtotal - total_item_discounts
        
        # Calculate final total (subtotal - item discounts - global discount + tax)
        self.total = total_after_item_discounts - self.discount + self.tax
        
        # Calculate profit/loss for the entire sale
        total_profit = Decimal('0.00')
        total_loss = Decimal('0.00')
        
        for item in items:
            # Get the cost price for this item
            cost_per_unit = item.product.cost_price if item.product.cost_price else Decimal('0.00')
            total_cost = cost_per_unit * item.quantity
            
            # Calculate selling price after item discount
            selling_price_after_item_discount = (item.unit_price * item.quantity) - item.discount
            
            # Calculate this item's proportion of the total for global discount allocation
            if total_after_item_discounts > 0:
                item_proportion = selling_price_after_item_discount / total_after_item_discounts
                item_global_discount = self.discount * item_proportion
            else:
                item_global_discount = Decimal('0.00')
            
            # Calculate final selling price after all discounts
            final_selling_price = selling_price_after_item_discount - item_global_discount
            
            # Calculate profit/loss for this item
            profit_loss = final_selling_price - total_cost
            
            if profit_loss >= 0:
                total_profit += profit_loss
            else:
                total_loss += abs(profit_loss)
        
        # Set the calculated totals
        self.total_profit = total_profit
        self.total_loss = total_loss
        
        # Save the updated totals
        self.save(update_fields=['subtotal', 'total', 'total_profit', 'total_loss'])

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    size = models.CharField(max_length=50)
    color = models.CharField(max_length=50)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))])
    total = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    profit = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))])
    loss = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product.name} - {self.size} - {self.color} - {self.quantity}"

    def get_variation(self):
        """Get the product variation based on size and color"""
        try:
            return ProductVariation.objects.get(
                product=self.product,
                size=self.size,
                color=self.color,
                is_active=True
            )
        except ProductVariation.DoesNotExist:
            return None

    def clean(self):
        """Validate stock availability"""
        variation = self.get_variation()
        if not variation:
            raise ValidationError(f"Invalid variation for {self.product.name} - Size: {self.size}, Color: {self.color}")
        
        if self.quantity > variation.stock:
            raise ValidationError(f"Not enough stock for {self.product.name} - Size: {self.size}, Color: {self.color}")

    def calculate_profit_loss(self):
        """Calculate profit or loss for this sale item"""
        variation = self.get_variation()
        if variation and self.product.cost_price:
            # Calculate cost total
            cost_total = self.product.cost_price * self.quantity
            
            # Calculate selling total with discount
            selling_total = self.total  # This already includes the discount
            
            # Calculate profit/loss
            difference = selling_total - cost_total
            
            if difference >= 0:
                return difference, Decimal('0.00')  # profit, loss
            else:
                return Decimal('0.00'), abs(difference)  # profit, loss
        return Decimal('0.00'), Decimal('0.00')

    def save(self, *args, **kwargs):
        # Calculate total before saving (with discount)
        self.total = (self.quantity * self.unit_price) - self.discount
        
        # Calculate basic profit and loss (without global discount)
        # Global discount is handled in Sale.calculate_totals()
        self.profit, self.loss = self.calculate_profit_loss()
        
        super().save(*args, **kwargs)
        
        # Stock reduction is now handled in Sale.update_payment_status() 
        # when the sale status changes to 'completed' or 'gifted'
        
        # Update sale totals after saving the item
        if self.sale:
            self.sale.calculate_totals()

class SalePayment(models.Model):
    """Enhanced payment model to support split payments and better tracking"""
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('mobile', 'Mobile'),
        ('gift', 'Gift Card')
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded')
    ]
    
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='sale_payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True)
    payment_date = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)
    is_gift_payment = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.id} for Sale {self.sale.invoice_number} - {self.payment_method}"

    def save(self, *args, **kwargs):
        # Mark as gift payment if payment method is gift
        if self.payment_method == 'gift':
            self.is_gift_payment = True
        
        super().save(*args, **kwargs)
        
        # Update sale payment tracking when payment is completed
        if self.status == 'completed':
            # Update gift amount in sale if this is a gift payment
            if self.is_gift_payment:
                # Calculate total gift amount from all gift payments
                total_gift_amount = self.sale.sale_payments.filter(
                    payment_method='gift', 
                    status='completed'
                ).aggregate(total=models.Sum('amount'))['total'] or Decimal('0.00')
                
                self.sale.gift_amount = total_gift_amount
                self.sale.save(update_fields=['gift_amount'])
                
                # Record gift payment as expense
                try:
                    self.sale.record_gift_as_expense()
                except Exception as e:
                    # Log the error but don't fail the payment
                    print(f"Warning: Failed to create expense for gift payment: {e}")
            
            # Update overall payment status
            self.sale.update_payment_status()

class Payment(models.Model):
    """Legacy payment model - keeping for backward compatibility"""
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('mobile_money', 'Mobile Money'),
        ('credit', 'Credit')
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded')
    ]
    
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True)
    payment_date = models.DateTimeField(default=timezone.now)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.id} for Sale {self.sale.invoice_number}"

class DuePayment(models.Model):
    """Model to track due payments and partial payments made later"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ]
    
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='due_payments')
    amount_due = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(Decimal('0.00'))])
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Due Payment for Sale {self.sale.invoice_number} - {self.amount_due}"

    @property
    def remaining_amount(self):
        """Calculate remaining amount to be paid"""
        return self.amount_due - self.amount_paid

    def add_payment(self, amount, payment_method='cash', notes=''):
        """Add a partial payment to this due amount"""
        if amount <= 0:
            raise ValueError("Payment amount must be greater than 0")
        
        if self.amount_paid + amount > self.amount_due:
            raise ValueError("Payment amount exceeds due amount")
        
        # Create a sale payment record
        payment = SalePayment.objects.create(
            sale=self.sale,
            amount=amount,
            payment_method=payment_method,
            status='completed',
            notes=notes
        )
        
        # Update this due payment
        self.amount_paid += amount
        if self.amount_paid >= self.amount_due:
            self.status = 'completed'
        self.save()
        
        return payment

class Return(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed')
    ]
    
    return_number = models.CharField(max_length=50, unique=True, default=generate_return_number)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='returns')
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))])
    refund_method = models.CharField(max_length=50, default='cash', blank=True)
    delivery_charge_paid_by_customer = models.BooleanField(default=True)
    return_charge_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    notes = models.TextField(blank=True)
    processed_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Return {self.return_number} for Sale {self.sale.invoice_number}"

    def save(self, *args, **kwargs):
        if not self.return_number:
            self.return_number = generate_return_number()
        super().save(*args, **kwargs)

class ReturnItem(models.Model):
    return_order = models.ForeignKey(Return, on_delete=models.CASCADE, related_name='items')
    sale_item = models.ForeignKey(SaleItem, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Return Item {self.id} for Return {self.return_order.return_number}"

    def save(self, *args, **kwargs):
        # Create stock movement record when return is approved
        if self.return_order.status == 'approved':
            StockMovement.objects.create(
                product=self.sale_item.product,
                movement_type='IN',
                quantity=self.quantity,
                reference_number=self.return_order.return_number,
                notes=f"Return item from {self.return_order.return_number}"
            )
            
            # Update product stock
            self.sale_item.product.stock_quantity += self.quantity
            self.sale_item.product.save()
        
        super().save(*args, **kwargs) 