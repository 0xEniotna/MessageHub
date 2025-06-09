# Gunicorn configuration file for production deployment

import multiprocessing
import os

# Server socket
bind = "127.0.0.1:8000"  # Bind to localhost since nginx will proxy
backlog = 2048

# Worker processes - FIXED: Use single worker to avoid Telethon session conflicts
workers = 1  # Changed from multiprocessing.cpu_count() * 2 + 1
max_requests = 1000
max_requests_jitter = 50
preload_app = True
timeout = 180
keepalive = 2

# Logging
accesslog = "logs/gunicorn_access.log"
errorlog = "logs/gunicorn_error.log"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'telegram_bot_backend'

# Server mechanics
daemon = False
pidfile = 'logs/gunicorn.pid'
user = None
group = None
tmp_upload_dir = None

# Worker connections
worker_connections = 1000
worker_class = 'sync'

# SSL (handled by nginx, so disabled here)
keyfile = None
certfile = None

# Application
module = 'wsgi:application' 