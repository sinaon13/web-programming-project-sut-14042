from django.urls import path
from .views import (
    TicketListCreateView,
    TicketDetailView,
    TicketMessageCreateView,
    PendingArtistListView,
    ArtistApproveView,
    ArtistRejectView,
)

urlpatterns = [
    # Support tickets
    path('tickets/', TicketListCreateView.as_view(), name='ticket-list-create'),
    path('tickets/<int:pk>/', TicketDetailView.as_view(), name='ticket-detail'),
    path('tickets/<int:ticket_id>/messages/', TicketMessageCreateView.as_view(), name='ticket-message-create'),

    # Artist approval workflow
    path('artist-requests/', PendingArtistListView.as_view(), name='artist-requests'),
    path('artist-requests/<int:pk>/approve/', ArtistApproveView.as_view(), name='artist-approve'),
    path('artist-requests/<int:pk>/reject/', ArtistRejectView.as_view(), name='artist-reject'),
]
