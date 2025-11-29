"""
URL configuration for Bubble_chat project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from apps.chat import views as chat_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # Unified chat routes (keep your old URLs)
    path("ccs/", chat_views.chat_room, {"room_name": "ccs"}, name="ccs_chat"),
    path("cn/", chat_views.chat_room, {"room_name": "cn"}, name="cn_chat"),
    path("educ/", chat_views.chat_room, {"room_name": "educ"}, name="educ_chat"),
    path("cbaa/", chat_views.chat_room, {"room_name": "cbaa"}, name="cbaa_chat"),
    path("crim/", chat_views.chat_room, {"room_name": "crim"}, name="crim_chat"),

]
