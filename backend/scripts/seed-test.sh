#!/bin/bash

# Change to backend directory
cd "$(dirname "$0")/.." || exit 1

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Run seed
bun src/db/seed-test-data.ts
