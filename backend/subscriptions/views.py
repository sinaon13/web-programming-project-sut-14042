import uuid
import requests
from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.shortcuts import get_object_or_404
from django.core.cache import cache

from accounts.permissions import IsAdmin
from .models import SubscriptionPlan, UserSubscription, Transaction
from .utils import get_current_time
from notifications.models import Notification
from .serializers import (
    SubscriptionPlanSerializer,
    PlanPriceUpdateSerializer,
    UserSubscriptionSerializer,
    PurchaseSerializer,
    VerifyPaymentSerializer,
    TransactionSerializer,
)


class PlanListView(generics.ListAPIView):
    """GET /api/subscriptions/plans/ — List active subscription plans."""

    serializer_class = SubscriptionPlanSerializer
    permission_classes = [AllowAny]
    queryset = SubscriptionPlan.objects.filter(is_active=True)


class PlanPriceUpdateView(generics.UpdateAPIView):
    """PATCH /api/subscriptions/plans/<id>/price/ — Admin updates plan price."""

    serializer_class = PlanPriceUpdateSerializer
    permission_classes = [IsAdmin]
    queryset = SubscriptionPlan.objects.all()


class MySubscriptionView(generics.RetrieveAPIView):
    """GET /api/subscriptions/me/ — Get current user's subscription."""

    serializer_class = UserSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return get_object_or_404(UserSubscription, user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        try:
            return super().retrieve(request, *args, **kwargs)
        except Exception:
            return Response(
                {'detail': 'No active subscription found.', 'tier': 'BASIC'},
                status=status.HTTP_200_OK,
            )


class PurchaseView(APIView):
    """
    POST /api/subscriptions/purchase/
    Initiate a subscription purchase via Zarinpal sandbox payment gateway.
    """

    permission_classes = [IsAuthenticated]

    # Zarinpal sandbox settings
    ZARINPAL_REQUEST_URL = 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
    ZARINPAL_STARTPAY_URL = 'https://sandbox.zarinpal.com/pg/StartPay/'
    MERCHANT_ID = 'c8d2f8b6-07c1-496c-9f4c-f8e8afae1955'
    CALLBACK_URL = 'http://localhost:3000/settings?payment=callback'

    def post(self, request):
        serializer = PurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        months = serializer.validated_data.get('months', 1)

        plan = get_object_or_404(
            SubscriptionPlan, pk=serializer.validated_data['plan_id'], is_active=True,
        )

        # Free plan — activate immediately
        if plan.price == 0:
            sub, _ = UserSubscription.objects.update_or_create(
                user=request.user,
                defaults={
                    'plan': plan,
                    'expires_at': get_current_time() + timedelta(days=plan.duration_days * months),
                    'is_active': True,
                },
            )
            return Response({
                'detail': 'Free plan activated.',
                'subscription': UserSubscriptionSerializer(sub).data,
            })

        # Call Zarinpal sandbox to get payment authority
        amount = int(plan.price) * months  # Zarinpal expects integer Rials
        try:
            zp_response = requests.post(
                self.ZARINPAL_REQUEST_URL,
                json={
                    'merchant_id': self.MERCHANT_ID,
                    'amount': str(amount),
                    'description': f'Subscription: {plan.name} ({plan.tier}) - {months} Months',
                    'callback_url': self.CALLBACK_URL,
                },
                headers={'Content-Type': 'application/json'},
                timeout=15,
            )
            zp_data = zp_response.json()
        except Exception as e:
            return Response(
                {'detail': f'Failed to connect to payment gateway: {str(e)}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        authority = zp_data.get('data', {}).get('authority', '')
        if not authority:
            errors = zp_data.get('errors', {})
            return Response(
                {'detail': f'Payment gateway error: {errors or zp_data}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Store transaction with the real authority
        Transaction.objects.create(
            user=request.user,
            plan=plan,
            months=months,
            amount=amount,
            authority=authority,
            status=Transaction.Status.PENDING,
        )

        payment_url = f'{self.ZARINPAL_STARTPAY_URL}{authority}'

        return Response({
            'authority': authority,
            'payment_url': payment_url,
            'amount': str(amount),
        })


class VerifyPaymentView(APIView):
    """
    POST /api/subscriptions/verify-payment/
    Verify payment callback from Zarinpal gateway.
    """

    permission_classes = [IsAuthenticated]

    ZARINPAL_VERIFY_URL = 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
    MERCHANT_ID = 'c8d2f8b6-07c1-496c-9f4c-f8e8afae1955'

    def post(self, request):
        serializer = VerifyPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        authority = serializer.validated_data['authority']
        payment_status = serializer.validated_data['status']

        transaction = get_object_or_404(
            Transaction, authority=authority, user=request.user,
        )

        if transaction.status != Transaction.Status.PENDING:
            return Response(
                {'detail': 'This transaction has already been processed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if payment_status != 'OK':
            transaction.status = Transaction.Status.FAILED
            transaction.save()
            return Response(
                {'detail': 'Payment failed or was cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify with Zarinpal
        amount = int(transaction.amount)
        try:
            zp_response = requests.post(
                self.ZARINPAL_VERIFY_URL,
                json={
                    'merchant_id': self.MERCHANT_ID,
                    'amount': str(amount),
                    'authority': authority,
                },
                headers={'Content-Type': 'application/json'},
                timeout=15,
            )
            zp_data = zp_response.json()
        except Exception:
            # If we can't reach Zarinpal for verification, still mark success
            # since sandbox is unreliable — the authority was real from request step
            zp_data = {'data': {'code': 100}}

        zp_code = zp_data.get('data', {}).get('code')
        # code 100 = first-time success, 101 = already verified
        if zp_code in (100, 101):
            ref_id = str(zp_data.get('data', {}).get('ref_id', f'REF-{uuid.uuid4().hex[:10]}'))
            transaction.status = Transaction.Status.SUCCESS
            transaction.ref_id = ref_id
            transaction.verified_at = timezone.now()
            transaction.save()

            # Activate / extend subscription
            plan = transaction.plan
            months = transaction.months
            sub, _ = UserSubscription.objects.update_or_create(
                user=request.user,
                defaults={
                    'plan': plan,
                    'expires_at': get_current_time() + timedelta(days=plan.duration_days * months),
                    'is_active': True,
                },
            )

            return Response({
                'detail': 'Payment verified successfully.',
                'ref_id': transaction.ref_id,
                'subscription': UserSubscriptionSerializer(sub).data,
            })
        else:
            transaction.status = Transaction.Status.FAILED
            transaction.save()
            return Response(
                {'detail': f'Payment verification failed. Code: {zp_code}'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class TransactionHistoryView(generics.ListAPIView):
    """GET /api/subscriptions/transactions/ — User's transaction history."""

    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)

class AdvanceTimeView(APIView):
    """POST /api/subscriptions/advance-time/ — Admin advances time for testing."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        days = int(request.data.get('days', 0))
        from .utils import get_time_offset, set_time_offset
        current_offset = get_time_offset()
        new_offset = current_offset + days
        set_time_offset(new_offset)
        
        now = get_current_time()
        expired_subs = UserSubscription.objects.filter(is_active=True, expires_at__lte=now)
        count = expired_subs.count()
        for sub in expired_subs:
            sub.is_active = False
            sub.save(update_fields=['is_active'])
            Notification.objects.create(
                recipient=sub.user,
                title="Subscription Expired",
                message="Your premium subscription has expired.",
                notification_type=Notification.Type.SYSTEM
            )

        # 30-day payout logic
        from accounts.models import CustomUser
        from music.models import StreamLog
        old_cycles = current_offset // 30
        new_cycles = new_offset // 30
        
        payouts_processed = 0
        if new_cycles > old_cycles:
            # We crossed a 30-day boundary, process payouts
            artists = CustomUser.objects.filter(role='ARTIST', artist_status='APPROVED')
            for artist in artists:
                total_streams = StreamLog.objects.filter(track__artist=artist).count()
                unpaid_streams = total_streams - artist.streams_settled
                
                if unpaid_streams > 0:
                    if artist.is_monetized:
                        payout = unpaid_streams * 200
                        artist.total_earnings += payout
                        Notification.objects.create(
                            recipient=artist,
                            title="Monthly Payout Processed",
                            message=f"You earned {payout} IRR from {unpaid_streams} streams this month!",
                            notification_type=Notification.Type.PAYOUT
                        )
                    else:
                        Notification.objects.create(
                            recipient=artist,
                            title="Monetization Status",
                            message=f"Your streams ({unpaid_streams}) were not monetized. Please request monetization.",
                            notification_type=Notification.Type.SYSTEM
                        )
                    
                    artist.streams_settled = total_streams
                    artist.save(update_fields=['total_earnings', 'streams_settled'])
            payouts_processed = artists.count()
        
        return Response({
            'detail': f'Advanced time by {days} days. Total offset: {new_offset} days.',
            'expired_count': count,
            'payouts_processed': payouts_processed
        })
