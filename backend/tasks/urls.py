from django.urls import path

from .views import LoginView, MeView, RegisterView, TaskDetailView, TaskListCreateView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path("tasks/", TaskListCreateView.as_view(), name="task_list_create"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task_detail"),
]
