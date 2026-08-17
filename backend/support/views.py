from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from accounts.permissions import IsSupportOrAdmin
from notifications.models import Notification
from .models import Ticket, TicketMessage
from .serializers import (
    TicketListSerializer,
    TicketDetailSerializer,
    TicketMessageSerializer,
    ArtistApprovalSerializer,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Support Tickets
# ---------------------------------------------------------------------------

class TicketListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/support/tickets/        — List user's tickets (support/admin see all)
    POST /api/support/tickets/        — Create a new ticket
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TicketDetailSerializer
        return TicketListSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ('SUPPORT', 'ADMIN'):
            return Ticket.objects.all()
        return Ticket.objects.filter(user=user)

    def perform_create(self, serializer):
        ticket = serializer.save(user=self.request.user)
        # Notify user that their ticket is created
        Notification.objects.create(
            recipient=self.request.user,
            title="Ticket Created",
            message=f"Your ticket '{ticket.subject}' has been submitted.",
            notification_type=Notification.Type.SUPPORT
        )


class TicketDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/support/tickets/<id>/  — Ticket detail with messages
    PATCH /api/support/tickets/<id>/  — Update status/priority (support/admin)
    """

    serializer_class = TicketDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ('SUPPORT', 'ADMIN'):
            return Ticket.objects.all()
        return Ticket.objects.filter(user=user)

    def perform_update(self, serializer):
        user = self.request.user
        if user.role not in ('SUPPORT', 'ADMIN'):
            for field in ['status', 'priority', 'assigned_to']:
                serializer.validated_data.pop(field, None)
        serializer.save()


class TicketMessageCreateView(generics.CreateAPIView):
    """POST /api/support/tickets/<ticket_id>/messages/ — Add a message to a ticket."""

    serializer_class = TicketMessageSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        ticket = get_object_or_404(Ticket, pk=self.kwargs['ticket_id'])
        # Verify the user owns the ticket or is support/admin
        if ticket.user != self.request.user and self.request.user.role not in ('SUPPORT', 'ADMIN'):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have permission to message on this ticket.')
            
        serializer.save(sender=self.request.user, ticket=ticket)
        
        # Update ticket status based on who replied
        if self.request.user.role in ('SUPPORT', 'ADMIN'):
            ticket.status = Ticket.Status.ANSWERED
            
            # Send notification to user that their ticket got a reply
            Notification.objects.create(
                recipient=ticket.user,
                title=f"New Reply on Ticket #{ticket.pk}",
                message=f"Support has replied to your ticket '{ticket.subject}'.",
                notification_type='SYSTEM'
            )
        else:
            ticket.status = Ticket.Status.OPEN
        ticket.save(update_fields=['status', 'updated_at'])


# ---------------------------------------------------------------------------
# Artist Approval Workflow
# ---------------------------------------------------------------------------

class PendingArtistListView(generics.ListAPIView):
    """GET /api/support/artist-requests/ — List pending artist applications."""

    serializer_class = ArtistApprovalSerializer
    permission_classes = [IsSupportOrAdmin]
    queryset = User.objects.filter(role='ARTIST', artist_status='PENDING')


class ArtistStatusUpdateView(APIView):
    """PATCH /api/support/artist-requests/<id>/ — Approve or reject an artist."""

    permission_classes = [IsSupportOrAdmin]

    def patch(self, request, pk):
        user = get_object_or_404(User, pk=pk, role='ARTIST', artist_status='PENDING')
        status_req = request.data.get('status')
        reason = request.data.get('reason', '')
        
        if status_req == 'APPROVED':
            user.artist_status = User.ArtistStatus.APPROVED
            user.save(update_fields=['artist_status'])
            Notification.objects.create(
                recipient=user,
                title="Artist Application Approved",
                message="Congratulations! Your artist application has been approved.",
                notification_type=Notification.Type.SYSTEM
            )
            return Response({'detail': f'Artist {user.display_name or user.username} approved.'})
        elif status_req == 'REJECTED':
            user.artist_status = User.ArtistStatus.REJECTED
            user.rejection_reason = reason
            user.save(update_fields=['artist_status', 'rejection_reason'])
            Notification.objects.create(
                recipient=user,
                title="Artist Application Rejected",
                message=f"Your artist application was rejected. Reason: {reason}",
                notification_type=Notification.Type.SYSTEM
            )
            return Response({'detail': f'Artist {user.display_name or user.username} rejected.'})
        
        return Response({'detail': 'Invalid status provided.'}, status=400)
