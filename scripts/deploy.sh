#!/bin/bash

# Telegram Bot VPS Deployment Script
# Usage: ./scripts/deploy.sh [--update]

set -e  # Exit on any error

# Configuration
APP_DIR="/opt/telegram-bot"
COMPOSE_FILE="docker-compose.vps.yml"
DOCKERFILE="Dockerfile.vps"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1${NC}"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        warn "Running as root. Consider using a non-root user with sudo privileges."
    fi
}

# Check if required files exist
check_requirements() {
    log "Checking requirements..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    if [ ! -f "$DOCKERFILE" ]; then
        error "Dockerfile not found: $DOCKERFILE"
        exit 1
    fi
    
    if [ ! -f "config/config.env.prod" ]; then
        error "Production config file not found: config/config.env.prod"
        error "Please create the configuration file first."
        exit 1
    fi
    
    log "Requirements check passed ✓"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    
    mkdir -p sessions
    mkdir -p data
    mkdir -p logs
    mkdir -p backups
    mkdir -p config
    
    log "Directories created ✓"
}

# Check if this is an update or fresh deployment
is_update() {
    if [ "$1" = "--update" ] || docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        return 0
    else
        return 1
    fi
}

# Stop existing services
stop_services() {
    log "Stopping existing services..."
    
    if docker-compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
        docker-compose -f "$COMPOSE_FILE" down
        log "Services stopped ✓"
    else
        info "No running services found"
    fi
}

# Build and start services
start_services() {
    log "Building and starting services..."
    
    # Pull latest images
    docker-compose -f "$COMPOSE_FILE" pull postgres || warn "Could not pull postgres image"
    
    # Build and start
    docker-compose -f "$COMPOSE_FILE" up -d --build
    
    log "Services started ✓"
}

# Wait for services to be healthy
wait_for_services() {
    log "Waiting for services to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f "$COMPOSE_FILE" ps | grep -q "healthy\|Up"; then
            log "Services are healthy ✓"
            return 0
        fi
        
        info "Attempt $attempt/$max_attempts - Waiting for services..."
        sleep 10
        ((attempt++))
    done
    
    error "Services failed to become healthy within timeout"
    docker-compose -f "$COMPOSE_FILE" logs
    exit 1
}

# Test API endpoint
test_api() {
    log "Testing API endpoint..."
    
    local max_attempts=10
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:8000/api/health > /dev/null; then
            log "API is responding ✓"
            return 0
        fi
        
        info "Attempt $attempt/$max_attempts - Waiting for API..."
        sleep 5
        ((attempt++))
    done
    
    error "API failed to respond within timeout"
    return 1
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo "===================="
    
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    echo "API Health Check:"
    curl -s http://localhost:8000/api/health | python3 -m json.tool || echo "API not responding"
    
    echo ""
    echo "System Resources:"
    df -h /
    free -h
    
    echo "===================="
}

# Setup backup cron job
setup_backup() {
    log "Setting up backup cron job..."
    
    # Make backup script executable
    chmod +x scripts/backup.sh
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "backup.sh"; then
        info "Backup cron job already exists"
    else
        # Add backup cron job (daily at 2 AM)
        (crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/scripts/backup.sh >> $APP_DIR/logs/backup.log 2>&1") | crontab -
        log "Backup cron job added ✓"
    fi
}

# Main deployment function
main() {
    log "Starting Telegram Bot VPS Deployment..."
    
    check_permissions
    check_requirements
    create_directories
    
    if is_update "$1"; then
        log "Performing update deployment..."
        stop_services
    else
        log "Performing fresh deployment..."
    fi
    
    start_services
    wait_for_services
    
    if test_api; then
        log "✅ Deployment completed successfully!"
        show_status
        setup_backup
        
        echo ""
        log "🚀 Your Telegram Bot is now running!"
        log "📊 API Health: http://localhost:8000/api/health"
        log "📝 Logs: docker-compose -f $COMPOSE_FILE logs -f"
        log "🔄 Update: ./scripts/deploy.sh --update"
        log "💾 Backup: ./scripts/backup.sh"
        
    else
        error "❌ Deployment failed - API is not responding"
        error "Check logs: docker-compose -f $COMPOSE_FILE logs"
        exit 1
    fi
}

# Handle script arguments
case "$1" in
    --help|-h)
        echo "Usage: $0 [--update]"
        echo ""
        echo "Options:"
        echo "  --update    Update existing deployment"
        echo "  --help      Show this help message"
        exit 0
        ;;
    *)
        main "$1"
        ;;
esac 