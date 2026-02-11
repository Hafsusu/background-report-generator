from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    OrderViewSet,
    ReportJobViewSet,
    ReportJobStatusView,
    OrderReportsView
)

router = DefaultRouter()
router.register(r'orders', OrderViewSet)
router.register(r'report-jobs', ReportJobViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('report-jobs/<int:pk>/status/', ReportJobStatusView.as_view(), name='report-job-status'),
    path('orders/<int:order_id>/reports/', OrderReportsView.as_view(), name='order-reports'),
    path('report-jobs/<int:pk>/download/', 
         ReportJobViewSet.as_view({'get': 'download'}), 
         name='report-job-download'),
]