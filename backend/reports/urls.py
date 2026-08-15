from django.urls import path
from .views import AdminDashboardView, AdminPayoutView, ArtistStatsView

urlpatterns = [
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('admin/payouts/', AdminPayoutView.as_view(), name='admin-payouts'),
    path('artist/stats/', ArtistStatsView.as_view(), name='artist-stats'),
]
