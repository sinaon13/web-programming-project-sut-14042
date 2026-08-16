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

    album_title = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Track
        fields = [
            'id', 'title', 'album', 'album_title', 'cover', 'audio_file',
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

    def _handle_album(self, validated_data, artist):
        album_title = validated_data.pop('album_title', None)
        cover = validated_data.get('cover')
        
        # Determine if we should handle album logic
        album_obj = validated_data.get('album')
        if album_title:
            album_obj, _ = Album.objects.get_or_create(
                artist=artist,
                title=album_title,
                defaults={
                    'release_date': validated_data.get('release_date', '2026-01-01'),
                    'genre': validated_data.get('genre', ''),
                }
            )
            validated_data['album'] = album_obj
            
        if album_obj and cover:
            # Sync cover to album
            album_obj.cover = cover
            album_obj.save()
            # Sync cover to all other tracks in the album
            for track in album_obj.tracks.all():
                if track.id != self.instance.id if self.instance else True:
                    track.cover = album_obj.cover
                    track.save(update_fields=['cover'])
                    
        # If part of an album, use album's cover if no cover provided
        if album_obj and not cover and album_obj.cover:
            validated_data['cover'] = album_obj.cover
            
        return validated_data

    def create(self, validated_data):
        artist = self.context['request'].user
        validated_data['artist'] = artist
        validated_data = self._handle_album(validated_data, artist)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        artist = instance.artist
        validated_data = self._handle_album(validated_data, artist)
        return super().update(instance, validated_data)


class StreamLogSerializer(serializers.ModelSerializer):
    """Read-only serializer for stream logs."""

    class Meta:
        model = StreamLog
        fields = ['id', 'user', 'track', 'streamed_at']
        read_only_fields = ['id', 'user', 'streamed_at']
