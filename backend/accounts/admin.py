from django.contrib import admin
from accounts.models import CustomUser, UserPreferences


@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'username', 'display_name', 'role', 'artist_status', 'is_active')
    list_filter = ('role', 'artist_status', 'is_active', 'gender')
    search_fields = ('email', 'username', 'display_name')
    ordering = ('-date_joined',)


@admin.register(UserPreferences)
class UserPreferencesAdmin(admin.ModelAdmin):
    list_display = ('user', 'language', 'volume', 'notifications_enabled')
    search_fields = ('user__email', 'user__username')
