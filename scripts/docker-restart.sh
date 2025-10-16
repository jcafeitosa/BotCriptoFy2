#!/bin/bash

# =============================================================================
# BotCriptoFy2 - Docker Restart Script
# =============================================================================
# Restarts all Docker services
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

# Parse arguments to pass to docker-start.sh
ARGS=""
while [[ $# -gt 0 ]]; do
  ARGS="$ARGS $1"
  shift
done

print_info "Restarting Docker services..."

# Stop services
./scripts/docker-stop.sh

# Start services with provided arguments
./scripts/docker-start.sh $ARGS
