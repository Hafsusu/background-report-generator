from rest_framework import serializers
from .models import Order, OrderItem, ReportJob
from django.core.validators import MinValueValidator


class OrderItemSerializer(serializers.ModelSerializer):
    total_price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'quantity', 'price', 'total_price']

    def validate_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Price must be greater than 0.")
        return value


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    report_jobs_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'name', 'created_at', 'updated_at', 'items', 'total_value', 'report_jobs_count']

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("At least one order item is required.")
        
        for item in value:
            product_name = item.get('product_name', '').strip()
            if not product_name:
                raise serializers.ValidationError("Product name is required for all items.")
            
            quantity = item.get('quantity', 0)
            if quantity <= 0:
                raise serializers.ValidationError("Quantity must be positive for each item.")
            
            price = item.get('price', 0)
            if price <= 0:
                raise serializers.ValidationError("Price must be greater than 0 for each item.")
        
        return value

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        for item in items_data:
            OrderItem.objects.create(order=order, **item)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        instance.name = validated_data.get('name', instance.name)
        instance.save()
        
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                OrderItem.objects.create(order=instance, **item)
        
        return instance


class ReportJobSerializer(serializers.ModelSerializer):
    order_name = serializers.CharField(source='order.name', read_only=True)
    order_total = serializers.DecimalField(source='order.total_value', max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = ReportJob
        fields = ['id', 'order', 'order_name', 'order_total', 'status', 'format', 
                  'file_path', 'file_name', 'created_at', 'completed_at']
        read_only_fields = ['status', 'file_path', 'file_name', 'created_at', 'completed_at']

    def validate(self, data):
        order = data.get('order')
        format_choice = data.get('format', 'CSV')
        
        pending_reports = ReportJob.objects.filter(
            order=order, 
            status__in=['PENDING', 'PROCESSING'],
            format=format_choice
        ).exists()
        
        if pending_reports:
            raise serializers.ValidationError(
                f"A {format_choice} report is already being generated for this order. "
                f"Please wait for it to complete or generate a different format."
            )
        
        return data