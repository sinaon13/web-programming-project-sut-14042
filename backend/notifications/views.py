from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(generics.ListAPIView):
    """GET /api/notifications/ — List all notifications for the authenticated user."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class NotificationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/notifications/<id>/
    PATCH to mark as read, DELETE to dismiss.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class MarkAllReadView(APIView):
    """POST /api/notifications/mark-all-read/ — Mark all notifications as read."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False,
        ).update(is_read=True)
        return Response({'detail': f'{count} notifications marked as read.'})


class UnreadCountView(APIView):
    """GET /api/notifications/unread-count/ — Get count of unread notifications."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user, is_read=False,
        ).count()
        return Response({'unread_count': count})
