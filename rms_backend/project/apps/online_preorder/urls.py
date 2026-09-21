from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PublicCreateOnlinePreorderView, OnlinePreorderViewSet, CourierSettingViewSet

router = DefaultRouter()
router.register(r'orders', OnlinePreorderViewSet, basename='online-preorders')
router.register(r'courier-settings', CourierSettingViewSet, basename='courier-settings')

urlpatterns = [
    path('orders/create/', PublicCreateOnlinePreorderView.as_view(), name='online-preorder-create'),
    path('', include(router.urls)),
]


