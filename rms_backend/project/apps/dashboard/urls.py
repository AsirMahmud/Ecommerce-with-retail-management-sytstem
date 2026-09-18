from django.urls import path
from .views import DashboardStatsView, ActivityLogView

urlpatterns = [
    path('stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('activity-log/', ActivityLogView.as_view(), name='activity-log'),
] 