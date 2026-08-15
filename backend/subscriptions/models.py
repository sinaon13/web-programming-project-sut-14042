from django.db import models
from django.conf import settings


class SubscriptionPlan(models.Model):
    """Available subscription tiers."""

    class Tier(models.TextChoices):
        FREE = 'FREE', 'Free'
        REGULAR = 'REGULAR', 'Regular'
        PREMIUM = 'PREMIUM', 'Premium'
        FAMILY = 'FAMILY', 'Family'
        STUDENT = 'STUDENT', 'Student'

    name = models.CharField(max_length=100)
    tier = models.CharField(max_length=10, choices=Tier.choices, unique=True)
    price = models.DecimalField(max_digits=12, decimal_places=0, help_text='Price in Rials')
    duration_days = models.PositiveIntegerField(default=30, help_text='Subscription duration in days')
    daily_stream_limit = models.PositiveIntegerField(
        null=True, blank=True, help_text='Null = unlimited',
    )
    max_playlists = models.PositiveIntegerField(
        null=True, blank=True, help_text='Null = unlimited',
    )
    description = models.TextField(blank=True, default='')
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.name} ({self.tier}) — {self.price:,.0f} Rials'


class UserSubscription(models.Model):
    """Active subscription for a user."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subscription',
    )
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT, related_name='subscribers')
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    auto_renew = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.user} — {self.plan.tier} (until {self.expires_at})'


class Transaction(models.Model):
    """Payment transaction record."""

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESS = 'SUCCESS', 'Success'
        FAILED = 'FAILED', 'Failed'
        REFUNDED = 'REFUNDED', 'Refunded'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transactions',
    )
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    authority = models.CharField(max_length=255, blank=True, default='', help_text='Payment gateway authority code')
    ref_id = models.CharField(max_length=255, blank=True, default='', help_text='Payment reference ID')
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Transaction #{self.pk} — {self.user} — {self.status}'
