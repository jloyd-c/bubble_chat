"""
ASGI config for Bubble_chat project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

"""
Bagong Import for handling real-time chat with WebSockets
"""
import apps.chat.routing
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter


os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Bubble_chat.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),  # Django HTTP handling
    "websocket": AuthMiddlewareStack(
        URLRouter(
            # WebSocket routes
            apps.chat.routing.websocket_urlpatterns
        )
    ),
})