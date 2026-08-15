from django.urls import path
from .views import (
    PlaylistListCreateView,
    PlaylistDetailView,
    PlaylistAddTrackView,
    PlaylistRemoveTrackView,
)

urlpatterns = [
    path('', PlaylistListCreateView.as_view(), name='playlist-list-create'),
    path('<int:pk>/', PlaylistDetailView.as_view(), name='playlist-detail'),
    path('<int:pk>/add-track/', PlaylistAddTrackView.as_view(), name='playlist-add-track'),
    path('<int:pk>/remove-track/<int:track_id>/', PlaylistRemoveTrackView.as_view(), name='playlist-remove-track'),
]
