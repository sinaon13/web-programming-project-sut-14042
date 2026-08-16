from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for user notifications."""

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'title', 'message', 'notification_type',
            'is_read', 'link', 'created_at',
        ]
        read_only_fields = ['id', 'recipient', 'title', 'message', 'notification_type', 'link', 'created_at']


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Admin/system serializer for creating notifications."""

    class Meta:
        model = Notification
        fields = ['recipient', 'title', 'message', 'notification_type', 'link']
