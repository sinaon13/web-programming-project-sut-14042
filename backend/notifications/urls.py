from django.urls import path
from .views import (
    NotificationListView,
    NotificationDetailView,
    MarkAllReadView,
    UnreadCountView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/', NotificationDetailView.as_view(), name='notification-detail'),
    path('mark-all-read/', MarkAllReadView.as_view(), name='mark-all-read'),
    path('unread-count/', UnreadCountView.as_view(), name='unread-count'),
]
