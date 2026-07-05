from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo
from django.utils import timezone
from apps.inventory.models import Product, ProductVariation
from .discount_utils import calculate_discounted_price
from .models import Coupon

MONEY = Decimal('0.01')


class PricingError(ValueError):
    pass


def _money(value):
    return Decimal(str(value or 0)).quantize(MONEY, rounding=ROUND_HALF_UP)


def _coupon_discount(coupon, base):
    if coupon.discount_type == 'PERCENTAGE':
        amount = base * coupon.value / Decimal('100')
        if coupon.maximum_discount is not None:
            amount = min(amount, coupon.maximum_discount)
    else:
        amount = coupon.value
    return min(base, _money(amount))


def price_cart(raw_items, coupon_code=None, lock_coupon=False):
    normalized = []
    for line in raw_items or []:
        try:
            raw_id = line.get('productId', line.get('product_id'))
            pid = int(str(raw_id).split('/')[0].split('-')[0])
            qty = int(line.get('quantity'))
            variations = line.get('variations') or {}
            color = str(line.get('color', variations.get('color', '')) or '').strip()
            size = str(line.get('size', variations.get('size', '')) or '').strip()
            if qty > 0:
                normalized.append((pid, qty, color, size))
        except (TypeError, ValueError, AttributeError):
            raise PricingError('Cart contains an invalid item.')
    if not normalized:
        raise PricingError('Cart is empty.')

    products = Product.objects.filter(
        id__in={row[0] for row in normalized}, is_active=True, assign_to_online=True
    ).select_related('category').prefetch_related('online_categories', 'variations')
    product_map = {p.id: p for p in products}
    priced_items, original_subtotal, automatic_subtotal = [], Decimal('0'), Decimal('0')

    for pid, qty, color, size in normalized:
        product = product_map.get(pid)
        if not product:
            raise PricingError(f'Product {pid} is unavailable.')
        variants = ProductVariation.objects.filter(product=product, is_active=True)
        if color:
            variants = variants.filter(color__iexact=color)
        if size:
            variants = variants.filter(size__iexact=size)
        variant_rows = list(variants)
        if (color or size) and not variant_rows:
            raise PricingError(f'The selected variant for {product.name} is unavailable.')
        stock = sum(v.stock for v in variant_rows) if variant_rows else max(0, getattr(product, 'stock_quantity', 0))
        if stock < qty:
            raise PricingError(f'Only {stock} item(s) are available for {product.name}.')

        info = calculate_discounted_price(product)
        original = _money(info['original_price'])
        final = _money(info['final_price'])
        line_original = original * qty
        line_final = final * qty
        original_subtotal += line_original
        automatic_subtotal += line_final
        priced_items.append({
            'productId': product.id, 'product_id': product.id, 'name': product.name,
            'product_name': product.name, 'unit_price': original, 'final_unit_price': final,
            'quantity': qty, 'discount': _money(line_original - line_final),
            'line_total': _money(line_final), 'max_stock': stock,
            'variant': {'color': color or None, 'size': size or None},
            'color': color, 'size': size,
            'discount_info': info if info['discount_type'] else None,
        })

    original_subtotal = _money(original_subtotal)
    automatic_subtotal = _money(automatic_subtotal)
    automatic_discount = _money(original_subtotal - automatic_subtotal)
    final_subtotal, coupon_discount, coupon, coupon_result = automatic_subtotal, Decimal('0'), None, None

    code = str(coupon_code or '').strip().upper()
    if code:
        queryset = Coupon.objects
        if lock_coupon:
            queryset = queryset.select_for_update()
        try:
            coupon = queryset.get(code__iexact=code)
        except Coupon.DoesNotExist:
            raise PricingError('Invalid coupon code.')
        now = timezone.now()
        if not coupon.is_active:
            raise PricingError('This coupon is disabled.')
        if now < coupon.start_date:
            local_start = timezone.localtime(coupon.start_date, ZoneInfo('Asia/Dhaka'))
            raise PricingError(
                f'This coupon starts on {local_start.strftime("%d %b %Y at %I:%M %p")} Bangladesh time.'
            )
        if now > coupon.end_date:
            raise PricingError('This coupon has expired.')
        if original_subtotal < coupon.minimum_spend:
            raise PricingError(f'Minimum spend for this coupon is {coupon.minimum_spend}.')
        if coupon.usage_limit is not None and coupon.used_count >= coupon.usage_limit:
            raise PricingError('This coupon has reached its usage limit.')

        if coupon.interaction_mode == 'STACK':
            coupon_discount = _coupon_discount(coupon, automatic_subtotal)
            final_subtotal = automatic_subtotal - coupon_discount
        elif coupon.interaction_mode == 'REPLACE':
            coupon_discount = _coupon_discount(coupon, original_subtotal)
            automatic_discount = Decimal('0')
            final_subtotal = original_subtotal - coupon_discount
        else:
            candidate = _coupon_discount(coupon, original_subtotal)
            if candidate > automatic_discount:
                coupon_discount, automatic_discount = candidate, Decimal('0')
                final_subtotal = original_subtotal - candidate
            else:
                coupon_discount, final_subtotal = Decimal('0'), automatic_subtotal
        coupon_result = {
            'valid': True, 'code': coupon.code, 'name': coupon.name,
            'interaction_mode': coupon.interaction_mode,
            'discount_amount': _money(coupon_discount),
        }

    return {
        'items': priced_items, 'original_subtotal': original_subtotal,
        'automatic_discount_amount': _money(automatic_discount),
        'coupon_discount_amount': _money(coupon_discount),
        'subtotal': _money(final_subtotal), 'final_merchandise_subtotal': _money(final_subtotal),
        'coupon': coupon_result, 'coupon_object': coupon,
    }
