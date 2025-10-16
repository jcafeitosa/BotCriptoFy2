#!/bin/bash

# =============================================================================
# BotCriptoFy2 - Docker Start Script
# =============================================================================
# Starts all Docker services with proper health checks and validation
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
  echo -e "\n${BLUE}════════════════════════════════════════${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}════════════════════════════════════════${NC}\n"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# =============================================================================
# Check Prerequisites
# =============================================================================

print_header "Checking Prerequisites"

if ! command -v docker &> /dev/null; then
  print_error "Docker is not installed"
  print_info "Install from: https://docs.docker.com/get-docker/"
  exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
  print_error "Docker Compose is not installed"
  exit 1
fi

print_success "Docker is installed"

if ! docker info &> /dev/null; then
  print_error "Docker daemon is not running"
  print_info "Start Docker Desktop or run: sudo systemctl start docker"
  exit 1
fi

print_success "Docker daemon is running"

# =============================================================================
# Parse Arguments
# =============================================================================

PROFILE=""
BUILD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --full)
      PROFILE="--profile full"
      print_info "Starting with FULL profile (all services including backend/frontend)"
      shift
      ;;
    --build)
      BUILD=true
      print_info "Will rebuild images before starting"
      shift
      ;;
    *)
      echo "Usage: $0 [--full] [--build]"
      echo "  --full   Start all services including backend and frontend containers"
      echo "  --build  Rebuild images before starting"
      exit 1
      ;;
  esac
done

# =============================================================================
# Check .env file
# =============================================================================

print_header "Checking Environment Configuration"

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    print_warning ".env file not found, creating from .env.example"
    cp .env.example .env
    print_success "Created .env file"
    print_warning "Please review and update .env file with your settings"
    read -p "Press Enter to continue or Ctrl+C to exit and edit .env..."
  else
    print_error ".env.example not found"
    exit 1
  fi
else
  print_success ".env file exists"
fi

# =============================================================================
# Stop existing containers
# =============================================================================

print_header "Stopping Existing Containers"

if docker-compose ps -q 2>/dev/null | grep -q .; then
  docker-compose down
  print_success "Stopped existing containers"
else
  print_info "No running containers found"
fi

# =============================================================================
# Build images if requested
# =============================================================================

if [ "$BUILD" = true ]; then
  print_header "Building Docker Images"
  docker-compose build $PROFILE
  print_success "Images built successfully"
fi

# =============================================================================
# Start services
# =============================================================================

print_header "Starting Docker Services"

if [ -z "$PROFILE" ]; then
  print_info "Starting infrastructure only (PostgreSQL, Redis, Ollama)"
  print_info "Backend/frontend will run locally"
else
  print_info "Starting all services including backend/frontend containers"
fi

docker-compose up -d $PROFILE

print_success "Services started"

# =============================================================================
# Wait for services to be healthy
# =============================================================================

print_header "Waiting for Services to be Healthy"

# Wait for PostgreSQL
print_info "Waiting for PostgreSQL..."
for i in {1..30}; do
  if docker-compose exec -T postgres pg_isready -U botcriptofy2 &> /dev/null; then
    print_success "PostgreSQL is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    print_error "PostgreSQL failed to start"
    docker-compose logs postgres
    exit 1
  fi
  sleep 1
done

# Wait for Redis
print_info "Waiting for Redis..."
for i in {1..30}; do
  if docker-compose exec -T redis redis-cli -a botcriptofy2 ping &> /dev/null 2>&1; then
    print_success "Redis is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    print_warning "Redis failed to start (continuing anyway)"
    break
  fi
  sleep 1
done

# Wait for Ollama (optional)
print_info "Waiting for Ollama..."
for i in {1..30}; do
  if curl -s http://localhost:11434/api/version &> /dev/null; then
    print_success "Ollama is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    print_warning "Ollama not responding (optional service)"
    break
  fi
  sleep 1
done

# =============================================================================
# Pull Ollama model if not present
# =============================================================================

print_header "Checking Ollama Model"

OLLAMA_MODEL=$(grep OLLAMA_MODEL .env | cut -d '=' -f2 | tr -d ' "' || echo "qwen3:0.6b")

if curl -s http://localhost:11434/api/version &> /dev/null; then
  print_info "Checking for model: $OLLAMA_MODEL"
  if ! docker-compose exec -T ollama ollama list | grep -q "$OLLAMA_MODEL"; then
    print_info "Pulling Ollama model: $OLLAMA_MODEL (this may take a while)..."
    docker-compose exec -T ollama ollama pull "$OLLAMA_MODEL"
    print_success "Model pulled successfully"
  else
    print_success "Model already available"
  fi
else
  print_warning "Ollama not running, skipping model check"
fi

# =============================================================================
# Summary
# =============================================================================

print_header "Docker Services Running"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  All Services Started Successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

docker-compose ps

echo -e "\n${BLUE}Service URLs:${NC}"
echo -e "  • PostgreSQL: ${GREEN}localhost:5432${NC}"
echo -e "  • Redis: ${GREEN}localhost:6379${NC}"
echo -e "  • Ollama: ${GREEN}http://localhost:11434${NC}"

if [ -n "$PROFILE" ]; then
  echo -e "  • Backend API: ${GREEN}http://localhost:3000${NC}"
  echo -e "  • Frontend: ${GREEN}http://localhost:4321${NC}"
  echo -e "  • API Docs: ${GREEN}http://localhost:3000/swagger${NC}"
fi

echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  • View logs: ${GREEN}docker-compose logs -f [service]${NC}"
echo -e "  • Stop services: ${GREEN}./scripts/docker-stop.sh${NC}"
echo -e "  • Restart services: ${GREEN}./scripts/docker-restart.sh${NC}"

if [ -z "$PROFILE" ]; then
  echo -e "\n${YELLOW}Infrastructure only mode:${NC}"
  echo -e "  Start backend/frontend locally with: ${GREEN}bun run dev${NC}"
fi

echo ""
