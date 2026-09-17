from decimal import Decimal
from django.db import transaction
import logging

logger = logging.getLogger(__name__)


def deduct_preorder_stock(order, reason="new"):
    """
    Deducts stock for all items in an online preorder and logs StockMovement(movement_type='OUT').
    Idempotent: runs if order.is_stock_deducted is False, or if order was previously restored.
    """
    if order.is_stock_deducted and not order.is_stock_restored:
        return

    if order.status in ["CANCELLED", "RETURNED"]:
        return

    from apps.inventory.models import Product, ProductVariation, StockMovement

    try:
        with transaction.atomic():
            for item in order.items or []:
                product_id = item.get("product_id") or item.get("id")
                qty = int(item.get("quantity", 0))
                size = item.get("size")
                color = item.get("color")

                if not product_id or qty <= 0:
                    continue

                try:
                    product = Product.objects.select_for_update().get(id=product_id)
                except Product.DoesNotExist:
                    continue

                variation = None
                if size and color:
                    variation = ProductVariation.objects.select_for_update().filter(product=product, size=size, color=color).first()
                if not variation and size:
                    variation = ProductVariation.objects.select_for_update().filter(product=product, size=size).first()
                if not variation:
                    variation = product.variations.select_for_update().first()

                note_text = (
                    f"Stock deducted for online preorder #{order.id}"
                    if reason == "new"
                    else f"Stock re-deducted for reactivated online preorder #{order.id}"
                )

                if variation:
                    variation.stock = max(0, variation.stock - qty)
                    variation.save()
                    product.save()
                    StockMovement.objects.create(
                        product=product,
                        variation=variation,
                        movement_type="OUT",
                        quantity=qty,
                        reference_number=f"ORD-{order.id}",
                        notes=note_text
                    )
                else:
                    product.stock_quantity = max(0, product.stock_quantity - qty)
                    product.save()
                    StockMovement.objects.create(
                        product=product,
                        variation=None,
                        movement_type="OUT",
                        quantity=qty,
                        reference_number=f"ORD-{order.id}",
                        notes=note_text
                    )

            order.is_stock_deducted = True
            order.is_stock_restored = False
            order.save(update_fields=["is_stock_deducted", "is_stock_restored", "updated_at"])
    except Exception as e:
        logger.error(f"Error deducting stock for online preorder #{order.id}: {str(e)}")
        raise


def restore_preorder_stock(order, reason="returned"):
    """
    Restores stock for all items in an online preorder and logs StockMovement(movement_type='IN').
    Idempotent: does nothing if order.is_stock_restored is already True.
    """
    if order.is_stock_restored:
        return

    from apps.inventory.models import Product, ProductVariation, StockMovement

    try:
        with transaction.atomic():
            for item in order.items or []:
                product_id = item.get("product_id") or item.get("id")
                qty = int(item.get("quantity", 0))
                size = item.get("size")
                color = item.get("color")

                if not product_id or qty <= 0:
                    continue

                try:
                    product = Product.objects.select_for_update().get(id=product_id)
                except Product.DoesNotExist:
                    continue

                variation = None
                if size and color:
                    variation = ProductVariation.objects.select_for_update().filter(product=product, size=size, color=color).first()
                if not variation and size:
                    variation = ProductVariation.objects.select_for_update().filter(product=product, size=size).first()
                if not variation:
                    variation = product.variations.select_for_update().first()

                note_text = (
                    f"Restocked from returned online preorder #{order.id}"
                    if reason == "returned"
                    else f"Restocked from cancelled online preorder #{order.id}"
                )

                if variation:
                    variation.stock += qty
                    variation.save()
                    product.save()
                    StockMovement.objects.create(
                        product=product,
                        variation=variation,
                        movement_type="IN",
                        quantity=qty,
                        reference_number=f"ORD-{order.id}",
                        notes=note_text
                    )
                else:
                    product.stock_quantity += qty
                    product.save()
                    StockMovement.objects.create(
                        product=product,
                        variation=None,
                        movement_type="IN",
                        quantity=qty,
                        reference_number=f"ORD-{order.id}",
                        notes=note_text
                    )

            order.is_stock_restored = True
            order.save(update_fields=["is_stock_restored", "updated_at"])
    except Exception as e:
        logger.error(f"Error restoring stock for online preorder #{order.id}: {str(e)}")
        raise
