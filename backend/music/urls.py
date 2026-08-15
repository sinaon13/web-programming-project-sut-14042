from django.urls import path
from .views import (
    TrackListCreateView,
    TrackDetailView,
    TrackStreamView,
    AlbumListCreateView,
    AlbumDetailView,
)

urlpatterns = [
    path('tracks/', TrackListCreateView.as_view(), name='track-list-create'),
    path('tracks/<int:pk>/', TrackDetailView.as_view(), name='track-detail'),
    path('tracks/<int:pk>/stream/', TrackStreamView.as_view(), name='track-stream'),
    path('albums/', AlbumListCreateView.as_view(), name='album-list-create'),
    path('albums/<int:pk>/', AlbumDetailView.as_view(), name='album-detail'),
]
