from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status as http_status

from music.models import Track, StreamLog

User = get_user_model()


class ReportsTests(TestCase):
    """Tests for reports app — Commit 3."""

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            email='admin@test.com', username='admin1', password='Pass123456',
            role=User.Role.ADMIN,
        )
        self.artist = User.objects.create_user(
            email='artist@test.com', username='artist1', password='Pass123456',
            role=User.Role.ARTIST, artist_status=User.ArtistStatus.APPROVED,
            display_name='DJ Test',
        )
        self.listener = User.objects.create_user(
            email='listener@test.com', username='listener1', password='Pass123456',
        )
        self.track = Track.objects.create(
            title='Hit Song', artist=self.artist, release_date=date.today(),
            audio_file='tracks/hit.mp3', total_streams=10, listeners_count=5,
        )
        # Create some stream logs
        for _ in range(10):
            StreamLog.objects.create(user=self.listener, track=self.track)

    # ---- Test 1: Admin dashboard returns data ----
    def test_admin_dashboard(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/reports/admin/dashboard/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIn('total_users', response.data)
        self.assertIn('total_streams', response.data)
        self.assertEqual(response.data['total_streams'], 10)

    # ---- Test 2: Admin payouts returns artists ----
    def test_admin_payouts(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/reports/admin/payouts/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIn('payouts', response.data)
        self.assertEqual(len(response.data['payouts']), 1)
        self.assertEqual(response.data['payouts'][0]['stream_count'], 10)

    # ---- Test 3: Artist stats returns own data ----
    def test_artist_stats(self):
        self.client.force_authenticate(user=self.artist)
        response = self.client.get('/api/reports/artist/stats/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIn('total_streams', response.data)
        self.assertIn('track_stats', response.data)
        self.assertEqual(response.data['total_tracks'], 1)

    # ---- Test 4: Listener cannot access admin dashboard ----
    def test_listener_cannot_access_dashboard(self):
        self.client.force_authenticate(user=self.listener)
        response = self.client.get('/api/reports/admin/dashboard/')
        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)

    # ---- Test 5: Listener cannot access artist stats ----
    def test_listener_cannot_access_artist_stats(self):
        self.client.force_authenticate(user=self.listener)
        response = self.client.get('/api/reports/artist/stats/')
        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)
