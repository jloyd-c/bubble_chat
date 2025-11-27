from django.urls import path
from . import views

app_name = 'ccs'

urlpatterns = [
    path('', views.index, name='index'),
]