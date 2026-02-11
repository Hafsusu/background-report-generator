from django.shortcuts import get_object_or_404
from django.http import FileResponse
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
import os
from .models import Order, ReportJob
from .serializers import OrderSerializer, ReportJobSerializer
from .tasks import generate_order_report


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    queryset = Order.objects.all().prefetch_related('items', 'report_jobs')
    
    def get_queryset(self):
        queryset = super().get_queryset()
        from django.db.models import Count, Sum, F
        queryset = queryset.annotate(
            report_jobs_count=Count('report_jobs'),
            total_value=Sum(F('items__quantity') * F('items__price'))
        )
        return queryset
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'message': f'Order "{instance.name}" has been deleted successfully.',
            'deleted_id': instance.id
        }, status=status.HTTP_200_OK)


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    queryset = Order.objects.all().prefetch_related('items')
    
    def get_queryset(self):
        queryset = super().get_queryset()
        from django.db.models import Sum, F
        queryset = queryset.annotate(
            total_value=Sum(F('items__quantity') * F('items__price'))
        )
        return queryset


class ReportJobViewSet(viewsets.ModelViewSet):
    serializer_class = ReportJobSerializer
    queryset = ReportJob.objects.all()
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        report_job = serializer.save()
        generate_order_report.delay(report_job.id)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        report_job = self.get_object()
        
        if report_job.status != 'COMPLETED' or not report_job.file_path:
            return Response(
                {'error': 'Report is not ready for download.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if not os.path.exists(report_job.file_path):
            return Response(
                {'error': 'Report file not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        response = FileResponse(
            open(report_job.file_path, 'rb'),
            content_type='application/octet-stream'
        )
        response['Content-Disposition'] = f'attachment; filename="{report_job.file_name}"'
        return response
    
    @action(detail=False, methods=['get'])
    def list_by_order(self, request):
        order_id = request.query_params.get('order_id')
        if not order_id:
            return Response(
                {'error': 'order_id parameter is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order = get_object_or_404(Order, id=order_id)
        report_jobs = self.queryset.filter(order=order)
        serializer = self.get_serializer(report_jobs, many=True)
        return Response(serializer.data)


class ReportJobStatusView(generics.RetrieveAPIView):
    serializer_class = ReportJobSerializer
    queryset = ReportJob.objects.all()

    def get_object(self):
        obj = get_object_or_404(ReportJob, id=self.kwargs['pk'])
        return obj


class OrderReportsView(generics.ListAPIView):
    serializer_class = ReportJobSerializer
    
    def get_queryset(self):
        order_id = self.kwargs['order_id']
        order = get_object_or_404(Order, id=order_id)
        return ReportJob.objects.filter(order=order).order_by('-created_at')