import uuid
from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from accounts.permissions import IsAdmin
from .models import SubscriptionPlan, UserSubscription, Transaction
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
    permission_classes = [IsAuthenticated]
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
                {'detail': 'No active subscription found.', 'tier': 'FREE'},
                status=status.HTTP_200_OK,
            )


class PurchaseView(APIView):
    """
    POST /api/subscriptions/purchase/
    Initiate a subscription purchase. In sandbox mode, simulates a payment gateway.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PurchaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = get_object_or_404(
            SubscriptionPlan, pk=serializer.validated_data['plan_id'], is_active=True,
        )

        # Free plan — activate immediately
        if plan.price == 0:
            sub, _ = UserSubscription.objects.update_or_create(
                user=request.user,
                defaults={
                    'plan': plan,
                    'expires_at': timezone.now() + timedelta(days=plan.duration_days),
                    'is_active': True,
                },
            )
            return Response({
                'detail': 'Free plan activated.',
                'subscription': UserSubscriptionSerializer(sub).data,
            })

        # Simulate Zarinpal sandbox — generate a fake authority
        authority = f'SANDBOX-{uuid.uuid4().hex[:20]}'
        Transaction.objects.create(
            user=request.user,
            plan=plan,
            amount=plan.price,
            authority=authority,
            status=Transaction.Status.PENDING,
        )

        # In a real implementation, redirect to Zarinpal's payment page
        payment_url = f'https://sandbox.zarinpal.com/pg/StartPay/{authority}'

        return Response({
            'authority': authority,
            'payment_url': payment_url,
            'amount': str(plan.price),
        })


class VerifyPaymentView(APIView):
    """
    POST /api/subscriptions/verify-payment/
    Verify payment callback from gateway. Sandbox mode auto-approves.
    """

    permission_classes = [IsAuthenticated]

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

        # Sandbox mode: accept if status == 'OK'
        if payment_status == 'OK':
            transaction.status = Transaction.Status.SUCCESS
            transaction.ref_id = f'REF-{uuid.uuid4().hex[:10]}'
            transaction.verified_at = timezone.now()
            transaction.save()

            # Activate / extend subscription
            plan = transaction.plan
            sub, _ = UserSubscription.objects.update_or_create(
                user=request.user,
                defaults={
                    'plan': plan,
                    'expires_at': timezone.now() + timedelta(days=plan.duration_days),
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
                {'detail': 'Payment failed or was cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )


class TransactionHistoryView(generics.ListAPIView):
    """GET /api/subscriptions/transactions/ — User's transaction history."""

    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)
