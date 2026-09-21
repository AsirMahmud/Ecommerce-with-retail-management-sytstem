from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.authentication.serializers import CustomTokenObtainPairSerializer

User = get_user_model()

class AuthenticationAndRoleTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@rawstitch.com',
            password='testpassword123',
            role='admin'
        )
        self.cashier_user = User.objects.create_user(
            username='cashieruser',
            email='cashier@rawstitch.com',
            password='testpassword123',
            role='cashier'
        )

    def test_custom_jwt_claims_contain_role(self):
        token = CustomTokenObtainPairSerializer.get_token(self.cashier_user)
        self.assertEqual(token['username'], 'cashieruser')
        self.assertEqual(token['role'], 'cashier')

    def test_user_profile_endpoint(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'adminuser')
        self.assertEqual(response.data['role'], 'admin')

    def test_unauthenticated_profile_access_denied(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
