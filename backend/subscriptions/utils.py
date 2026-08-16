from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta

import os
from django.conf import settings

OFFSET_FILE = os.path.join(settings.BASE_DIR, 'time_offset.txt')

def get_current_time():
    """
    Returns the current time adjusted by a global offset for testing purposes.
    The offset is stored in a file so it persists across server restarts.
    """
    offset_days = 0
    if os.path.exists(OFFSET_FILE):
        try:
            with open(OFFSET_FILE, 'r') as f:
                offset_days = int(f.read().strip())
        except (ValueError, IOError):
            pass
    return timezone.now() + timedelta(days=offset_days)
    
def set_time_offset(days):
    with open(OFFSET_FILE, 'w') as f:
        f.write(str(days))
        
def get_time_offset():
    if os.path.exists(OFFSET_FILE):
        try:
            with open(OFFSET_FILE, 'r') as f:
                return int(f.read().strip())
        except (ValueError, IOError):
            pass
    return 0
