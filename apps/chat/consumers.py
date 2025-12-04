import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import Room, Message
from django.utils import timezone
from datetime import timedelta

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"{self.room_name}_chat"

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # ✅ DELETE ALL MESSAGES OLDER THAN 10 MINUTES (FROM ALL ROOMS)
        time_limit = timezone.now() - timedelta(minutes=10)
        
        deleted_count = await sync_to_async(
            Message.objects.filter(created_at__lt=time_limit).delete
        )()
        
        if deleted_count[0] > 0:
            print(f"🧹 User opened site - deleted {deleted_count[0]} old messages")

        # ✅ LOAD RECENT MESSAGES FOR THIS ROOM
        room = await sync_to_async(Room.objects.get)(name=self.room_name)
        messages = await sync_to_async(list)(
            Message.objects.filter(room=room, created_at__gte=time_limit)
                .order_by("created_at")  # Oldest first (changed from "-created_at")
        )

        for msg in messages:
            await self.send(text_data=json.dumps({
                "message": msg.message,
                "sender": msg.username,
                "timestamp": msg.created_at.isoformat(),  # ADDED
                "message_id": msg.id  # ADDED
            }))
            
    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']

        # ✅ Anonymous nickname support
        sender = data.get("sender", "Anonymous")

        # ✅ Save to DB
        room = await sync_to_async(Room.objects.get)(name=self.room_name)
        message_obj = await sync_to_async(Message.objects.create)(
            room=room,
            username=sender,
            message=message
        )

        # ✅ Broadcast to group WITH TIMESTAMP
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender': sender,
                'timestamp': message_obj.created_at.isoformat(),  # ADDED
                'message_id': message_obj.id  # ADDED
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender': event['sender'],
            'timestamp': event.get('timestamp', timezone.now().isoformat()),  # ADDED
            'message_id': event.get('message_id')  # ADDED
        }))