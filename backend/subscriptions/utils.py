from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta

def get_current_time():
    """
    Returns the current time adjusted by a global offset for testing purposes.
    The offset is stored in the Django cache.
    """
    offset_days = cache.get('time_offset_days', 0)
    return timezone.now() + timedelta(days=offset_days)
