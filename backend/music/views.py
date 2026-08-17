from datetime import date

from django.db.models import F, Q
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.http import HttpResponseRedirect, FileResponse, Http404
from rest_framework.exceptions import PermissionDenied, AuthenticationFailed
from notifications.models import Notification
from rest_framework_simplejwt.authentication import JWTAuthentication
from subscriptions.utils import get_current_time
from subscriptions.models import SubscriptionPlan

from accounts.permissions import IsApprovedArtist, IsOwner
from music.models import Album, Track, StreamLog
from .serializers import (
    AlbumListSerializer,
    AlbumDetailSerializer,
    AlbumCreateSerializer,
    TrackUploadSerializer,
    TrackSerializer,
)
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter


# ---------------------------------------------------------------------------
# Track Views
# ---------------------------------------------------------------------------

class TrackViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing, creating, updating, and deleting tracks.
    """
    queryset = Track.objects.select_related('artist', 'album').all()
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['genre', 'release_type', 'artist', 'album']
    search_fields = ['title', 'artist__display_name', 'genre']
    ordering_fields = ['release_date', 'total_streams', 'title']
    ordering = ['-release_date']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TrackUploadSerializer
        return TrackSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsApprovedArtist()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwner()]
        return [IsAuthenticated()]

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

        # Determine user's tier
        tier = user.get_tier()
        is_gold = (tier == 'GOLD')

        # Check early access logic
        if track.is_early_access and track.artist != user and not is_gold:
            raise PermissionDenied('This VIP track is strictly available to Gold subscribers.')

        # Check daily limit
        try:
            plan = SubscriptionPlan.objects.get(tier=tier)
            daily_limit = plan.daily_stream_limit
        except SubscriptionPlan.DoesNotExist:
            daily_limit = 60
            
        if daily_limit is not None:
            today = get_current_time().date()
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

        # Unique listener counter logic
        is_first_stream = StreamLog.objects.filter(user=user, track=track).count() == 1
        if is_first_stream:
            track.listeners_count = F('listeners_count') + 1
            track.save(update_fields=['listeners_count'])

        return Response({'detail': 'Stream logged successfully.'})


class TrackDownloadView(APIView):
    """GET /api/music/tracks/<id>/download/ — Download track (Silver/Gold only)."""
    
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        track = get_object_or_404(Track, pk=pk)
        user = request.user

        tier = user.get_tier()
        is_gold = (tier == 'GOLD')

        if track.is_early_access and track.artist != user and not is_gold:
            raise PermissionDenied('Downloading VIP tracks is restricted to Gold subscribers.')

        # Allow artist to download own track regardless of tier
        if tier == 'BASIC' and track.artist != user:
            raise PermissionDenied('Downloading tracks is restricted to Silver and Gold subscribers.')

        if not track.audio_file:
            return Response({'detail': 'No audio file available for this track.'}, status=status.HTTP_404_NOT_FOUND)

        # Serve file directly
        return FileResponse(track.audio_file.open(), as_attachment=True, filename=f"{track.title}.mp3")

class TrackPlayView(APIView):
    """GET /api/music/tracks/<id>/play/ — Playback track with limits."""
    
    from rest_framework.permissions import AllowAny
    permission_classes = [AllowAny]
    
    # We must allow unauthenticated requests briefly so we can parse the token from query param
    # because <audio> tags do not send Authorization headers.
    
    def get(self, request, pk):
        # Authenticate via query param for audio streams
        token = request.GET.get('token')
        if not token:
            raise PermissionDenied('No token provided.')
            
        jwt_auth = JWTAuthentication()
        try:
            validated_token = jwt_auth.get_validated_token(token)
            user = jwt_auth.get_user(validated_token)
        except AuthenticationFailed:
            raise PermissionDenied('Invalid token.')
            
        track = get_object_or_404(Track, pk=pk)
        
        tier = user.get_tier()
        is_gold = (tier == 'GOLD')

        if track.is_early_access and track.artist != user and not is_gold:
            raise PermissionDenied('This VIP track is strictly available to Gold subscribers.')

        try:
            plan = SubscriptionPlan.objects.get(tier=tier)
            daily_limit = plan.daily_stream_limit
        except SubscriptionPlan.DoesNotExist:
            daily_limit = 60
            
        if daily_limit is not None:
            from django.utils.timezone import localtime
            today = localtime(get_current_time()).date()
            today_count = StreamLog.objects.filter(
                user=user,
                streamed_at__date=today,
            ).count()
            if today_count >= daily_limit:
                # 429 prevents audio playback in browser
                return Response('Daily limit reached', status=status.HTTP_429_TOO_MANY_REQUESTS)

        quality = request.GET.get('quality', 'high')
        target_file = track.audio_file_128 if (quality == 'low' and track.audio_file_128) else track.audio_file

        if not target_file:
            raise Http404('No audio file.')

        return self._ranged_response(request, target_file)

    def _ranged_response(self, request, file_field):
        import os
        import re
        from django.http import StreamingHttpResponse, HttpResponse

        try:
            file_path = file_field.path
            file_size = os.path.getsize(file_path)
        except Exception:
            file_path = None
            file_size = file_field.size

        content_type = 'audio/mpeg'
        range_header = request.META.get('HTTP_RANGE', '').strip()
        range_match = re.match(r'bytes\s*=\s*(\d+)\s*-\s*(\d*)', range_header)

        if range_match:
            start_str, end_str = range_match.groups()
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1

            if start >= file_size or end >= file_size or start > end:
                res = HttpResponse(status=416)
                res['Content-Range'] = f'bytes */{file_size}'
                return res

            length = end - start + 1

            def file_iterator():
                if file_path and os.path.exists(file_path):
                    with open(file_path, 'rb') as f:
                        f.seek(start)
                        remaining = length
                        while remaining > 0:
                            chunk_size = min(65536, remaining)
                            data = f.read(chunk_size)
                            if not data:
                                break
                            remaining -= len(data)
                            yield data
                else:
                    f = file_field.open('rb')
                    try:
                        f.seek(start)
                        remaining = length
                        while remaining > 0:
                            chunk_size = min(65536, remaining)
                            data = f.read(chunk_size)
                            if not data:
                                break
                            remaining -= len(data)
                            yield data
                    finally:
                        f.close()

            response = StreamingHttpResponse(
                file_iterator(),
                status=206,
                content_type=content_type
            )
            response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response['Content-Length'] = str(length)
            response['Accept-Ranges'] = 'bytes'
            return response
        else:
            def file_iterator():
                if file_path and os.path.exists(file_path):
                    with open(file_path, 'rb') as f:
                        while True:
                            data = f.read(65536)
                            if not data:
                                break
                            yield data
                else:
                    f = file_field.open('rb')
                    try:
                        while True:
                            data = f.read(65536)
                            if not data:
                                break
                            yield data
                    finally:
                        f.close()

            response = StreamingHttpResponse(
                file_iterator(),
                status=200,
                content_type=content_type
            )
            response['Content-Length'] = str(file_size)
            response['Accept-Ranges'] = 'bytes'
            return response


# ---------------------------------------------------------------------------
# Album Views
# ---------------------------------------------------------------------------

class AlbumViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing, creating, updating, and deleting albums.
    """
    queryset = Album.objects.select_related('artist').prefetch_related('tracks').all()
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['genre', 'artist']
    search_fields = ['title', 'artist__display_name', 'genre']
    ordering_fields = ['release_date', 'title']
    ordering = ['-release_date']

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
        return [IsAuthenticated()]

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
