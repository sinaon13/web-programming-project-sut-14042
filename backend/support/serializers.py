from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Ticket, TicketMessage

User = get_user_model()


class TicketMessageSerializer(serializers.ModelSerializer):
    """Serializer for individual ticket messages."""

    sender_display = serializers.CharField(source='sender.display_name', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)

    class Meta:
        model = TicketMessage
        fields = ['id', 'ticket', 'sender', 'sender_display', 'sender_role', 'body', 'created_at']
        read_only_fields = ['id', 'ticket', 'sender', 'created_at']


class TicketListSerializer(serializers.ModelSerializer):
    """Compact serializer for ticket list view."""

    user_display = serializers.CharField(source='user.display_name', read_only=True)

    messages = TicketMessageSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'user', 'user_display', 'subject', 'status',
            'priority', 'created_at', 'updated_at', 'messages',
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at', 'updated_at']


class TicketDetailSerializer(serializers.ModelSerializer):
    """Full ticket serializer with nested messages."""

    messages = TicketMessageSerializer(many=True, read_only=True)
    user_display = serializers.CharField(source='user.display_name', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'user', 'user_display', 'subject', 'description',
            'status', 'priority', 'assigned_to',
            'created_at', 'updated_at', 'messages',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class ArtistApprovalSerializer(serializers.ModelSerializer):
    """Serializer for artist approval / rejection (support/admin use)."""

    class Meta:
        model = User
        fields = ['id', 'email', 'display_name', 'artist_status', 'rejection_reason', 'portfolio_url', 'bio']
        read_only_fields = ['id', 'email', 'display_name', 'portfolio_url', 'bio']
