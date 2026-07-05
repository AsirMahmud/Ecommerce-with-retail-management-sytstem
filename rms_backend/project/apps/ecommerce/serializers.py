from rest_framework import serializers
from .models import Discount, Coupon, Brand, HomePageSettings, DeliverySettings, HeroSlide, PromotionalModal, ProductStatus
from apps.inventory.serializers import ProductSerializer, CategorySerializer, OnlineCategorySerializer


class CouponSerializer(serializers.ModelSerializer):
    used_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Coupon
        fields = [
            'id', 'name', 'code', 'discount_type', 'value', 'interaction_mode',
            'start_date', 'end_date', 'minimum_spend', 'maximum_discount',
            'usage_limit', 'used_count', 'is_active', 'created_at', 'updated_at',
        ]
        read_only_fields = ['used_count', 'created_at', 'updated_at']

    def validate_code(self, value):
        value = value.strip().upper()
        queryset = Coupon.objects.filter(code__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('A coupon with this code already exists.')
        return value

    def validate(self, data):
        start = data.get('start_date', getattr(self.instance, 'start_date', None))
        end = data.get('end_date', getattr(self.instance, 'end_date', None))
        discount_type = data.get('discount_type', getattr(self.instance, 'discount_type', None))
        value = data.get('value', getattr(self.instance, 'value', None))
        maximum = data.get('maximum_discount', getattr(self.instance, 'maximum_discount', None))
        if start and end and start >= end:
            raise serializers.ValidationError({'end_date': 'End date must be after start date.'})
        if value is not None and value <= 0:
            raise serializers.ValidationError({'value': 'Discount value must be greater than zero.'})
        minimum = data.get('minimum_spend', getattr(self.instance, 'minimum_spend', 0))
        usage_limit = data.get('usage_limit', getattr(self.instance, 'usage_limit', None))
        if minimum is not None and minimum < 0:
            raise serializers.ValidationError({'minimum_spend': 'Minimum spend cannot be negative.'})
        if maximum is not None and maximum <= 0:
            raise serializers.ValidationError({'maximum_discount': 'Maximum discount must be greater than zero.'})
        if usage_limit is not None and usage_limit < 1:
            raise serializers.ValidationError({'usage_limit': 'Usage limit must be at least one.'})
        if discount_type == 'PERCENTAGE' and value and value > 100:
            raise serializers.ValidationError({'value': 'Percentage cannot exceed 100.'})
        if discount_type == 'FIXED' and maximum is not None:
            raise serializers.ValidationError({'maximum_discount': 'Only percentage coupons can have a maximum discount.'})
        return data


class ProductStatusSerializer(serializers.ModelSerializer):
    """Serializer for ProductStatus model"""
    class Meta:
        model = ProductStatus
        fields = ['id', 'name', 'slug', 'display_on_home', 'display_order', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'slug']


class DiscountSerializer(serializers.ModelSerializer):
    """Serializer for Discount model"""
    
    # Include nested serializers for better API response
    categories_detail = CategorySerializer(source='categories', read_only=True, many=True)
    online_categories_detail = OnlineCategorySerializer(source='online_categories', read_only=True, many=True)
    products_detail = ProductSerializer(source='products', read_only=True, many=True)
    
    # Add display fields
    discount_type_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Discount
        fields = [
            'id',
            'name',
            'discount_type',
            'discount_type_display',
            'value',
            'description',
            'start_date',
            'end_date',
            'status',
            'status_display',
            'categories',
            'categories_detail',
            'online_categories',
            'online_categories_detail',
            'products',
            'products_detail',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'status']
    
    def get_discount_type_display(self, obj):
        """Get human-readable discount type"""
        return obj.get_discount_type_display()
    
    def get_status_display(self, obj):
        """Get human-readable status"""
        return obj.get_status_display()
    
    def validate(self, data):
        """Custom validation for discount"""
        # Check if start_date is before end_date
        # Use existing instance data if fields are missing (for partial updates)
        start_date = data.get('start_date', getattr(self.instance, 'start_date', None))
        end_date = data.get('end_date', getattr(self.instance, 'end_date', None))
        
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        
        # Validate discount_type specific requirements
        discount_type = data.get('discount_type', getattr(self.instance, 'discount_type', 'APP_WIDE'))
        
        # For M2M fields in validate(), they might be lists of PKs or objects
        # We check both the new data and the existing instance if it's a partial update
        categories = data.get('categories')
        online_categories = data.get('online_categories')
        products = data.get('products')
        
        if discount_type == 'CATEGORY':
            # Check if at least one category selection exists (either new or existing)
            has_cats = False
            if categories or online_categories:
                has_cats = True
            elif self.instance:
                if self.instance.categories.exists() or self.instance.online_categories.exists():
                    has_cats = True
            
            if not has_cats:
                raise serializers.ValidationError({
                    'categories': 'At least one category or online category is required for CATEGORY discount type.'
                })
        
        if discount_type == 'PRODUCT':
            # Check if at least one product selection exists
            has_prods = False
            if products:
                has_prods = True
            elif self.instance and self.instance.products.exists():
                has_prods = True
                
            if not has_prods:
                raise serializers.ValidationError({
                    'products': 'At least one product is required for PRODUCT discount type.'
                })
        
        return data
    
    def create(self, validated_data):
        """Create discount with automatic status setting"""
        from django.utils import timezone
        
        now = timezone.now()
        start_date = validated_data.get('start_date')
        end_date = validated_data.get('end_date')
        
        # Set status based on dates
        if start_date > now:
            validated_data['status'] = 'SCHEDULED'
        elif end_date < now:
            validated_data['status'] = 'EXPIRED'
        else:
            validated_data['status'] = 'ACTIVE'
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update discount with automatic status setting"""
        from django.utils import timezone
        
        now = timezone.now()
        start_date = validated_data.get('start_date', instance.start_date)
        end_date = validated_data.get('end_date', instance.end_date)
        
        # Update status based on dates
        if start_date > now:
            validated_data['status'] = 'SCHEDULED'
        elif end_date < now:
            validated_data['status'] = 'EXPIRED'
        else:
            validated_data['status'] = 'ACTIVE'
        
        return super().update(instance, validated_data)


class DiscountListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing discounts"""
    
    # Include nested serializers for better API response
    categories_detail = CategorySerializer(source='categories', read_only=True, many=True)
    online_categories_detail = OnlineCategorySerializer(source='online_categories', read_only=True, many=True)
    products_detail = ProductSerializer(source='products', read_only=True, many=True)

    # Add display fields
    discount_type_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Discount
        fields = [
            'id',
            'name',
            'discount_type',
            'discount_type_display',
            'value',
            'start_date',
            'end_date',
            'status',
            'status_display',
            'categories',
            'categories_detail',
            'online_categories',
            'online_categories_detail',
            'products',
            'products_detail',
            'is_active',
            'created_at',
        ]
    
    def get_discount_type_display(self, obj):
        """Get human-readable discount type"""
        return obj.get_discount_type_display()

    def get_status_display(self, obj):
        """Get human-readable status"""
        return obj.get_status_display()


class BrandSerializer(serializers.ModelSerializer):
    """Serializer for Brand model"""
    logo_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Brand
        fields = [
            'id',
            'name',
            'logo_image',
            'logo_image_url',
            'logo_text',
            'website_url',
            'is_active',
            'display_order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_logo_image_url(self, obj):
        if obj.logo_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo_image.url)
            return obj.logo_image.url
        return None


class HomePageSettingsSerializer(serializers.ModelSerializer):
    """Serializer for HomePageSettings model"""
    logo_image_url = serializers.SerializerMethodField()
    hero_primary_image_url = serializers.SerializerMethodField()
    hero_secondary_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = HomePageSettings
        fields = [
            'id',
            'logo_image',
            'logo_image_url',
            'logo_text',
            'footer_tagline',
            'footer_address',
            'footer_phone',
            'footer_email',
            'footer_facebook_url',
            'footer_instagram_url',
            'footer_twitter_url',
            'footer_github_url',
            'footer_map_embed_url',
            'hero_badge_text',
            'hero_heading_line1',
            'hero_heading_line2',
            'hero_heading_line3',
            'hero_heading_line4',
            'hero_heading_line5',
            'hero_description',
            'hero_primary_image',
            'hero_primary_image_url',
            'hero_secondary_image',
            'hero_secondary_image_url',
            'stat_brands',
            'stat_products',
            'stat_customers',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_logo_image_url(self, obj):
        if obj.logo_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo_image.url)
            return obj.logo_image.url
        return None
    
    def get_hero_primary_image_url(self, obj):
        if obj.hero_primary_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.hero_primary_image.url)
            return obj.hero_primary_image.url
        return None
    
    def get_hero_secondary_image_url(self, obj):
        if obj.hero_secondary_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.hero_secondary_image.url)
            return obj.hero_secondary_image.url
        return None

    def update(self, instance, validated_data):
        """Handle image replacement with old file cleanup and canonical naming."""
        import os
        request = self.context.get('request')

        def replace_image(field_name: str, new_file):
            if not new_file:
                return
            # delete previous file if exists
            old_file = getattr(instance, field_name, None)
            if old_file:
                try:
                    old_file.delete(save=False)
                except Exception:
                    pass
            # set canonical filename
            base = {
                'logo_image': 'logo',
                'hero_primary_image': 'primary',
                'hero_secondary_image': 'secondary',
            }.get(field_name, field_name)
            _, ext = os.path.splitext(getattr(new_file, 'name', '') or '')
            if not ext:
                ext = '.jpg'
            new_file.name = f"{base}{ext}"
            setattr(instance, field_name, new_file)

        # Handle explicit delete flags coming from request (e.g., remove_logo_image=true)
        if request is not None:
            remove_logo = str(request.data.get('remove_logo_image', 'false')).lower() == 'true'
            remove_primary = str(request.data.get('remove_hero_primary_image', 'false')).lower() == 'true'
            remove_secondary = str(request.data.get('remove_hero_secondary_image', 'false')).lower() == 'true'
            if remove_logo and getattr(instance, 'logo_image', None):
                try:
                    instance.logo_image.delete(save=False)
                except Exception:
                    pass
                instance.logo_image = None
            if remove_primary and getattr(instance, 'hero_primary_image', None):
                try:
                    instance.hero_primary_image.delete(save=False)
                except Exception:
                    pass
                instance.hero_primary_image = None
            if remove_secondary and getattr(instance, 'hero_secondary_image', None):
                try:
                    instance.hero_secondary_image.delete(save=False)
                except Exception:
                    pass
                instance.hero_secondary_image = None

        # Extract image files from validated_data first
        logo_file = validated_data.pop('logo_image', None)
        primary_file = validated_data.pop('hero_primary_image', None)
        secondary_file = validated_data.pop('hero_secondary_image', None)

        # Update non-file fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Handle images with cleanup and naming
        replace_image('logo_image', logo_file)
        replace_image('hero_primary_image', primary_file)
        replace_image('hero_secondary_image', secondary_file)

        instance.save()
        return instance


class DeliverySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliverySettings
        fields = [
            'inside_dhaka_charge',
            'inside_gazipur_charge',
            'outside_dhaka_charge',
            'updated_at',
        ]
        read_only_fields = ['updated_at']


class HeroSlideSerializer(serializers.ModelSerializer):
    """Serializer for HeroSlide model"""
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = HeroSlide
        fields = [
            'id',
            'title',
            'subtitle',
            'button_text',
            'image',
            'image_url',
            'bg_color',
            'layout',
            'title_class',
            'subtitle_class',
            'stats',
            'display_order',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None


class PromotionalModalSerializer(serializers.ModelSerializer):
    """Serializer for PromotionalModal model"""
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = PromotionalModal
        fields = [
            'id',
            'title',
            'description',
            'discount_code',
            'cta_text',
            'cta_url',
            'image',
            'image_url',
            'layout',
            'color_theme',
            'display_rules',
            'targeting_rules',
            'start_date',
            'end_date',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url
        return None
    
    def validate(self, data):
        """Custom validation"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError({
                'end_date': 'End date must be after start date.'
            })
        return data
