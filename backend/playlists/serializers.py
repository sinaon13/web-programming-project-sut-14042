from rest_framework import serializers
from .models import Playlist, PlaylistTrack


class PlaylistTrackSerializer(serializers.ModelSerializer):
    """Serializer for tracks within a playlist (with position)."""

    track_title = serializers.CharField(source='track.title', read_only=True)
    track_artist = serializers.CharField(source='track.artist.display_name', read_only=True)
    track_cover = serializers.ImageField(source='track.cover', read_only=True)
    audio_file = serializers.FileField(source='track.audio_file', read_only=True)

    class Meta:
        model = PlaylistTrack
        fields = [
            'id', 'track', 'track_title', 'track_artist', 'track_cover',
            'audio_file', 'position', 'added_at',
        ]
        read_only_fields = ['id', 'added_at']


class PlaylistListSerializer(serializers.ModelSerializer):
    """Compact playlist serializer for listing."""

    owner_display = serializers.CharField(source='owner.display_name', read_only=True)
    track_count = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = [
            'id', 'title', 'owner', 'owner_display', 'cover',
            'is_public', 'track_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_track_count(self, obj):
        return obj.playlist_tracks.count()


class PlaylistDetailSerializer(serializers.ModelSerializer):
    """Full playlist serializer with nested tracks."""

    owner_display = serializers.CharField(source='owner.display_name', read_only=True)
    playlist_tracks = PlaylistTrackSerializer(many=True, read_only=True)

    class Meta:
        model = Playlist
        fields = [
            'id', 'title', 'description', 'owner', 'owner_display',
            'cover', 'is_public', 'created_at', 'updated_at',
            'playlist_tracks',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']


class AddTrackToPlaylistSerializer(serializers.Serializer):
    """Serializer for adding a track to a playlist."""

    track_id = serializers.IntegerField()
    position = serializers.IntegerField(required=False, default=0)
