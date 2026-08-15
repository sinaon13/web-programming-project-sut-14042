from django.contrib import admin
from music.models import Album, Track, StreamLog


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ('title', 'artist', 'genre', 'release_date')
    list_filter = ('genre', 'release_date')
    search_fields = ('title', 'artist__display_name', 'artist__username')


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ('title', 'artist', 'album', 'genre', 'release_type', 'total_streams', 'is_early_access')
    list_filter = ('genre', 'release_type', 'file_format', 'is_early_access')
    search_fields = ('title', 'artist__display_name', 'artist__username')
    ordering = ('-total_streams',)


@admin.register(StreamLog)
class StreamLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'track', 'streamed_at')
    list_filter = ('streamed_at',)
    search_fields = ('user__email', 'track__title')
    ordering = ('-streamed_at',)
