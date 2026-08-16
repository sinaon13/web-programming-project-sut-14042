from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncMonth
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin, IsApprovedArtist
from music.models import Track, StreamLog
from subscriptions.models import UserSubscription, Transaction

User = get_user_model()

# Per-stream payout rate (in Rials)
PAYOUT_RATE_PER_STREAM = Decimal('50')


class AdminDashboardView(APIView):
    """
    GET /api/reports/admin/dashboard/
    Returns aggregated data for admin dashboard:
    - Tier distribution (pie chart data)
    - Monthly revenue
    - Total users, artists, tracks
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        # Tier distribution
        tier_distribution = list(
            UserSubscription.objects.filter(is_active=True)
            .values('plan__tier')
            .annotate(count=Count('id'))
            .order_by('plan__tier')
        )

        # Monthly revenue (last 12 months)
        twelve_months_ago = date.today() - timedelta(days=365)
        monthly_revenue = list(
            Transaction.objects.filter(
                status='SUCCESS',
                verified_at__date__gte=twelve_months_ago,
            )
            .annotate(month=TruncMonth('verified_at'))
            .values('month')
            .annotate(total=Sum('amount'))
            .order_by('month')
        )

        # Convert dates to strings for JSON
        for entry in monthly_revenue:
            entry['month'] = entry['month'].strftime('%Y-%m') if entry['month'] else None

        total_revenue = Transaction.objects.filter(status='SUCCESS').aggregate(
            total=Sum('amount')
        )['total'] or 0

        # General stats
        total_users = User.objects.filter(is_active=True).count()
        total_artists = User.objects.filter(role='ARTIST', artist_status='APPROVED').count()
        pending_artists = User.objects.filter(role='ARTIST', artist_status='PENDING').count()
        total_tracks = Track.objects.count()
        total_streams = StreamLog.objects.count()

        return Response({
            'tier_distribution': tier_distribution,
            'monthly_revenue': monthly_revenue,
            'total_revenue': str(total_revenue),
            'total_users': total_users,
            'total_artists': total_artists,
            'pending_artists': pending_artists,
            'total_tracks': total_tracks,
            'total_streams': total_streams,
        })


class AdminPayoutView(APIView):
    """
    GET /api/reports/admin/payouts/
    Calculate payout amounts for all approved artists based on their stream counts.

    POST /api/reports/admin/payouts/
    Settle payouts (mark as paid — in a real system, trigger bank transfers).
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        # Optional date range filtering
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        stream_qs = StreamLog.objects.all()
        if start_date:
            stream_qs = stream_qs.filter(streamed_at__date__gte=start_date)
        if end_date:
            stream_qs = stream_qs.filter(streamed_at__date__lte=end_date)

        # Aggregate streams per artist
        artist_payouts = (
            stream_qs
            .values(
                artist_id=F('track__artist__id'),
                artist_name=F('track__artist__display_name'),
                artist_email=F('track__artist__email'),
                is_monetized=F('track__artist__is_monetized'),
                streams_settled=F('track__artist__streams_settled'),
            )
            .annotate(
                stream_count=Count('id'),
            )
            .order_by('-stream_count')
        )

        # Calculate payout amounts
        results = []
        for entry in artist_payouts:
            unpaid_streams = max(0, entry['stream_count'] - entry['streams_settled'])
            payout_amount = Decimal(unpaid_streams) * Decimal('200')
            results.append({
                'artist_id': entry['artist_id'],
                'artist_name': entry['artist_name'] or 'Unknown',
                'artist_email': entry['artist_email'],
                'stream_count': entry['stream_count'],
                'unpaid_streams': unpaid_streams,
                'payout_amount': str(payout_amount),
                'is_monetized': entry['is_monetized'],
            })

        total_payout = sum(Decimal(r['payout_amount']) for r in results)

        return Response({
            'payouts': results,
            'total_payout': str(total_payout),
            'payout_rate_per_stream': '200',
        })

    def post(self, request):
        """Toggle monetization status for artists."""
        artist_ids = request.data.get('artist_ids', [])
        if not artist_ids:
            return Response({'detail': 'No artists specified.'}, status=400)

        try:
            from notifications.models import Notification
            for artist_id in artist_ids:
                artist = User.objects.filter(pk=artist_id, role='ARTIST').first()
                if artist:
                    artist.is_monetized = not artist.is_monetized
                    artist.save(update_fields=['is_monetized'])
                    
                    status_text = 'monetized' if artist.is_monetized else 'revoked'
                    msg = 'Admin has confirmed your monetization.' if artist.is_monetized else 'Admin has revoked your monetization.'
                    
                    Notification.objects.create(
                        recipient=artist,
                        title=f'Monetization {status_text.capitalize()}',
                        message=msg,
                        notification_type=Notification.Type.SYSTEM,
                    )
            return Response({'detail': 'Monetization statuses updated successfully.'})
        except ImportError:
            return Response({'detail': 'Notification system not available.'}, status=500)


class ArtistStatsView(APIView):
    """
    GET /api/reports/artist/stats/
    Returns analytics for the authenticated artist:
    - Total streams, unique listeners
    - Streams per track
    - Monthly stream trend
    - Estimated earnings
    """

    permission_classes = [IsApprovedArtist]

    def get(self, request):
        artist = request.user
        tracks = Track.objects.filter(artist=artist)

        # Per-track stats
        track_stats = list(
            tracks.values('id', 'title')
            .annotate(
                streams=Sum('total_streams'),
                listeners=Sum('listeners_count'),
            )
            .order_by('-streams')
        )

        total_streams = sum(t['streams'] or 0 for t in track_stats)
        total_listeners = sum(t['listeners'] or 0 for t in track_stats)

        # Monthly stream trend (last 6 months)
        six_months_ago = date.today() - timedelta(days=180)
        monthly_streams = list(
            StreamLog.objects.filter(
                track__artist=artist,
                streamed_at__date__gte=six_months_ago,
            )
            .annotate(month=TruncMonth('streamed_at'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )

        for entry in monthly_streams:
            entry['month'] = entry['month'].strftime('%Y-%m') if entry['month'] else None

        # Estimated earnings
        estimated_earnings = Decimal(total_streams) * PAYOUT_RATE_PER_STREAM

        return Response({
            'total_streams': total_streams,
            'total_listeners': total_listeners,
            'total_tracks': tracks.count(),
            'estimated_earnings': str(estimated_earnings),
            'payout_rate_per_stream': str(PAYOUT_RATE_PER_STREAM),
            'track_stats': track_stats,
            'monthly_streams': monthly_streams,
        })
