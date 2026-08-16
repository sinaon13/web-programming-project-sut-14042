from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status as http_status
from unittest.mock import patch, MagicMock

from .models import SubscriptionPlan, UserSubscription, Transaction

User = get_user_model()


class SubscriptionTests(TestCase):
    """Tests for subscriptions app — Commit 3."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='user@test.com', username='user1', password='Pass123456',
        )
        self.admin = User.objects.create_user(
            email='admin@test.com', username='admin1', password='Pass123456',
            role=User.Role.ADMIN,
        )
        self.free_plan = SubscriptionPlan.objects.create(
            name='Basic', tier='BASIC', price=0, duration_days=9999,
            daily_stream_limit=60, max_playlists=6,
        )
        self.premium_plan = SubscriptionPlan.objects.create(
            name='Gold', tier='GOLD', price=99000, duration_days=30,
        )

    # ---- Test 1: List plans ----
    def test_list_plans(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/subscriptions/plans/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    # ---- Test 2: Purchase free plan activates immediately ----
    def test_purchase_free_plan(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/subscriptions/purchase/', {'plan_id': self.free_plan.pk})
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertTrue(UserSubscription.objects.filter(user=self.user).exists())

    # ---- Test 3: Purchase premium returns payment URL ----
    @patch('subscriptions.views.requests.post')
    def test_purchase_premium_returns_payment_url(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': {'authority': 'SANDBOX-test123'},
            'errors': []
        }
        mock_post.return_value = mock_response

        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/subscriptions/purchase/', {'plan_id': self.premium_plan.pk})
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIn('payment_url', response.data)
        self.assertIn('authority', response.data)
        self.assertEqual(Transaction.objects.count(), 1)

    # ---- Test 4: Verify payment success ----
    @patch('subscriptions.views.requests.post')
    def test_verify_payment_success(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            'data': {'code': 100},
            'errors': []
        }
        mock_post.return_value = mock_response

        self.client.force_authenticate(user=self.user)
        # Create pending transaction
        tx = Transaction.objects.create(
            user=self.user, plan=self.premium_plan,
            amount=self.premium_plan.price, authority='SANDBOX-test123',
        )
        response = self.client.post('/api/subscriptions/verify-payment/', {
            'authority': 'SANDBOX-test123', 'status': 'OK',
        })
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        tx.refresh_from_db()
        self.assertEqual(tx.status, Transaction.Status.SUCCESS)
        self.assertTrue(UserSubscription.objects.filter(user=self.user, plan=self.premium_plan).exists())

    # ---- Test 5: Admin can update plan price ----
    def test_admin_update_plan_price(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(
            f'/api/subscriptions/plans/{self.premium_plan.pk}/price/',
            {'price': 149000},
        )
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.premium_plan.refresh_from_db()
        self.assertEqual(self.premium_plan.price, 149000)

    # ---- Test 6: Non-admin cannot update price ----
    def test_non_admin_cannot_update_price(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/subscriptions/plans/{self.premium_plan.pk}/price/',
            {'price': 1},
        )
        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)
