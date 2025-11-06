# Project Structure

This document describes the complete project structure and organization of the WhatsApp CRM Backend.

## Directory Structure

```
backend/
├── .husky/                      # Git hooks configuration
│   └── pre-commit              # Pre-commit hook for linting
├── docs/                        # Documentation files
│   ├── SETUP.md                # Setup guide
│   └── PROJECT_STRUCTURE.md    # This file
├── logs/                        # Application logs (gitignored)
├── node_modules/               # Dependencies (gitignored)
├── prisma/                     # Database schema and migrations
│   ├── migrations/             # Database migration files
│   ├── schema.prisma           # Prisma schema definition
│   └── seed.js                 # Database seeding script
├── sessions/                   # WhatsApp session data (gitignored)
├── src/                        # Source code
│   ├── config/                 # Configuration files
│   │   └── index.js            # Centralized configuration
│   ├── controllers/            # Request handlers (to be implemented)
│   ├── middleware/             # Express middleware (to be implemented)
│   ├── models/                 # Database queries (to be implemented)
│   ├── queues/                 # Bull queue definitions (to be implemented)
│   ├── routes/                 # API routes (to be implemented)
│   ├── services/               # Business logic (to be implemented)
│   │   ├── ai/                 # AI service implementations
│   │   │   └── providers/      # AI provider integrations
│   │   ├── ecommerce/          # E-commerce integrations
│   │   │   ├── shopify/        # Shopify integration
│   │   │   └── woocommerce/    # WooCommerce integration
│   │   └── payments/           # Payment processing
│   │       └── providers/      # Payment gateway providers
│   ├── sockets/                # Socket.io handlers (to be implemented)
│   ├── utils/                  # Helper functions
│   │   └── logger.js           # Winston logger configuration
│   ├── validators/             # Validation schemas (to be implemented)
│   ├── webhooks/               # Webhook handlers (to be implemented)
│   ├── workers/                # Queue processors (to be implemented)
│   ├── app.js                  # Express application setup
│   └── server.js               # Server entry point
├── tests/                      # Test files
│   └── app.test.js             # Basic app tests
├── .env                        # Environment variables (gitignored)
├── .env.example                # Example environment variables
├── .gitignore                  # Git ignore rules
├── .prettierignore             # Prettier ignore rules
├── .prettierrc.json            # Prettier configuration
├── eslint.config.js            # ESLint configuration
├── jest.config.js              # Jest test configuration
├── jsconfig.json               # JavaScript configuration for IDE
├── nodemon.json                # Nodemon configuration
├── package.json                # Project dependencies and scripts
└── README.md                   # Project README
```

## Key Files

### Configuration Files

- **`.env`**: Environment variables (not committed to git)
- **`.env.example`**: Template for environment variables
- **`src/config/index.js`**: Centralized configuration management
- **`jsconfig.json`**: JavaScript/IDE configuration with path aliases
- **`eslint.config.js`**: ESLint rules and configuration
- **`.prettierrc.json`**: Code formatting rules
- **`jest.config.js`**: Test framework configuration
- **`nodemon.json`**: Development server configuration

### Application Files

- **`src/server.js`**: Application entry point, starts the Express server
- **`src/app.js`**: Express application setup with middleware
- **`src/utils/logger.js`**: Winston logger for application logging

### Database Files

- **`prisma/schema.prisma`**: Database schema definition
- **`prisma/seed.js`**: Database seeding script
- **`prisma/migrations/`**: Database migration history

### Testing Files

- **`tests/app.test.js`**: Basic application tests
- **`jest.config.js`**: Jest configuration for running tests

## NPM Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server

### Testing
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode

### Code Quality
- `npm run lint` - Check code for linting errors
- `npm run lint:fix` - Fix linting errors automatically
- `npm run format` - Format code with Prettier

### Database
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio GUI
- `npm run prisma:seed` - Seed database with sample data

## Technology Stack

### Core
- **Node.js** v20+ - JavaScript runtime
- **Express.js** v5 - Web framework
- **PostgreSQL** 15+ - Primary database
- **Prisma** 6+ - ORM and database toolkit
- **Redis** 7+ - Caching and queue backing store

### Key Dependencies
- **Bull** - Queue and background job processing
- **Socket.io** - Real-time bidirectional communication
- **Winston** - Logging framework
- **Sentry** - Error tracking and monitoring
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logging
- **Joi** - Input validation

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Supertest** - HTTP testing
- **Nodemon** - Development server with hot reload
- **Husky** - Git hooks

## Path Aliases

The following path aliases are configured in `jsconfig.json`:

- `@/*` → `src/*`
- `@config/*` → `src/config/*`
- `@routes/*` → `src/routes/*`
- `@middleware/*` → `src/middleware/*`
- `@controllers/*` → `src/controllers/*`
- `@services/*` → `src/services/*`
- `@models/*` → `src/models/*`
- `@utils/*` → `src/utils/*`

## Environment Variables

All environment variables are documented in `.env.example`. Key categories:

1. **Application**: Basic app configuration
2. **Database**: PostgreSQL connection
3. **Redis**: Cache and queue configuration
4. **Authentication**: JWT secrets and expiry
5. **Email**: SMTP and SendGrid configuration
6. **Storage**: AWS S3 and Cloudinary
7. **AI Providers**: API keys for 11 AI providers
8. **E-commerce**: Shopify and WooCommerce
9. **Payments**: 20+ payment gateway configurations
10. **Feature Flags**: Enable/disable features

## Next Steps

1. Implement authentication system (Task 2)
2. Set up database models and migrations (Task 2)
3. Configure Redis and queue infrastructure (Task 3)
4. Build API routes and controllers (Tasks 6-65)
5. Implement business logic in services (Tasks 6-65)
6. Add comprehensive tests (Throughout implementation)

## Notes

- All sensitive data is stored in `.env` and excluded from git
- Code is automatically linted and formatted on commit via Husky
- ES modules are used throughout the project
- Winston logger is configured for both console and file output
- Jest is configured to work with ES modules
- Prisma schema includes core models for the CRM system
