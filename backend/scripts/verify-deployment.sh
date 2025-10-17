#!/bin/bash
# =============================================================================
# Verify Deployment Script
# Verifies all instances are running and healthy
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_MODE="${DEPLOYMENT_MODE:-docker}"
TIMEOUT="${TIMEOUT:-10}"

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Deployment Verification${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "  ℹ $1"
}

# =============================================================================
# Instance Detection
# =============================================================================

detect_instances() {
    print_section "Detecting Instances"

    case "$DEPLOYMENT_MODE" in
        docker)
            WEBSOCKET_INSTANCES=$(docker ps --filter "name=botcripto-websocket-" --format "{{.Names}}" | sort)
            BOT_INSTANCES=$(docker ps --filter "name=botcripto-bot-" --format "{{.Names}}" | sort)
            ;;
        pm2)
            WEBSOCKET_INSTANCES=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name | startswith("websocket-")) | .name' | sort)
            BOT_INSTANCES=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.name | startswith("bot-")) | .name' | sort)
            ;;
        systemd)
            WEBSOCKET_INSTANCES=$(systemctl list-units --type=service --all | grep "botcripto-websocket-" | awk '{print $1}' | sed 's/.service//' | sort)
            BOT_INSTANCES=$(systemctl list-units --type=service --all | grep "botcripto-bot-" | awk '{print $1}' | sed 's/.service//' | sort)
            ;;
        *)
            print_error "Unknown deployment mode: $DEPLOYMENT_MODE"
            exit 1
            ;;
    esac

    local ws_count=$(echo "$WEBSOCKET_INSTANCES" | grep -c . || true)
    local bot_count=$(echo "$BOT_INSTANCES" | grep -c . || true)

    print_info "WebSocket instances: $ws_count"
    print_info "Bot instances: $bot_count"

    if [ $ws_count -eq 0 ] && [ $bot_count -eq 0 ]; then
        print_error "No instances found"
        exit 1
    fi
}

# =============================================================================
# Health Checks
# =============================================================================

check_instance_health() {
    local instance_name=$1
    local port=$2

    local health_url="http://localhost:$port/health"
    local response=$(curl -s -w "\n%{http_code}" --connect-timeout "$TIMEOUT" "$health_url" 2>/dev/null || echo -e "\n000")
    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)

    if [ "$status" = "200" ]; then
        # Parse health response
        local redis_status=$(echo "$body" | jq -r '.redis.connected // "unknown"' 2>/dev/null || echo "unknown")
        local db_status=$(echo "$body" | jq -r '.database.connected // "unknown"' 2>/dev/null || echo "unknown")

        print_success "$instance_name is healthy"
        print_info "Redis: $redis_status | Database: $db_status"
        return 0
    elif [ "$status" = "000" ]; then
        print_error "$instance_name is unreachable (connection timeout)"
        return 1
    else
        print_error "$instance_name returned HTTP $status"
        return 1
    fi
}

check_websocket_instances() {
    if [ -z "$WEBSOCKET_INSTANCES" ]; then
        return 0
    fi

    print_section "WebSocket Instances Health"

    local port=8080
    while IFS= read -r instance; do
        [ -z "$instance" ] && continue
        check_instance_health "$instance" "$port" || true
        ((port++))
    done <<< "$WEBSOCKET_INSTANCES"
}

check_bot_instances() {
    if [ -z "$BOT_INSTANCES" ]; then
        return 0
    fi

    print_section "Bot Instances Health"

    local port=8081
    while IFS= read -r instance; do
        [ -z "$instance" ] && continue
        check_instance_health "$instance" "$port" || true
        ((port++))
    done <<< "$BOT_INSTANCES"
}

# =============================================================================
# Infrastructure Checks
# =============================================================================

check_redis() {
    print_section "Redis Connection"

    if ! command -v redis-cli &> /dev/null; then
        print_warning "redis-cli not installed, skipping Redis check"
        return 0
    fi

    local redis_host="${REDIS_HOST:-localhost}"
    local redis_port="${REDIS_PORT:-6379}"

    if redis-cli -h "$redis_host" -p "$redis_port" ping &> /dev/null; then
        print_success "Redis is available"

        # Check Redis memory
        local memory_used=$(redis-cli -h "$redis_host" -p "$redis_port" INFO MEMORY 2>/dev/null | grep "used_memory_human:" | cut -d: -f2 | tr -d '\r')
        if [ -n "$memory_used" ]; then
            print_info "Memory used: $memory_used"
        fi

        # Check connected clients
        local connected_clients=$(redis-cli -h "$redis_host" -p "$redis_port" INFO CLIENTS 2>/dev/null | grep "connected_clients:" | cut -d: -f2 | tr -d '\r')
        if [ -n "$connected_clients" ]; then
            print_info "Connected clients: $connected_clients"
        fi

        return 0
    else
        print_error "Cannot connect to Redis"
        return 1
    fi
}

check_postgres() {
    print_section "PostgreSQL Connection"

    if ! command -v psql &> /dev/null; then
        print_warning "psql not installed, skipping PostgreSQL check"
        return 0
    fi

    local pg_host="${POSTGRES_HOST:-localhost}"
    local pg_port="${POSTGRES_PORT:-5432}"
    local pg_user="${POSTGRES_USER:-postgres}"
    local pg_db="${POSTGRES_DB:-botcripto}"

    export PGPASSWORD="$POSTGRES_PASSWORD"
    if psql -h "$pg_host" -p "$pg_port" -U "$pg_user" -d "$pg_db" -c "SELECT 1;" &> /dev/null; then
        print_success "PostgreSQL is available"

        # Check active connections
        local connections=$(psql -h "$pg_host" -p "$pg_port" -U "$pg_user" -d "$pg_db" -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='$pg_db';" 2>/dev/null | tr -d ' ')
        if [ -n "$connections" ]; then
            print_info "Active connections: $connections"
        fi

        return 0
    else
        print_error "Cannot connect to PostgreSQL"
        return 1
    fi
    unset PGPASSWORD
}

# =============================================================================
# Metrics Checks
# =============================================================================

check_prometheus() {
    print_section "Prometheus Metrics"

    local prometheus_port="${PROMETHEUS_PORT:-9093}"
    local prometheus_url="http://localhost:$prometheus_port"

    if curl -s --connect-timeout 5 "$prometheus_url" > /dev/null 2>&1; then
        print_success "Prometheus is available"
        print_info "URL: $prometheus_url"
        return 0
    else
        print_warning "Prometheus not accessible (may not be deployed)"
        return 0
    fi
}

check_grafana() {
    print_section "Grafana Dashboard"

    local grafana_port="${GRAFANA_PORT:-3003}"
    local grafana_url="http://localhost:$grafana_port"

    if curl -s --connect-timeout 5 "$grafana_url" > /dev/null 2>&1; then
        print_success "Grafana is available"
        print_info "URL: $grafana_url"
        return 0
    else
        print_warning "Grafana not accessible (may not be deployed)"
        return 0
    fi
}

# =============================================================================
# Resource Usage
# =============================================================================

check_resource_usage() {
    print_section "Resource Usage"

    case "$DEPLOYMENT_MODE" in
        docker)
            check_docker_resources
            ;;
        pm2)
            check_pm2_resources
            ;;
        systemd)
            check_systemd_resources
            ;;
    esac
}

check_docker_resources() {
    if ! command -v docker &> /dev/null; then
        print_warning "Docker not available"
        return 0
    fi

    # Get stats for all botcripto containers
    local stats=$(docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $(docker ps -q --filter name=botcripto-) 2>/dev/null)

    if [ -n "$stats" ]; then
        echo "$stats" | while IFS= read -r line; do
            print_info "$line"
        done
    else
        print_warning "No resource stats available"
    fi
}

check_pm2_resources() {
    if ! command -v pm2 &> /dev/null; then
        print_warning "PM2 not available"
        return 0
    fi

    pm2 list 2>/dev/null | grep -E "websocket-|bot-" | while IFS= read -r line; do
        print_info "$line"
    done
}

check_systemd_resources() {
    systemctl status botcripto-* --no-pager 2>/dev/null | grep -E "Active:|Memory:|CPU:" | while IFS= read -r line; do
        print_info "$line"
    done
}

# =============================================================================
# Connectivity Tests
# =============================================================================

test_api_endpoints() {
    print_section "API Endpoint Tests"

    # Test WebSocket instance API
    local ws_port=3000
    if curl -s --connect-timeout 5 "http://localhost:$ws_port" > /dev/null 2>&1; then
        print_success "WebSocket API responding on port $ws_port"
    else
        print_error "WebSocket API not responding on port $ws_port"
    fi

    # Test first bot instance API
    local bot_port=3001
    if curl -s --connect-timeout 5 "http://localhost:$bot_port" > /dev/null 2>&1; then
        print_success "Bot API responding on port $bot_port"
    else
        print_warning "Bot API not responding on port $bot_port (may be expected)"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header

    echo -e "${BLUE}Configuration:${NC}"
    echo "  Deployment Mode: $DEPLOYMENT_MODE"
    echo "  Health Check Timeout: ${TIMEOUT}s"
    echo ""

    # Detect instances
    detect_instances

    # Run health checks
    check_websocket_instances || true
    check_bot_instances || true

    # Check infrastructure
    check_redis || true
    check_postgres || true

    # Check monitoring
    check_prometheus || true
    check_grafana || true

    # Check resources
    check_resource_usage || true

    # Test endpoints
    test_api_endpoints || true

    # Print summary
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Verification Summary${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${GREEN}Passed:${NC}   $CHECKS_PASSED"
    echo -e "${RED}Failed:${NC}   $CHECKS_FAILED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo ""

    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ Deployment verification passed${NC}"

        if [ $WARNINGS -gt 0 ]; then
            echo -e "${YELLOW}⚠ Review warnings above${NC}"
        fi

        echo ""
        exit 0
    else
        echo -e "${RED}✗ Deployment verification failed${NC}"
        echo -e "${RED}  $CHECKS_FAILED critical check(s) failed${NC}"
        echo ""
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            DEPLOYMENT_MODE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --mode MODE          Deployment mode (docker, pm2, systemd)"
            echo "  --timeout SECONDS    Health check timeout (default: 10)"
            echo "  --help               Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  DEPLOYMENT_MODE      docker, pm2, or systemd (default: docker)"
            echo "  REDIS_HOST           Redis host (default: localhost)"
            echo "  REDIS_PORT           Redis port (default: 6379)"
            echo "  POSTGRES_HOST        PostgreSQL host (default: localhost)"
            echo "  POSTGRES_PORT        PostgreSQL port (default: 5432)"
            echo "  POSTGRES_USER        PostgreSQL user (default: postgres)"
            echo "  POSTGRES_DB          PostgreSQL database (default: botcripto)"
            echo "  PROMETHEUS_PORT      Prometheus port (default: 9093)"
            echo "  GRAFANA_PORT         Grafana port (default: 3003)"
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
