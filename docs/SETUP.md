# Project Setup Guide

This guide will help you set up the WhatsApp CRM Backend project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- **PostgreSQL** >= 15 ([Download](https://www.postgresql.org/download/))
- **Redis** >= 7 ([Download](https://redis.io/download))
- **npm** >= 9.0.0 (comes with Node.js)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL Database

Create a new PostgreSQL database:

```sql
CREATE DATABASE whatsapp_crm;
CREATE USER whatsapp_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_crm TO whatsapp_user;
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update the following required variables:

```env
DATABASE_URL=postgresql://whatsapp_user:your_password@localhost:5432/whatsapp_crm?schema=public
JWT_SECRET=your-super-secret-jwt-key-change-this
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 4. Set Up Redis

Start Redis server:

```bash
# macOS (with Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# Or run directly
redis-server
```

Verify Redis is running:

```bash
redis-cli ping
# Should return: PONG
```

### 5. Initialize Database

Generate Prisma client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

Seed the database with sample data:

```bash
npm run prisma:seed
```

### 6. Start Development Server

```bash
npm run dev
```

The server should now be running at `http://localhost:5000`

## Verify Installation

### Check Health Endpoint

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 1.234,
  "environment": "development"
}
```

### Check API Endpoint

```bash
curl http://localhost:5000/api/v1
```

Expected response:
```json
{
  "message": "WhatsApp CRM API v1",
  "version": "1.0.0",
  "status": "active"
}
```

### Run Tests

```bash
npm test
```

All tests should pass.

## Development Tools

### Prisma Studio

Open Prisma Studio to view and edit your database:

```bash
npm run prisma:studio
```

Access at `http://localhost:5555`

### Code Linting

Lint your code:

```bash
npm run lint
```

Auto-fix linting issues:

```bash
npm run lint:fix
```

### Code Formatting

Format your code with Prettier:

```bash
npm run format
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Check your DATABASE_URL in `.env`

3. Ensure the database exists:
   ```bash
   psql -U postgres -c "\l"
   ```

### Redis Connection Issues

If Redis connection fails:

1. Verify Redis is running:
   ```bash
   redis-cli ping
   ```

2. Check Redis configuration in `.env`

### Port Already in Use

If port 5000 is already in use:

1. Change the PORT in `.env`:
   ```env
   PORT=5001
   ```

2. Or kill the process using port 5000:
   ```bash
   # macOS/Linux
   lsof -ti:5000 | xargs kill -9
   ```

## Next Steps

- Review the [API Documentation](./API.md)
- Check the [Architecture Guide](./ARCHITECTURE.md)
- Read the [Contributing Guidelines](./CONTRIBUTING.md)

## Demo Credentials

After seeding the database, you can use these credentials:

- **Email**: demo@whatsappcrm.com
- **Password**: password123
- **Role**: Owner

## Support

If you encounter any issues, please:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review existing GitHub issues
3. Create a new issue with detailed information
