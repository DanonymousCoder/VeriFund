from django.urls import path
from member_service.views.member_views import MemberProfileView

urlpatterns = [
    path("me/", MemberProfileView.as_view(), name="member-profile"),
]
