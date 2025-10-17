#!/bin/bash
# =============================================================================
# Deploy WebSocket Instance
# Deploys the WebSocket manager instance for exchange connections
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTANCE_ID="${INSTANCE_ID:-websocket-01}"
PORT="${PORT:-3000}"
HEALTH_PORT="${HEALTH_PORT:-8080}"
METRICS_PORT="${METRICS_PORT:-9090}"
LOG_DIR="${LOG_DIR:-./logs}"
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-docker}"  # docker, pm2, or systemd

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Deploy WebSocket Instance${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "  ℹ $1"
}

# =============================================================================
# Validation
# =============================================================================

validate_env() {
    print_step "Validating environment"

    local required_vars=(
        "NODE_ENV"
        "DATABASE_URL"
        "REDIS_HOST"
        "REDIS_PORT"
    )

    local missing=0
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "$var is not set"
            ((missing++))
        fi
    done

    if [ $missing -eq 0 ]; then
        print_success "Environment validated"
        return 0
    else
        print_error "$missing required environment variable(s) missing"
        return 1
    fi
}

check_port_availability() {
    print_step "Checking port availability"

    local ports=("$PORT" "$HEALTH_PORT" "$METRICS_PORT")
    local ports_in_use=0

    for port in "${ports[@]}"; do
        if lsof -i ":$port" &> /dev/null; then
            print_warning "Port $port is already in use"
            ((ports_in_use++))
        fi
    done

    if [ $ports_in_use -gt 0 ]; then
        print_warning "$ports_in_use port(s) in use - will stop existing instance"
    else
        print_success "All ports available"
    fi

    return 0
}

# =============================================================================
# Deployment Methods
# =============================================================================

deploy_with_docker() {
    print_step "Deploying with Docker"

    # Check if container exists
    if docker ps -a --format '{{.Names}}' | grep -q "^botcripto-$INSTANCE_ID$"; then
        print_info "Stopping existing container..."
        docker stop "botcripto-$INSTANCE_ID" || true
        docker rm "botcripto-$INSTANCE_ID" || true
        print_success "Existing container removed"
    fi

    # Create log directory
    mkdir -p "$LOG_DIR"

    # Start new container
    print_info "Starting WebSocket instance container..."

    docker run -d \
        --name "botcripto-$INSTANCE_ID" \
        --network botcripto-network \
        -p "$PORT:3000" \
        -p "$HEALTH_PORT:8080" \
        -p "$METRICS_PORT:9090" \
        -v "$(pwd)/$LOG_DIR:/app/logs" \
        -e NODE_ENV="$NODE_ENV" \
        -e INSTANCE_TYPE=websocket \
        -e INSTANCE_ID="$INSTANCE_ID" \
        -e PORT=3000 \
        -e DATABASE_URL="$DATABASE_URL" \
        -e REDIS_HOST="$REDIS_HOST" \
        -e REDIS_PORT="$REDIS_PORT" \
        -e REDIS_PASSWORD="${REDIS_PASSWORD:-}" \
        -e REDIS_ENABLE_PUBSUB=true \
        -e REDIS_KEY_PREFIX="${REDIS_KEY_PREFIX:-ws:}" \
        -e WS_ENABLE_MANAGER=true \
        -e WS_BINANCE_ENABLE="${WS_BINANCE_ENABLE:-true}" \
        -e WS_COINBASE_ENABLE="${WS_COINBASE_ENABLE:-true}" \
        -e BINANCE_API_KEY="${BINANCE_API_KEY:-}" \
        -e BINANCE_SECRET_KEY="${BINANCE_SECRET_KEY:-}" \
        -e COINBASE_API_KEY="${COINBASE_API_KEY:-}" \
        -e COINBASE_SECRET_KEY="${COINBASE_SECRET_KEY:-}" \
        -e METRICS_ENABLE=true \
        -e HEALTH_CHECK_ENABLE=true \
        -e LOG_LEVEL="${LOG_LEVEL:-info}" \
        --restart unless-stopped \
        "${DOCKER_IMAGE:-botcripto-backend:latest}"

    print_success "Container started: botcripto-$INSTANCE_ID"
    print_info "API Port: $PORT"
    print_info "Health Port: $HEALTH_PORT"
    print_info "Metrics Port: $METRICS_PORT"
}

deploy_with_pm2() {
    print_step "Deploying with PM2"

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_error "PM2 is not installed"
        print_info "Install with: npm install -g pm2"
        return 1
    fi

    # Stop existing instance
    if pm2 describe "$INSTANCE_ID" &> /dev/null; then
        print_info "Stopping existing instance..."
        pm2 stop "$INSTANCE_ID"
        pm2 delete "$INSTANCE_ID"
        print_success "Existing instance stopped"
    fi

    # Create log directory
    mkdir -p "$LOG_DIR"

    # Start new instance
    print_info "Starting WebSocket instance with PM2..."

    NODE_ENV="$NODE_ENV" \
    INSTANCE_TYPE=websocket \
    INSTANCE_ID="$INSTANCE_ID" \
    PORT="$PORT" \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_HOST="$REDIS_HOST" \
    REDIS_PORT="$REDIS_PORT" \
    REDIS_PASSWORD="${REDIS_PASSWORD:-}" \
    REDIS_ENABLE_PUBSUB=true \
    REDIS_KEY_PREFIX="${REDIS_KEY_PREFIX:-ws:}" \
    WS_ENABLE_MANAGER=true \
    WS_BINANCE_ENABLE="${WS_BINANCE_ENABLE:-true}" \
    WS_COINBASE_ENABLE="${WS_COINBASE_ENABLE:-true}" \
    BINANCE_API_KEY="${BINANCE_API_KEY:-}" \
    BINANCE_SECRET_KEY="${BINANCE_SECRET_KEY:-}" \
    COINBASE_API_KEY="${COINBASE_API_KEY:-}" \
    COINBASE_SECRET_KEY="${COINBASE_SECRET_KEY:-}" \
    METRICS_ENABLE=true \
    HEALTH_CHECK_ENABLE=true \
    LOG_LEVEL="${LOG_LEVEL:-info}" \
    pm2 start src/index.ts \
        --name "$INSTANCE_ID" \
        --interpreter bun \
        --log "$LOG_DIR/$INSTANCE_ID.log" \
        --error "$LOG_DIR/$INSTANCE_ID-error.log" \
        --time

    # Save PM2 configuration
    pm2 save

    print_success "PM2 instance started: $INSTANCE_ID"
    print_info "View logs: pm2 logs $INSTANCE_ID"
}

deploy_with_systemd() {
    print_step "Deploying with systemd"

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "systemd deployment requires root privileges"
        print_info "Run with sudo or as root"
        return 1
    fi

    # Create systemd service file
    SERVICE_FILE="/etc/systemd/system/botcripto-$INSTANCE_ID.service"

    print_info "Creating systemd service..."

    cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=BotCripto WebSocket Instance ($INSTANCE_ID)
After=network.target redis.service postgresql.service

[Service]
Type=simple
User=${DEPLOY_USER:-$(whoami)}
WorkingDirectory=$(pwd)
Environment="NODE_ENV=$NODE_ENV"
Environment="INSTANCE_TYPE=websocket"
Environment="INSTANCE_ID=$INSTANCE_ID"
Environment="PORT=$PORT"
Environment="DATABASE_URL=$DATABASE_URL"
Environment="REDIS_HOST=$REDIS_HOST"
Environment="REDIS_PORT=$REDIS_PORT"
Environment="REDIS_PASSWORD=${REDIS_PASSWORD:-}"
Environment="REDIS_ENABLE_PUBSUB=true"
Environment="REDIS_KEY_PREFIX=${REDIS_KEY_PREFIX:-ws:}"
Environment="WS_ENABLE_MANAGER=true"
Environment="WS_BINANCE_ENABLE=${WS_BINANCE_ENABLE:-true}"
Environment="WS_COINBASE_ENABLE=${WS_COINBASE_ENABLE:-true}"
Environment="BINANCE_API_KEY=${BINANCE_API_KEY:-}"
Environment="BINANCE_SECRET_KEY=${BINANCE_SECRET_KEY:-}"
Environment="COINBASE_API_KEY=${COINBASE_API_KEY:-}"
Environment="COINBASE_SECRET_KEY=${COINBASE_SECRET_KEY:-}"
Environment="METRICS_ENABLE=true"
Environment="HEALTH_CHECK_ENABLE=true"
Environment="LOG_LEVEL=${LOG_LEVEL:-info}"
ExecStart=$(which bun) run src/index.ts
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/$INSTANCE_ID.log
StandardError=append:$LOG_DIR/$INSTANCE_ID-error.log

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd and start service
    print_info "Reloading systemd daemon..."
    systemctl daemon-reload

    print_info "Starting service..."
    systemctl start "botcripto-$INSTANCE_ID"

    print_info "Enabling service on boot..."
    systemctl enable "botcripto-$INSTANCE_ID"

    print_success "systemd service started: botcripto-$INSTANCE_ID"
    print_info "View logs: journalctl -u botcripto-$INSTANCE_ID -f"
}

# =============================================================================
# Health Check
# =============================================================================

wait_for_health() {
    print_step "Waiting for instance to be healthy"

    local max_attempts=30
    local attempt=0
    local health_url="http://localhost:$HEALTH_PORT/health"

    print_info "Health check URL: $health_url"

    while [ $attempt -lt $max_attempts ]; do
        ((attempt++))

        if curl -f -s "$health_url" > /dev/null 2>&1; then
            print_success "Instance is healthy (attempt $attempt/$max_attempts)"
            return 0
        fi

        echo -n "."
        sleep 2
    done

    echo ""
    print_error "Instance failed to become healthy after $max_attempts attempts"
    return 1
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header

    echo -e "${BLUE}Configuration:${NC}"
    echo "  Instance ID: $INSTANCE_ID"
    echo "  Deployment Mode: $DEPLOYMENT_MODE"
    echo "  API Port: $PORT"
    echo "  Health Port: $HEALTH_PORT"
    echo "  Metrics Port: $METRICS_PORT"
    echo "  Log Directory: $LOG_DIR"
    echo ""

    # Validation
    validate_env || exit 1
    check_port_availability || exit 1

    # Deploy based on mode
    case "$DEPLOYMENT_MODE" in
        docker)
            deploy_with_docker || exit 1
            ;;
        pm2)
            deploy_with_pm2 || exit 1
            ;;
        systemd)
            deploy_with_systemd || exit 1
            ;;
        *)
            print_error "Unknown deployment mode: $DEPLOYMENT_MODE"
            print_info "Valid modes: docker, pm2, systemd"
            exit 1
            ;;
    esac

    # Wait for health check
    wait_for_health || exit 1

    # Print summary
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Deployment Summary${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${GREEN}✓ WebSocket instance deployed successfully${NC}"
    echo ""
    echo "  Instance ID: $INSTANCE_ID"
    echo "  API: http://localhost:$PORT"
    echo "  Health: http://localhost:$HEALTH_PORT/health"
    echo "  Metrics: http://localhost:$METRICS_PORT/metrics"
    echo ""

    case "$DEPLOYMENT_MODE" in
        docker)
            echo "  View logs: docker logs -f botcripto-$INSTANCE_ID"
            echo "  Stop: docker stop botcripto-$INSTANCE_ID"
            ;;
        pm2)
            echo "  View logs: pm2 logs $INSTANCE_ID"
            echo "  Stop: pm2 stop $INSTANCE_ID"
            ;;
        systemd)
            echo "  View logs: journalctl -u botcripto-$INSTANCE_ID -f"
            echo "  Stop: sudo systemctl stop botcripto-$INSTANCE_ID"
            ;;
    esac

    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            DEPLOYMENT_MODE="$2"
            shift 2
            ;;
        --instance-id)
            INSTANCE_ID="$2"
            shift 2
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --mode MODE          Deployment mode (docker, pm2, systemd)"
            echo "  --instance-id ID     Instance ID (default: websocket-01)"
            echo "  --port PORT          API port (default: 3000)"
            echo "  --help               Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  NODE_ENV             Node environment (required)"
            echo "  DATABASE_URL         Database connection URL (required)"
            echo "  REDIS_HOST           Redis host (required)"
            echo "  REDIS_PORT           Redis port (required)"
            echo "  DEPLOYMENT_MODE      docker, pm2, or systemd (default: docker)"
            echo "  PORT                 API port (default: 3000)"
            echo "  HEALTH_PORT          Health check port (default: 8080)"
            echo "  METRICS_PORT         Metrics port (default: 9090)"
            echo "  LOG_DIR              Log directory (default: ./logs)"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Run '$0 --help' for usage information"
            exit 1
            ;;
    esac
done

main "$@"
