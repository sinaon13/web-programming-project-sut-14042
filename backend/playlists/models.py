from django.db import models
from django.conf import settings


class Playlist(models.Model):
    """User-created playlist."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='playlists',
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    cover = models.ImageField(upload_to='playlist_covers/', blank=True, null=True)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'{self.title} (by {self.owner.display_name or self.owner.username})'


class PlaylistTrack(models.Model):
    """
    Through-model for playlist ↔ track relationship.
    Supports ordering via `position`.
    """

    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE, related_name='playlist_tracks')
    track = models.ForeignKey('music.Track', on_delete=models.CASCADE, related_name='in_playlists')
    position = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['position']
        unique_together = ('playlist', 'track')

    def __str__(self):
        return f'{self.track.title} in {self.playlist.title} (pos {self.position})'
