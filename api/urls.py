from django.urls import path
from . import views

urlpatterns = [
    path('upload_audio/', views.UploadAudio, name='UploadAudio')
]
