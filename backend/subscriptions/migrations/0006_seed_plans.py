from django.db import migrations

def seed_plans(apps, schema_editor):
    SubscriptionPlan = apps.get_model('subscriptions', 'SubscriptionPlan')
    
    plans = [
        {
            'name': 'Basic (Free)',
            'tier': 'BASIC',
            'price': 0,
            'duration_days': 30,
            'daily_stream_limit': 60,
            'max_playlists': 6,
            'description': 'Free basic plan'
        },
        {
            'name': 'Silver',
            'tier': 'SILVER',
            'price': 50000,
            'duration_days': 30,
            'daily_stream_limit': None,
            'max_playlists': 100,
            'description': 'Silver premium plan'
        },
        {
            'name': 'Gold',
            'tier': 'GOLD',
            'price': 120000,
            'duration_days': 30,
            'daily_stream_limit': None,
            'max_playlists': None,
            'description': 'Gold VIP plan'
        }
    ]
    
    for plan_data in plans:
        # Use update_or_create to avoid errors if the plans already exist
        SubscriptionPlan.objects.update_or_create(
            tier=plan_data['tier'],
            defaults=plan_data
        )

def reverse_seed_plans(apps, schema_editor):
    SubscriptionPlan = apps.get_model('subscriptions', 'SubscriptionPlan')
    SubscriptionPlan.objects.filter(tier__in=['BASIC', 'SILVER', 'GOLD']).delete()

class Migration(migrations.Migration):

    dependencies = [
        ('subscriptions', '0005_transaction_months'),
    ]

    operations = [
        migrations.RunPython(seed_plans, reverse_seed_plans),
    ]
