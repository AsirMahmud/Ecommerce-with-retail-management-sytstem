from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal

from apps.sales.serializers import SaleSerializer
from .models import OnlineConversion, OnlinePreorder


@receiver(post_save, sender=OnlinePreorder)
def convert_online_preorder_to_sale(sender, instance: OnlinePreorder, created: bool, **kwargs):
    # Only when online preorder is completed
    if instance.status != 'COMPLETED':
        return

    conversion, _ = OnlineConversion.objects.get_or_create(online_preorder=instance)
    if conversion.status == 'SUCCESS' and conversion.sale_id:
        return

    try:
        items_payload = []
        subtotal = Decimal('0')
        for item in instance.items or []:
            qty = int(item.get('quantity', 0))
            unit_price = Decimal(str(item.get('unit_price', 0)))
            discount = Decimal(str(item.get('discount', 0) or 0))
            line_total = (unit_price * qty) - discount
            subtotal += line_total
            items_payload.append({
                'product_id': item['product_id'],
                'size': item.get('size') or '',
                'color': item.get('color') or '',
                'quantity': qty,
                'unit_price': float(unit_price),
                'discount': float(discount),
            })

        sale_data = {
            'customer_phone': instance.customer_phone,
            'customer_name': instance.customer_name,
            'subtotal': float(subtotal),
            'tax': 0,
            'discount': 0,
            'total': float(subtotal),
            'payment_method': 'cash',
            'status': 'completed',
            'sale_type': 'online_preorder',
            'notes': f"Converted from online preorder #{instance.id}",
            'items': items_payload,
            'payment_data': [{
                'method': 'cash',
                'amount': float(subtotal),
                'notes': f"COD payment for online preorder #{instance.id}",
            }],
        }

        serializer = SaleSerializer(data=sale_data)
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()
        conversion.mark_success(sale)
    except Exception as exc:
        conversion.mark_failed(str(exc))


