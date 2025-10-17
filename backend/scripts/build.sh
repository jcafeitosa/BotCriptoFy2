#!/bin/bash
# =============================================================================
# Build Script
# Installs dependencies, runs tests, and validates code
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_LINT="${SKIP_LINT:-false}"
SKIP_TYPECHECK="${SKIP_TYPECHECK:-false}"

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Build Process${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo ""
}

print_step() {
    echo ""
    echo -e "${BLUE}[STEP]${NC} $1"
    echo -e "${BLUE}────────────────────────────────────────────────────────────${NC}"
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
# Build Steps
# =============================================================================

clean_build() {
    print_step "Cleaning previous build artifacts"

    # Remove node_modules if CLEAN_BUILD=true
    if [ "$CLEAN_BUILD" = "true" ]; then
        print_info "Removing node_modules..."
        rm -rf node_modules
        print_success "Cleaned node_modules"
    fi

    # Remove any temporary files
    rm -rf .temp
    rm -rf dist 2>/dev/null || true

    print_success "Build artifacts cleaned"
}

install_dependencies() {
    print_step "Installing dependencies"

    print_info "Using Bun package manager..."

    if [ "$CLEAN_BUILD" = "true" ]; then
        bun install --frozen-lockfile
    else
        # Check if lockfile exists
        if [ -f "bun.lockb" ]; then
            bun install --frozen-lockfile
        else
            print_warning "No lockfile found, installing without freeze"
            bun install
        fi
    fi

    print_success "Dependencies installed"
}

run_typecheck() {
    if [ "$SKIP_TYPECHECK" = "true" ]; then
        print_step "Type checking (SKIPPED)"
        print_warning "Type checking skipped"
        return 0
    fi

    print_step "Running type checks"

    print_info "Running TypeScript compiler..."

    if bun run typecheck; then
        print_success "Type checking passed"
        return 0
    else
        print_error "Type checking failed"
        return 1
    fi
}

run_lint() {
    if [ "$SKIP_LINT" = "true" ]; then
        print_step "Linting (SKIPPED)"
        print_warning "Linting skipped"
        return 0
    fi

    print_step "Running linter"

    print_info "Running ESLint..."

    if bun run lint; then
        print_success "Linting passed"
        return 0
    else
        print_error "Linting failed"
        print_info "Run 'bun run lint:fix' to auto-fix issues"
        return 1
    fi
}

run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        print_step "Testing (SKIPPED)"
        print_warning "Tests skipped"
        return 0
    fi

    print_step "Running tests"

    print_info "Running test suite..."

    if bun test; then
        print_success "All tests passed"
        return 0
    else
        print_error "Tests failed"
        return 1
    fi
}

generate_migrations() {
    print_step "Generating database migrations"

    print_info "Checking for schema changes..."

    if bun run db:generate; then
        print_success "Migrations generated"
        return 0
    else
        print_warning "Migration generation failed (this may be expected if no schema changes)"
        return 0
    fi
}

validate_env() {
    print_step "Validating environment configuration"

    # Check for required env vars
    local required_vars=(
        "NODE_ENV"
        "DATABASE_URL"
        "REDIS_HOST"
    )

    local missing=0
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            print_warning "$var is not set"
            ((missing++))
        fi
    done

    if [ $missing -eq 0 ]; then
        print_success "Environment variables validated"
    else
        print_warning "$missing environment variable(s) not set"
        print_info "Ensure all variables are set before deployment"
    fi

    return 0
}

build_docker_image() {
    if [ "$BUILD_DOCKER" != "true" ]; then
        return 0
    fi

    print_step "Building Docker image"

    # Get version from git or use timestamp
    if command -v git &> /dev/null && git rev-parse --git-dir &> /dev/null; then
        VERSION=$(git describe --tags --always --dirty 2>/dev/null || git rev-parse --short HEAD)
    else
        VERSION=$(date +%Y%m%d-%H%M%S)
    fi

    IMAGE_NAME="${DOCKER_IMAGE_NAME:-botcripto-backend}"
    IMAGE_TAG="${DOCKER_IMAGE_TAG:-$VERSION}"

    print_info "Building image: $IMAGE_NAME:$IMAGE_TAG"

    if docker build -t "$IMAGE_NAME:$IMAGE_TAG" -t "$IMAGE_NAME:latest" .; then
        print_success "Docker image built: $IMAGE_NAME:$IMAGE_TAG"
        return 0
    else
        print_error "Docker build failed"
        return 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================

main() {
    local start_time=$(date +%s)

    print_header

    # Print configuration
    echo -e "${BLUE}Build Configuration:${NC}"
    echo "  NODE_ENV: ${NODE_ENV:-not set}"
    echo "  SKIP_TESTS: $SKIP_TESTS"
    echo "  SKIP_LINT: $SKIP_LINT"
    echo "  SKIP_TYPECHECK: $SKIP_TYPECHECK"
    echo "  CLEAN_BUILD: ${CLEAN_BUILD:-false}"
    echo "  BUILD_DOCKER: ${BUILD_DOCKER:-false}"
    echo ""

    # Execute build steps
    local failed=false

    clean_build || failed=true

    if [ "$failed" = "false" ]; then
        install_dependencies || failed=true
    fi

    if [ "$failed" = "false" ]; then
        run_typecheck || failed=true
    fi

    if [ "$failed" = "false" ]; then
        run_lint || failed=true
    fi

    if [ "$failed" = "false" ]; then
        run_tests || failed=true
    fi

    if [ "$failed" = "false" ]; then
        generate_migrations || true  # Non-critical
    fi

    if [ "$failed" = "false" ]; then
        validate_env || true  # Non-critical
    fi

    if [ "$failed" = "false" ]; then
        build_docker_image || failed=true
    fi

    # Print summary
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    echo ""
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}  Build Summary${NC}"
    echo -e "${BLUE}================================================================${NC}"

    if [ "$failed" = "false" ]; then
        echo -e "${GREEN}✓ Build completed successfully${NC}"
        echo -e "  Duration: ${duration}s"
        echo ""
        exit 0
    else
        echo -e "${RED}✗ Build failed${NC}"
        echo -e "  Duration: ${duration}s"
        echo ""
        echo -e "${RED}Fix the errors above and try again${NC}"
        echo ""
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        --skip-typecheck)
            SKIP_TYPECHECK=true
            shift
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --docker)
            BUILD_DOCKER=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --skip-tests       Skip running tests"
            echo "  --skip-lint        Skip linting"
            echo "  --skip-typecheck   Skip type checking"
            echo "  --clean            Clean node_modules before install"
            echo "  --docker           Build Docker image"
            echo "  --help             Show this help message"
            echo ""
            echo "Environment variables:"
            echo "  SKIP_TESTS         Skip tests (default: false)"
            echo "  SKIP_LINT          Skip linting (default: false)"
            echo "  SKIP_TYPECHECK     Skip type checking (default: false)"
            echo "  CLEAN_BUILD        Clean before build (default: false)"
            echo "  BUILD_DOCKER       Build Docker image (default: false)"
            echo "  DOCKER_IMAGE_NAME  Docker image name (default: botcripto-backend)"
            echo "  DOCKER_IMAGE_TAG   Docker image tag (default: git version)"
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
