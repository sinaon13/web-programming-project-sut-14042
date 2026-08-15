from django.db import models
from django.conf import settings


class Ticket(models.Model):
    """Support ticket submitted by any authenticated user."""

    class Status(models.TextChoices):
        OPEN = 'OPEN', 'Open'
        IN_PROGRESS = 'IN_PROGRESS', 'In Progress'
        RESOLVED = 'RESOLVED', 'Resolved'
        CLOSED = 'CLOSED', 'Closed'

    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        MEDIUM = 'MEDIUM', 'Medium'
        HIGH = 'HIGH', 'High'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='tickets',
    )
    subject = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=15, choices=Status.choices, default=Status.OPEN)
    priority = models.CharField(max_length=10, choices=Priority.choices, default=Priority.MEDIUM)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='assigned_tickets',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Ticket #{self.pk}: {self.subject} [{self.status}]'


class TicketMessage(models.Model):
    """Message within a support ticket thread."""

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ticket_messages',
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'Message by {self.sender} on Ticket #{self.ticket.pk}'
