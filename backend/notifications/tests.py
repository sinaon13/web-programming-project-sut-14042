from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status as http_status

from .models import Notification

User = get_user_model()


class NotificationTests(TestCase):
    """Tests for notifications app — Commit 3."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='user@test.com', username='user1', password='Pass123456',
        )
        self.other_user = User.objects.create_user(
            email='other@test.com', username='other', password='Pass123456',
        )
        self.notification = Notification.objects.create(
            recipient=self.user,
            title='Welcome!',
            message='Welcome to Spotify Clone.',
            notification_type=Notification.Type.SYSTEM,
        )

    # ---- Test 1: List own notifications ----
    def test_list_notifications(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    # ---- Test 2: Cannot see other user's notifications ----
    def test_cannot_see_others_notifications(self):
        self.client.force_authenticate(user=self.other_user)
        response = self.client.get('/api/notifications/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    # ---- Test 3: Mark as read ----
    def test_mark_as_read(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f'/api/notifications/{self.notification.pk}/',
            {'is_read': True},
        )
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    # ---- Test 4: Mark all read ----
    def test_mark_all_read(self):
        Notification.objects.create(
            recipient=self.user, title='Second', message='Another one',
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/notifications/mark-all-read/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(recipient=self.user, is_read=False).count(), 0)

    # ---- Test 5: Unread count ----
    def test_unread_count(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/notifications/unread-count/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 1)
