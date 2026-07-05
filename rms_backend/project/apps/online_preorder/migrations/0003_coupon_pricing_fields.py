from django.db import migrations, models
import django.db.models.deletion
from decimal import Decimal


class Migration(migrations.Migration):
    dependencies = [
        ('ecommerce', '0010_coupon_and_order_pricing'),
        ('online_preorder', '0002_onlinepreorderverification_and_more'),
    ]
    operations = [
        migrations.AddField(model_name='onlinepreorder', name='coupon', field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='orders', to='ecommerce.coupon')),
        migrations.AddField(model_name='onlinepreorder', name='coupon_code', field=models.CharField(blank=True, max_length=50)),
        migrations.AddField(model_name='onlinepreorder', name='coupon_interaction_mode', field=models.CharField(blank=True, max_length=10)),
        migrations.AddField(model_name='onlinepreorder', name='original_subtotal', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
        migrations.AddField(model_name='onlinepreorder', name='automatic_discount_amount', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
        migrations.AddField(model_name='onlinepreorder', name='coupon_discount_amount', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
        migrations.AddField(model_name='onlinepreorder', name='final_merchandise_subtotal', field=models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
    ]
