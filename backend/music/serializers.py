import os
from rest_framework import serializers
from django.contrib.auth import get_user_model
from music.models import Album, Track, StreamLog

User = get_user_model()

ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac']
MAX_AUDIO_SIZE_MB = 50


class ArtistMiniSerializer(serializers.ModelSerializer):
    """Minimal artist info for embedding in track/album responses."""

    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'avatar']


class AlbumListSerializer(serializers.ModelSerializer):
    """Compact album serializer for browse listing."""

    artist = ArtistMiniSerializer(read_only=True)
    track_count = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = ['id', 'title', 'artist', 'cover', 'release_date', 'genre', 'track_count']

    def get_track_count(self, obj):
        return obj.tracks.count()


class TrackSerializer(serializers.ModelSerializer):
    """Full track detail serializer (read)."""

    artist = ArtistMiniSerializer(read_only=True)
    album_title = serializers.CharField(source='album.title', read_only=True, default=None)

    class Meta:
        model = Track
        fields = [
            'id', 'title', 'artist', 'album', 'album_title',
            'cover', 'audio_file', 'release_date', 'release_type',
            'genre', 'lyrics', 'release_year', 'collaborators',
            'file_format', 'is_early_access',
            'listeners_count', 'total_streams',
        ]


class AlbumDetailSerializer(serializers.ModelSerializer):
    """Full album serializer with nested tracks."""

    artist = ArtistMiniSerializer(read_only=True)
    tracks = TrackSerializer(many=True, read_only=True)

    class Meta:
        model = Album
        fields = [
            'id', 'title', 'artist', 'cover', 'release_date', 'genre', 'tracks',
        ]


class AlbumCreateSerializer(serializers.ModelSerializer):
    """Serializer for artist to create/update an album."""

    class Meta:
        model = Album
        fields = ['id', 'title', 'cover', 'release_date', 'genre']

    def create(self, validated_data):
        validated_data['artist'] = self.context['request'].user
        return super().create(validated_data)


class TrackUploadSerializer(serializers.ModelSerializer):
    """Serializer for artist track upload with file validation."""

    class Meta:
        model = Track
        fields = [
            'id', 'title', 'album', 'cover', 'audio_file',
            'release_date', 'release_type', 'genre', 'lyrics',
            'release_year', 'collaborators', 'file_format', 'is_early_access',
        ]

    def validate_audio_file(self, value):
        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_AUDIO_EXTENSIONS:
            raise serializers.ValidationError(
                f'Unsupported audio format "{ext}". Allowed: {", ".join(ALLOWED_AUDIO_EXTENSIONS)}'
            )
        max_size = MAX_AUDIO_SIZE_MB * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f'Audio file too large. Maximum size is {MAX_AUDIO_SIZE_MB} MB.'
            )
        return value

    def create(self, validated_data):
        validated_data['artist'] = self.context['request'].user
        return super().create(validated_data)


class StreamLogSerializer(serializers.ModelSerializer):
    """Read-only serializer for stream logs."""

    class Meta:
        model = StreamLog
        fields = ['id', 'user', 'track', 'streamed_at']
        read_only_fields = ['id', 'user', 'streamed_at']
