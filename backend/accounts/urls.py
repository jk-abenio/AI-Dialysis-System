from django.urls import path
from .views import login_view
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("login/", login_view, name="login"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
]