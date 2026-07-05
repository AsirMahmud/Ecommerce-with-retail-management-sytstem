from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from django.db.models import Q
from django.db import IntegrityError, transaction
from datetime import datetime
from .models import Discount, Coupon, CouponRedemption, Brand, HomePageSettings, DeliverySettings, HeroSlide, PromotionalModal, ProductStatus
from .serializers import (
    DiscountSerializer, DiscountListSerializer, BrandSerializer, 
    HomePageSettingsSerializer, DeliverySettingsSerializer, 
    HeroSlideSerializer, PromotionalModalSerializer, ProductStatusSerializer, CouponSerializer
)
from django.utils.text import slugify
from apps.inventory.models import Product, ProductVariation, Gallery, Image, OnlineCategory
from apps.inventory.serializers import EcommerceProductSerializer
from apps.customer.models import Customer
from apps.online_preorder.models import OnlinePreorder
from apps.online_preorder.serializers import OnlinePreorderSerializer, OnlinePreorderCreateSerializer
from django.db.models import Sum
from decimal import Decimal
from .discount_utils import calculate_discounted_price
from .pricing import price_cart, PricingError


class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        coupon = self.get_object()
        coupon.is_active = True
        coupon.save(update_fields=['is_active', 'updated_at'])
        return Response(self.get_serializer(coupon).data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        coupon = self.get_object()
        coupon.is_active = False
        coupon.save(update_fields=['is_active', 'updated_at'])
        return Response(self.get_serializer(coupon).data)


class DiscountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing discounts
    - List all discounts
    - Create new discount
    - Update existing discount
    - Delete discount
    - Get active discounts
    - Get expired discounts
    """
    queryset = Discount.objects.all()
    serializer_class = DiscountSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DiscountListSerializer
        return DiscountSerializer
    
    def get_queryset(self):
        queryset = Discount.objects.all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by discount type
        discount_type = self.request.query_params.get('discount_type', None)
        if discount_type:
            queryset = queryset.filter(discount_type=discount_type)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        
        # Search by name
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def active(self, request):
        """Get all currently active discounts"""
        now = timezone.now()
        active_discounts = self.queryset.filter(
            is_active=True,
            status='ACTIVE',
            products__isnull=True,
            categories__isnull=True,
            online_categories__isnull=True,
            start_date__lte=now,
            end_date__gte=now
        )
        serializer = self.get_serializer(active_discounts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Get all expired discounts"""
        now = timezone.now()
        expired_discounts = self.queryset.filter(
            end_date__lt=now
        )
        serializer = self.get_serializer(expired_discounts, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def scheduled(self, request):
        """Get all scheduled discounts"""
        now = timezone.now()
        scheduled_discounts = self.queryset.filter(
            start_date__gt=now
        )
        serializer = self.get_serializer(scheduled_discounts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a discount"""
        discount = self.get_object()
        discount.is_active = True
        discount.save()
        serializer = self.get_serializer(discount)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a discount"""
        discount = self.get_object()
        discount.is_active = False
        discount.save()
        serializer = self.get_serializer(discount)
        return Response(serializer.data)


class ProductStatusViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing product statuses (home page sections)
    """
    queryset = ProductStatus.objects.all()
    serializer_class = ProductStatusSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return super().get_permissions()
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a discount"""
        discount = self.get_object()
        discount.is_active = False
        discount.save()
        serializer = self.get_serializer(discount)
        return Response(serializer.data)


class BrandViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing brands
    """
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = Brand.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
        
        # Search by name
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset.order_by('display_order', 'name')


class HomePageSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing home page settings (singleton)
    """
    queryset = HomePageSettings.objects.all()
    serializer_class = HomePageSettingsSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'
    parser_classes = [MultiPartParser, FormParser]
    
    def get_object(self):
        """Always return the singleton instance"""
        return HomePageSettings.load()
    
    def list(self, request):
        """Return the singleton instance"""
        instance = HomePageSettings.load()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def create(self, request):
        """Update or create the singleton instance"""
        instance = HomePageSettings.load()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def update(self, request, id=None):
        """Update the singleton instance"""
        instance = HomePageSettings.load()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def partial_update(self, request, id=None):
        """Partially update the singleton instance"""
        instance = HomePageSettings.load()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PublicHomePageSettingsView(APIView):
    """Public API endpoint for home page settings"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get home page settings for public access"""
        try:
            settings = HomePageSettings.load()
            serializer = HomePageSettingsSerializer(settings, context={'request': request})
            return Response(serializer.data)
        except HomePageSettings.DoesNotExist:
            # Return default values if settings don't exist
            return Response({
                'logo_image_url': None,
                'logo_text': None,
                'footer_tagline': None,
                'footer_address': None,
                'footer_phone': None,
                'footer_email': None,
                'footer_facebook_url': None,
                'footer_instagram_url': None,
                'footer_twitter_url': None,
                'footer_github_url': None,
                'footer_map_embed_url': None,
                'hero_badge_text': 'New Collection 2024',
                'hero_heading_line1': 'FIND',
                'hero_heading_line2': 'CLOTHES',
                'hero_heading_line3': 'THAT',
                'hero_heading_line4': 'Matches',
                'hero_heading_line5': 'YOUR STYLE',
                'hero_description': 'Browse through our diverse range of meticulously crafted garments...',
                'hero_primary_image_url': None,
                'hero_secondary_image_url': None,
                'stat_brands': '200+',
                'stat_products': '2,000+',
                'stat_customers': '30,000+',
            })


class PublicBrandsView(APIView):
    """Public API endpoint for active brands"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        """Get active brands for public access"""
        brands = Brand.objects.filter(is_active=True).order_by('display_order', 'name')
        serializer = BrandSerializer(brands, many=True, context={'request': request})
        return Response(serializer.data)


class PublicProductsByColorView(APIView):
    """Public API: list products grouped by color as separate entries."""
    permission_classes = [AllowAny]

    def get_cover_image_url(self, request, product: Product, color: str):
        try:
            gallery = Gallery.objects.get(product=product, color__iexact=color)
            primary = gallery.images.filter(imageType='PRIMARY').first()
            image_obj = primary or gallery.images.first()
            if image_obj and image_obj.image:
                return request.build_absolute_uri(image_obj.image.url)
        except Gallery.DoesNotExist:
            pass
        # Fallback to product.image
        if product.image:
            return request.build_absolute_uri(product.image.url)
        return None

    def get(self, request):
        """
        Returns a flat list where each color of a product is its own card.
        Optional query params:
        - search: filter by product name contains
        - category: filter by category slug
        - online_category: filter by online category slug
        - product_type(s): alias for online category slug(s), comma-separated
        - gender: filter by product gender (MALE, FEMALE, UNISEX, or men/women for convenience)
        - only_in_stock: true|false
        - price_min, price_max: numeric filters on product price
        - color(s): comma-separated color names to include
        - size(s): comma-separated sizes to include (must exist for the color)
        - sort: one of [name, price_asc, price_desc]
        - page: page number (default 1)
        - page_size: items per page (default 24)
        """
        search = request.query_params.get('search')
        category_slug = request.query_params.get('category')
        online_category_slug = request.query_params.get('online_category')
        product_types_csv = request.query_params.get('product_types') or request.query_params.get('product_type')
        gender_param = request.query_params.get('gender')
        only_in_stock = str(request.query_params.get('only_in_stock', 'false')).lower() == 'true'
        product_id = request.query_params.get('product_id')
        product_ids_csv = request.query_params.get('product_ids')
        status_slug = request.query_params.get('status')
        # Color and size filters (support both singular and plural names)
        colors_csv = request.query_params.get('colors') or request.query_params.get('color') or ''
        sizes_csv = request.query_params.get('sizes') or request.query_params.get('size') or ''
        wanted_colors = {c.strip().lower() for c in colors_csv.split(',') if c.strip()} if colors_csv else None
        wanted_sizes = {s.strip().lower() for s in sizes_csv.split(',') if s.strip()} if sizes_csv else None

        # Only return products explicitly assigned to online and active
        products = Product.objects.filter(is_active=True, assign_to_online=True).prefetch_related('online_categories').select_related('category')
        if search:
            products = products.filter(name__icontains=search)
        if category_slug:
            products = products.filter(category__slug=category_slug)
        if online_category_slug:
            # Handle parent/child category filtering
            # If the category has children, include products from child categories
            # If it's a child category, only show products in that category
            try:
                category = OnlineCategory.objects.get(slug=online_category_slug)
                # Get all child category IDs (recursively if needed)
                child_ids = [category.id]
                # Get direct children
                children = OnlineCategory.objects.filter(parent=category)
                child_ids.extend([child.id for child in children])
                # Filter products by category or any of its children
                products = products.filter(online_categories__id__in=child_ids)
            except OnlineCategory.DoesNotExist:
                # If category doesn't exist, return empty result
                products = products.none()
        # Support multiple product types (maps to online_category slugs)
        if product_types_csv:
            type_slugs = [s.strip() for s in product_types_csv.split(',') if s.strip()]
            if type_slugs:
                products = products.filter(online_categories__slug__in=type_slugs)
        # Gender filter: support both backend values (MALE, FEMALE, UNISEX) and convenience values (men, women)
        if gender_param:
            gender_lower = gender_param.strip().upper()
            # Map convenience values to backend values
            gender_mapping = {
                'MEN': 'MALE',
                'WOMEN': 'FEMALE',
                'MAN': 'MALE',
                'WOMAN': 'FEMALE',
                'UNISEX': 'UNISEX',
            }
            # Use mapping if available, otherwise use the value directly (assuming it's already MALE/FEMALE/UNISEX)
            gender_value = gender_mapping.get(gender_lower, gender_lower)
            # Filter: include products with matching gender OR UNISEX (unisex products show for all genders)
            if gender_value in ['MALE', 'FEMALE']:
                products = products.filter(
                    Q(gender=gender_value) | Q(gender='UNISEX')
                )
            elif gender_value == 'UNISEX':
                products = products.filter(gender='UNISEX')
        # Price range filter
        try:
            price_min = request.query_params.get('price_min')
            price_max = request.query_params.get('price_max')
            if price_min is not None:
                products = products.filter(selling_price__gte=price_min)
            if price_max is not None:
                products = products.filter(selling_price__lte=price_max)
        except Exception:
            pass
        if product_id:
            products = products.filter(id=product_id)
        elif product_ids_csv:
            try:
                ids = [int(x) for x in product_ids_csv.split(',') if x.strip().isdigit()]
                if ids:
                    products = products.filter(id__in=ids)
            except Exception:
                pass
        
        if status_slug:
            products = products.filter(ecommerce_statuses__slug=status_slug)

        products = products.distinct()

        result = []
        # Prefetch variations to reduce queries
        for product in products:
            # Consider all active variations, regardless of assign_to_online
            variations = ProductVariation.objects.filter(
                product=product,
                is_active=True,
            )
            # group by color
            color_to_stock = {}
            for v in variations:
                key = v.color.strip()
                color_to_stock.setdefault(key, 0)
                color_to_stock[key] += max(0, v.stock)
            # If no variations captured any color, fall back to galleries as color sources
            if not color_to_stock:
                for g in Gallery.objects.filter(product=product):
                    color_name = g.color.strip()
                    # Sum stock for this color if any variations exist; else 0
                    total_stock = variations.filter(color__iexact=color_name).aggregate(total=Sum('stock'))['total'] or 0
                    color_to_stock[color_name] = max(0, total_stock)
            for color_name, total_stock in color_to_stock.items():
                # Color filter
                if wanted_colors and color_name.strip().lower() not in wanted_colors:
                    continue
                if only_in_stock and total_stock <= 0:
                    continue
                # Size filter: must have at least one variation with requested size for this color
                if wanted_sizes:
                    has_size = variations.filter(
                        color__iexact=color_name,
                        size__isnull=False,
                    ).filter(size__in=list(wanted_sizes)).exists()
                    if not has_size:
                        continue
                # Calculate priority-based discount for this product
                discount_info = calculate_discounted_price(product)
                item = {
                    'product_id': product.id,
                    'product_name': product.name,
                    'product_price': str(product.selling_price),
                    'discount_info': discount_info if discount_info['discount_type'] else None,
                    'color_name': color_name,
                    'color_slug': slugify(color_name),
                    'total_stock': total_stock,
                    'cover_image_url': self.get_cover_image_url(request, product, color_name),
                }
                result.append(item)

        # Sorting (on resulting flat list)
        sort = request.query_params.get('sort') or ''
        if sort == 'name':
            result.sort(key=lambda x: x['product_name'])
        elif sort == 'price_asc':
            result.sort(key=lambda x: float(x['product_price']))
        elif sort == 'price_desc':
            result.sort(key=lambda x: float(x['product_price']), reverse=True)

        # Pagination
        try:
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 24))
        except ValueError:
            page, page_size = 1, 24
        total = len(result)
        start = max(0, (page - 1) * page_size)
        end = start + page_size
        results_page = result[start:end]

        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'results': results_page,
        })


class PublicProductDetailByColorView(APIView):
    """Public API: product detail for a given product and color, with sizes/stock/images."""
    permission_classes = [AllowAny]

    def get(self, request, product_id: int, color_slug: str):
        try:
            # Only return products explicitly assigned to online and active
            product = Product.objects.prefetch_related('online_categories').select_related('category').get(id=product_id, is_active=True, assign_to_online=True)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)

        # Resolve actual color name by matching slug against variations
        variations_qs = ProductVariation.objects.filter(
            product=product,
            is_active=True,
        )
        # Build available colors with stock + hex
        color_meta = {}
        for v in variations_qs:
            color_name = v.color.strip()
            color_key = slugify(color_name)
            meta = color_meta.setdefault(color_key, {
                'color_name': color_name,
                'color_slug': color_key,
                'total_stock': 0,
                'color_hex': v.color_hax or None,
            })
            meta['total_stock'] += max(0, v.stock)

        # Find requested color
        if color_slug not in color_meta:
            return Response({'detail': 'Color not found for this product'}, status=status.HTTP_404_NOT_FOUND)
        current_color_name = color_meta[color_slug]['color_name']
        current_color_hex = color_meta[color_slug].get('color_hex')

        # Images for current color
        images = []
        try:
            gallery = Gallery.objects.get(product=product, color__iexact=current_color_name)
            images_qs = gallery.images.order_by('imageType')
            for img in images_qs:
                if img.image:
                    images.append({
                        'type': img.imageType,
                        'url': request.build_absolute_uri(img.image.url)
                    })
        except Gallery.DoesNotExist:
            # Fallback to product default image
            if product.image:
                images.append({'type': 'PRIMARY', 'url': request.build_absolute_uri(product.image.url)})

        # Sizes and stock for current color
        size_entries = []
        current_variations = variations_qs.filter(color__iexact=current_color_name)
        for v in current_variations.order_by('size'):
            size_entries.append({
                'size': v.size,
                'stock_qty': max(0, v.stock),
                'in_stock': v.stock > 0,
            })

        # Calculate priority-based discount
        discount_info = calculate_discounted_price(product)
        
        data = {
            'product': {
                'id': product.id,
                'name': product.name,
                'price': str(product.selling_price),
                'category': product.category.name if product.category else None,
                'online_categories': [
                    {'id': cat.id, 'name': cat.name, 'slug': cat.slug}
                    for cat in product.online_categories.all()
                ],
            },
            'discount_info': discount_info if discount_info['discount_type'] else None,
            'color': {
                'name': current_color_name,
                'slug': color_slug,
                'hex': current_color_hex,
            },
            'images': images,
            'sizes': size_entries,
            'available_colors': list(color_meta.values()),
            'total_stock_for_color': sum(e['stock_qty'] for e in size_entries),
        }
        return Response(data)


class PublicDeliverySettingsView(APIView):
    """Public API: get delivery charges (inside/outside Dhaka)."""
    permission_classes = [AllowAny]

    def get(self, request):
        settings = DeliverySettings.load()
        serializer = DeliverySettingsSerializer(settings)
        return Response(serializer.data)


class DeliverySettingsView(APIView):
    """Authenticated API: update delivery charges."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings = DeliverySettings.load()
        serializer = DeliverySettingsSerializer(settings)
        return Response(serializer.data)

    def patch(self, request):
        settings = DeliverySettings.load()
        serializer = DeliverySettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class HeroSlideViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing hero slides
    """
    queryset = HeroSlide.objects.all()
    serializer_class = HeroSlideSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        queryset = HeroSlide.objects.all()
        # Filter by active status if requested
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset.order_by('display_order', 'created_at')


class PublicHeroSlidesView(APIView):
    """Public API endpoint for active hero slides"""
    permission_classes = [AllowAny]

    def get(self, request):
        slides = HeroSlide.objects.filter(is_active=True).order_by('display_order', 'created_at')
        serializer = HeroSlideSerializer(slides, many=True, context={'request': request})
        return Response(serializer.data)


class PromotionalModalViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing promotional modals
    """
    queryset = PromotionalModal.objects.all()
    serializer_class = PromotionalModalSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return PromotionalModal.objects.all().order_by('-created_at')


class PublicPromotionalModalView(APIView):
    """Public API endpoint for active promotional modals"""
    permission_classes = [AllowAny]

    def get(self, request):
        now = timezone.now()
        active_modals = PromotionalModal.objects.filter(
            is_active=True,
            start_date__lte=now,
            end_date__gte=now
        ).order_by('-created_at')
        
        # We might only want to return one or all depending on requirements.
        # Returning all allows frontend to decide priority or display rules.
        serializer = PromotionalModalSerializer(active_modals, many=True, context={'request': request})
        return Response(serializer.data)


class PublicCartPriceView(APIView):
    """
    Public API: Accepts cart items and returns authoritative pricing.
    Body: { items: [{ productId: string|number, quantity: number }] }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        items = request.data.get('items') or []
        if not isinstance(items, list):
            return Response({'detail': 'Invalid items'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            pricing = price_cart(items, request.data.get('coupon_code'))
        except PricingError as exc:
            return Response({'detail': str(exc), 'coupon': {'valid': False, 'error': str(exc)}}, status=status.HTTP_400_BAD_REQUEST)
        delivery = DeliverySettings.load()
        product_ids = [item['productId'] for item in pricing['items']]
        products = Product.objects.filter(id__in=product_ids).prefetch_related(
            'online_categories', 'galleries__images', 'variations'
        )
        public_pricing = {key: value for key, value in pricing.items() if key != 'coupon_object'}
        public_pricing['items'] = [
            {**item, 'unit_price': item['final_unit_price']} for item in pricing['items']
        ]
        public_pricing['products'] = EcommerceProductSerializer(products, many=True, context={'request': request}).data
        public_pricing['delivery'] = DeliverySettingsSerializer(delivery).data
        return Response(public_pricing)

        product_ids = []
        normalized = []
        for line in items:
            try:
                raw_pid = str(line.get('productId') or '')
                if '/' in raw_pid:
                    pid = int(raw_pid.split('/')[0])
                else:
                    pid = int(raw_pid)
                
                qty = int(line.get('quantity'))
                if qty <= 0:
                    continue
                variations = line.get('variations') or {}
                color = (variations.get('color') or '').strip() if isinstance(variations, dict) else ''
                size = (variations.get('size') or '').strip() if isinstance(variations, dict) else ''
                product_ids.append(pid)
                normalized.append({'product_id': pid, 'quantity': qty, 'color': color, 'size': size})
            except Exception:
                continue

        # Use select_related and prefetch_related for optimized queries
        products = Product.objects.filter(
            id__in=product_ids, 
            is_active=True, 
            assign_to_online=True
        ).select_related(
            'category',
            'supplier'
        ).prefetch_related(
            'online_categories',
            'galleries__images',
            'variations'
        )
        prod_map = {p.id: p for p in products}

        result_items = []
        subtotal = 0
        for line in normalized:
            p = prod_map.get(line['product_id'])
            if not p:
                continue
            
            # Apply priority-based discount (Product > Category > Global)
            discount_info = calculate_discounted_price(p)
            unit_price = discount_info['final_price']
            original_price = discount_info['original_price']

            # Determine available stock based on requested variant
            max_stock = 0
            variant_color = line.get('color') or None
            variant_size = line.get('size') or None
            try:
                q = ProductVariation.objects.filter(product=p, is_active=True)
                if variant_color:
                    q = q.filter(color__iexact=variant_color)
                if variant_size:
                    q = q.filter(size__iexact=variant_size)
                max_stock = max(0, q.aggregate(total=Sum('stock'))['total'] or 0)
            except Exception:
                max_stock = max(0, getattr(p, 'stock_quantity', 0))

            # Cap effective quantity by stock for pricing summary
            effective_qty = min(line['quantity'], max_stock) if max_stock > 0 else line['quantity']
            line_total = unit_price * effective_qty
            subtotal += line_total
            
            # Get primary image from gallery, fallback to product image
            # Use prefetched galleries to avoid additional queries
            image_url = None
            try:
                # Try to get primary image from prefetched galleries
                for gallery in p.galleries.all():
                    for img in gallery.images.all():
                        if img.imageType == 'PRIMARY' and img.image:
                            image_url = request.build_absolute_uri(img.image.url)
                            break
                    if image_url:
                        break
            except Exception:
                pass
            
            # Fallback to product's main image if no primary image found
            if not image_url and p.image:
                image_url = request.build_absolute_uri(p.image.url)
            
            result_items.append({
                'productId': p.id,
                'name': p.name,
                'image_url': image_url,
                'unit_price': unit_price,
                'original_price': original_price,
                'discount_info': discount_info if discount_info['discount_type'] else None,
                'quantity': line['quantity'],
                'max_stock': max_stock,
                'variant': {
                    'color': variant_color,
                    'size': variant_size,
                },
                'line_total': line_total,
            })

        delivery = DeliverySettings.load()
        
        # Serialize products with full information
        product_serializer = EcommerceProductSerializer(
            list(prod_map.values()), 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'items': result_items,
            'products': product_serializer.data,  # Array of products with full info
            'subtotal': subtotal,
            'delivery': DeliverySettingsSerializer(delivery).data,
        })


class CreateOnlinePreorderView(APIView):
    """
    Public API endpoint to create a customer and online preorder in one request.
    Accepts the full checkout payload and creates customer if needed, then creates preorder.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """
        Create customer (if needed) and online preorder.
        Expected payload:
        {
            "customer_name": "John Doe",
            "customer_phone": "01712345678",
            "customer_email": "john@example.com",
            "shipping_address": {
                "city_corporation": "Dhaka North City Corporation",
                "thana": "Mohammadpur",
                "place": "Shahbagh",
                "address": "Full address"
            },
            "notes": "Optional notes",
            "items": [
                {
                    "product_id": 96,
                    "size": "28",
                    "color": "Purple",
                    "quantity": 1,
                    "unit_price": 12000,
                    "discount": 0
                }
            ],
            "delivery_charge": 0,
            "delivery_method": "Inside Dhaka",
            "expected_delivery_date": "2025-12-31"  # Optional
        }
        """
        # Extract customer data
        customer_name = request.data.get('customer_name', '').strip()
        customer_phone = request.data.get('customer_phone', '').strip()
        customer_email = request.data.get('customer_email', '').strip()

        # Validate required fields
        if not customer_phone:
            return Response(
                {'error': 'customer_phone is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not customer_name:
            return Response(
                {'error': 'customer_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate items
        items = request.data.get('items', [])
        if not items or not isinstance(items, list):
            return Response(
                {'error': 'items is required and must be a non-empty list'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate each item
        for item in items:
            required_fields = ['product_id', 'size', 'color', 'quantity']
            for field in required_fields:
                if field not in item:
                    return Response(
                        {'error': f'Each item must include {field} field'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

        # Create or get customer
        try:
            customer = Customer.objects.get(phone=customer_phone)
            # Update customer info if provided
            if customer_name:
                name_parts = customer_name.split(maxsplit=1)
                customer.first_name = name_parts[0] if len(name_parts) > 0 else ''
                customer.last_name = name_parts[1] if len(name_parts) > 1 else ''
            if customer_email:
                # Only update email if it's not already set or if it's different
                # Handle email uniqueness - if email exists for another customer, skip updating
                try:
                    existing_customer_with_email = Customer.objects.exclude(id=customer.id).get(email=customer_email)
                    # Email already belongs to another customer, skip updating
                    pass
                except Customer.DoesNotExist:
                    # Email is available, update it
                    customer.email = customer_email
            customer.save()
        except Customer.DoesNotExist:
            # Create new customer
            name_parts = customer_name.split(maxsplit=1)
            first_name = name_parts[0] if len(name_parts) > 0 else ''
            last_name = name_parts[1] if len(name_parts) > 1 else ''
            
            # Build address from shipping_address if provided
            shipping_address = request.data.get('shipping_address', {})
            address_parts = []
            if shipping_address.get('address'):
                address_parts.append(shipping_address['address'])
            if shipping_address.get('place'):
                address_parts.append(shipping_address['place'])
            if shipping_address.get('thana'):
                address_parts.append(shipping_address['thana'])
            if shipping_address.get('city_corporation'):
                address_parts.append(shipping_address['city_corporation'])
            address_text = ', '.join(address_parts) if address_parts else ''

            # Handle email uniqueness
            email_to_use = customer_email if customer_email else f"{customer_phone}@temp.com"
            if customer_email:
                try:
                    # Check if email already exists
                    Customer.objects.get(email=customer_email)
                    # Email exists, use a different one
                    email_to_use = f"{customer_phone}@temp.com"
                except Customer.DoesNotExist:
                    # Email is available
                    pass

            try:
                customer = Customer.objects.create(
                    first_name=first_name,
                    last_name=last_name,
                    phone=customer_phone,
                    email=email_to_use,
                    address=address_text,
                    gender='O'  # Default to Other
                )
            except IntegrityError:
                # Handle case where phone might have been created between check and create
                customer = Customer.objects.get(phone=customer_phone)

        # Build shipping address JSON
        shipping_address_data = request.data.get('shipping_address', {})
        
        delivery = DeliverySettings.load()
        delivery_method = request.data.get('delivery_method', '')
        if delivery_method == 'Inside Dhaka':
            delivery_charge = Decimal(str(delivery.inside_dhaka_charge))
        elif delivery_method == 'Inside Gazipur':
            delivery_charge = Decimal(str(delivery.inside_gazipur_charge))
        else:
            delivery_charge = Decimal(str(delivery.outside_dhaka_charge))

        # Handle expected_delivery_date if provided
        expected_delivery_date = request.data.get('expected_delivery_date')
        if expected_delivery_date:
            try:
                if isinstance(expected_delivery_date, str):
                    expected_delivery_date = datetime.strptime(expected_delivery_date, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                expected_delivery_date = None

        try:
            with transaction.atomic():
                pricing = price_cart(items, request.data.get('coupon_code'), lock_coupon=True)
                coupon = pricing['coupon_object']
                preorder_data = {
                    'customer_name': customer_name, 'customer_phone': customer_phone,
                    'customer_email': customer_email if customer_email else '',
                    'items': pricing['items'],
                    'shipping_address': shipping_address_data if shipping_address_data else None,
                    'delivery_charge': delivery_charge, 'delivery_method': delivery_method,
                    'total_amount': pricing['subtotal'] + delivery_charge,
                    'notes': request.data.get('notes', '') or '', 'status': 'PENDING',
                    'coupon': coupon.pk if coupon else None,
                    'coupon_code': coupon.code if coupon else '',
                    'coupon_interaction_mode': coupon.interaction_mode if coupon else '',
                    'original_subtotal': pricing['original_subtotal'],
                    'automatic_discount_amount': pricing['automatic_discount_amount'],
                    'coupon_discount_amount': pricing['coupon_discount_amount'],
                    'final_merchandise_subtotal': pricing['subtotal'],
                }
                if expected_delivery_date:
                    preorder_data['expected_delivery_date'] = expected_delivery_date
                serializer = OnlinePreorderCreateSerializer(data=preorder_data)
                if not serializer.is_valid():
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                online_preorder = serializer.save()
                if coupon:
                    CouponRedemption.objects.create(coupon=coupon, order=online_preorder)
        except PricingError as exc:
            return Response({'detail': str(exc), 'coupon': {'valid': False, 'error': str(exc)}}, status=status.HTTP_400_BAD_REQUEST)
        
        # Send notification alerts
        try:
            from apps.online_preorder.email_utils import send_admin_order_notification, send_customer_order_received
            send_admin_order_notification(online_preorder.id)
            send_customer_order_received(online_preorder.id)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to trigger notifications in ecommerce view: {str(e)}")
            
        return Response(OnlinePreorderSerializer(online_preorder).data, status=status.HTTP_201_CREATED)
