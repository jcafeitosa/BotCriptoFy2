#!/bin/bash
# =============================================================================
# Pre-Deployment Checks Script
# Validates environment before deployment
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-botcripto}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
MIN_MEMORY_GB=2
MIN_DISK_GB=10

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Pre-Deployment Checks${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
}

print_check() {
    echo -e "${BLUE}[CHECK]${NC} $1"
}

print_success() {
    echo -e "${GREEN}  ✓${NC} $1"
    ((CHECKS_PASSED++))
}

print_error() {
    echo -e "${RED}  ✗${NC} $1"
    ((CHECKS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}  ⚠${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "  ℹ $1"
}

# =============================================================================
# Check Functions
# =============================================================================

check_node_env() {
    print_check "Node Environment"

    if [ -z "$NODE_ENV" ]; then
        print_error "NODE_ENV is not set"
        print_info "Set NODE_ENV=production for production deployment"
        return 1
    fi

    if [ "$NODE_ENV" != "production" ] && [ "$NODE_ENV" != "staging" ]; then
        print_warning "NODE_ENV is '$NODE_ENV' (expected 'production' or 'staging')"
    fi

    print_success "NODE_ENV: $NODE_ENV"
    return 0
}

check_bun() {
    print_check "Bun Runtime"

    if ! command -v bun &> /dev/null; then
        print_error "Bun is not installed"
        print_info "Install from https://bun.sh"
        return 1
    fi

    BUN_VERSION=$(bun --version)
    print_success "Bun installed: v$BUN_VERSION"
    return 0
}

check_redis() {
    print_check "Redis Connection"

    if ! command -v redis-cli &> /dev/null; then
        print_warning "redis-cli not installed, skipping connection test"
        return 0
    fi

    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping &> /dev/null; then
        print_success "Redis available at $REDIS_HOST:$REDIS_PORT"

        # Check Redis version
        REDIS_VERSION=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO SERVER | grep "redis_version" | cut -d: -f2 | tr -d '\r')
        print_info "Redis version: $REDIS_VERSION"
        return 0
    else
        print_error "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
        print_info "Ensure Redis is running and accessible"
        return 1
    fi
}

check_postgres() {
    print_check "PostgreSQL Connection"

    if ! command -v psql &> /dev/null; then
        print_warning "psql not installed, skipping database connection test"
        return 0
    fi

    export PGPASSWORD="$POSTGRES_PASSWORD"
    if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &> /dev/null; then
        print_success "PostgreSQL available at $POSTGRES_HOST:$POSTGRES_PORT"

        # Check PostgreSQL version
        PG_VERSION=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT version();" 2>/dev/null | head -n1)
        print_info "PostgreSQL: $(echo $PG_VERSION | cut -d',' -f1)"

        # Check TimescaleDB extension
        TS_INSTALLED=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname='timescaledb';" 2>/dev/null | tr -d ' ')
        if [ "$TS_INSTALLED" = "1" ]; then
            TS_VERSION=$(psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT extversion FROM pg_extension WHERE extname='timescaledb';" 2>/dev/null | tr -d ' ')
            print_info "TimescaleDB extension: v$TS_VERSION"
        else
            print_warning "TimescaleDB extension not installed"
        fi

        return 0
    else
        print_error "Cannot connect to PostgreSQL at $POSTGRES_HOST:$POSTGRES_PORT"
        print_info "Ensure PostgreSQL is running and credentials are correct"
        return 1
    fi
    unset PGPASSWORD
}

check_memory() {
    print_check "System Memory"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        TOTAL_MEMORY_GB=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024)}')
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        TOTAL_MEMORY_GB=$(free -g | awk '/^Mem:/{print $2}')
    else
        print_warning "Cannot detect memory on this OS"
        return 0
    fi

    if [ "$TOTAL_MEMORY_GB" -lt "$MIN_MEMORY_GB" ]; then
        print_error "Insufficient memory: ${TOTAL_MEMORY_GB}GB (minimum ${MIN_MEMORY_GB}GB)"
        return 1
    fi

    print_success "Memory: ${TOTAL_MEMORY_GB}GB available"
    return 0
}

check_disk_space() {
    print_check "Disk Space"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        AVAILABLE_GB=$(df -g . | awk 'NR==2 {print $4}')
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        AVAILABLE_GB=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')
    else
        print_warning "Cannot detect disk space on this OS"
        return 0
    fi

    if [ "$AVAILABLE_GB" -lt "$MIN_DISK_GB" ]; then
        print_error "Insufficient disk space: ${AVAILABLE_GB}GB (minimum ${MIN_DISK_GB}GB)"
        return 1
    fi

    print_success "Disk space: ${AVAILABLE_GB}GB available"
    return 0
}

check_env_vars() {
    print_check "Required Environment Variables"

    local required_vars=(
        "DATABASE_URL"
        "REDIS_HOST"
    )

    local missing=0
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "$var is not set"
            ((missing++))
        fi
    done

    if [ $missing -eq 0 ]; then
        print_success "All required environment variables are set"
        return 0
    else
        print_error "$missing required environment variable(s) missing"
        return 1
    fi
}

check_ports() {
    print_check "Port Availability"

    local ports=(3000 8080 9090)
    local ports_in_use=0

    for port in "${ports[@]}"; do
        if lsof -i ":$port" &> /dev/null; then
            print_warning "Port $port is already in use"
            ((ports_in_use++))
        fi
    done

    if [ $ports_in_use -eq 0 ]; then
        print_success "All required ports are available"
        return 0
    else
        print_warning "$ports_in_use port(s) already in use (may need to stop existing instances)"
        return 0
    fi
}

check_dependencies() {
    print_check "Project Dependencies"

    if [ ! -d "node_modules" ]; then
        print_error "node_modules directory not found"
        print_info "Run 'bun install' to install dependencies"
        return 1
    fi

    if [ ! -f "bun.lockb" ]; then
        print_warning "bun.lockb not found (lock file missing)"
    fi

    print_success "Dependencies installed"
    return 0
}

check_git_status() {
    print_check "Git Repository Status"

    if ! command -v git &> /dev/null; then
        print_warning "Git not installed, skipping repository checks"
        return 0
    fi

    if ! git rev-parse --git-dir &> /dev/null; then
        print_warning "Not a git repository"
        return 0
    fi

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_warning "Repository has uncommitted changes"
    fi

    # Get current branch and commit
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    COMMIT=$(git rev-parse --short HEAD)

    print_success "Branch: $BRANCH (commit: $COMMIT)"
    return 0
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header

    # Run all checks
    check_node_env || true
    check_bun || true
    check_redis || true
    check_postgres || true
    check_memory || true
    check_disk_space || true
    check_env_vars || true
    check_ports || true
    check_dependencies || true
    check_git_status || true

    # Print summary
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Summary${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${GREEN}Passed:${NC}   $CHECKS_PASSED"
    echo -e "${RED}Failed:${NC}   $CHECKS_FAILED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo ""

    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✓ All critical checks passed${NC}"

        if [ $WARNINGS -gt 0 ]; then
            echo -e "${YELLOW}⚠ Review warnings before deployment${NC}"
        fi

        echo ""
        exit 0
    else
        echo -e "${RED}✗ $CHECKS_FAILED critical check(s) failed${NC}"
        echo -e "${RED}  Fix issues before proceeding with deployment${NC}"
        echo ""
        exit 1
    fi
}

main "$@"
