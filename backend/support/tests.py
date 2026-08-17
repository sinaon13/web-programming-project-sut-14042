from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from .models import Ticket

User = get_user_model()


class SupportTests(TestCase):
    """Tests for support app — Commit 1."""

    def setUp(self):
        self.client = APIClient()
        self.listener = User.objects.create_user(
            email='listener@test.com', username='listener', password='Pass123456',
            role=User.Role.LISTENER,
        )
        self.support_user = User.objects.create_user(
            email='support@test.com', username='support', password='Pass123456',
            role=User.Role.SUPPORT,
        )
        self.artist = User.objects.create_user(
            email='artist@test.com', username='artist', password='Pass123456',
            role=User.Role.ARTIST, artist_status=User.ArtistStatus.PENDING,
            display_name='Test Artist',
        )
        self.tickets_url = '/api/support/tickets/'

    # ---- Test 1: Create a ticket ----
    def test_create_ticket(self):
        self.client.force_authenticate(user=self.listener)
        data = {'subject': 'Cannot play songs', 'description': 'Audio fails to load.'}
        response = self.client.post(self.tickets_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Ticket.objects.count(), 1)

    # ---- Test 2: Listener only sees own tickets ----
    def test_listener_sees_own_tickets(self):
        Ticket.objects.create(user=self.listener, subject='My ticket', description='...')
        Ticket.objects.create(user=self.support_user, subject='Other ticket', description='...')
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(self.tickets_url)
        self.assertEqual(len(response.data['results']), 1)

    # ---- Test 3: Support sees all tickets ----
    def test_support_sees_all_tickets(self):
        Ticket.objects.create(user=self.listener, subject='Ticket A', description='...')
        Ticket.objects.create(user=self.support_user, subject='Ticket B', description='...')
        self.client.force_authenticate(user=self.support_user)
        response = self.client.get(self.tickets_url)
        self.assertEqual(len(response.data['results']), 2)

    # ---- Test 4: Approve artist ----
    def test_approve_artist(self):
        self.client.force_authenticate(user=self.support_user)
        response = self.client.patch(
            f'/api/support/artist-requests/{self.artist.pk}/',
            {'status': 'APPROVED'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.artist.refresh_from_db()
        self.assertEqual(self.artist.artist_status, User.ArtistStatus.APPROVED)

    # ---- Test 5: Reject artist ----
    def test_reject_artist(self):
        self.client.force_authenticate(user=self.support_user)
        response = self.client.patch(
            f'/api/support/artist-requests/{self.artist.pk}/',
            {'status': 'REJECTED', 'reason': 'Incomplete portfolio'},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.artist.refresh_from_db()
        self.assertEqual(self.artist.artist_status, User.ArtistStatus.REJECTED)
        self.assertEqual(self.artist.rejection_reason, 'Incomplete portfolio')

    # ---- Test 6: Listener cannot approve artist ----
    def test_listener_cannot_approve_artist(self):
        self.client.force_authenticate(user=self.listener)
        response = self.client.patch(
            f'/api/support/artist-requests/{self.artist.pk}/',
            {'status': 'APPROVED'}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
