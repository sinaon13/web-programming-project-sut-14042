from django.urls import path
from .views import (
    PlaylistListCreateView,
    PlaylistDetailView,
    PlaylistTracksView,
    PlaylistTrackDetailView,
)

urlpatterns = [
    path('', PlaylistListCreateView.as_view(), name='playlist-list-create'),
    path('<int:pk>/', PlaylistDetailView.as_view(), name='playlist-detail'),
    path('<int:pk>/tracks/', PlaylistTracksView.as_view(), name='playlist-tracks'),
    path('<int:pk>/tracks/<int:track_id>/', PlaylistTrackDetailView.as_view(), name='playlist-track-detail'),
]
