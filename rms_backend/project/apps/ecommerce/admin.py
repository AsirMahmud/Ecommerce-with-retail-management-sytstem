from django.contrib import admin
from .models import Discount, Coupon, Brand, HomePageSettings, ProductStatus


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'discount_type', 'value', 'interaction_mode', 'used_count', 'usage_limit', 'is_active')
    list_filter = ('discount_type', 'interaction_mode', 'is_active')
    search_fields = ('code', 'name')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(Discount)
class DiscountAdmin(admin.ModelAdmin):
    list_display = ('name', 'discount_type', 'value', 'status', 'start_date', 'end_date', 'is_active')
    list_filter = ('discount_type', 'status', 'is_active', 'created_at')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'description', 'discount_type', 'value')
        }),
        ('Dates & Status', {
            'fields': ('start_date', 'end_date', 'status', 'is_active')
        }),
        ('Target', {
            'fields': ('category', 'online_category', 'product'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'logo_text', 'display_order', 'is_active', 'website_url', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'logo_text')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ['display_order', 'name']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'logo_image', 'logo_text', 'website_url')
        }),
        ('Display Settings', {
            'fields': ('display_order', 'is_active')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(HomePageSettings)
class HomePageSettingsAdmin(admin.ModelAdmin):
    fieldsets = (
        ('Logo Settings', {
            'fields': ('logo_image', 'logo_text')
        }),
        ('Hero Section', {
            'fields': (
                'hero_badge_text',
                'hero_heading_line1',
                'hero_heading_line2',
                'hero_heading_line3',
                'hero_heading_line4',
                'hero_heading_line5',
                'hero_description',
                'hero_primary_image',
                'hero_secondary_image',
            )
        }),
        ('Statistics', {
            'fields': ('stat_brands', 'stat_products', 'stat_customers')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('created_at', 'updated_at')
    
    def has_add_permission(self, request):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False

