from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allows access only to admin users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class IsSupport(BasePermission):
    """Allows access only to support users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'SUPPORT'


class IsSupportOrAdmin(BasePermission):
    """Allows access to support or admin users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('SUPPORT', 'ADMIN')


class IsApprovedArtist(BasePermission):
    """Allows access only to approved artist users."""
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == 'ARTIST'
            and request.user.artist_status == 'APPROVED'
        )


class IsOwner(BasePermission):
    """Object-level permission: only the owner can access."""
    def has_object_permission(self, request, view, obj):
        # Expects the object to have a `user` or `owner` or `artist` field
        owner_field = getattr(obj, 'owner', None) or getattr(obj, 'user', None) or getattr(obj, 'artist', None)
        return owner_field == request.user
