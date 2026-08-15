from django.contrib import admin
from .models import SubscriptionPlan, UserSubscription, Transaction


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'tier', 'price', 'duration_days', 'daily_stream_limit', 'max_playlists', 'is_active')
    list_filter = ('tier', 'is_active')


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'started_at', 'expires_at', 'is_active', 'auto_renew')
    list_filter = ('is_active', 'plan__tier')
    search_fields = ('user__email', 'user__username')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'plan', 'amount', 'status', 'created_at', 'verified_at')
    list_filter = ('status', 'plan__tier')
    search_fields = ('user__email', 'authority', 'ref_id')
    ordering = ('-created_at',)
