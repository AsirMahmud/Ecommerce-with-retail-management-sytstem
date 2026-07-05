from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DiscountViewSet,
    BrandViewSet,
    HomePageSettingsViewSet,
    PublicHomePageSettingsView,
    PublicBrandsView,
    PublicProductsByColorView,
    PublicProductDetailByColorView,
    PublicDeliverySettingsView,
    DeliverySettingsView,
    PublicCartPriceView,
    CreateOnlinePreorderView,
    HeroSlideViewSet,
    PublicHeroSlidesView,
    PromotionalModalViewSet,
    PublicPromotionalModalView,
    ProductStatusViewSet,
    CouponViewSet,
)

router = DefaultRouter()
router.register(r'discounts', DiscountViewSet, basename='discount')
router.register(r'coupons', CouponViewSet, basename='coupon')
router.register(r'brands', BrandViewSet, basename='brand')
router.register(r'home-page-settings', HomePageSettingsViewSet, basename='home-page-settings')
router.register(r'hero-slides', HeroSlideViewSet, basename='hero-slide')
router.register(r'promotional-modals', PromotionalModalViewSet, basename='promotional-modal')
router.register(r'product-statuses', ProductStatusViewSet, basename='product-status')

urlpatterns = [
    path('', include(router.urls)),
    path('public/home-page-settings/', PublicHomePageSettingsView.as_view(), name='public-home-page-settings'),
    path('public/brands/', PublicBrandsView.as_view(), name='public-brands'),
    path('public/products-by-color/', PublicProductsByColorView.as_view(), name='public-products-by-color'),
    path('public/product-details/<int:product_id>/<slug:color_slug>/', PublicProductDetailByColorView.as_view(), name='public-product-detail-by-color'),
    path('public/delivery-settings/', PublicDeliverySettingsView.as_view(), name='public-delivery-settings'),
    path('delivery-settings/', DeliverySettingsView.as_view(), name='delivery-settings'),
    path('public/cart/price/', PublicCartPriceView.as_view(), name='public-cart-price'),
    path('orders/create/', CreateOnlinePreorderView.as_view(), name='create-online-preorder'),
    path('public/hero-slides/', PublicHeroSlidesView.as_view(), name='public-hero-slides'),
    path('public/promotional-modals/', PublicPromotionalModalView.as_view(), name='public-promotional-modals'),
]

