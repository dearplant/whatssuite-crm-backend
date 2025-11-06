#!/bin/bash

# WhatsApp CRM Database Setup Script
# This script sets up the PostgreSQL database and runs migrations

set -e

echo "🚀 WhatsApp CRM Database Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please copy .env.example to .env and configure your database settings"
    echo "  cp .env.example .env"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "📋 Checking prerequisites..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL is not installed${NC}"
    echo "Please install PostgreSQL 15+ before continuing"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is installed${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js 20+ before continuing"
    exit 1
fi

echo -e "${GREEN}✅ Node.js is installed ($(node --version))${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm is installed ($(npm --version))${NC}"

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Generating Prisma Client..."
npm run prisma:generate

echo ""
echo "🗄️  Running database migrations..."
echo -e "${YELLOW}Note: This will create all tables and indexes${NC}"

# Try to run migrations
if npm run prisma:migrate; then
    echo -e "${GREEN}✅ Migrations completed successfully${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. Database server is not running"
    echo "  2. Database credentials are incorrect"
    echo "  3. Database does not exist"
    echo ""
    echo "To create the database manually:"
    echo "  psql postgres -c 'CREATE DATABASE whatsapp_crm;'"
    exit 1
fi

echo ""
echo "🌱 Seeding database with sample data..."
read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if npm run prisma:seed; then
        echo -e "${GREEN}✅ Database seeded successfully${NC}"
        echo ""
        echo "📝 Demo login credentials:"
        echo "   Email: owner@whatsappcrm.com"
        echo "   Password: password123"
    else
        echo -e "${YELLOW}⚠️  Seeding failed or was skipped${NC}"
    fi
else
    echo "Skipping database seeding"
fi

echo ""
echo -e "${GREEN}🎉 Database setup completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the development server: npm run dev"
echo "  2. View database in Prisma Studio: npm run prisma:studio"
echo "  3. Check API health: curl http://localhost:5000/health"
echo ""
