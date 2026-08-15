from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status as http_status

from music.models import Track
from .models import Playlist, PlaylistTrack

User = get_user_model()


class PlaylistTests(TestCase):
    """Tests for playlists app — Commit 2."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='user@test.com', username='user1', password='Pass123456',
            display_name='Test User',
        )
        self.artist = User.objects.create_user(
            email='artist@test.com', username='artist1', password='Pass123456',
            role=User.Role.ARTIST, artist_status=User.ArtistStatus.APPROVED,
        )
        self.track = Track.objects.create(
            title='Test Track', artist=self.artist, release_date=date.today(),
            audio_file='tracks/test.mp3',
        )
        self.playlists_url = '/api/playlists/'

    # ---- Test 1: Create playlist ----
    def test_create_playlist(self):
        self.client.force_authenticate(user=self.user)
        data = {'title': 'My Favorites', 'description': 'Best songs'}
        response = self.client.post(self.playlists_url, data)
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(Playlist.objects.count(), 1)

    # ---- Test 2: Add track to playlist ----
    def test_add_track_to_playlist(self):
        playlist = Playlist.objects.create(owner=self.user, title='My List')
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'{self.playlists_url}{playlist.pk}/add-track/',
            {'track_id': self.track.pk},
        )
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(PlaylistTrack.objects.count(), 1)

    # ---- Test 3: Remove track from playlist ----
    def test_remove_track_from_playlist(self):
        playlist = Playlist.objects.create(owner=self.user, title='My List')
        PlaylistTrack.objects.create(playlist=playlist, track=self.track)
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(
            f'{self.playlists_url}{playlist.pk}/remove-track/{self.track.pk}/',
        )
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(PlaylistTrack.objects.count(), 0)

    # ---- Test 4: Duplicate track rejected ----
    def test_duplicate_track_rejected(self):
        playlist = Playlist.objects.create(owner=self.user, title='My List')
        PlaylistTrack.objects.create(playlist=playlist, track=self.track)
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'{self.playlists_url}{playlist.pk}/add-track/',
            {'track_id': self.track.pk},
        )
        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)

    # ---- Test 5: Playlist detail has tracks ----
    def test_playlist_detail_has_tracks(self):
        playlist = Playlist.objects.create(owner=self.user, title='Detail List')
        PlaylistTrack.objects.create(playlist=playlist, track=self.track)
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'{self.playlists_url}{playlist.pk}/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(len(response.data['playlist_tracks']), 1)
