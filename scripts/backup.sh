#!/bin/bash

# Telegram Bot Backup Script for VPS
# Run this script daily via cron: 0 2 * * * /opt/telegram-bot/scripts/backup.sh

set -e  # Exit on any error

# Configuration
BACKUP_DIR="/opt/telegram-bot/backups"
APP_DIR="/opt/telegram-bot"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

log "Starting backup process..."

# Check if Docker Compose is running
if ! docker-compose -f docker-compose.vps.yml ps | grep -q "Up"; then
    error "Docker containers are not running!"
    exit 1
fi

# Backup PostgreSQL database (if using PostgreSQL)
if docker-compose -f docker-compose.vps.yml ps postgres | grep -q "Up"; then
    log "Backing up PostgreSQL database..."
    
    if docker-compose -f docker-compose.vps.yml exec -T postgres pg_dump -U telegram_user telegram_sender > "$BACKUP_DIR/db_backup_$DATE.sql"; then
        log "Database backup completed: db_backup_$DATE.sql"
        
        # Compress database backup
        gzip "$BACKUP_DIR/db_backup_$DATE.sql"
        log "Database backup compressed: db_backup_$DATE.sql.gz"
    else
        error "Database backup failed!"
    fi
else
    warn "PostgreSQL container not running, skipping database backup"
fi

# Backup SQLite database (if exists)
if [ -f "$APP_DIR/data/telegram_sender.db" ]; then
    log "Backing up SQLite database..."
    cp "$APP_DIR/data/telegram_sender.db" "$BACKUP_DIR/sqlite_backup_$DATE.db"
    gzip "$BACKUP_DIR/sqlite_backup_$DATE.db"
    log "SQLite backup completed: sqlite_backup_$DATE.db.gz"
fi

# Backup sessions directory
if [ -d "$APP_DIR/sessions" ] && [ "$(ls -A $APP_DIR/sessions)" ]; then
    log "Backing up sessions directory..."
    tar -czf "$BACKUP_DIR/sessions_backup_$DATE.tar.gz" -C "$APP_DIR" sessions/
    log "Sessions backup completed: sessions_backup_$DATE.tar.gz"
else
    warn "Sessions directory is empty or doesn't exist"
fi

# Backup data directory
if [ -d "$APP_DIR/data" ] && [ "$(ls -A $APP_DIR/data)" ]; then
    log "Backing up data directory..."
    tar -czf "$BACKUP_DIR/data_backup_$DATE.tar.gz" -C "$APP_DIR" data/
    log "Data backup completed: data_backup_$DATE.tar.gz"
else
    warn "Data directory is empty or doesn't exist"
fi

# Backup configuration files
log "Backing up configuration files..."
tar -czf "$BACKUP_DIR/config_backup_$DATE.tar.gz" -C "$APP_DIR" config/ docker-compose.vps.yml Dockerfile.vps
log "Configuration backup completed: config_backup_$DATE.tar.gz"

# Clean up old backups (keep only last N days)
log "Cleaning up old backups (keeping last $RETENTION_DAYS days)..."

find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.db.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

# Show backup summary
log "Backup Summary:"
echo "===================="
ls -lh "$BACKUP_DIR"/*_$DATE.* 2>/dev/null || warn "No backup files created for this run"
echo "===================="

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Total backup directory size: $TOTAL_SIZE"

# Check disk space
DISK_USAGE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    warn "Disk usage is high: ${DISK_USAGE}%"
fi

log "Backup process completed successfully!"

# Optional: Send notification (uncomment and configure if needed)
# curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
#      -d "chat_id=<YOUR_CHAT_ID>" \
#      -d "text=✅ Telegram Bot backup completed successfully on $(hostname) at $(date)" 