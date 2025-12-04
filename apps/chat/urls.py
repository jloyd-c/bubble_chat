from django.urls import path
from . import views

urlpatterns = [
    path("<str:room_name>/", views.chat_room, name="chat_room"),
    path("dashboard/", views.dashboard_view, name="dashboard"),
]
