from rest_framework import serializers
from django.contrib.auth import get_user_model
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

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'display_name', 'role',
            'avatar', 'birth_date', 'gender', 'bio', 'portfolio_url',
            'artist_status', 'rejection_reason', 'is_verified',
            'followers_count', 'following_count',
            'date_joined', 'tier',
        ]
        read_only_fields = [
            'id', 'email', 'role', 'artist_status', 'rejection_reason',
            'is_verified', 'date_joined', 'tier',
        ]

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_following_count(self, obj):
        return obj.following.count()

    def get_tier(self, obj):
        if hasattr(obj, 'subscription'):
            sub = obj.subscription
            if sub and sub.is_active and sub.plan:
                return sub.plan.tier
        return 'BASIC'

    def validate_avatar(self, value):
        user = self.context['request'].user
        tier = 'BASIC'
        if hasattr(user, 'subscription'):
            sub = user.subscription
            if sub and sub.is_active and sub.plan:
                tier = sub.plan.tier
        
        if tier == 'BASIC':
            raise serializers.ValidationError('Avatar upload is restricted on Free Basic tier. Please upgrade to Silver or Gold.')
        return value


class PublicUserSerializer(serializers.ModelSerializer):
    """Read-only public profile for viewing other users."""

    followers_count = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'display_name', 'role', 'avatar',
            'bio', 'is_verified', 'followers_count', 'is_following',
        ]

    def get_followers_count(self, obj):
        return obj.followers.count()

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.following.filter(pk=obj.pk).exists()
        return False


class UserPreferencesSerializer(serializers.ModelSerializer):
    """Serializer for user preferences (language, volume, notification toggle)."""

    class Meta:
        model = UserPreferences
        fields = ['language', 'volume', 'notifications_enabled']
