from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class AccountsTests(TestCase):
    """Tests for accounts app — Commit 1."""

    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/accounts/register/'
        self.artist_register_url = '/api/accounts/register/artist/'
        self.login_url = '/api/token/'
        self.profile_url = '/api/accounts/me/'

    # ---- Test 1: Listener registration ----
    def test_register_listener(self):
        data = {
            'email': 'listener@test.com',
            'username': 'listener1',
            'password': 'StrongPass123',
            'password_confirm': 'StrongPass123',
            'display_name': 'Test Listener',
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='listener@test.com')
        self.assertEqual(user.role, User.Role.LISTENER)

    # ---- Test 2: Artist registration sets PENDING status ----
    def test_register_artist_pending(self):
        data = {
            'email': 'artist@test.com',
            'username': 'artist1',
            'password': 'StrongPass123',
            'password_confirm': 'StrongPass123',
            'display_name': 'Test Artist',
            'bio': 'I make music',
            'portfolio_url': 'https://example.com',
        }
        response = self.client.post(self.artist_register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='artist@test.com')
        self.assertEqual(user.role, User.Role.ARTIST)
        self.assertEqual(user.artist_status, User.ArtistStatus.PENDING)

    # ---- Test 3: JWT login returns tokens ----
    def test_login_returns_jwt(self):
        User.objects.create_user(
            email='jwt@test.com', username='jwtuser', password='StrongPass123',
        )
        response = self.client.post(self.login_url, {
            'email': 'jwt@test.com', 'password': 'StrongPass123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    # ---- Test 4: Profile update ----
    def test_profile_update(self):
        user = User.objects.create_user(
            email='profile@test.com', username='profuser', password='StrongPass123',
        )
        self.client.force_authenticate(user=user)
        response = self.client.patch(self.profile_url, {'display_name': 'Updated Name'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.display_name, 'Updated Name')

    # ---- Test 5: Follow / Unfollow ----
    def test_follow_unfollow(self):
        user1 = User.objects.create_user(
            email='user1@test.com', username='user1', password='Pass123456',
        )
        user2 = User.objects.create_user(
            email='user2@test.com', username='user2', password='Pass123456',
        )
        self.client.force_authenticate(user=user1)

        # Follow
        response = self.client.post(f'/api/accounts/users/{user2.pk}/follow/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(user1.following.filter(pk=user2.pk).exists())

        # Unfollow
        response = self.client.delete(f'/api/accounts/users/{user2.pk}/follow/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(user1.following.filter(pk=user2.pk).exists())

    # ---- Test 6: Cannot follow yourself ----
    def test_cannot_follow_self(self):
        user = User.objects.create_user(
            email='self@test.com', username='selfuser', password='Pass123456',
        )
        self.client.force_authenticate(user=user)
        response = self.client.post(f'/api/accounts/users/{user.pk}/follow/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ---- Test 7: Password mismatch rejected ----
    def test_register_password_mismatch(self):
        data = {
            'email': 'bad@test.com',
            'username': 'baduser',
            'password': 'StrongPass123',
            'password_confirm': 'WrongPass456',
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
