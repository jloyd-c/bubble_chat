# consumers.py - Clean version
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from .models import Room, Message
from django.utils import timezone
from datetime import timedelta


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for chat functionality"""
    
    async def connect(self):
        """Handle new WebSocket connection"""
        await self.setup_connection()
        await self.cleanup_old_messages()
        await self.send_message_history()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            await self.process_message(data)
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
        except Exception as e:
            print(f"Error processing message: {e}")
    
    async def chat_message(self, event):
        """Send chat message to WebSocket"""
        await self.send_message_to_client(event)
    
    # ================= HELPER METHODS =================
    
    async def setup_connection(self):
        """Setup WebSocket connection and room group"""
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f"chat_{self.room_name}"
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
    
    async def cleanup_old_messages(self):
        """Delete messages older than 10 minutes"""
        try:
            time_limit = timezone.now() - timedelta(minutes=10)
            deleted_count = await sync_to_async(
                Message.objects.filter(created_at__lt=time_limit).delete
            )()
            
            if deleted_count[0] > 0:
                print(f"🧹 Cleaned up {deleted_count[0]} old messages")
                
        except Exception as e:
            print(f"Cleanup error: {e}")
    
    async def send_message_history(self):
        """Send recent message history to client"""
        try:
            room = await sync_to_async(Room.objects.get)(name=self.room_name)
            time_limit = timezone.now() - timedelta(minutes=10)
            
            messages = await sync_to_async(list)(
                Message.objects.filter(room=room, created_at__gte=time_limit)
                    .order_by("created_at")
            )
            
            for msg in messages:
                await self.send_message_to_client({
                    "message": msg.message,
                    "sender": msg.username,
                    "timestamp": msg.created_at.isoformat(),
                    "message_id": msg.id,
                    "type": "message"
                })
                
        except Exception as e:
            print(f"Error loading message history: {e}")
    
    async def process_message(self, data):
        """Process incoming message from client"""
        message_text = data.get('message', '').strip()
        if not message_text:
            return
        
        sender = data.get('sender', 'Anonymous').strip()
        
        # Save to database
        message_obj = await self.save_message_to_db(message_text, sender)
        
        # Broadcast to room
        await self.broadcast_message(message_text, sender, message_obj)
    
    async def save_message_to_db(self, message_text, sender):
        """Save message to database"""
        room = await sync_to_async(Room.objects.get)(name=self.room_name)
        
        message_obj = await sync_to_async(Message.objects.create)(
            room=room,
            username=sender,
            message=message_text
        )
        
        return message_obj
    
    async def broadcast_message(self, message_text, sender, message_obj):
        """Broadcast message to room group"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message_text,
                'sender': sender,
                'timestamp': message_obj.created_at.isoformat(),
                'message_id': message_obj.id
            }
        )
    
    async def send_message_to_client(self, data):
        """Send formatted message to WebSocket client"""
        message_data = {
            'type': 'message',
            'message': data.get('message', ''),
            'sender': data.get('sender', 'Anonymous'),
            'timestamp': data.get('timestamp'),
            'message_id': data.get('message_id')
        }
        
        await self.send(text_data=json.dumps(message_data))