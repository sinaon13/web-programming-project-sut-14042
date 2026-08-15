from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q

from music.models import Track
from .models import Playlist, PlaylistTrack
from .serializers import (
    PlaylistListSerializer,
    PlaylistDetailSerializer,
    AddTrackToPlaylistSerializer,
)

# Playlist limits by subscription tier (from project doc table)
PLAYLIST_LIMITS = {
    'BASIC': 6,        # Basic (free) tier: max 6 playlists
    'SILVER': 100,     # Silver tier: max 100 playlists
    'GOLD': None,      # Gold tier: unlimited
}


class PlaylistListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/playlists/          — List own playlists + public playlists
    POST /api/playlists/          — Create a new playlist
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return PlaylistDetailSerializer
        return PlaylistListSerializer

    def get_queryset(self):
        user = self.request.user
        return Playlist.objects.filter(
            Q(owner=user) | Q(is_public=True)
        ).select_related('owner').distinct()

    def perform_create(self, serializer):
        user = self.request.user

        # Check playlist limit based on tier
        tier = 'BASIC'
        if hasattr(user, 'subscription'):
            sub = user.subscription
            if sub and sub.is_active and sub.plan:
                tier = sub.plan.tier

        limit = PLAYLIST_LIMITS.get(tier)
        if limit is not None:
            current_count = Playlist.objects.filter(owner=user).count()
            if current_count >= limit:
                from rest_framework.exceptions import ValidationError
                raise ValidationError(
                    f'Playlist limit ({limit}) reached for your plan. Upgrade to create more.'
                )

        serializer.save(owner=user)


class PlaylistDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/playlists/<id>/
    Anyone can view public playlists; only owner can edit/delete.
    """

    serializer_class = PlaylistDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Playlist.objects.filter(
            Q(owner=user) | Q(is_public=True)
        ).select_related('owner').prefetch_related('playlist_tracks__track__artist')

    def perform_update(self, serializer):
        if serializer.instance.owner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only edit your own playlists.')
        serializer.save()

    def perform_destroy(self, instance):
        if instance.owner != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You can only delete your own playlists.')
        instance.delete()


class PlaylistAddTrackView(APIView):
    """POST /api/playlists/<int:pk>/add-track/ — Add a track to a playlist."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        playlist = get_object_or_404(Playlist, pk=pk, owner=request.user)
        serializer = AddTrackToPlaylistSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        track = get_object_or_404(Track, pk=serializer.validated_data['track_id'])
        position = serializer.validated_data.get('position', 0)

        pt, created = PlaylistTrack.objects.get_or_create(
            playlist=playlist, track=track,
            defaults={'position': position},
        )
        if not created:
            return Response(
                {'detail': 'Track already in playlist.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({'detail': 'Track added to playlist.'}, status=status.HTTP_201_CREATED)


class PlaylistRemoveTrackView(APIView):
    """DELETE /api/playlists/<int:pk>/remove-track/<int:track_id>/ — Remove a track."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, track_id):
        playlist = get_object_or_404(Playlist, pk=pk, owner=request.user)
        pt = get_object_or_404(PlaylistTrack, playlist=playlist, track_id=track_id)
        pt.delete()
        return Response({'detail': 'Track removed from playlist.'})
