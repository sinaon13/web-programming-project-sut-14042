from django.contrib import admin
from .models import Playlist, PlaylistTrack


@admin.register(Playlist)
class PlaylistAdmin(admin.ModelAdmin):
    list_display = ('title', 'owner', 'is_public', 'created_at', 'updated_at')
    list_filter = ('is_public',)
    search_fields = ('title', 'owner__email', 'owner__username')


@admin.register(PlaylistTrack)
class PlaylistTrackAdmin(admin.ModelAdmin):
    list_display = ('playlist', 'track', 'position', 'added_at')
    ordering = ('playlist', 'position')
