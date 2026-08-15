from django.urls import path
from .views import (
    PlanListView,
    PlanPriceUpdateView,
    MySubscriptionView,
    PurchaseView,
    VerifyPaymentView,
    TransactionHistoryView,
)

urlpatterns = [
    path('plans/', PlanListView.as_view(), name='plan-list'),
    path('plans/<int:pk>/price/', PlanPriceUpdateView.as_view(), name='plan-price-update'),
    path('me/', MySubscriptionView.as_view(), name='my-subscription'),
    path('purchase/', PurchaseView.as_view(), name='purchase'),
    path('verify-payment/', VerifyPaymentView.as_view(), name='verify-payment'),
    path('transactions/', TransactionHistoryView.as_view(), name='transaction-history'),
]
