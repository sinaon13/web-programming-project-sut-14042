from django.db import models
from django.conf import settings


class Notification(models.Model):
    """In-app notification for a user."""

    class Type(models.TextChoices):
        SYSTEM = 'SYSTEM', 'System'
        SUBSCRIPTION = 'SUBSCRIPTION', 'Subscription'
        MUSIC = 'MUSIC', 'Music'
        FOLLOW = 'FOLLOW', 'Follow'
        SUPPORT = 'SUPPORT', 'Support'
        PAYOUT = 'PAYOUT', 'Payout'

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications',
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=15, choices=Type.choices, default=Type.SYSTEM)
    is_read = models.BooleanField(default=False)
    link = models.CharField(max_length=500, blank=True, default='', help_text='Frontend route to navigate to')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.notification_type}] {self.title} → {self.recipient}'
