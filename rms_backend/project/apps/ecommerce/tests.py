from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from .models import Coupon
from .serializers import CouponSerializer
from .pricing import _coupon_discount

class CouponTests(TestCase):
    def payload(self, **overrides):
        data = {
            'name': 'Welcome', 'code': ' welcome10 ', 'discount_type': 'PERCENTAGE',
            'value': '10.00', 'interaction_mode': 'STACK',
            'start_date': timezone.now(), 'end_date': timezone.now() + timedelta(days=1),
            'minimum_spend': '100.00', 'maximum_discount': '50.00',
            'usage_limit': 10, 'is_active': True,
        }
        data.update(overrides)
        return data

    def test_code_is_normalized_and_case_insensitive_duplicate_is_rejected(self):
        serializer = CouponSerializer(data=self.payload())
        self.assertTrue(serializer.is_valid(), serializer.errors)
        coupon = serializer.save()
        self.assertEqual(coupon.code, 'WELCOME10')
        duplicate = CouponSerializer(data=self.payload(code='Welcome10'))
        self.assertFalse(duplicate.is_valid())

    def test_percentage_validation_and_fixed_cap_validation(self):
        too_large = CouponSerializer(data=self.payload(value='101'))
        self.assertFalse(too_large.is_valid())
        fixed_with_cap = CouponSerializer(data=self.payload(discount_type='FIXED', maximum_discount='20'))
        self.assertFalse(fixed_with_cap.is_valid())

    def test_discount_is_capped_and_never_exceeds_subtotal(self):
        coupon = Coupon(value=Decimal('50'), discount_type='PERCENTAGE', maximum_discount=Decimal('20'))
        self.assertEqual(_coupon_discount(coupon, Decimal('100')), Decimal('20.00'))
        coupon.discount_type = 'FIXED'
        coupon.value = Decimal('500')
        coupon.maximum_discount = None
        self.assertEqual(_coupon_discount(coupon, Decimal('100')), Decimal('100.00'))














