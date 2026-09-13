from django.test import TestCase, Client
from rest_framework import status
from apps.online_preorder.models import OnlinePreorder, MetaEventLog
from apps.online_preorder.services.fraud_scoring import calculate_fraud_score
from apps.online_preorder.services.meta_capi import dispatch_meta_purchase_event


class OrderTrackingFraudMetaTest(TestCase):
    def setUp(self):
        self.client = Client()
        from apps.inventory.models import Product, ProductVariation
        self.product = Product.objects.create(
            id=1,
            name="Test T-Shirt",
            sku="TST-001",
            selling_price=1500,
            cost_price=1000,
            stock_quantity=100,
            is_active=True,
            assign_to_online=True
        )
        ProductVariation.objects.create(
            product=self.product,
            size="M",
            color="Black",
            stock=50
        )
        ProductVariation.objects.create(
            product=self.product,
            size="L",
            color="White",
            stock=50
        )

    def test_create_order_with_attribution_and_fraud_signals(self):
        payload = {
            "customer_name": "Test Customer",
            "customer_phone": "01700000001",
            "customer_email": "test@example.com",
            "shipping_address": {"address": "House 12, Road 4, Sector 3, Uttara", "city": "Dhaka"},
            "delivery_charge": 80,
            "delivery_method": "Inside Dhaka",
            "items": [
                {
                    "product_id": 1,
                    "size": "M",
                    "color": "Black",
                    "quantity": 1,
                    "unit_price": 1500,
                    "discount": 0
                }
            ],
            "fbp": "fb.1.1680000000.123456789",
            "fbclid": "IwAR0123456789abcdef",
            "fbc": "fb.1.1680000000.IwAR0123456789abcdef",
            "utm_source": "facebook",
            "utm_medium": "cpc",
            "utm_campaign": "summer_sale",
            "utm_content": "ad_variant_a",
            "utm_term": "tshirt",
            "session_id": "sess_12345678"
        }

        response = self.client.post(
            '/api/ecommerce/orders/create/',
            data=payload,
            content_type='application/json',
            HTTP_X_FORWARDED_FOR='103.14.23.10',
            HTTP_USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_id = response.data['id']

        order = OnlinePreorder.objects.get(pk=order_id)
        self.assertEqual(order.fbp, "fb.1.1680000000.123456789")
        self.assertEqual(order.fbclid, "IwAR0123456789abcdef")
        self.assertTrue(order.fbc.startswith("fb.1."))
        self.assertEqual(order.utm_source, "facebook")
        self.assertEqual(order.utm_campaign, "summer_sale")
        self.assertEqual(order.ip_address, "103.14.23.10")
        self.assertEqual(order.event_id, f"purchase_{order_id}")
        self.assertFalse(order.purchase_event_sent)
        self.assertIsNotNone(order.risk_level)

    def test_fbc_null_when_no_fbclid(self):
        payload = {
            "customer_name": "No Click Customer",
            "customer_phone": "01700000002",
            "items": [
                {
                    "product_id": 1,
                    "size": "L",
                    "color": "White",
                    "quantity": 1,
                    "unit_price": 1200,
                    "discount": 0
                }
            ],
            "fbp": "fb.1.1680000000.987654321",
            "utm_source": "google"
        }

        response = self.client.post(
            '/api/ecommerce/orders/create/',
            data=payload,
            content_type='application/json'
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_id = response.data['id']
        order = OnlinePreorder.objects.get(pk=order_id)

        self.assertIsNone(order.fbc)
        self.assertIsNone(order.fbclid)
        self.assertEqual(order.fbp, "fb.1.1680000000.987654321")

    def test_fraud_scoring_logic(self):
        phone = "01700000003"
        # Create 2 fake cancelled orders
        OnlinePreorder.objects.create(
            customer_name="Refused User",
            customer_phone=phone,
            status="CANCELLED",
            cancel_reason="Fake Customer / Fake Order",
            is_fake=True,
            total_amount=2000
        )
        OnlinePreorder.objects.create(
            customer_name="Refused User",
            customer_phone=phone,
            status="CANCELLED",
            cancel_reason="Refused delivery at doorstep",
            total_amount=2000
        )

        result = calculate_fraud_score(
            customer_phone=phone,
            current_order_amount=30000.0,
            fbp="fb.1.shared.123"
        )

        self.assertGreater(result['risk_score'], 50)
        self.assertIn(result['risk_level'], ['MEDIUM', 'HIGH'])
        self.assertEqual(result['stats']['returned_refused_count'], 2)

    def test_meta_purchase_event_on_confirm_idempotent(self):
        order = OnlinePreorder.objects.create(
            customer_name="Confirm Customer",
            customer_phone="01700000004",
            total_amount=3500,
            status="PENDING",
            fbp="fb.1.168.111",
            fbclid="click_123",
            fbc="fb.1.168.click_123"
        )
        self.assertFalse(order.purchase_event_sent)

        # Confirm order via patch request
        patch_resp = self.client.patch(
            f'/api/online-preorder/orders/{order.id}/',
            data={"status": "CONFIRMED"},
            content_type='application/json'
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        self.assertTrue(order.purchase_event_sent)
        self.assertIsNotNone(order.purchase_event_sent_at)
        self.assertEqual(MetaEventLog.objects.filter(online_preorder=order, event_name='Purchase').count(), 1)

        # Confirm second time (idempotency check)
        second_patch = self.client.patch(
            f'/api/online-preorder/orders/{order.id}/',
            data={"status": "CONFIRMED"},
            content_type='application/json'
        )
        self.assertEqual(second_patch.status_code, status.HTTP_200_OK)
        self.assertEqual(MetaEventLog.objects.filter(online_preorder=order, event_name='Purchase').count(), 1)

    def test_backward_compatibility_old_orders(self):
        old_order = OnlinePreorder.objects.create(
            customer_name="Old Customer",
            customer_phone="01700000005",
            total_amount=1000,
            status="PENDING"
        )

        resp = self.client.get(f'/api/online-preorder/orders/{old_order.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('fraud_summary', resp.data)

        # Confirm old order without attribution data
        res = dispatch_meta_purchase_event(old_order)
        self.assertEqual(res['status'], 'SUCCESS')

    def test_completed_status_does_not_trigger_purchase_event(self):
        order = OnlinePreorder.objects.create(
            customer_name="Non Confirmed Customer",
            customer_phone="01700000006",
            total_amount=2200,
            status="DELIVERED"
        )
        self.assertFalse(order.purchase_event_sent)

        # Transition to COMPLETED
        patch_resp = self.client.patch(
            f'/api/online-preorder/orders/{order.id}/',
            data={"status": "COMPLETED"},
            content_type='application/json'
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)

        order.refresh_from_db()
        # Purchase event must NOT have been sent when moving to COMPLETED
        self.assertFalse(order.purchase_event_sent)
        self.assertIsNone(order.purchase_event_sent_at)
        self.assertEqual(MetaEventLog.objects.filter(online_preorder=order, event_name='Purchase').count(), 0)

    def test_dispatch_steadfast_success(self):
        from unittest.mock import patch
        order = OnlinePreorder.objects.create(
            customer_name="Steadfast Customer",
            customer_phone="01712345678",
            total_amount=1500,
            status="PENDING",
            shipping_address={"address": "House 1, Road 2", "city": "Dhaka"}
        )

        with patch('apps.online_preorder.steadfast_service.requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "status": 200,
                "message": "Consignment created successfully",
                "consignment": {
                    "consignment_id": 998877,
                    "tracking_code": "STDF998877",
                    "status": "in_review"
                }
            }

            resp = self.client.post(
                f'/api/online-preorder/orders/{order.id}/dispatch-steadfast/',
                data={"cod_amount": 1500, "note": "Handle with care"},
                content_type='application/json'
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertTrue(resp.data.get('success'))
            self.assertEqual(resp.data.get('consignment_id'), "998877")
            self.assertEqual(resp.data.get('tracking_code'), "STDF998877")

            order.refresh_from_db()
            self.assertEqual(order.steadfast_consignment_id, "998877")
            self.assertEqual(order.steadfast_tracking_code, "STDF998877")
            self.assertEqual(order.steadfast_status, "in_review")
            self.assertEqual(order.status, "CONFIRMED")

    def test_dispatch_steadfast_cancelled_order_fails(self):
        order = OnlinePreorder.objects.create(
            customer_name="Cancelled Customer",
            customer_phone="01712345678",
            total_amount=1000,
            status="CANCELLED"
        )
        resp = self.client.post(f'/api/online-preorder/orders/{order.id}/dispatch-steadfast/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot dispatch a cancelled order", resp.data.get('detail', ''))

    def test_steadfast_fraud_check(self):
        from unittest.mock import patch
        order = OnlinePreorder.objects.create(
            customer_name="Fraud Check Customer",
            customer_phone="01811223344",
            total_amount=2000,
            status="PENDING"
        )

        with patch('apps.online_preorder.steadfast_service.requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {
                "status": 200,
                "total_parcels": 10,
                "total_delivered": 9,
                "total_cancelled": 1
            }

            resp = self.client.get(f'/api/online-preorder/orders/{order.id}/steadfast-fraud-check/')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertTrue(resp.data.get('success'))
            self.assertEqual(resp.data.get('total_parcels'), 10)
            self.assertEqual(resp.data.get('total_delivered'), 9)
            self.assertEqual(resp.data.get('risk_level'), 'SAFE')


class CourierIntegrationTest(TestCase):
    def setUp(self):
        self.client = Client()
        from apps.online_preorder.models import CourierSetting
        for code in ['STEADFAST', 'PATHAO', 'REDX', 'CARRYBEE']:
            CourierSetting.objects.get_or_create(provider=code)

    def test_courier_settings_auto_seed(self):
        resp = self.client.get('/api/online-preorder/courier-settings/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Should have seeded 4 default providers: STEADFAST, PATHAO, REDX, CARRYBEE
        data = resp.data if isinstance(resp.data, list) else resp.data.get('results', [])
        providers = [c['provider'] for c in data]
        self.assertIn('STEADFAST', providers)
        self.assertIn('PATHAO', providers)
        self.assertIn('REDX', providers)
        self.assertIn('CARRYBEE', providers)

    def test_active_couriers_endpoint(self):
        from apps.online_preorder.models import CourierSetting
        # Initially none have api_key
        resp = self.client.get('/api/online-preorder/courier-settings/active/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        active = resp.data if isinstance(resp.data, list) else resp.data.get('active_couriers', [])
        self.assertEqual(len(active), 0)

        # Configure Steadfast
        setting = CourierSetting.objects.get(provider='STEADFAST')
        setting.api_key = "test_key"
        setting.secret_key = "test_secret"
        setting.is_active = True
        setting.save()

        resp = self.client.get('/api/online-preorder/courier-settings/active/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        active = resp.data if isinstance(resp.data, list) else resp.data.get('active_couriers', [])
        self.assertEqual(len(active), 1)
        self.assertEqual(active[0]['provider'], 'STEADFAST')

    def test_dispatch_courier_endpoint(self):
        from unittest.mock import patch
        from apps.online_preorder.models import CourierSetting

        setting = CourierSetting.objects.get(provider='STEADFAST')
        setting.api_key = "test_key"
        setting.secret_key = "test_secret"
        setting.is_active = True
        setting.save()

        order = OnlinePreorder.objects.create(
            customer_name="Test Courier Customer",
            customer_phone="01799887766",
            total_amount=2500,
            status="PENDING",
            shipping_address={"address": "Banani 11", "city": "Dhaka"}
        )

        with patch('apps.online_preorder.courier_services.SteadfastService.create_consignment') as mock_create:
            mock_create.return_value = {
                "success": True,
                "provider": "STEADFAST",
                "consignment_id": "ST1001",
                "tracking_code": "TRK1001",
                "status": "in_review",
                "message": "Order created successfully"
            }

            resp = self.client.post(
                f'/api/online-preorder/orders/{order.id}/dispatch-courier/',
                data={"courier_partner": "STEADFAST", "cod_amount": 2500, "note": "Deliver soon"},
                content_type='application/json'
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertTrue(resp.data.get('success'))
            self.assertEqual(resp.data.get('consignment_id'), "ST1001")

            order.refresh_from_db()
            self.assertEqual(order.courier_partner, "STEADFAST")
            self.assertEqual(order.courier_consignment_id, "ST1001")
            self.assertEqual(order.courier_tracking_code, "TRK1001")
            self.assertEqual(order.status, "CONFIRMED")

    def test_courier_fraud_check_respective_method(self):
        from apps.online_preorder.models import OnlinePreorder
        order = OnlinePreorder.objects.create(
            customer_name="Pathao Customer",
            customer_phone="01811223344",
            total_amount=1500,
            status="PENDING",
            courier_partner="PATHAO"
        )

        # 1. Test detail endpoint defaulting to order's courier_partner (PATHAO)
        resp = self.client.get(f'/api/online-preorder/orders/{order.id}/courier-fraud-check/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get('success'))
        self.assertEqual(resp.data.get('provider'), 'PATHAO')
        self.assertEqual(resp.data.get('provider_name'), 'Pathao Courier')

        # 2. Test switching provider to ALL
        resp_all = self.client.get(f'/api/online-preorder/orders/{order.id}/courier-fraud-check/?provider=ALL')
        self.assertEqual(resp_all.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_all.data.get('provider'), 'ALL')

        # 3. Test list endpoint by phone
        resp_phone = self.client.get('/api/online-preorder/orders/courier-fraud-check/?phone=01811223344&provider=PATHAO')
        self.assertEqual(resp_phone.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_phone.data.get('provider'), 'PATHAO')




