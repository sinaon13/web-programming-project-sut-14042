from django.db import models
from django.conf import settings


class Album(models.Model):
    """Music album belonging to an artist."""

    title = models.CharField(max_length=255)
    artist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='albums',
    )
    cover = models.ImageField(upload_to='covers/', blank=True, null=True)
    release_date = models.DateField()
    genre = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return f'{self.title} — {self.artist.display_name}'


class Track(models.Model):
    """Individual music track (single or part of album)."""

    class ReleaseType(models.TextChoices):
        SINGLE = 'SINGLE', 'Single'
        ALBUM = 'ALBUM', 'Album'

    class FileFormat(models.TextChoices):
        MP3 = 'MP3', 'MP3'
        WAV = 'WAV', 'WAV'
        FLAC = 'FLAC', 'FLAC'

    title = models.CharField(max_length=255)
    artist = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tracks',
    )
    album = models.ForeignKey(
        Album, on_delete=models.SET_NULL, null=True, blank=True, related_name='tracks',
    )
    cover = models.ImageField(upload_to='covers/', blank=True, null=True)
    audio_file = models.FileField(upload_to='tracks/')
    release_date = models.DateField()
    release_type = models.CharField(max_length=6, choices=ReleaseType.choices, default=ReleaseType.SINGLE)
    genre = models.CharField(max_length=100, blank=True, default='')
    lyrics = models.TextField(blank=True, default='')
    release_year = models.IntegerField(blank=True, null=True)
    collaborators = models.TextField(blank=True, default='')
    file_format = models.CharField(max_length=4, choices=FileFormat.choices, default=FileFormat.MP3)
    is_early_access = models.BooleanField(default=False)

    # Denormalized counters (updated on stream)
    listeners_count = models.IntegerField(default=0)
    total_streams = models.IntegerField(default=0)

    class Meta:
        ordering = ['-release_date', '-id']

    def __str__(self):
        return f'{self.title} — {self.artist.display_name}'


class StreamLog(models.Model):
    """Logs every stream event for analytics, daily limits, and payout calculation."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='stream_logs',
    )
    track = models.ForeignKey(Track, on_delete=models.CASCADE, related_name='stream_logs')
    streamed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'streamed_at']),
            models.Index(fields=['track', 'streamed_at']),
        ]

    def __str__(self):
        return f'{self.user} streamed {self.track} at {self.streamed_at}'
