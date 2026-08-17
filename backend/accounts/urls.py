from django.urls import path
from .views import (
    RegisterView,
    ArtistRegisterView,
    ProfileView,
    PublicUserView,
    FollowView,
    UserPreferencesView,
    PasswordResetRequestView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('register/artist/', ArtistRegisterView.as_view(), name='register-artist'),
    path('me/', ProfileView.as_view(), name='profile'),
    path('users/<int:pk>/', PublicUserView.as_view(), name='public-user'),
    path('users/<int:pk>/follow/', FollowView.as_view(), name='follow'),
    path('users/<int:pk>/followers/', FollowView.as_view(), name='followers'),
    path('preferences/', UserPreferencesView.as_view(), name='preferences'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset'),
]
