Background Report Generator for Business Orders

Overview

This system allows users to:
Create business orders with multiple items
Generate a downloadable CSV report of completed orders
Process report generation asynchronously using Celery
Poll report status from the frontend
Download the generated report file(csv/pdf)
The key architectural requirement was that report generation must not block the API request.

Architecture Overview

Core Stack
Backend: Django + Django REST Framework
Frontend: React (Vite)
Background Tasks: Celery
Broker: Redis
Storage: Local filesystem (reports directory respective csv and pdf directories for file types)

┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   React     │  │   Mobile    │  │    API      │           │
│  │   Frontend  │  │    App      │  │   Clients   │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API LAYER                             │
│              Django REST Framework - Port 8000               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │   Orders    │  │   Reports   │  │   Auth      │           │
│  │  Endpoints  │  │  Endpoints  │  │  Endpoints  │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKGROUND TASK LAYER                    │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│  │   Redis     │◄────│   Celery    │────►│   Celery    │      │
│  │   Broker    │     │   Beat      │     │   Workers   │      │
│  └─────────────┘     └─────────────┘     └─────────────┘      │
│                                                │              │
│                                                ▼              │
│                                      ┌─────────────────┐      │
│                                      │  Report Tasks   │      │
│                                      │  CSV | PDF      │      │
│                                      └─────────────────┘      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     │
│  │  Database   │     │   File      │     │    Redis    │     │
│  │ (PostgreSQL)│     │   Storage   │     │   Cache     │     │
│  └─────────────┘     └─────────────┘     └─────────────┘     │
└─────────────────────────────────────────────────────────────────┘

System Flow

High-Level Flow
React → Create Order
React → Request Report Generation
Django API → Create ReportJob record
Django API → Enqueue Celery task
Celery Worker → Generate CSV or PDF file
Worker → Save file to disk
Worker → Update ReportJob status
React → Poll report status
React → Download file when status = COMPLETED

┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│         │     │         │     │         │     │         │     │         │
│ Client  │────▶│ Django  │────▶│ Redis   │────▶│ Celery  │────▶│ File    │
│ (React) │◀────│   API   │◀────│ Broker  │◀────│ Worker  │────▶│ Storage │
│         │     │         │     │         │     │         │     │         │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
     │               │               │               │               │
     │               │               │               │               │
     ▼               ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                           SEQUENCE FLOW                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Client                  API                  Redis                Worker               Storage
  │                     │                     │                     │                     │
  │ POST /report-jobs   │                     │                     │                     │
  ├────────────────────>│                     │                     │                     │
  │                     │                     │                     │                     │
  │                     │ Save ReportJob      │                     │                     │
  │                     ├────────────────────>│                     │                     │
  │                     │                     │                     │                     │
  │                     │ Return 201 Created  │                     │                     │
  │<────────────────────┤                     │                     │                     │
  │                     │                     │                     │                     │
  │                     │ generate_report.delay()                   │                     │
  │                     ├──────────────────────────────────────────>│                     │
  │                     │                     │                     │                     │
  │                     │                     │   Task Queued       │                     │
  │                     │                     │<────────────────────┤                     │
  │                     │                     │                     │                     │
  │ GET /jobs/{id}/     │                     │                     │                     │
  ├────────────────────────────────────────────────────────────────>│                     │
  │                     │                     │                     │                     │
  │ Status: PENDING     │                     │                     │                     │
  │<────────────────────────────────────────────────────────────────┤                     │
  │                     │                     │                     │                     │
  │                     │                     │   Worker picks task │                     │
  │                     │                     │ ───────────────────>│                     │
  │                     │                     │                     │                     │
  │                     │                     │   Generate Report   │                     │
  │                     │                     │ ───────────────────>│                     │
  │                     │                     │                     │                     │
  │                     │                     │                     │ Write File          │
  │                     │                     │                     ├────────────────────>│
  │                     │                     │                     │                     │
  │                     │                     │                     │ File Saved          │
  │                     │                     │                     │<────────────────────┤
  │                     │                     │                     │                     │
  │                     │                     │ Update Job Status   │                     │
  │                     │                     │<────────────────────┤                     │
  │                     │                     │ Status=COMPLETED    │                     │
  │                     │                     │                     │                     │
  │ GET /jobs/{id}/download                   │                     │                     │
  ├────────────────────────────────────────────────────────────────>│                     │
  │                     │                     │                     │                     │
  │ File Response       │                     │                     │                     │
  │<────────────────────────────────────────────────────────────────┤                     │
  │                     │                     │                     │                     │

Background Task Configuration
1. Celery Setup
Celery is configured in the Django project as follows:

celery.py
Configures Celery app
Loads Django settings
Auto-discovers tasks from installed apps

__init__.py

from .celery import app as celery_app
__all__ = ('celery_app',)

2. Redis as Broker
Celery uses Redis to:
Store queued tasks
Pass tasks to workers
Track execution state

In settings.py:

CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'

3. Report Generation Task

The report task:
Accepts report_job_id
Updates status → PROCESSING 
Generates CSV / PDF file
Saves file to disk
Updates status → COMPLETED
Handles exceptions → sets status → FAILED

This ensures:
API response is immediate
Heavy file generation runs in background

4. Running Celery Worker
   
celery -A config worker --loglevel=info
Redis must be running before starting the worker.

Asynchronous Approach (Used Here)

With Celery:
API immediately responds
Heavy processing runs in worker
System remains responsive
Scales horizontally by adding workers

Setup Instructions
1. Clone Repository
git clone <repo-url>
cd backend

2. Create Virtual Environment
python -m venv venv
source venv/bin/activate  for Mac/Linux
venv\Scripts\activate  for  Windows

3. Install Dependencies
pip install -r requirements.txt

4. Install and Start Redis

redis-server

5. Run Migrations
python manage.py migrate

6. Start Django Server
python manage.py runserver

7. Start Celery Worker (Separate Terminal)
celery -A config worker --loglevel=info

Running the Full System
Start Redis
Start Django
Start Celery worker
Start React frontend:

npm install
npm run dev

Frontend runs at:
http://localhost:5173

Backend runs at:
http://localhost:8000

Edge Cases Handled

Missing order ID → 400

Non-existent order → 404

Validation errors for order items

Report failure handling

Safe status polling

CORS properly configured
