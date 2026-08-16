from datetime import date

from django.db.models import F, Q
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.http import HttpResponseRedirect
from rest_framework.exceptions import PermissionDenied
from notifications.models import Notification

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

class TrackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing, creating, updating, and deleting tracks.
    """
    queryset = Track.objects.select_related('artist', 'album').all()
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['genre', 'release_type', 'artist', 'album']
    search_fields = ['title', 'artist__display_name', 'genre']
    ordering_fields = ['release_date', 'total_streams', 'title']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TrackUploadSerializer
        return TrackSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsApprovedArtist()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwner()]
        return [IsAuthenticatedOrReadOnly()]

    def get_queryset(self):
        qs = super().get_queryset()
        return qs

    def perform_create(self, serializer):
        track = serializer.save(artist=self.request.user)
        
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
        is_gold = False
        if hasattr(user, 'subscription'):
            sub = user.subscription
            if sub and sub.is_active and sub.plan:
                from subscriptions.utils import get_current_time
                if sub.expires_at > get_current_time():
                    tier = sub.plan.tier
                    if tier == 'GOLD':
                        is_gold = True

        # Check early access logic
        if track.is_early_access and track.artist != user and not is_gold:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('This VIP track is strictly available to Gold subscribers.')

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
        
        # Denormalized counters
        track.total_streams = F('total_streams') + 1
        track.save(update_fields=['total_streams'])

        # Unique listener counter logic (if needed in model, but we fetch directly from DB now)
        # We can safely increment listeners_count just to keep the old field accurate
        if not StreamLog.objects.filter(user=user, track=track).exclude(id=StreamLog.objects.latest('id').id).exists():
            track.listeners_count = F('listeners_count') + 1
            track.save(update_fields=['listeners_count'])

        return Response({'detail': 'Stream logged successfully.'})


class TrackDownloadView(APIView):
    """GET /api/music/tracks/<id>/download/ — Download track (Silver/Gold only)."""
    
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        track = get_object_or_404(Track, pk=pk)
        user = request.user

        tier = 'BASIC'
        is_gold = False
        if hasattr(user, 'subscription'):
            sub = user.subscription
            if sub and sub.is_active and sub.plan:
                from subscriptions.utils import get_current_time
                if sub.expires_at > get_current_time():
                    tier = sub.plan.tier
                    if tier == 'GOLD':
                        is_gold = True

        if track.is_early_access and track.artist != user and not is_gold:
            raise PermissionDenied('Downloading VIP tracks is restricted to Gold subscribers.')

        # Allow artist to download own track regardless of tier
        if tier == 'BASIC' and track.artist != user:
            raise PermissionDenied('Downloading tracks is restricted to Silver and Gold subscribers.')

        if not track.audio_file:
            return Response({'detail': 'No audio file available for this track.'}, status=status.HTTP_404_NOT_FOUND)

        # Return redirect to media URL
        return HttpResponseRedirect(track.audio_file.url)


# ---------------------------------------------------------------------------
# Album Views
# ---------------------------------------------------------------------------

class AlbumViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing, creating, updating, and deleting albums.
    """
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['genre', 'artist']
    search_fields = ['title', 'artist__display_name', 'genre']
    ordering_fields = ['release_date', 'title']

    def get_queryset(self):
        if self.action in ['retrieve', 'update', 'partial_update', 'destroy']:
            return Album.objects.select_related('artist').prefetch_related('tracks').all()
        return Album.objects.select_related('artist').all()

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return AlbumCreateSerializer
        elif self.action == 'retrieve':
            return AlbumDetailSerializer
        return AlbumListSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsApprovedArtist()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwner()]
        return [IsAuthenticatedOrReadOnly()]

    def perform_create(self, serializer):
        album = serializer.save(artist=self.request.user)
        
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
