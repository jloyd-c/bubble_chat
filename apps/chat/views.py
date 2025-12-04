from django.shortcuts import render
from .models import Room

# Create your views here.
ROOM_THEMES = {
    "ccs": "css/ccs_design.css",
    "cn": "css/cn_design.css",
    "ce": "css/c_design.css",
    "ccje": "css/ccje_design.css",
    "cbaa": "css/cbaa_design.css",
}

def chat_room(request, room_name):
    # room_name must not be empty
    if not room_name:
        room_name = "ccs"  # default room

    room_obj, created = Room.objects.get_or_create(name=room_name)

    # Optional: pick a theme based on room_name
    theme_css = ROOM_THEMES.get(room_name.lower(), "css/base.css")
    
    return render(request, 'chat/chat.html', {
        "room_name": room_name,
        "theme_css": theme_css,
    })


def dashboard_view(request):
    return render(request, "dashboard.html")