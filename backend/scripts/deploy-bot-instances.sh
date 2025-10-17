#!/bin/bash
# =============================================================================
# Deploy Bot Instances
# Deploys multiple bot instances for distributed trading execution
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTANCE_COUNT="${1:-1}"
START_PORT="${START_PORT:-3001}"
START_HEALTH_PORT="${START_HEALTH_PORT:-8081}"
START_METRICS_PORT="${START_METRICS_PORT:-9091}"
LOG_DIR="${LOG_DIR:-./logs}"
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-docker}"  # docker, pm2, or systemd
BOT_MAX_CONCURRENT="${BOT_MAX_CONCURRENT:-50}"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Deploy Bot Instances${NC}"
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

validate_instance_count() {
    if ! [[ "$INSTANCE_COUNT" =~ ^[0-9]+$ ]]; then
        print_error "Invalid instance count: $INSTANCE_COUNT"
        print_info "Must be a positive integer"
        return 1
    fi

    if [ "$INSTANCE_COUNT" -lt 1 ]; then
        print_error "Instance count must be at least 1"
        return 1
    fi

    if [ "$INSTANCE_COUNT" -gt 10 ]; then
        print_warning "Deploying $INSTANCE_COUNT instances (recommended max: 10)"
        read -p "Continue? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi

    print_success "Deploying $INSTANCE_COUNT bot instance(s)"
    return 0
}

# =============================================================================
# Deployment Functions
# =============================================================================

deploy_bot_with_docker() {
    local instance_num=$1
    local instance_id="bot-$(printf "%02d" $instance_num)"
    local port=$((START_PORT + instance_num - 1))
    local health_port=$((START_HEALTH_PORT + instance_num - 1))
    local metrics_port=$((START_METRICS_PORT + instance_num - 1))

    print_info "Deploying $instance_id..."

    # Check if container exists
    if docker ps -a --format '{{.Names}}' | grep -q "^botcripto-$instance_id$"; then
        docker stop "botcripto-$instance_id" || true
        docker rm "botcripto-$instance_id" || true
    fi

    # Start container
    docker run -d \
        --name "botcripto-$instance_id" \
        --network botcripto-network \
        -p "$port:3001" \
        -p "$health_port:8081" \
        -p "$metrics_port:9091" \
        -v "$(pwd)/$LOG_DIR:/app/logs" \
        -e NODE_ENV="$NODE_ENV" \
        -e INSTANCE_TYPE=bot \
        -e INSTANCE_ID="$instance_id" \
        -e PORT=3001 \
        -e DATABASE_URL="$DATABASE_URL" \
        -e REDIS_HOST="$REDIS_HOST" \
        -e REDIS_PORT="$REDIS_PORT" \
        -e REDIS_PASSWORD="${REDIS_PASSWORD:-}" \
        -e REDIS_ENABLE_PUBSUB=true \
        -e REDIS_KEY_PREFIX="${REDIS_KEY_PREFIX:-ws:}" \
        -e BOT_ENABLE=true \
        -e BOT_MAX_CONCURRENT="$BOT_MAX_CONCURRENT" \
        -e METRICS_ENABLE=true \
        -e HEALTH_CHECK_ENABLE=true \
        -e HEALTH_CHECK_PORT=8081 \
        -e METRICS_PORT=9091 \
        -e LOG_LEVEL="${LOG_LEVEL:-info}" \
        --restart unless-stopped \
        "${DOCKER_IMAGE:-botcripto-backend:latest}" \
        > /dev/null

    print_success "$instance_id deployed (port: $port, health: $health_port, metrics: $metrics_port)"
}

deploy_bot_with_pm2() {
    local instance_num=$1
    local instance_id="bot-$(printf "%02d" $instance_num)"
    local port=$((START_PORT + instance_num - 1))
    local health_port=$((START_HEALTH_PORT + instance_num - 1))
    local metrics_port=$((START_METRICS_PORT + instance_num - 1))

    print_info "Deploying $instance_id..."

    # Stop existing instance
    if pm2 describe "$instance_id" &> /dev/null; then
        pm2 stop "$instance_id" > /dev/null
        pm2 delete "$instance_id" > /dev/null
    fi

    # Start new instance
    NODE_ENV="$NODE_ENV" \
    INSTANCE_TYPE=bot \
    INSTANCE_ID="$instance_id" \
    PORT="$port" \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_HOST="$REDIS_HOST" \
    REDIS_PORT="$REDIS_PORT" \
    REDIS_PASSWORD="${REDIS_PASSWORD:-}" \
    REDIS_ENABLE_PUBSUB=true \
    REDIS_KEY_PREFIX="${REDIS_KEY_PREFIX:-ws:}" \
    BOT_ENABLE=true \
    BOT_MAX_CONCURRENT="$BOT_MAX_CONCURRENT" \
    METRICS_ENABLE=true \
    HEALTH_CHECK_ENABLE=true \
    HEALTH_CHECK_PORT="$health_port" \
    METRICS_PORT="$metrics_port" \
    LOG_LEVEL="${LOG_LEVEL:-info}" \
    pm2 start src/index.ts \
        --name "$instance_id" \
        --interpreter bun \
        --log "$LOG_DIR/$instance_id.log" \
        --error "$LOG_DIR/$instance_id-error.log" \
        --time \
        > /dev/null

    print_success "$instance_id deployed (port: $port, health: $health_port, metrics: $metrics_port)"
}

deploy_bot_with_systemd() {
    local instance_num=$1
    local instance_id="bot-$(printf "%02d" $instance_num)"
    local port=$((START_PORT + instance_num - 1))
    local health_port=$((START_HEALTH_PORT + instance_num - 1))
    local metrics_port=$((START_METRICS_PORT + instance_num - 1))

    print_info "Deploying $instance_id..."

    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        print_error "systemd deployment requires root privileges"
        return 1
    fi

    # Create systemd service file
    SERVICE_FILE="/etc/systemd/system/botcripto-$instance_id.service"

    cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=BotCripto Bot Instance ($instance_id)
After=network.target redis.service postgresql.service botcripto-websocket-01.service

[Service]
Type=simple
User=${DEPLOY_USER:-$(whoami)}
WorkingDirectory=$(pwd)
Environment="NODE_ENV=$NODE_ENV"
Environment="INSTANCE_TYPE=bot"
Environment="INSTANCE_ID=$instance_id"
Environment="PORT=$port"
Environment="DATABASE_URL=$DATABASE_URL"
Environment="REDIS_HOST=$REDIS_HOST"
Environment="REDIS_PORT=$REDIS_PORT"
Environment="REDIS_PASSWORD=${REDIS_PASSWORD:-}"
Environment="REDIS_ENABLE_PUBSUB=true"
Environment="REDIS_KEY_PREFIX=${REDIS_KEY_PREFIX:-ws:}"
Environment="BOT_ENABLE=true"
Environment="BOT_MAX_CONCURRENT=$BOT_MAX_CONCURRENT"
Environment="METRICS_ENABLE=true"
Environment="HEALTH_CHECK_ENABLE=true"
Environment="HEALTH_CHECK_PORT=$health_port"
Environment="METRICS_PORT=$metrics_port"
Environment="LOG_LEVEL=${LOG_LEVEL:-info}"
ExecStart=$(which bun) run src/index.ts
Restart=always
RestartSec=10
StandardOutput=append:$LOG_DIR/$instance_id.log
StandardError=append:$LOG_DIR/$instance_id-error.log

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload > /dev/null
    systemctl start "botcripto-$instance_id" > /dev/null
    systemctl enable "botcripto-$instance_id" > /dev/null

    print_success "$instance_id deployed (port: $port, health: $health_port, metrics: $metrics_port)"
}

# =============================================================================
# Health Check
# =============================================================================

wait_for_instance_health() {
    local instance_id=$1
    local health_port=$2
    local max_attempts=30
    local attempt=0
    local health_url="http://localhost:$health_port/health"

    while [ $attempt -lt $max_attempts ]; do
        ((attempt++))

        if curl -f -s "$health_url" > /dev/null 2>&1; then
            return 0
        fi

        sleep 2
    done

    return 1
}

wait_for_all_healthy() {
    print_step "Waiting for all instances to be healthy"

    local failed_instances=()

    for ((i=1; i<=INSTANCE_COUNT; i++)); do
        local instance_id="bot-$(printf "%02d" $i)"
        local health_port=$((START_HEALTH_PORT + i - 1))

        echo -n "  Checking $instance_id..."

        if wait_for_instance_health "$instance_id" "$health_port"; then
            echo -e " ${GREEN}✓${NC}"
        else
            echo -e " ${RED}✗${NC}"
            failed_instances+=("$instance_id")
        fi
    done

    if [ ${#failed_instances[@]} -eq 0 ]; then
        print_success "All instances healthy"
        return 0
    else
        print_error "${#failed_instances[@]} instance(s) failed health check:"
        for instance in "${failed_instances[@]}"; do
            print_error "  - $instance"
        done
        return 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header

    echo -e "${BLUE}Configuration:${NC}"
    echo "  Instance Count: $INSTANCE_COUNT"
    echo "  Deployment Mode: $DEPLOYMENT_MODE"
    echo "  Starting Port: $START_PORT"
    echo "  Starting Health Port: $START_HEALTH_PORT"
    echo "  Starting Metrics Port: $START_METRICS_PORT"
    echo "  Max Concurrent Bots: $BOT_MAX_CONCURRENT"
    echo "  Log Directory: $LOG_DIR"
    echo ""

    # Validation
    validate_env || exit 1
    validate_instance_count || exit 1

    # Create log directory
    mkdir -p "$LOG_DIR"

    # Deploy instances
    print_step "Deploying $INSTANCE_COUNT bot instance(s)"

    local failed=0
    for ((i=1; i<=INSTANCE_COUNT; i++)); do
        case "$DEPLOYMENT_MODE" in
            docker)
                deploy_bot_with_docker $i || ((failed++))
                ;;
            pm2)
                deploy_bot_with_pm2 $i || ((failed++))
                ;;
            systemd)
                deploy_bot_with_systemd $i || ((failed++))
                ;;
            *)
                print_error "Unknown deployment mode: $DEPLOYMENT_MODE"
                exit 1
                ;;
        esac
    done

    if [ $failed -gt 0 ]; then
        print_error "$failed instance(s) failed to deploy"
        exit 1
    fi

    # Save PM2 configuration if using PM2
    if [ "$DEPLOYMENT_MODE" = "pm2" ]; then
        print_info "Saving PM2 configuration..."
        pm2 save > /dev/null
    fi

    # Wait for health checks
    wait_for_all_healthy || exit 1

    # Print summary
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Deployment Summary${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${GREEN}✓ $INSTANCE_COUNT bot instance(s) deployed successfully${NC}"
    echo ""

    for ((i=1; i<=INSTANCE_COUNT; i++)); do
        local instance_id="bot-$(printf "%02d" $i)"
        local port=$((START_PORT + i - 1))
        local health_port=$((START_HEALTH_PORT + i - 1))
        local metrics_port=$((START_METRICS_PORT + i - 1))

        echo "  $instance_id:"
        echo "    API: http://localhost:$port"
        echo "    Health: http://localhost:$health_port/health"
        echo "    Metrics: http://localhost:$metrics_port/metrics"
        echo ""
    done

    case "$DEPLOYMENT_MODE" in
        docker)
            echo "  View all logs: docker logs -f botcripto-bot-01"
            echo "  Stop all: docker stop \$(docker ps -q --filter name=botcripto-bot-)"
            ;;
        pm2)
            echo "  View all logs: pm2 logs"
            echo "  Stop all: pm2 stop all"
            ;;
        systemd)
            echo "  View logs: journalctl -u botcripto-bot-* -f"
            echo "  Stop all: sudo systemctl stop botcripto-bot-*"
            ;;
    esac

    echo ""
}

# Parse command line arguments
shift || true  # Remove instance count argument

while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            DEPLOYMENT_MODE="$2"
            shift 2
            ;;
        --start-port)
            START_PORT="$2"
            shift 2
            ;;
        --max-concurrent)
            BOT_MAX_CONCURRENT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 <instance-count> [options]"
            echo ""
            echo "Arguments:"
            echo "  instance-count       Number of bot instances to deploy (required)"
            echo ""
            echo "Options:"
            echo "  --mode MODE          Deployment mode (docker, pm2, systemd)"
            echo "  --start-port PORT    Starting API port (default: 3001)"
            echo "  --max-concurrent N   Max concurrent bots per instance (default: 50)"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 3                 Deploy 3 bot instances with Docker"
            echo "  $0 5 --mode pm2      Deploy 5 bot instances with PM2"
            echo "  $0 2 --start-port 4000  Deploy 2 instances starting at port 4000"
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
