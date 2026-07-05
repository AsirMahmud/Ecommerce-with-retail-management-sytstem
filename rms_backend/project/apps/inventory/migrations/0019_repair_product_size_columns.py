from django.db import migrations


def repair_product_size_columns(apps, schema_editor):
    table = schema_editor.quote_name('inventory_product')
    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor, 'inventory_product'
            )
        }
        for column_name in ('size_type', 'size_category'):
            if column_name not in columns:
                cursor.execute(
                    f'ALTER TABLE {table} ADD COLUMN '
                    f'{schema_editor.quote_name(column_name)} VARCHAR(50) NULL'
                )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('inventory', '0018_repair_product_selling_price_column'),
    ]

    operations = [
        migrations.RunPython(repair_product_size_columns, migrations.RunPython.noop),
    ]
