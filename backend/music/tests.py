from datetime import date
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status as http_status

from music.models import Album, Track, StreamLog

User = get_user_model()


class MusicTests(TestCase):
    """Tests for music app — Commit 2."""

    def setUp(self):
        self.client = APIClient()
        self.artist = User.objects.create_user(
            email='artist@test.com', username='artist1', password='Pass123456',
            role=User.Role.ARTIST, artist_status=User.ArtistStatus.APPROVED,
            display_name='DJ Test',
        )
        self.listener = User.objects.create_user(
            email='listener@test.com', username='listener1', password='Pass123456',
            role=User.Role.LISTENER,
        )
        # Minimal valid MP3 header bytes
        self.fake_mp3 = SimpleUploadedFile(
            'song.mp3', b'\xff\xfb\x90\x00' * 100, content_type='audio/mpeg',
        )

    # ---- Test 1: Artist can create album ----
    def test_create_album(self):
        self.client.force_authenticate(user=self.artist)
        data = {'title': 'Test Album', 'release_date': '2026-01-01', 'genre': 'Pop'}
        response = self.client.post('/api/music/albums/', data)
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(Album.objects.count(), 1)

    # ---- Test 2: Listener cannot create album ----
    def test_listener_cannot_create_album(self):
        self.client.force_authenticate(user=self.listener)
        data = {'title': 'Hacker Album', 'release_date': '2026-01-01'}
        response = self.client.post('/api/music/albums/', data)
        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)

    # ---- Test 3: Artist can upload track ----
    def test_upload_track(self):
        self.client.force_authenticate(user=self.artist)
        data = {
            'title': 'My Song',
            'audio_file': self.fake_mp3,
            'release_date': '2026-06-01',
            'genre': 'Rock',
        }
        response = self.client.post('/api/music/tracks/', data, format='multipart')
        self.assertEqual(response.status_code, http_status.HTTP_201_CREATED)
        self.assertEqual(Track.objects.count(), 1)

    # ---- Test 4: Browse tracks returns results ----
    def test_browse_tracks(self):
        Track.objects.create(
            title='Song A', artist=self.artist, release_date=date.today(),
            audio_file='tracks/a.mp3',
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.get('/api/music/tracks/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)

    # ---- Test 5: Stream logging ----
    def test_stream_logging(self):
        track = Track.objects.create(
            title='Streamable', artist=self.artist, release_date=date.today(),
            audio_file='tracks/s.mp3',
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.post(f'/api/music/tracks/{track.pk}/stream/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(StreamLog.objects.count(), 1)
        track.refresh_from_db()
        self.assertEqual(track.total_streams, 1)

    # ---- Test 6: Album detail with tracks ----
    def test_album_detail_with_tracks(self):
        album = Album.objects.create(
            title='Detail Album', artist=self.artist, release_date=date.today(),
        )
        Track.objects.create(
            title='Track In Album', artist=self.artist, album=album,
            release_date=date.today(), audio_file='tracks/t.mp3',
        )
        self.client.force_authenticate(user=self.listener)
        response = self.client.get(f'/api/music/albums/{album.pk}/')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(len(response.data['tracks']), 1)
