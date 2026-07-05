from django.db import migrations


def repair_selling_price_column(apps, schema_editor):
    """
    Repair legacy databases whose product selling price is still stored under
    an old column name even though Django's migration state is current.
    """
    table = schema_editor.quote_name('inventory_product')
    with schema_editor.connection.cursor() as cursor:
        columns = {
            column.name
            for column in schema_editor.connection.introspection.get_table_description(
                cursor, 'inventory_product'
            )
        }

        if 'selling_price' in columns:
            return

        if 'retail_price' in columns:
            cursor.execute(
                f'ALTER TABLE {table} CHANGE COLUMN '
                f'{schema_editor.quote_name("retail_price")} '
                f'{schema_editor.quote_name("selling_price")} '
                'DECIMAL(10, 2) NOT NULL'
            )
            return

        if 'product_price' in columns:
            cursor.execute(
                f'ALTER TABLE {table} CHANGE COLUMN '
                f'{schema_editor.quote_name("product_price")} '
                f'{schema_editor.quote_name("selling_price")} '
                'DECIMAL(10, 2) NOT NULL'
            )
            return

        cursor.execute(
            f'ALTER TABLE {table} ADD COLUMN '
            f'{schema_editor.quote_name("selling_price")} '
            'DECIMAL(10, 2) NULL'
        )
        cursor.execute(
            f'UPDATE {table} SET '
            f'{schema_editor.quote_name("selling_price")} = '
            f'{schema_editor.quote_name("cost_price")} '
            f'WHERE {schema_editor.quote_name("selling_price")} IS NULL'
        )
        cursor.execute(
            f'ALTER TABLE {table} MODIFY COLUMN '
            f'{schema_editor.quote_name("selling_price")} '
            'DECIMAL(10, 2) NOT NULL'
        )


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('inventory', '0017_product_ecommerce_statuses'),
    ]

    operations = [
        migrations.RunPython(repair_selling_price_column, migrations.RunPython.noop),
    ]
