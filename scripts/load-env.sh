#!/bin/bash

# Script to load environment-specific configuration
# Usage: ./scripts/load-env.sh [dev|staging|prod]

set -e

ENV=${1:-dev}

echo "Loading environment configuration for: $ENV"

case $ENV in
  dev|development)
    ENV_FILE=".env.dev"
    ;;
  staging)
    ENV_FILE=".env.staging"
    ;;
  prod|production)
    ENV_FILE=".env.prod"
    ;;
  *)
    echo "Error: Invalid environment '$ENV'"
    echo "Usage: $0 [dev|staging|prod]"
    exit 1
    ;;
esac

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Environment file '$ENV_FILE' not found"
  exit 1
fi

# Copy environment file to .env
cp "$ENV_FILE" .env

echo "✅ Environment configuration loaded from $ENV_FILE"
echo "   You can now run: npm start"
