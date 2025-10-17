#!/bin/bash
# =============================================================================
# Rollback Script
# Rolls back to a previous deployment version
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
ROLLBACK_VERSION="${1:-previous}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Rollback Deployment${NC}"
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

confirm_rollback() {
    echo -e "${YELLOW}⚠ WARNING: This will rollback the deployment${NC}"
    echo -e "${YELLOW}  Current instances will be stopped and replaced${NC}"
    echo ""
    read -p "Continue with rollback? (yes/NO) " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "Rollback cancelled"
        exit 0
    fi
}

# =============================================================================
# Version Management
# =============================================================================

get_current_version() {
    case "$DEPLOYMENT_MODE" in
        docker)
            # Get current Docker image tag
            CURRENT_VERSION=$(docker inspect --format='{{.Config.Image}}' botcripto-websocket-01 2>/dev/null | cut -d: -f2 || echo "unknown")
            ;;
        pm2|systemd)
            # Get current git commit
            if git rev-parse --git-dir &> /dev/null; then
                CURRENT_VERSION=$(git rev-parse --short HEAD)
            else
                CURRENT_VERSION="unknown"
            fi
            ;;
    esac

    print_info "Current version: $CURRENT_VERSION"
}

list_available_versions() {
    print_step "Available Versions"

    case "$DEPLOYMENT_MODE" in
        docker)
            # List Docker images
            print_info "Available Docker images:"
            docker images botcripto-backend --format "table {{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | head -n 10
            ;;
        pm2|systemd)
            # List git tags/commits
            if git rev-parse --git-dir &> /dev/null; then
                print_info "Recent git commits:"
                git log --oneline -n 10
            else
                print_warning "Not a git repository"
            fi
            ;;
    esac

    echo ""
}

get_rollback_version() {
    if [ "$ROLLBACK_VERSION" = "previous" ]; then
        case "$DEPLOYMENT_MODE" in
            docker)
                # Get previous Docker image
                ROLLBACK_VERSION=$(docker images botcripto-backend --format "{{.Tag}}" | sed -n '2p')
                if [ -z "$ROLLBACK_VERSION" ]; then
                    print_error "No previous Docker image found"
                    exit 1
                fi
                ;;
            pm2|systemd)
                # Get previous git commit
                if git rev-parse --git-dir &> /dev/null; then
                    ROLLBACK_VERSION=$(git rev-parse --short HEAD~1)
                else
                    print_error "Cannot determine previous version"
                    exit 1
                fi
                ;;
        esac
    fi

    print_info "Rollback version: $ROLLBACK_VERSION"
}

# =============================================================================
# Backup Current State
# =============================================================================

backup_current_state() {
    print_step "Backing up current state"

    mkdir -p "$BACKUP_DIR"

    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$BACKUP_DIR/deployment-$timestamp.tar.gz"

    # Backup relevant files
    print_info "Creating backup: $backup_file"

    case "$DEPLOYMENT_MODE" in
        docker)
            # Backup Docker container configs
            docker ps -a --filter name=botcripto- --format "{{.Names}}" > "$BACKUP_DIR/containers-$timestamp.txt"
            ;;
        pm2)
            # Backup PM2 configuration
            pm2 save --force
            cp -r ~/.pm2 "$BACKUP_DIR/pm2-$timestamp" 2>/dev/null || true
            ;;
        systemd)
            # Backup systemd service files
            mkdir -p "$BACKUP_DIR/systemd-$timestamp"
            cp /etc/systemd/system/botcripto-*.service "$BACKUP_DIR/systemd-$timestamp/" 2>/dev/null || true
            ;;
    esac

    # Backup environment and logs
    tar -czf "$backup_file" \
        --exclude=node_modules \
        --exclude=.git \
        .env* \
        logs/ \
        package.json \
        bun.lockb \
        2>/dev/null || true

    if [ -f "$backup_file" ]; then
        print_success "Backup created: $backup_file"
    else
        print_warning "Backup creation failed (non-critical)"
    fi
}

# =============================================================================
# Database Backup
# =============================================================================

backup_database() {
    print_step "Backing up database"

    if ! command -v pg_dump &> /dev/null; then
        print_warning "pg_dump not installed, skipping database backup"
        return 0
    fi

    local timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_file="$BACKUP_DIR/database-$timestamp.sql"

    local pg_host="${POSTGRES_HOST:-localhost}"
    local pg_port="${POSTGRES_PORT:-5432}"
    local pg_user="${POSTGRES_USER:-postgres}"
    local pg_db="${POSTGRES_DB:-botcripto}"

    print_info "Creating database backup: $backup_file"

    export PGPASSWORD="$POSTGRES_PASSWORD"
    if pg_dump -h "$pg_host" -p "$pg_port" -U "$pg_user" -d "$pg_db" > "$backup_file" 2>/dev/null; then
        print_success "Database backup created"
    else
        print_warning "Database backup failed (non-critical)"
    fi
    unset PGPASSWORD
}

# =============================================================================
# Rollback Execution
# =============================================================================

stop_all_instances() {
    print_step "Stopping all instances"

    case "$DEPLOYMENT_MODE" in
        docker)
            # Stop all Docker containers
            local containers=$(docker ps --filter name=botcripto- --format "{{.Names}}")
            if [ -n "$containers" ]; then
                echo "$containers" | while IFS= read -r container; do
                    print_info "Stopping $container..."
                    docker stop "$container" > /dev/null
                done
                print_success "All containers stopped"
            else
                print_warning "No running containers found"
            fi
            ;;
        pm2)
            # Stop all PM2 processes
            pm2 stop all > /dev/null 2>&1 || true
            print_success "All PM2 processes stopped"
            ;;
        systemd)
            # Stop all systemd services
            systemctl stop botcripto-* > /dev/null 2>&1 || true
            print_success "All systemd services stopped"
            ;;
    esac
}

rollback_docker() {
    print_step "Rolling back Docker deployment"

    local image="botcripto-backend:$ROLLBACK_VERSION"

    # Verify image exists
    if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^$image$"; then
        print_error "Docker image not found: $image"
        print_info "Available images:"
        docker images botcripto-backend --format "  {{.Tag}}"
        exit 1
    fi

    print_info "Using Docker image: $image"

    # Remove old containers
    print_info "Removing old containers..."
    docker ps -a --filter name=botcripto- --format "{{.Names}}" | while IFS= read -r container; do
        docker rm "$container" > /dev/null 2>&1 || true
    done

    # Deploy with docker-compose if available
    if [ -f "docker-compose.yml" ]; then
        print_info "Deploying with docker-compose..."
        DOCKER_IMAGE="$image" docker-compose up -d
        print_success "Deployment complete"
    else
        print_warning "docker-compose.yml not found"
        print_info "Use deploy-websocket-instance.sh and deploy-bot-instances.sh to redeploy"
    fi
}

rollback_git_based() {
    print_step "Rolling back to git commit $ROLLBACK_VERSION"

    if ! git rev-parse --git-dir &> /dev/null; then
        print_error "Not a git repository"
        exit 1
    fi

    # Verify commit exists
    if ! git cat-file -e "$ROLLBACK_VERSION^{commit}" 2>/dev/null; then
        print_error "Git commit not found: $ROLLBACK_VERSION"
        exit 1
    fi

    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_error "Repository has uncommitted changes"
        print_info "Commit or stash changes before rollback"
        exit 1
    fi

    # Checkout target version
    print_info "Checking out commit $ROLLBACK_VERSION..."
    git checkout "$ROLLBACK_VERSION"

    # Reinstall dependencies
    print_info "Reinstalling dependencies..."
    bun install --frozen-lockfile > /dev/null

    print_success "Code rolled back to $ROLLBACK_VERSION"
}

restart_all_instances() {
    print_step "Restarting all instances"

    case "$DEPLOYMENT_MODE" in
        docker)
            # Already restarted in rollback_docker
            print_success "Instances restarted via docker-compose"
            ;;
        pm2)
            pm2 restart all > /dev/null
            print_success "All PM2 processes restarted"
            ;;
        systemd)
            systemctl start botcripto-* > /dev/null
            print_success "All systemd services restarted"
            ;;
    esac
}

# =============================================================================
# Verification
# =============================================================================

verify_rollback() {
    print_step "Verifying rollback"

    # Wait for instances to start
    print_info "Waiting for instances to start..."
    sleep 10

    # Run deployment verification
    if [ -f "scripts/verify-deployment.sh" ]; then
        if bash scripts/verify-deployment.sh --mode "$DEPLOYMENT_MODE" > /dev/null 2>&1; then
            print_success "Rollback verification passed"
            return 0
        else
            print_error "Rollback verification failed"
            print_info "Check logs for details"
            return 1
        fi
    else
        print_warning "verify-deployment.sh not found, skipping verification"
        return 0
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    print_header

    echo -e "${BLUE}Configuration:${NC}"
    echo "  Deployment Mode: $DEPLOYMENT_MODE"
    echo "  Backup Directory: $BACKUP_DIR"
    echo ""

    # Get current version
    get_current_version

    # Show available versions
    list_available_versions

    # Determine rollback version
    get_rollback_version

    # Confirm rollback
    confirm_rollback

    # Create backups
    backup_current_state
    backup_database || true  # Non-critical

    # Stop all instances
    stop_all_instances

    # Execute rollback based on deployment mode
    case "$DEPLOYMENT_MODE" in
        docker)
            rollback_docker || exit 1
            ;;
        pm2|systemd)
            rollback_git_based || exit 1
            restart_all_instances || exit 1
            ;;
    esac

    # Verify rollback
    verify_rollback || print_warning "Verification failed - manual inspection recommended"

    # Print summary
    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Rollback Summary${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${GREEN}✓ Rollback completed${NC}"
    echo ""
    echo "  Previous version: $CURRENT_VERSION"
    echo "  Current version: $ROLLBACK_VERSION"
    echo ""
    echo "  Backups location: $BACKUP_DIR"
    echo ""

    case "$DEPLOYMENT_MODE" in
        docker)
            echo "  View logs: docker-compose logs -f"
            ;;
        pm2)
            echo "  View logs: pm2 logs"
            ;;
        systemd)
            echo "  View logs: journalctl -u botcripto-* -f"
            ;;
    esac

    echo ""
}

# Parse command line arguments
shift || true  # Remove version argument

while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            DEPLOYMENT_MODE="$2"
            shift 2
            ;;
        --backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [version] [options]"
            echo ""
            echo "Arguments:"
            echo "  version              Version to rollback to (default: previous)"
            echo ""
            echo "Options:"
            echo "  --mode MODE          Deployment mode (docker, pm2, systemd)"
            echo "  --backup-dir DIR     Backup directory (default: ./backups)"
            echo "  --help               Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                   Rollback to previous version"
            echo "  $0 v1.2.3            Rollback to specific version"
            echo "  $0 abc123f           Rollback to specific git commit"
            echo "  $0 --mode pm2        Rollback using PM2 deployment"
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
