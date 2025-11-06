# Database Setup Guide

This guide explains how to set up and configure the PostgreSQL database with Prisma ORM for the WhatsApp CRM Backend.

## Prerequisites

- PostgreSQL 15+ installed and running
- Node.js 20+ installed
- npm 9+ installed

## Quick Start

### 1. Install PostgreSQL

**macOS (using Homebrew):**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows:**
Download and install from [PostgreSQL official website](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE whatsapp_crm;

# Create user (optional, for production)
CREATE USER whatsapp_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE whatsapp_crm TO whatsapp_user;

# Exit psql
\q
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update the `DATABASE_URL`:

```bash
cp .env.example .env
```

Update the DATABASE_URL in `.env`:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/whatsapp_crm?schema=public
```

For local development with default PostgreSQL settings:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/whatsapp_crm?schema=public
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client based on your schema, enabling type-safe database queries.

### 6. Run Database Migrations

```bash
npm run prisma:migrate
```

This will:
- Create all database tables
- Set up indexes
- Apply constraints
- Create enums

You'll be prompted to name the migration. Use a descriptive name like:
```
init_complete_schema
```

### 7. Seed the Database (Optional)

Populate the database with sample data:

```bash
npm run prisma:seed
```

This creates:
- 4 demo users (Owner, Admin, Manager, Agent)
- 3 subscription plans (Starter, Professional, Enterprise)
- 1 sample WhatsApp account
- 3 sample contacts
- 1 sample campaign
- 1 sample flow

**Demo Login Credentials:**
- Email: `owner@whatsappcrm.com`
- Password: `password123`

## Database Schema Overview

The database includes the following main models:

### Core Models
- **User** - User accounts with role-based access control
- **RefreshToken** - JWT refresh tokens for authentication
- **WhatsAppAccount** - Connected WhatsApp Business accounts
- **Contact** - Customer/lead contact information
- **Message** - WhatsApp messages (inbound/outbound)

### Campaign & Automation
- **Campaign** - Broadcast campaigns
- **CampaignRecipient** - Campaign recipient tracking
- **Flow** - Automated workflows
- **FlowExecution** - Flow execution tracking
- **FlowExecutionStep** - Individual flow step execution

### AI & Chatbot
- **AIProvider** - AI provider configurations (OpenAI, Claude, etc.)
- **Chatbot** - AI chatbot configurations
- **ChatbotConversation** - Chatbot conversation sessions
- **ChatbotMessage** - Individual chatbot messages
- **VoiceTranscription** - Voice message transcriptions

### E-commerce
- **EcommerceIntegration** - Shopify/WooCommerce integrations
- **Order** - E-commerce orders
- **AbandonedCart** - Abandoned cart tracking

### Payments
- **PaymentGateway** - Payment gateway configurations
- **SubscriptionPlan** - Subscription plan definitions
- **Subscription** - User subscriptions
- **Payment** - Payment transactions
- **Invoice** - Generated invoices

### Analytics & Webhooks
- **AnalyticsSnapshot** - Pre-aggregated analytics data
- **WebhookSubscription** - Outbound webhook subscriptions
- **WebhookDelivery** - Webhook delivery tracking

### Team Management
- **TeamMember** - Team member records
- **TeamInvitation** - Team invitation tokens
- **ActivityLog** - Audit trail of user actions

## Connection Pooling

Prisma automatically manages connection pooling. The configuration is set in `src/config/database.js`:

```javascript
const prisma = new PrismaClient({
  // Connection pool is managed automatically by Prisma
  // Default pool size: 10 connections
  // Can be configured via DATABASE_URL query parameters
});
```

To customize connection pool settings, add to your DATABASE_URL:
```
postgresql://user:pass@localhost:5432/whatsapp_crm?schema=public&connection_limit=10&pool_timeout=30
```

## Database Maintenance

### View Database with Prisma Studio

```bash
npm run prisma:studio
```

Opens a web interface at `http://localhost:5555` to view and edit data.

### Reset Database (Development Only)

⚠️ **WARNING: This will delete all data!**

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Create a new database
3. Run all migrations
4. Run seed script

### Create New Migration

After modifying `prisma/schema.prisma`:

```bash
npm run prisma:migrate
```

Name your migration descriptively:
- `add_user_preferences`
- `update_message_indexes`
- `add_payment_gateway_fields`

### Check Migration Status

```bash
npx prisma migrate status
```

### Apply Migrations (Production)

```bash
npx prisma migrate deploy
```

This applies pending migrations without prompting.

## Performance Optimization

### Indexes

The schema includes optimized indexes for common query patterns:

```prisma
model Message {
  @@index([whatsappAccountId, contactId, createdAt])
  @@index([status])
  @@index([campaignId])
}
```

### Query Optimization Tips

1. **Use `select` to fetch only needed fields:**
```javascript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, email: true, firstName: true }
});
```

2. **Use `include` sparingly to avoid N+1 queries:**
```javascript
const contacts = await prisma.contact.findMany({
  include: { messages: true } // Loads all messages - can be slow!
});
```

3. **Use pagination for large datasets:**
```javascript
const contacts = await prisma.contact.findMany({
  take: 100,
  skip: (page - 1) * 100,
  orderBy: { createdAt: 'desc' }
});
```

4. **Use cursor-based pagination for better performance:**
```javascript
const contacts = await prisma.contact.findMany({
  take: 100,
  cursor: { id: lastContactId },
  orderBy: { id: 'asc' }
});
```

## Backup and Restore

### Create Backup

```bash
pg_dump -U postgres -d whatsapp_crm -F c -f backup_$(date +%Y%m%d_%H%M%S).dump
```

### Restore Backup

```bash
pg_restore -U postgres -d whatsapp_crm -c backup_20231104_120000.dump
```

### Automated Backups

Set up a cron job for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * pg_dump -U postgres -d whatsapp_crm -F c -f /backups/whatsapp_crm_$(date +\%Y\%m\%d).dump
```

## Troubleshooting

### Connection Issues

**Error: "Can't reach database server"**
- Check if PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`
- Check firewall settings

**Error: "Authentication failed"**
- Verify username and password in DATABASE_URL
- Check PostgreSQL user permissions

### Migration Issues

**Error: "Migration failed to apply"**
- Check database logs: `tail -f /var/log/postgresql/postgresql-15-main.log`
- Verify schema changes are valid
- Try resetting in development: `npx prisma migrate reset`

**Error: "Database is out of sync"**
- Run: `npx prisma migrate resolve --applied <migration_name>`
- Or reset: `npx prisma migrate reset` (development only)

### Performance Issues

**Slow queries:**
- Enable query logging in `src/config/database.js`
- Check for missing indexes
- Use `EXPLAIN ANALYZE` in PostgreSQL

**Connection pool exhausted:**
- Increase connection limit in DATABASE_URL
- Check for connection leaks (missing `await prisma.$disconnect()`)

## Production Considerations

### Security

1. **Use strong passwords:**
```env
DATABASE_URL=postgresql://user:$(openssl rand -base64 32)@localhost:5432/whatsapp_crm
```

2. **Enable SSL:**
```env
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

3. **Restrict database access:**
- Use firewall rules
- Limit connections to application servers only
- Use VPC/private networks

### Monitoring

1. **Enable slow query logging:**
```javascript
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    logger.warn('Slow query', { query: e.query, duration: e.duration });
  }
});
```

2. **Monitor connection pool:**
```javascript
const metrics = await prisma.$metrics.json();
console.log(metrics);
```

3. **Set up alerts:**
- Database CPU usage > 80%
- Connection pool > 90% utilized
- Slow queries > 5 seconds
- Failed connections

### Scaling

1. **Read Replicas:**
- Configure read replicas for analytics queries
- Use Prisma's replica support (coming soon)

2. **Connection Pooling:**
- Use PgBouncer for connection pooling
- Configure in transaction mode for better performance

3. **Horizontal Scaling:**
- Use Citus for sharding (if needed)
- Partition large tables by date

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Database Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Prisma logs in `logs/` directory
3. Check PostgreSQL logs
4. Contact the development team
