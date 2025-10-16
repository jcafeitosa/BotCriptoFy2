#!/bin/bash

# =============================================================================
# BotCriptoFy2 - Docker Stop Script
# =============================================================================
# Stops all Docker services gracefully
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# =============================================================================
# Parse Arguments
# =============================================================================

REMOVE_VOLUMES=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --volumes|-v)
      REMOVE_VOLUMES=true
      print_warning "Will remove volumes (data will be lost!)"
      shift
      ;;
    *)
      echo "Usage: $0 [--volumes|-v]"
      echo "  --volumes, -v  Remove volumes (WARNING: deletes all data)"
      exit 1
      ;;
  esac
done

# =============================================================================
# Stop Services
# =============================================================================

echo -e "\n${BLUE}Stopping Docker Services...${NC}\n"

if docker-compose ps -q 2>/dev/null | grep -q .; then
  if [ "$REMOVE_VOLUMES" = true ]; then
    read -p "Are you sure you want to remove volumes? All data will be lost! (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose down -v
      print_success "Stopped services and removed volumes"
    else
      print_info "Cancelled volume removal"
      docker-compose down
      print_success "Stopped services (volumes preserved)"
    fi
  else
    docker-compose down
    print_success "Stopped services (volumes preserved)"
  fi
else
  print_info "No running containers found"
fi

echo ""
