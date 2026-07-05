from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from apps.inventory.models import Product, Category, OnlineCategory
import os
from apps.utils import optimize_image
from django.db.models.signals import post_delete
from django.dispatch import receiver


class ProductStatus(models.Model):
    """Model for defining dynamic product sections on the home page"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    display_on_home = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = 'Product Status'
        verbose_name_plural = 'Product Statuses'

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Discount(models.Model):
    """
    Discount model for managing discount campaigns
    """
    DISCOUNT_TYPE_CHOICES = [
        ('APP_WIDE', 'App-Wide Discount'),
        ('CATEGORY', 'Category Discount'),
        ('PRODUCT', 'Product Discount'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('EXPIRED', 'Expired'),
        ('SCHEDULED', 'Scheduled'),
    ]
    
    name = models.CharField(max_length=200)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPE_CHOICES, default='APP_WIDE')
    value = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(Decimal('100.00'))],
        help_text="Discount percentage (0.01 to 100)"
    )
    description = models.TextField(blank=True, null=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    # Specific target for category or product discounts
    categories = models.ManyToManyField(
        Category,
        related_name='discounts',
        blank=True,
        help_text="Required for CATEGORY discount type"
    )
    
    online_categories = models.ManyToManyField(
        OnlineCategory,
        related_name='discounts',
        blank=True,
        help_text="Online category for ecommerce discounts"
    )
    
    products = models.ManyToManyField(
        Product,
        related_name='discounts',
        blank=True,
        help_text="Required for PRODUCT discount type"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Discount'
        verbose_name_plural = 'Discounts'
    
    def __str__(self):
        return f"{self.name} - {self.get_discount_type_display()} ({self.value}%)"
    
    def save(self, *args, **kwargs):
        # Update status based on dates
        now = timezone.now()
        if self.start_date > now:
            self.status = 'SCHEDULED'
        elif self.end_date < now:
            self.status = 'EXPIRED'
        elif self.start_date <= now <= self.end_date:
            self.status = 'ACTIVE'
        
        super().save(*args, **kwargs)
    
    def is_currently_active(self):
        """Check if discount is currently active based on dates"""
        now = timezone.now()
        return self.is_active and self.start_date <= now <= self.end_date
    
    def clean(self):
        """Validate discount configuration"""
        from django.core.exceptions import ValidationError
        
        # Note: ManyToMany relationships cannot be checked easily in clean() 
        # because they are usually set after the instance is saved.
        # Most validation should happen in the serializer or admin form.
        pass
        
        # Validate dates
        if self.start_date >= self.end_date:
            raise ValidationError("End date must be after start date")


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [('PERCENTAGE', 'Percentage'), ('FIXED', 'Fixed amount')]
    INTERACTION_CHOICES = [
        ('STACK', 'Stack after automatic discounts'),
        ('BEST', 'Best discount only'),
        ('REPLACE', 'Replace automatic discounts'),
    ]

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=12, choices=DISCOUNT_TYPE_CHOICES)
    value = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    interaction_mode = models.CharField(max_length=10, choices=INTERACTION_CHOICES, default='STACK')
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    minimum_spend = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'))
    maximum_discount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    @property
    def used_count(self):
        return self.redemptions.filter(is_active=True).count()

    def __str__(self):
        return self.code


class CouponRedemption(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.SET_NULL, null=True, related_name='redemptions')
    order = models.OneToOneField('online_preorder.OnlinePreorder', on_delete=models.CASCADE, related_name='coupon_redemption')
    is_active = models.BooleanField(default=True)
    redeemed_at = models.DateTimeField(auto_now_add=True)
    released_at = models.DateTimeField(null=True, blank=True)


class Brand(models.Model):
    """Brand model for showcasing brands on home page"""
    name = models.CharField(max_length=200, unique=True)
    logo_image = models.ImageField(upload_to='brands/', null=True, blank=True)
    logo_text = models.CharField(max_length=100, null=True, blank=True, help_text="Text logo if no image")
    website_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = 'Brand'
        verbose_name_plural = 'Brands'
    
    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.logo_image:
            optimize_image(self.logo_image, max_width=800, max_height=800)
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Override delete to also delete the logo image from filesystem"""
        if self.logo_image:
            try:
                if os.path.isfile(self.logo_image.path):
                    os.remove(self.logo_image.path)
            except (ValueError, OSError):
                pass
        super().delete(*args, **kwargs)


class HomePageSettings(models.Model):
    """Singleton model for home page settings"""
    # Logo Settings
    logo_image = models.ImageField(upload_to='site_logo/', null=True, blank=True)
    logo_text = models.CharField(max_length=100, null=True, blank=True)

    # Footer Settings
    footer_tagline = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Short tagline shown under the footer logo",
    )
    footer_address = models.TextField(
        null=True,
        blank=True,
        help_text="Store address shown in the footer. Supports multiple lines.",
    )
    footer_phone = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Primary contact phone number for the footer.",
    )
    footer_email = models.EmailField(
        null=True,
        blank=True,
        help_text="Primary contact email address for the footer.",
    )
    footer_facebook_url = models.URLField(
        null=True,
        blank=True,
        help_text="Facebook page URL for the footer social links.",
    )
    footer_instagram_url = models.URLField(
        null=True,
        blank=True,
        help_text="Instagram page URL for the footer social links.",
    )
    footer_twitter_url = models.URLField(
        null=True,
        blank=True,
        help_text="Twitter/X profile URL for the footer social links.",
    )
    footer_github_url = models.URLField(
        null=True,
        blank=True,
        help_text="GitHub profile or organization URL for the footer social links.",
    )
    footer_map_embed_url = models.TextField(
        null=True,
        blank=True,
        help_text="Google Maps embed URL used for the footer map preview.",
    )
    
    # Hero Section Settings
    hero_badge_text = models.CharField(max_length=100, default="New Collection 2024")
    hero_heading_line1 = models.CharField(max_length=100, default="FIND")
    hero_heading_line2 = models.CharField(max_length=100, default="CLOTHES", null=True, blank=True)
    hero_heading_line3 = models.CharField(max_length=100, default="THAT", null=True, blank=True)
    hero_heading_line4 = models.CharField(max_length=100, default="Matches", null=True, blank=True)
    hero_heading_line5 = models.CharField(max_length=100, default="YOUR STYLE", null=True, blank=True)
    
    hero_description = models.TextField(
        default="Browse through our diverse range of meticulously crafted garments, designed to bring out your individuality and cater to your sense of style.",
        null=True,
        blank=True
    )
    
    hero_primary_image = models.ImageField(upload_to='hero/', null=True, blank=True)
    hero_secondary_image = models.ImageField(upload_to='hero/', null=True, blank=True)
    
    # Stats Settings
    stat_brands = models.CharField(max_length=50, default="200+")
    stat_products = models.CharField(max_length=50, default="2,000+")
    stat_customers = models.CharField(max_length=50, default="30,000+")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Home Page Settings'
        verbose_name_plural = 'Home Page Settings'
    
    def __str__(self):
        return "Home Page Settings"
    
    def save(self, *args, **kwargs):
        # Optimize images
        if self.logo_image:
            optimize_image(self.logo_image, max_width=500, max_height=500)
        
        if self.hero_primary_image:
            optimize_image(self.hero_primary_image)
            
        if self.hero_secondary_image:
            optimize_image(self.hero_secondary_image)

        # Ensure only one instance exists
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def load(cls):
        """Get or create the singleton instance"""
        obj, created = cls.objects.get_or_create(pk=1)
        return obj
    
    def delete(self, *args, **kwargs):
        # Prevent deletion of the singleton
        pass


class DeliverySettings(models.Model):
    """Singleton model for delivery charges"""
    inside_dhaka_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    inside_gazipur_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    outside_dhaka_charge = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Delivery Settings'
        verbose_name_plural = 'Delivery Settings'

    def __str__(self):
        return "Delivery Settings"

    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def delete(self, *args, **kwargs):
        # Prevent deletion of the singleton
        pass


class HeroSlide(models.Model):
    """Model for managing hero section slides"""
    LAYOUT_CHOICES = [
        ('clean-left', 'Clean Left'),
        ('centered-clean', 'Centered Clean'),
        ('split-clean', 'Split Clean'),
        ('image-showcase', 'Image Showcase'),
        ('bold-left', 'Bold Left'),
    ]
    
    BG_COLOR_CHOICES = [
        ('bg-slate-950', 'Slate 950'),
        ('bg-orange-950', 'Orange 950'),
        ('bg-purple-950', 'Purple 950'),
        ('bg-emerald-950', 'Emerald 950'),
        ('bg-slate-900', 'Slate 900'),
        ('bg-blue-950', 'Blue 950'),
        ('bg-red-950', 'Red 950'),
        ('bg-green-950', 'Green 950'),
    ]
    
    title = models.CharField(max_length=200, help_text="Main title (use \\n for line breaks)")
    subtitle = models.TextField(max_length=500, blank=True, null=True)
    button_text = models.CharField(max_length=50, default="Shop Now")
    image = models.ImageField(upload_to='hero_slides/', help_text="Hero slide background image")
    bg_color = models.CharField(max_length=50, choices=BG_COLOR_CHOICES, default='bg-slate-950')
    layout = models.CharField(max_length=50, choices=LAYOUT_CHOICES, default='clean-left')
    
    # Title styling
    title_class = models.CharField(
        max_length=200,
        default="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black text-white leading-tight tracking-tighter",
        help_text="CSS classes for title styling"
    )
    
    # Subtitle styling
    subtitle_class = models.CharField(
        max_length=200,
        default="text-sm sm:text-base text-white/80 max-w-lg leading-relaxed",
        help_text="CSS classes for subtitle styling"
    )
    
    # Stats (stored as JSON)
    stats = models.JSONField(
        default=list,
        blank=True,
        help_text="Array of stats objects: [{'value': '200+', 'label': 'Brands'}]"
    )
    
    display_order = models.PositiveIntegerField(default=0, help_text="Order of display (lower numbers appear first)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'created_at']
        verbose_name = 'Hero Slide'
        verbose_name_plural = 'Hero Slides'
    
    def __str__(self):
        return f"{self.title} (Order: {self.display_order})"
    
    def save(self, *args, **kwargs):
        if self.image:
            optimize_image(self.image)
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Override delete to also delete the hero slide image from filesystem"""
        if self.image:
            try:
                if os.path.isfile(self.image.path):
                    os.remove(self.image.path)
            except (ValueError, OSError):
                pass
        super().delete(*args, **kwargs)


class PromotionalModal(models.Model):
    """Model for managing promotional modals"""
    LAYOUT_CHOICES = [
        ('centered', 'Centered'),
        ('split-left', 'Split Left (Image Left)'),
        ('split-right', 'Split Right (Image Right)'),
        ('full-cover', 'Full Cover Image'),
        ('image-only', 'Image Only'),
    ]
    
    COLOR_THEME_CHOICES = [
        ('light', 'Light Mode'),
        ('dark', 'Dark Mode'),
        ('brand', 'Brand Colors'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True, help_text="Supports rich text/HTML")
    discount_code = models.CharField(max_length=50, blank=True, null=True)
    cta_text = models.CharField(max_length=50, default="Shop Now")
    cta_url = models.CharField(max_length=500, blank=True, null=True)
    image = models.ImageField(upload_to='promo_modals/', null=True, blank=True)
    
    # Visual Settings
    layout = models.CharField(max_length=50, choices=LAYOUT_CHOICES, default='centered')
    color_theme = models.CharField(max_length=50, choices=COLOR_THEME_CHOICES, default='light')
    
    # Configuration JSONs
    # display_rules example: {"trigger": "timer", "delay_seconds": 5, "frequency": "once_per_session"}
    display_rules = models.JSONField(default=dict, blank=True, help_text="Rules: timer, exit_intent, first_visit etc.")
    
    # targeting example: {"devices": ["mobile", "desktop"], "users": ["all"]}
    targeting_rules = models.JSONField(default=dict, blank=True, help_text="Device and User targeting rules")

    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Promotional Modal'
        verbose_name_plural = 'Promotional Modals'

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.image:
            optimize_image(self.image)
        super().save(*args, **kwargs)

    def is_currently_active(self):
        now = timezone.now()
        return self.is_active and self.start_date <= now <= self.end_date

    def delete(self, *args, **kwargs):
        if self.image:
            try:
                if os.path.isfile(self.image.path):
                    os.remove(self.image.path)
            except (ValueError, OSError):
                pass
        super().delete(*args, **kwargs)
