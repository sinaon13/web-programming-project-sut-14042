from django.utils import timezone
from datetime import timedelta
from subscriptions.models import SystemSettings

def get_current_time():
    """
    Returns the current time adjusted by a global offset for testing purposes.
    """
    try:
        settings = SystemSettings.objects.first()
        offset_days = settings.time_offset_days if settings else 0
    except Exception:
        # Failsafe if DB is not migrated yet
        offset_days = 0
    return timezone.now() + timedelta(days=offset_days)
    
def set_time_offset(days):
    settings, _ = SystemSettings.objects.get_or_create(id=1)
    settings.time_offset_days = days
    settings.save()
        
def get_time_offset():
    try:
        settings = SystemSettings.objects.first()
        return settings.time_offset_days if settings else 0
    except Exception:
        return 0
