from django.urls import re_path
from .consumers import CCSConsumer

websocket_urlpatterns = [
    re_path(r'ws/ccs/$', CCSConsumer.as_asgi()),
]
