from rest_framework import serializers
from .models import SubscriptionPlan, UserSubscription, Transaction


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for listing available subscription plans."""

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'tier', 'price', 'duration_days',
            'daily_stream_limit', 'max_playlists', 'description', 'is_active',
        ]


class PlanPriceUpdateSerializer(serializers.ModelSerializer):
    """Admin-only serializer for updating a plan's price."""

    class Meta:
        model = SubscriptionPlan
        fields = ['price']


class UserSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for the user's active subscription."""

    plan = SubscriptionPlanSerializer(read_only=True)

    class Meta:
        model = UserSubscription
        fields = ['id', 'plan', 'started_at', 'expires_at', 'is_active', 'auto_renew']
        read_only_fields = ['id', 'started_at', 'expires_at', 'is_active']


class PurchaseSerializer(serializers.Serializer):
    """Serializer for initiating a subscription purchase."""

    plan_id = serializers.IntegerField()
    months = serializers.ChoiceField(choices=[1, 3, 6, 12], default=1)


class VerifyPaymentSerializer(serializers.Serializer):
    """Serializer for verifying a payment callback."""

    authority = serializers.CharField()
    status = serializers.CharField()


class TransactionSerializer(serializers.ModelSerializer):
    """Read-only serializer for transaction history."""

    plan_name = serializers.CharField(source='plan.name', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'plan', 'plan_name', 'amount', 'authority',
            'ref_id', 'status', 'created_at', 'verified_at',
        ]
        read_only_fields = fields
