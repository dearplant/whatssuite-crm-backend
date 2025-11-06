# WhatsApp CRM Backend

A comprehensive WhatsApp CRM SaaS backend system built with Node.js, Express, PostgreSQL, Redis, and Socket.io.

## Features

- 🔐 JWT Authentication & RBAC
- 💬 WhatsApp Multi-Device Integration
- 👥 Contact Management & Segmentation
- 📢 Campaign Management & Broadcasting
- 🤖 AI-Powered Chatbots (11 providers)
- 🔄 Flow Automation Engine
- 🛒 E-commerce Integration (Shopify, WooCommerce)
- 💳 Payment Processing (20+ gateways)
- 📊 Analytics & Reporting
- 🔔 Real-time Updates (Socket.io)
- 🎯 Webhook System
- 🌍 Multi-language Support

## Prerequisites

- Node.js >= 20.0.0
- PostgreSQL >= 15
- Redis >= 7
- npm >= 9.0.0

## Installation

### Quick Setup (Automated)

**Linux/macOS:**
```bash
./scripts/setup-database.sh
```

**Windows:**
```bash
scripts\setup-database.bat
```

### Manual Setup

1. Clone the repository

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure your `.env` file with appropriate values:
   - Set `DATABASE_URL` to your PostgreSQL connection string
   - Configure Redis connection details
   - Set JWT secrets and encryption keys
   - Add API keys for external services (optional)

5. Create PostgreSQL database:
   ```bash
   psql postgres -c 'CREATE DATABASE whatsapp_crm;'
   ```

6. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```

7. Run database migrations:
   ```bash
   npm run prisma:migrate
   ```
   
   When prompted, name your migration (e.g., `init_complete_schema`)

8. Seed the database (optional):
   ```bash
   npm run prisma:seed
   ```
   
   This creates demo users and sample data:
   - **Email:** owner@whatsappcrm.com
   - **Password:** password123

For detailed database setup instructions, see [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md)

## Development

Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:5000`

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code
- `npm run lint:fix` - Lint and fix code
- `npm run format` - Format code with Prettier
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio
- `npm run prisma:seed` - Seed database

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── routes/          # API routes
│   ├── middleware/      # Express middleware
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── models/          # Database queries
│   ├── queues/          # Bull queue definitions
│   ├── workers/         # Queue processors
│   ├── sockets/         # Socket.io handlers
│   ├── webhooks/        # Webhook handlers
│   ├── validators/      # Validation schemas
│   └── utils/           # Helper functions
├── prisma/              # Database schema & migrations
├── tests/               # Test files
├── docs/                # Documentation
└── logs/                # Log files
```

## Documentation

- [Setup Guide](docs/SETUP.md) - Complete setup instructions
- [Database Setup](docs/DATABASE_SETUP.md) - Database configuration and migrations
- [Schema Reference](docs/SCHEMA_REFERENCE.md) - Database schema documentation
- [Redis Queue Setup](docs/REDIS_QUEUE_SETUP.md) - Queue infrastructure setup
- [Middleware](docs/MIDDLEWARE.md) - Middleware stack documentation
- [Project Structure](docs/PROJECT_STRUCTURE.md) - Detailed project structure

API documentation will be available at `/api/v1/docs` once the server is running.

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## License

ISC
