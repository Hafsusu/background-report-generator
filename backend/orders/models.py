from django.db import models
from django.core.validators import MinValueValidator


class Order(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def total_value(self):
        return sum(item.total_price() for item in self.items.all())


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, related_name='items', on_delete=models.CASCADE
    )
    product_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    price = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0.01)]
    )

    def __str__(self):
        return f"{self.product_name} ({self.order.name})"

    def total_price(self):
        return self.quantity * self.price


class ReportJob(models.Model):
    FORMAT_CHOICES = (
        ('CSV', 'CSV'),
        ('PDF', 'PDF'),
    )
    
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='report_jobs')
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default='PENDING'
    )
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='CSV')
    file_path = models.CharField(max_length=500, blank=True, null=True)
    file_name = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"ReportJob {self.id} - {self.status} - {self.format}"