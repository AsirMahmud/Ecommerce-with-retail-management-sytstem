from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from apps.authentication.permissions import IsAdminUserRole
from django.db import connection
from apps.sales.models import Sale
from apps.customer.models import Customer
from apps.expenses.models import Expense
from apps.reports.models import Report

class FlushDatabaseView(APIView):
    permission_classes = [IsAdminUserRole]
    authentication_classes = [JWTAuthentication]

    def delete(self, request):
        try:
            database_type = request.query_params.get('database_type')
            
            if database_type == 'all':
                # Delete all data from main application tables
                Sale.objects.all().delete()
                Customer.objects.all().delete()
                Expense.objects.all().delete()
                Report.objects.all().delete()
                
                # Reset auto-increment counters for all tables
                with connection.cursor() as cursor:
                    cursor.execute("ALTER TABLE sales_sale AUTO_INCREMENT = 1")
                    cursor.execute("ALTER TABLE customer_customer AUTO_INCREMENT = 1")
                    cursor.execute("ALTER TABLE expenses_expense AUTO_INCREMENT = 1")
                    cursor.execute("ALTER TABLE reports_report AUTO_INCREMENT = 1")
                
                return Response(
                    {'message': 'All databases flushed successfully'},
                    status=status.HTTP_200_OK
                )
            
            if database_type == 'sales':
                Sale.objects.all().delete()
            elif database_type == 'customers':
                Customer.objects.all().delete()
            elif database_type == 'expenses':
                Expense.objects.all().delete()
            elif database_type == 'reports':
                Report.objects.all().delete()
            else:
                return Response(
                    {'error': 'Invalid database type'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Reset auto-increment counters
            with connection.cursor() as cursor:
                if database_type == 'sales':
                    cursor.execute("ALTER TABLE sales_sale AUTO_INCREMENT = 1")
                elif database_type == 'customers':
                    cursor.execute("ALTER TABLE customer_customer AUTO_INCREMENT = 1")
                elif database_type == 'expenses':
                    cursor.execute("ALTER TABLE expenses_expense AUTO_INCREMENT = 1")
                elif database_type == 'reports':
                    cursor.execute("ALTER TABLE reports_report AUTO_INCREMENT = 1")

            return Response(
                {'message': f'{database_type.capitalize()} database flushed successfully'},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
