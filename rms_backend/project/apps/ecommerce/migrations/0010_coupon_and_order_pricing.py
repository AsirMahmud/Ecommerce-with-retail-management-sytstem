from django.db import migrations, models
import django.db.models.deletion
import django.core.validators
from decimal import Decimal


class Migration(migrations.Migration):
    dependencies = [
        ('ecommerce', '0009_productstatus'),
    ]

    operations = [
        migrations.CreateModel(
            name='Coupon',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('code', models.CharField(max_length=50, unique=True)),
                ('discount_type', models.CharField(choices=[('PERCENTAGE', 'Percentage'), ('FIXED', 'Fixed amount')], max_length=12)),
                ('value', models.DecimalField(decimal_places=2, max_digits=12, validators=[django.core.validators.MinValueValidator(Decimal('0.01'))])),
                ('interaction_mode', models.CharField(choices=[('STACK', 'Stack after automatic discounts'), ('BEST', 'Best discount only'), ('REPLACE', 'Replace automatic discounts')], default='STACK', max_length=10)),
                ('start_date', models.DateTimeField()),
                ('end_date', models.DateTimeField()),
                ('minimum_spend', models.DecimalField(decimal_places=2, default=Decimal('0.00'), max_digits=12)),
                ('maximum_discount', models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ('usage_limit', models.PositiveIntegerField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
