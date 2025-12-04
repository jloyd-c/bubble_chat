from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.chat.models import Message

class Command(BaseCommand):
    help = "Delete messages older than 10 minutes (Manual backup)"

    def handle(self, *args, **kwargs):
        limit = timezone.now() - timedelta(minutes=10)
        
        # Count before cleanup
        total_messages = Message.objects.count()
        old_messages = Message.objects.filter(created_at__lt=limit).count()
        
        # Delete old messages
        deleted_count = Message.objects.filter(created_at__lt=limit).delete()
        
        # Show statistics
        self.stdout.write(f"📊 Database Statistics:")
        self.stdout.write(f"   Total messages in DB: {total_messages}")
        self.stdout.write(f"   Messages older than 10min: {old_messages}")
        self.stdout.write(f"   Recent messages: {total_messages - old_messages}")
        
        if deleted_count[0] > 0:
            self.stdout.write(f"✅ Deleted {deleted_count[0]} old messages.")
        else:
            self.stdout.write("✅ No old messages to delete.")
        
        # Warning if database is getting large
        if total_messages > 500:
            self.stdout.write(
                self.style.WARNING("⚠️  Database has more than 500 messages!")
            )
            self.stdout.write(
                self.style.WARNING("   Consider having users visit more often")
            )