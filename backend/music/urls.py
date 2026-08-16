from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TrackViewSet,
    TrackStreamView,
    TrackDownloadView,
    AlbumViewSet,
    TrackPlayView,
)

router = DefaultRouter()
router.register(r'tracks', TrackViewSet, basename='track')
router.register(r'albums', AlbumViewSet, basename='album')

urlpatterns = [
    path('', include(router.urls)),
    path('tracks/<int:pk>/stream/', TrackStreamView.as_view(), name='track-stream'),
    path('tracks/<int:pk>/play/', TrackPlayView.as_view(), name='track-play'),
    path('tracks/<int:pk>/download/', TrackDownloadView.as_view(), name='track-download'),
]
