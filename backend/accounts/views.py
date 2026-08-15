from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from accounts.models import UserPreferences
from .serializers import (
    RegisterSerializer,
    ArtistRegisterSerializer,
    UserProfileSerializer,
    PublicUserSerializer,
    UserPreferencesSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/accounts/register/ — Listener registration."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'detail': 'Account created successfully.', 'user_id': user.id},
            status=status.HTTP_201_CREATED,
        )


class ArtistRegisterView(generics.CreateAPIView):
    """POST /api/accounts/register/artist/ — Artist registration (pending approval)."""

    serializer_class = ArtistRegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'detail': 'Artist account created. Awaiting admin/support approval.',
                'user_id': user.id,
            },
            status=status.HTTP_201_CREATED,
        )


class ProfileView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/accounts/me/
    Retrieve, update, or deactivate the authenticated user's own profile.
    """

    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def perform_destroy(self, instance):
        # Soft-delete: deactivate instead of removing
        instance.is_active = False
        instance.save()


class PublicUserView(generics.RetrieveAPIView):
    """GET /api/accounts/users/<id>/ — View any user's public profile."""

    serializer_class = PublicUserSerializer
    permission_classes = [IsAuthenticated]
    queryset = User.objects.filter(is_active=True)


class FollowView(APIView):
    """
    POST /api/accounts/users/<int:pk>/follow/   — Follow a user
    DELETE /api/accounts/users/<int:pk>/follow/  — Unfollow a user
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        target = get_object_or_404(User, pk=pk, is_active=True)
        if target == request.user:
            return Response(
                {'detail': 'You cannot follow yourself.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.following.add(target)
        return Response({'detail': f'Now following {target.display_name or target.username}.'})

    def delete(self, request, pk):
        target = get_object_or_404(User, pk=pk, is_active=True)
        request.user.following.remove(target)
        return Response({'detail': f'Unfollowed {target.display_name or target.username}.'})


class UserPreferencesView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/accounts/preferences/
    Manage cross-device user preferences (language, volume, notifications).
    """

    serializer_class = UserPreferencesSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        prefs, _ = UserPreferences.objects.get_or_create(user=self.request.user)
        return prefs
