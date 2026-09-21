from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import Expense, ExpenseCategory
from .serializers import ExpenseSerializer, ExpenseCategorySerializer
from apps.authentication.permissions import IsAccountantOrAbove

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAccountantOrAbove]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAccountantOrAbove]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['description', 'reference_number', 'notes']
    ordering_fields = ['date', 'amount', 'status', 'created_at']
    ordering = ['-date', '-created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        
        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category_id=category)
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by payment method
        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        
        return queryset

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        today = timezone.now().date()
        start_of_month = today.replace(day=1)
        
        # Today's expenses
        today_expenses = Expense.objects.filter(
            date=today
        ).aggregate(
            total_amount=Sum('amount'),
            total_count=Count('id'),
            pending_count=Count('id', filter=Q(status='PENDING')),
            approved_count=Count('id', filter=Q(status='APPROVED'))
        )
        
        # Monthly expenses
        monthly_expenses = Expense.objects.filter(
            date__gte=start_of_month
        ).aggregate(
            total_amount=Sum('amount'),
            total_count=Count('id'),
            pending_count=Count('id', filter=Q(status='PENDING')),
            approved_count=Count('id', filter=Q(status='APPROVED'))
        )
        
        # Category distribution
        category_distribution = Expense.objects.filter(
            date__gte=start_of_month
        ).values(
            'category__name',
            'category__color'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        # Payment method distribution
        payment_distribution = Expense.objects.filter(
            date__gte=start_of_month
        ).values('payment_method').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        # Recent expenses
        recent_expenses = Expense.objects.select_related(
            'category'
        ).order_by('-created_at')[:5]

        # Monthly trend (last 6 months)
        six_months_ago = today - timedelta(days=180)
        monthly_trend = Expense.objects.filter(
            date__gte=six_months_ago
        ).values(
            'date__month'
        ).annotate(
            amount=Sum('amount')
        ).order_by('date__month')

        # Format monthly trend data
        formatted_monthly_trend = [
            {
                'month': datetime(2024, item['date__month'], 1).strftime('%b'),
                'amount': item['amount'] or 0
            }
            for item in monthly_trend
        ]
        
        return Response({
            'today': today_expenses,
            'monthly': monthly_expenses,
            'category_distribution': list(category_distribution),
            'payment_distribution': list(payment_distribution),
            'recent_expenses': ExpenseSerializer(recent_expenses, many=True).data,
            'monthly_trend': formatted_monthly_trend
        })

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        expense = self.get_object()
        if expense.status != 'PENDING':
            return Response(
                {'error': 'Only pending expenses can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        expense.status = 'APPROVED'
        expense.save()
        
        return Response(ExpenseSerializer(expense).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        expense = self.get_object()
        if expense.status != 'PENDING':
            return Response(
                {'error': 'Only pending expenses can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        expense.status = 'REJECTED'
        expense.save()
        
        return Response(ExpenseSerializer(expense).data) 