from django.contrib import admin
from .models import Ticket, TicketMessage


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'subject', 'user', 'status', 'priority', 'assigned_to', 'created_at')
    list_filter = ('status', 'priority')
    search_fields = ('subject', 'user__email', 'user__username')
    ordering = ('-created_at',)


@admin.register(TicketMessage)
class TicketMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket', 'sender', 'created_at')
    search_fields = ('body', 'sender__email')
