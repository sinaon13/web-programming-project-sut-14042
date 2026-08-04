from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    """
    Custom user model extending AbstractUser.
    Uses email for login. Supports roles: LISTENER, ARTIST, SUPPORT, ADMIN.
    """

    class Role(models.TextChoices):
        LISTENER = 'LISTENER', 'Listener'
        ARTIST = 'ARTIST', 'Artist'
        SUPPORT = 'SUPPORT', 'Support'
        ADMIN = 'ADMIN', 'Admin'

    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    class ArtistStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    email = models.EmailField(unique=True)
    display_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.LISTENER)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    birth_date = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True, null=True)
    bio = models.TextField(blank=True, default='')
    portfolio_url = models.URLField(blank=True, null=True)
    artist_status = models.CharField(
        max_length=10, choices=ArtistStatus.choices, blank=True, null=True,
    )
    rejection_reason = models.TextField(blank=True, default='')
    is_verified = models.BooleanField(default=False)

    # Self-referential many-to-many for following
    following = models.ManyToManyField(
        'self', symmetrical=False, related_name='followers', blank=True,
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return f'{self.display_name or self.username} ({self.role})'


class UserPreferences(models.Model):
    """Stores user preferences synced across devices."""

    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='preferences')
    language = models.CharField(max_length=5, default='en')
    volume = models.IntegerField(default=80)
    notifications_enabled = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'User preferences'

    def __str__(self):
        return f'Preferences for {self.user}'
