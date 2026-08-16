from datetime import date

from django.db.models import F, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404

from accounts.permissions import IsApprovedArtist, IsOwner
from music.models import Album, Track, StreamLog
from .serializers import (
    AlbumListSerializer,
    AlbumDetailSerializer,
    AlbumCreateSerializer,
    TrackSerializer,
    TrackUploadSerializer,
)

# Daily stream limits per subscription tier (from project doc table)
DAILY_STREAM_LIMITS = {
    'BASIC': 60,      # Basic (free) tier: 60 streams/day
    'SILVER': None,    # Silver tier: unlimited
    'GOLD': None,      # Gold tier: unlimited
}


# ---------------------------------------------------------------------------
# Track Views
# ---------------------------------------------------------------------------

class TrackListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/music/tracks/       — Browse all tracks (filterable)
    POST /api/music/tracks/       — Upload a new track (approved artists only)
    """

    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['genre', 'release_type', 'artist', 'album']
    search_fields = ['title', 'artist__display_name', 'genre']
    ordering_fields = ['release_date', 'total_streams', 'title']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TrackUploadSerializer
        return TrackSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsApprovedArtist()]
        return [IsAuthenticatedOrReadOnly()]

    def get_queryset(self):
        qs = Track.objects.select_related('artist', 'album').all()
        # Filter out early-access tracks for non-premium users
        user = self.request.user
        
        tier = 'BASIC'
        if user.is_authenticated and hasattr(user, 'subscription'):
            sub = user.subscription
            if sub and sub.is_active and sub.plan:
                tier = sub.plan.tier
                
        if not user.is_authenticated or tier in ['BASIC', 'SILVER']:
            # But the artist themselves can see their own tracks even if they are basic/silver
            if user.is_authenticated:
                qs = qs.filter(Q(is_early_access=False) | Q(artist=user))
            else:
                qs = qs.filter(is_early_access=False)
        return qs

    def perform_create(self, serializer):
        track = serializer.save(artist=self.request.user)
        
        # Notify followers
        from notifications.models import Notification
        followers = self.request.user.followers.all()
        notifications = [
            Notification(
                recipient=follower,
                title="New Music Released",
                message=f"{self.request.user.display_name or self.request.user.username} just released a new track: {track.title}!",
                notification_type='SYSTEM'
            )
            for follower in followers
        ]
        Notification.objects.bulk_create(notifications)



class TrackDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/music/tracks/<id>/
    Read by anyone; write by owning artist only.
    """

    queryset = Track.objects.select_related('artist', 'album').all()
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return TrackUploadSerializer
        return TrackSerializer

    def get_permissions(self):
        if self.request.method in ('PATCH', 'PUT', 'DELETE'):
            return [IsAuthenticated(), IsOwner()]
        return [IsAuthenticatedOrReadOnly()]


class TrackStreamView(APIView):
    """
    POST /api/music/tracks/<int:pk>/stream/
    Log a stream event, enforce daily limit, update denormalized counters.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        track = get_object_or_404(Track, pk=pk)
        user = request.user

        # Determine user's tier (default BASIC if no subscription)
        tier = 'BASIC'
        if hasattr(user, 'subscription'):
            sub = user.subscription
            if sub and sub.is_active and sub.plan:
                tier = sub.plan.tier

        # Check daily limit
        daily_limit = DAILY_STREAM_LIMITS.get(tier)
        if daily_limit is not None:
            today = date.today()
            today_count = StreamLog.objects.filter(
                user=user,
                streamed_at__date=today,
            ).count()
            if today_count >= daily_limit:
                return Response(
                    {'detail': f'Daily stream limit ({daily_limit}) reached for your plan.'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

        # Log the stream
        StreamLog.objects.create(user=user, track=track)

        # Update denormalized counters
        Track.objects.filter(pk=pk).update(total_streams=F('total_streams') + 1)

        # Check if this is a new unique listener
        is_new_listener = not StreamLog.objects.filter(
            user=user, track=track,
        ).exclude(pk=StreamLog.objects.filter(user=user, track=track).latest('streamed_at').pk).exists()

        if is_new_listener:
            Track.objects.filter(pk=pk).update(listeners_count=F('listeners_count') + 1)

        return Response({'detail': 'Stream logged successfully.'})


class TrackDownloadView(APIView):
    """GET /api/music/tracks/<id>/download/ — Download track (Silver/Gold only)."""
    
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        track = get_object_or_404(Track, pk=pk)
        user = request.user

        tier = 'BASIC'
        if hasattr(user, 'subscription'):
            sub = user.subscription
            if sub and sub.is_active and sub.plan:
                tier = sub.plan.tier

        # Allow artist to download own track regardless of tier
        if tier == 'BASIC' and track.artist != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Downloading tracks is restricted to Silver and Gold subscribers.')

        if not track.audio_file:
            return Response({'detail': 'No audio file available for this track.'}, status=status.HTTP_404_NOT_FOUND)

        # Return redirect to media URL
        from django.http import HttpResponseRedirect
        return HttpResponseRedirect(track.audio_file.url)


# ---------------------------------------------------------------------------
# Album Views
# ---------------------------------------------------------------------------

class AlbumListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/music/albums/       — Browse all albums
    POST /api/music/albums/       — Create a new album (approved artists only)
    """

    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['genre', 'artist']
    search_fields = ['title', 'artist__display_name', 'genre']
    ordering_fields = ['release_date', 'title']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AlbumCreateSerializer
        return AlbumListSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsApprovedArtist()]
        return [IsAuthenticatedOrReadOnly()]

    def get_queryset(self):
        return Album.objects.select_related('artist').all()

    def perform_create(self, serializer):
        album = serializer.save(artist=self.request.user)
        
        # Notify followers
        from notifications.models import Notification
        followers = self.request.user.followers.all()
        notifications = [
            Notification(
                recipient=follower,
                title="New Album Released",
                message=f"{self.request.user.display_name or self.request.user.username} just released a new album: {album.title}!",
                notification_type='SYSTEM'
            )
            for follower in followers
        ]
        Notification.objects.bulk_create(notifications)


class AlbumDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/music/albums/<id>/
    Read by anyone; write by owning artist only.
    """

    queryset = Album.objects.select_related('artist').prefetch_related('tracks').all()
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return AlbumCreateSerializer
        return AlbumDetailSerializer

    def get_permissions(self):
        if self.request.method in ('PATCH', 'PUT', 'DELETE'):
            return [IsAuthenticated(), IsOwner()]
        return [IsAuthenticatedOrReadOnly()]
