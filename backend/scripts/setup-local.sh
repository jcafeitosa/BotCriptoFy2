#!/bin/bash

# =============================================================================
# BotCriptoFy2 - Local Development Setup Script
# =============================================================================
# This script sets up the local development environment WITHOUT Docker
# It checks prerequisites, creates .env file, and initializes the database
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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
# STEP 1: Check Prerequisites
# =============================================================================

print_header "Checking Prerequisites"

# Check Bun
if command -v bun &> /dev/null; then
  BUN_VERSION=$(bun --version)
  print_success "Bun installed (v$BUN_VERSION)"
else
  print_error "Bun is not installed"
  print_info "Install from: https://bun.sh"
  exit 1
fi

# Check PostgreSQL
if command -v psql &> /dev/null; then
  PG_VERSION=$(psql --version | awk '{print $3}')
  print_success "PostgreSQL installed (v$PG_VERSION)"
else
  print_error "PostgreSQL is not installed"
  print_info "Install with: brew install postgresql@16"
  exit 1
fi

# Check if PostgreSQL is running
if pg_isready -q; then
  print_success "PostgreSQL is running"
else
  print_warning "PostgreSQL is not running"
  print_info "Start with: brew services start postgresql@16"
  read -p "Do you want to start PostgreSQL now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    brew services start postgresql@16
    sleep 2
    if pg_isready -q; then
      print_success "PostgreSQL started successfully"
    else
      print_error "Failed to start PostgreSQL"
      exit 1
    fi
  else
    exit 1
  fi
fi

# Check Redis (optional)
if command -v redis-cli &> /dev/null; then
  print_success "Redis installed (optional)"
  if redis-cli ping &> /dev/null; then
    print_success "Redis is running"
  else
    print_warning "Redis is not running (will use in-memory fallback)"
  fi
else
  print_warning "Redis not installed (will use in-memory fallback)"
  print_info "Optional: brew install redis"
fi

# Check Ollama (optional)
if command -v ollama &> /dev/null; then
  print_success "Ollama installed (optional)"
  if curl -s http://localhost:11434/api/version &> /dev/null; then
    print_success "Ollama is running"
  else
    print_warning "Ollama is not running (optional service)"
  fi
else
  print_warning "Ollama not installed (optional)"
  print_info "Optional: https://ollama.ai/download"
fi

# =============================================================================
# STEP 2: Create .env file
# =============================================================================

print_header "Setting up Environment Variables"

if [ -f ".env" ]; then
  print_warning ".env file already exists"
  read -p "Do you want to overwrite it? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Skipping .env creation"
  else
    cp .env.example .env
    print_success "Created .env from .env.example"
  fi
else
  if [ -f ".env.example" ]; then
    cp .env.example .env
    print_success "Created .env from .env.example"
  else
    print_error ".env.example not found"
    exit 1
  fi
fi

# Generate Better-Auth secret if needed
if grep -q "your-super-secret-key-change-this-in-production" .env 2>/dev/null; then
  print_info "Generating Better-Auth secret..."
  BETTER_AUTH_SECRET=$(openssl rand -base64 32)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|your-super-secret-key-change-this-in-production|$BETTER_AUTH_SECRET|g" .env
  else
    sed -i "s|your-super-secret-key-change-this-in-production|$BETTER_AUTH_SECRET|g" .env
  fi
  print_success "Generated Better-Auth secret"
fi

# =============================================================================
# STEP 3: Create Database
# =============================================================================

print_header "Setting up Database"

# Load database name from .env
DB_NAME=$(grep POSTGRES_DB .env | cut -d '=' -f2 | tr -d ' "' || echo "botcriptofy2")
DB_USER=$(grep POSTGRES_USER .env | cut -d '=' -f2 | tr -d ' "' || echo "botcriptofy2")
DB_PASS=$(grep POSTGRES_PASSWORD .env | cut -d '=' -f2 | tr -d ' "' || echo "botcriptofy2")

print_info "Database: $DB_NAME"
print_info "User: $DB_USER"

# Check if database exists
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  print_warning "Database '$DB_NAME' already exists"
  read -p "Do you want to drop and recreate it? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    dropdb -U postgres --if-exists "$DB_NAME"
    print_success "Dropped existing database"
  fi
fi

# Create user if doesn't exist
psql -U postgres -tc "SELECT 1 FROM pg_user WHERE usename = '$DB_USER'" | grep -q 1 || \
  psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" &> /dev/null

print_success "Database user ready"

# Create database
if ! psql -U postgres -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  createdb -U postgres -O "$DB_USER" "$DB_NAME"
  print_success "Created database '$DB_NAME'"
fi

# Enable TimescaleDB extension
psql -U postgres -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;" &> /dev/null
print_success "Enabled TimescaleDB extension"

# Grant privileges
psql -U postgres -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" &> /dev/null
psql -U postgres -d "$DB_NAME" -c "GRANT ALL PRIVILEGES ON SCHEMA public TO $DB_USER;" &> /dev/null
print_success "Granted database privileges"

# =============================================================================
# STEP 4: Install Dependencies
# =============================================================================

print_header "Installing Dependencies"

bun install
print_success "Dependencies installed"

# =============================================================================
# STEP 5: Run Database Migrations
# =============================================================================

print_header "Running Database Migrations"

bun run db:push
print_success "Database schema created"

# =============================================================================
# STEP 6: Seed Database (optional)
# =============================================================================

print_header "Seeding Database"

read -p "Do you want to seed the database with demo data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  bun run db:seed
  print_success "Database seeded with demo data"
else
  print_info "Skipping database seeding"
fi

# =============================================================================
# STEP 7: Summary
# =============================================================================

print_header "Setup Complete!"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Local Development Environment Ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

print_success "Database: $DB_NAME (TimescaleDB enabled)"
print_success "Redis: In-memory fallback mode"
print_success "Better-Auth: Configured with secure secret"

echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Review and update .env file if needed"
echo -e "  2. Start development server: ${GREEN}bun run dev${NC}"
echo -e "  3. Open API docs: ${GREEN}http://localhost:3000/swagger${NC}"
echo -e "  4. Check health: ${GREEN}http://localhost:3000${NC}"

echo -e "\n${YELLOW}Optional services:${NC}"
if ! redis-cli ping &> /dev/null; then
  echo -e "  • Start Redis: ${GREEN}brew services start redis${NC}"
fi
if ! curl -s http://localhost:11434/api/version &> /dev/null; then
  echo -e "  • Start Ollama: ${GREEN}ollama serve${NC}"
fi

echo -e "\n${BLUE}Useful commands:${NC}"
echo -e "  • Database Studio: ${GREEN}bun run db:studio${NC}"
echo -e "  • Run migrations: ${GREEN}bun run db:migrate${NC}"
echo -e "  • Seed database: ${GREEN}bun run db:seed${NC}"
echo -e "  • Run tests: ${GREEN}bun run test${NC}"

echo ""
