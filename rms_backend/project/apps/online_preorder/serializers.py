from rest_framework import serializers
from decimal import Decimal
from .models import (
    OnlinePreorder,
    OnlinePreorderVerification,
    OnlinePreorderVerificationItem,
    OnlinePreorderVerificationScanLog,
)


import json
import ast

class RobustJSONField(serializers.JSONField):
    def to_internal_value(self, data):
        parsed = None
        if isinstance(data, str):
            data = data.strip()
            if not data:
                parsed = []
            else:
                try:
                    parsed = json.loads(data)
                except (TypeError, ValueError):
                    try:
                        parsed = ast.literal_eval(data)
                    except Exception:
                        self.fail('invalid')
        elif isinstance(data, list):
            parsed_list = []
            for item in data:
                if isinstance(item, str):
                    item = item.strip()
                    try:
                        parsed_list.append(json.loads(item))
                    except (TypeError, ValueError):
                        try:
                            parsed_list.append(ast.literal_eval(item))
                        except Exception:
                            self.fail('invalid')
                else:
                    parsed_list.append(item)
            parsed = parsed_list
        else:
            parsed = super().to_internal_value(data)

        def clean_decimals(val):
            if isinstance(val, dict):
                return {k: clean_decimals(v) for k, v in val.items()}
            elif isinstance(val, list):
                return [clean_decimals(v) for v in val]
            elif isinstance(val, Decimal):
                return float(val)
            return val

        return clean_decimals(parsed)



class OnlinePreorderCreateSerializer(serializers.ModelSerializer):
    items = RobustJSONField()

    class Meta:
        model = OnlinePreorder
        fields = '__all__'

    def validate_items(self, value):
        if not isinstance(value, list) or not value:
            # raise serializers.ValidationError('Items must be a non-empty list.')
             pass
        for item in value:
             pass
            # for field in ['product_id', 'size', 'color', 'quantity', 'unit_price', 'discount']:
            #     if field not in item:
            #         raise serializers.ValidationError(f"Each item must include '{field}' field.")
        return value

    def validate(self, data):
        # Compute total if not provided explicitly
        if data.get('items'):
            from apps.inventory.models import Product
            from apps.ecommerce.discount_utils import calculate_discounted_price, get_applicable_discount
            
            items_subtotal = 0
            
            # Iterate through items to auto-fill price/discount if missing
            for item in data['items']:
                # If unit_price is missing or 0, try to fetch from product
                if not item.get('unit_price'):
                    pid = item.get('product_id')
                    if pid:
                        try:
                            product = Product.objects.get(id=pid)
                            # Get authoritative price info (including discounts)
                            # calculate_discounted_price returns:
                            # { 'original_price', 'discount_value', 'discount_amount', 'final_price', ... }
                            
                            # Note: The 'discount' field in OnlinePreorder item usually represents the TOTAL discount amount for the line item
                            # OR the unit discount?
                            # Looking at models.py: items_subtotal = sum(qty * unit_price - discount)
                            # This implies 'unit_price' is the ORIGINAL price, and 'discount' is the total discount for that line (or unit discount * qty).
                            # Let's check checkout logic in frontend/models.
                            # Frontend:
                            # unit_price = originalPrice
                            # discountAmount = (originalPrice - discountedPrice) * quantity
                            
                            # Backend models.py save():
                            # items_subtotal = sum(float(item.get('quantity', 0)) * float(item.get('unit_price', 0)) - float(item.get('discount', 0) or 0) ...)
                            # So yes: unit_price = base price, discount = total discount amount for the line.
                            
                            discount_info = calculate_discounted_price(product)
                            
                            original_unit_price = discount_info['original_price']
                            final_unit_price = discount_info['final_price']
                            
                            qty = float(item.get('quantity', 1))
                            
                            # Initial population
                            item['unit_price'] = original_unit_price
                            
                            # Calculate total discount for this line
                            # (Original - Final) * Qty
                            unit_discount = original_unit_price - final_unit_price
                            total_line_discount = unit_discount * qty
                            
                            item['discount'] = total_line_discount
                            
                        except Product.DoesNotExist:
                            # Fallback if product not found, just use 0
                            item['unit_price'] = 0
                            item['discount'] = 0
                
                # Now calculate contribution to subtotal
                qty = float(item.get('quantity', 0))
                u_price = float(item.get('unit_price', 0))
                disc = float(item.get('discount', 0) or 0)
                
                items_subtotal += (qty * u_price) - disc

            delivery_charge = float(data.get('delivery_charge', 0) or 0)
            data['total_amount'] = Decimal(str(items_subtotal + delivery_charge))
        return data

    def create(self, validated_data):
        from apps.customer.models import Customer
        from django.db import IntegrityError

        customer_phone = validated_data.get('customer_phone')
        customer_name = validated_data.get('customer_name', '')
        customer_email = validated_data.get('customer_email')
        shipping_address = validated_data.get('shipping_address', {})

        # Build address string from structured shipping address
        address_parts = []
        if shipping_address.get('address'):
            address_parts.append(str(shipping_address['address']))
        
        # Inside Dhaka fields
        if shipping_address.get('place'):
            address_parts.append(str(shipping_address['place']))
        if shipping_address.get('thana'):
            address_parts.append(str(shipping_address['thana']))
        if shipping_address.get('city_corporation'):
            address_parts.append(str(shipping_address['city_corporation']))
            
        # Outside Dhaka/Gazipur fields
        if shipping_address.get('union'):
            address_parts.append(str(shipping_address['union']))
        if shipping_address.get('upazila'):
            address_parts.append(str(shipping_address['upazila']))
        if shipping_address.get('district'):
            address_parts.append(str(shipping_address['district']))
        if shipping_address.get('division'):
            address_parts.append(str(shipping_address['division']))
            
        address_text = ', '.join([p for p in address_parts if p])

        # Parse name
        name_parts = customer_name.strip().split(maxsplit=1)
        first_name = name_parts[0] if len(name_parts) > 0 else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        try:
            # Try to find existing customer
            customer = Customer.objects.get(phone=customer_phone)
            
            # Update customer info
            if first_name:
                customer.first_name = first_name
            if last_name:
                customer.last_name = last_name
            
            # Update address if provided
            if address_text:
                customer.address = address_text

            # Update email if provided and safe
            if customer_email:
                if customer.email != customer_email:
                    # Check uniqueness
                    if not Customer.objects.filter(email=customer_email).exclude(id=customer.id).exists():
                        customer.email = customer_email
            
            # Mark this customer as online/both
            if customer.customer_type == 'shop':
                customer.customer_type = 'both'

            customer.save()

        except Customer.DoesNotExist:
            # Create new customer
            email_to_use = customer_email
            
            # If email is provided, check if it's already taken by another phone number
            if email_to_use:
                if Customer.objects.filter(email=email_to_use).exists():
                    # Email taken, fallback or leave blank? 
                    email_to_use = None
            
            try:
                customer = Customer.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    phone=customer_phone,
                    email=email_to_use,
                    address=address_text,
                    gender='O', # Default
                    customer_type='online',
                )
            except IntegrityError:
                # Race condition: created by another request?
                customer = Customer.objects.get(phone=customer_phone)

        # Note: OnlinePreorder model does not have a ForeignKey to Customer, 
        # so we don't assign it to validated_data. 
        # The Customer record is created/updated for CRM synchronization only.
        
        # Call super create
        return super().create(validated_data)

    def update(self, instance, validated_data):
        from apps.customer.models import Customer

        customer_phone = validated_data.get('customer_phone', instance.customer_phone)
        customer_name = validated_data.get('customer_name', instance.customer_name)
        customer_email = validated_data.get('customer_email', instance.customer_email)
        shipping_address = validated_data.get('shipping_address', instance.shipping_address)

        # Build address string from structured shipping address
        address_parts = []
        if shipping_address and isinstance(shipping_address, dict):
            if shipping_address.get('address'):
                address_parts.append(str(shipping_address['address']))
            
            # Inside Dhaka fields
            if shipping_address.get('place'):
                address_parts.append(str(shipping_address['place']))
            if shipping_address.get('thana'):
                address_parts.append(str(shipping_address['thana']))
            if shipping_address.get('city_corporation'):
                address_parts.append(str(shipping_address['city_corporation']))
                
            # Outside Dhaka/Gazipur fields
            if shipping_address.get('union'):
                address_parts.append(str(shipping_address['union']))
            if shipping_address.get('upazila'):
                address_parts.append(str(shipping_address['upazila']))
            if shipping_address.get('district'):
                address_parts.append(str(shipping_address['district']))
            if shipping_address.get('division'):
                address_parts.append(str(shipping_address['division']))
                
        address_text = ', '.join([p for p in address_parts if p])

        # Parse name
        name_parts = customer_name.strip().split(maxsplit=1)
        first_name = name_parts[0] if len(name_parts) > 0 else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        # Update or create customer
        try:
            customer = Customer.objects.get(phone=customer_phone)
            
            # Update customer info
            if first_name:
                customer.first_name = first_name
            if last_name:
                customer.last_name = last_name
            
            # Update address if provided
            if address_text:
                customer.address = address_text

            # Update email if provided and safe
            if customer_email:
                if customer.email != customer_email:
                    # Check uniqueness
                    if not Customer.objects.filter(email=customer_email).exclude(id=customer.id).exists():
                        customer.email = customer_email

            # Mark this customer as online/both
            if customer.customer_type == 'shop':
                customer.customer_type = 'both'

            customer.save()

        except Customer.DoesNotExist:
            # Create new customer if phone number changed or customer doesn't exist
            email_to_use = customer_email
            if email_to_use and Customer.objects.filter(email=email_to_use).exists():
                email_to_use = None
            
            Customer.objects.create(
                first_name=first_name,
                last_name=last_name,
                phone=customer_phone,
                email=email_to_use,
                address=address_text,
                gender='O',
                customer_type='online',
            )

        # Call super update
        return super().update(instance, validated_data)


class OnlinePreorderSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnlinePreorder
        fields = '__all__'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        items = ret.get('items', [])
        if isinstance(items, list):
            enriched_items = []
            from apps.inventory.models import Product
            for item in items:
                pid = item.get('product_id')
                if pid:
                    try:
                        product = Product.objects.get(id=pid)
                        item['product_name'] = product.name
                        
                        # Logic: "primary photo of first variant of that product"
                        image_url = None
                        
                        from apps.inventory.models import Gallery, Image
                        
                        # 1. Try first variant's primary photo
                        first_variant = product.variations.first()
                        if first_variant:
                            gallery = Gallery.objects.filter(product=product, color=first_variant.color).first()
                            if gallery:
                                primary_img = Image.objects.filter(gallery=gallery, imageType='PRIMARY').first()
                                if primary_img and primary_img.image:
                                    image_url = primary_img.image.url
                        
                        # 2. Fallback to main product image
                        if not image_url and product.image:
                            image_url = product.image.url

                        if image_url:
                            request = self.context.get('request')
                            if request:
                                item['product_image'] = request.build_absolute_uri(image_url)
                            else:
                                item['product_image'] = image_url

                    except Product.DoesNotExist:
                        pass
                enriched_items.append(item)
            ret['items'] = enriched_items
        return ret


class OnlinePreorderVerificationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OnlinePreorderVerificationItem
        fields = [
            'id',
            'sku',
            'product_name',
            'ordered_qty',
            'verified_qty',
        ]


class OnlinePreorderVerificationSerializer(serializers.ModelSerializer):
    items = OnlinePreorderVerificationItemSerializer(many=True, read_only=True)

    class Meta:
        model = OnlinePreorderVerification
        fields = [
            'id',
            'online_preorder',
            'status',
            'total_units',
            'verified_units',
            'skipped_reason',
            'created_at',
            'updated_at',
            'completed_at',
            'skipped_at',
            'items',
        ]
        read_only_fields = [
            'online_preorder',
            'total_units',
            'verified_units',
            'created_at',
            'updated_at',
            'completed_at',
            'skipped_at',
        ]


class OnlinePreorderScanResultSerializer(serializers.Serializer):
    """
    Lightweight serializer for returning the result of a single scan
    together with the updated verification payload.
    """
    result = serializers.ChoiceField(choices=['MATCHED', 'NOT_IN_ORDER', 'OVER_SCAN'])
    message = serializers.CharField()
    verification = OnlinePreorderVerificationSerializer()



