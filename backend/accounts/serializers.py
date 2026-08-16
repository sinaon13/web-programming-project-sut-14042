from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.db.models import Sum
from accounts.models import UserPreferences

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Listener registration serializer."""

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'password', 'password_confirm',
            'display_name', 'birth_date', 'gender',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            display_name=validated_data.get('display_name', ''),
            birth_date=validated_data.get('birth_date'),
            gender=validated_data.get('gender'),
            role=User.Role.LISTENER,
        )
        # Auto-create preferences
        UserPreferences.objects.create(user=user)
        return user


class ArtistRegisterSerializer(serializers.ModelSerializer):
    """Artist registration serializer — sets status to PENDING."""

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'password', 'password_confirm',
            'display_name', 'birth_date', 'gender',
            'bio', 'portfolio_url',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            display_name=validated_data.get('display_name', ''),
            birth_date=validated_data.get('birth_date'),
            gender=validated_data.get('gender'),
            bio=validated_data.get('bio', ''),
            portfolio_url=validated_data.get('portfolio_url'),
            role=User.Role.ARTIST,
            artist_status=User.ArtistStatus.PENDING,
        )
        UserPreferences.objects.create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Full profile serializer for the authenticated user (GET/PATCH /me/)."""

    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    tier = serializers.SerializerMethodField()
    subscription_expires_at = serializers.SerializerMethodField()
    subscription_days_left = serializers.SerializerMethodField()
    daily_streams = serializers.SerializerMethodField()
    daily_stream_limit = serializers.SerializerMethodField()
    playlist_limit = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'display_name', 'role',
            'avatar', 'birth_date', 'gender', 'bio', 'portfolio_url',
            'artist_status', 'rejection_reason', 'is_verified',
            'followers_count', 'following_count',
            'date_joined', 'tier', 'is_monetized', 'total_earnings', 'subscription_expires_at', 'subscription_days_left',
            'daily_streams', 'daily_stream_limit', 'playlist_limit',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'artist_status', 'rejection_reason',
            'is_verified', 'date_joined', 'tier', 'is_monetized', 'total_earnings', 'subscription_expires_at', 'subscription_days_left',
            'daily_streams', 'daily_stream_limit', 'playlist_limit',
        ]

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_tier(self, obj):
        return obj.get_tier()
        
    def get_subscription_expires_at(self, obj):
        sub = obj.get_active_subscription()
        return sub.expires_at if sub else None

    def get_subscription_days_left(self, obj):
        sub = obj.get_active_subscription()
        if sub:
            from subscriptions.utils import get_current_time
            delta = sub.expires_at - get_current_time()
            return max(0, delta.days)
        return 0

    def get_daily_streams(self, obj):
        from subscriptions.utils import get_current_time
        from music.models import StreamLog
        from django.utils.timezone import localtime
        today = localtime(get_current_time()).date()
        return StreamLog.objects.filter(user=obj, streamed_at__date=today).count()

    def get_daily_stream_limit(self, obj):
        from subscriptions.models import SubscriptionPlan
        try:
            plan = SubscriptionPlan.objects.get(tier=obj.get_tier())
            return plan.daily_stream_limit
        except SubscriptionPlan.DoesNotExist:
            return 60  # fallback

    def get_playlist_limit(self, obj):
        from subscriptions.models import SubscriptionPlan
        try:
            plan = SubscriptionPlan.objects.get(tier=obj.get_tier())
            return plan.max_playlists
        except SubscriptionPlan.DoesNotExist:
            return 6  # fallback

    def validate_avatar(self, value):
        import os
        ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']
        MAX_IMAGE_SIZE_MB = 5
        
        if value:
            ext = os.path.splitext(value.name)[1].lower()
            if ext not in ALLOWED_IMAGE_EXTENSIONS:
                raise serializers.ValidationError(f'Unsupported image format "{ext}". Allowed: {", ".join(ALLOWED_IMAGE_EXTENSIONS)}')
            
            if value.size > MAX_IMAGE_SIZE_MB * 1024 * 1024:
                raise serializers.ValidationError(f'Avatar image is too large. Max size is {MAX_IMAGE_SIZE_MB}MB.')

        user = self.context['request'].user
        sub = self._get_active_subscription(user)
        tier = sub.plan.tier if sub else 'BASIC'
        
        if tier == 'BASIC':
            raise serializers.ValidationError('Avatar upload is restricted on Free Basic tier. Please upgrade to Silver or Gold.')
        return value


class PublicUserSerializer(serializers.ModelSerializer):
    """Read-only public profile for viewing other users."""

    followers_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    subscription_days_left = serializers.SerializerMethodField()
    total_streams = serializers.SerializerMethodField()
    tracks_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'display_name', 'role', 'avatar',
            'bio', 'is_verified', 'artist_status', 'followers_count', 'is_following', 'subscription_days_left',
            'total_streams', 'tracks_count'
        ]

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.following.filter(pk=obj.pk).exists()
        return False

    def _get_active_subscription(self, obj):
        if not hasattr(self, '_active_subs'):
            self._active_subs = {}
        if obj.id not in self._active_subs:
            from subscriptions.models import UserSubscription
            from subscriptions.utils import get_current_time
            self._active_subs[obj.id] = UserSubscription.objects.filter(
                user=obj, is_active=True, expires_at__gt=get_current_time()
            ).first()
        return self._active_subs[obj.id]

    def get_subscription_days_left(self, obj):
        sub = self._get_active_subscription(obj)
        if sub:
            from subscriptions.utils import get_current_time
            delta = sub.expires_at - get_current_time()
            return max(0, delta.days)
        return 0

    def _is_request_user_gold(self):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        user = request.user
        if hasattr(user, 'subscription'):
            sub = user.subscription
            if sub and sub.is_active and sub.plan and sub.plan.tier == 'GOLD':
                from subscriptions.utils import get_current_time
                if sub.expires_at > get_current_time():
                    return True
        return False

    def get_total_streams(self, obj):
        # Only return stats to Gold users (or the artist themselves)
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
            
        if request.user != obj and not self._is_request_user_gold():
            return None
            
        from music.models import StreamLog
        # Calculate unique listeners directly from the DB
        return StreamLog.objects.filter(track__artist=obj).values('user').distinct().count()

    def get_tracks_count(self, obj):
        return obj.tracks.count()


class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user preferences (language, volume, notification toggle)."""

    class Meta:
        model = UserPreferences
        fields = ['language', 'volume', 'notifications_enabled']
