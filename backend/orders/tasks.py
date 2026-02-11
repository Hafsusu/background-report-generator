import csv
import os
from datetime import datetime
from celery import shared_task
from django.conf import settings
from django.db import transaction
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from .models import ReportJob


def generate_csv_report(report_job, order, items):
    reports_dir = os.path.join(settings.BASE_DIR, 'reports', 'csv')
    os.makedirs(reports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    file_name = f'order_{order.id}_report_{timestamp}.csv'
    file_path = os.path.join(reports_dir, file_name)
    
    with open(file_path, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file)
        writer.writerow(['Order Report'])
        writer.writerow(['Order ID:', order.id])
        writer.writerow(['Order Name:', order.name])
        writer.writerow(['Created:', order.created_at.strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([''])
        
        writer.writerow(['Product', 'Quantity', 'Unit Price', 'Total Price'])
        
        total_order_value = 0
        for item in items:
            item_total = item.quantity * item.price
            total_order_value += item_total
            writer.writerow([
                item.product_name,
                item.quantity,
                f"ETB {item.price:.2f}",
                f"ETB {item_total:.2f}"
            ])
        
        writer.writerow([''])
        writer.writerow(['Total Order Value:', '', '', f"ETB {total_order_value:.2f}"])
    
    return file_path, file_name


def generate_pdf_report(report_job, order, items):
    reports_dir = os.path.join(settings.BASE_DIR, 'reports', 'pdf')
    os.makedirs(reports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    file_name = f'order_{order.id}_report_{timestamp}.pdf'
    file_path = os.path.join(reports_dir, file_name)
    
    doc = SimpleDocTemplate(file_path, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=30,
        textColor=colors.HexColor('#1ee600')
    )
    
    elements.append(Paragraph("Order Report", title_style))
    elements.append(Spacer(1, 0.2*inch))
    
    order_info_data = [
        ['Order ID:', str(order.id)],
        ['Order Name:', order.name],
        ['Created:', order.created_at.strftime('%Y-%m-%d %H:%M:%S')],
        ['Report Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')]
    ]
    
    order_info_table = Table(order_info_data, colWidths=[2*inch, 4*inch])
    order_info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0fdf4')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#023400')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(order_info_table)
    elements.append(Spacer(1, 0.3*inch))
    
    items_data = [['Product', 'Quantity', 'Unit Price', 'Total Price']]
    total_order_value = 0
    
    for item in items:
        item_total = item.quantity * item.price
        total_order_value += item_total
        items_data.append([
            item.product_name,
            str(item.quantity),
            f"ETB {item.price:.2f}",
            f"ETB {item_total:.2f}"
        ])
    
    items_data.append(['', '', 'Total:', f"ETB {total_order_value:.2f}"])
    
    items_table = Table(items_data, colWidths=[3*inch, 1*inch, 1.5*inch, 1.5*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1ee600')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 1), (-1, -2), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -2), 10),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f0fdf4')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#023400')),
        ('GRID', (0, 0), (-1, -2), 1, colors.grey),
        ('GRID', (0, -1), (-1, -1), 1, colors.black),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(items_table)
    
    doc.build(elements)
    return file_path, file_name


@shared_task(bind=True)
def generate_order_report(self, report_job_id):
    try:
        with transaction.atomic():
            report_job = ReportJob.objects.select_for_update().get(id=report_job_id)
            report_job.status = 'PROCESSING'
            report_job.save()

            order = report_job.order
            items = order.items.all()

            if report_job.format == 'PDF':
                file_path, file_name = generate_pdf_report(report_job, order, items)
            else:
                file_path, file_name = generate_csv_report(report_job, order, items)

            report_job.status = 'COMPLETED'
            report_job.file_path = file_path
            report_job.file_name = file_name
            report_job.completed_at = datetime.now()
            report_job.save()

    except Exception as e:
        ReportJob.objects.filter(id=report_job_id).update(
            status='FAILED',
            completed_at=datetime.now()
        )
        raise e