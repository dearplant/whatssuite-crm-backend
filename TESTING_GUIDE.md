# Testing Guide - Docker & GitLab CI/CD Setup

## ✅ Step 1: Local Docker Testing (COMPLETED)

### Docker Image Build Test
```bash
# Build the Docker image
docker build -t whatsapp-crm-backend:test -f backend/Dockerfile backend

# ✅ SUCCESS: Image built successfully in ~70 seconds
```

## 🧪 Step 2: Test Development Environment with Docker Compose

### Start Development Services

```bash
# Navigate to backend directory
cd backend

# Start all services (PostgreSQL, Redis, Backend, Bull Board)
docker-compose -f docker-compose.dev.yml up -d

# Check running containers
docker-compose -f docker-compose.dev.yml ps

# View logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Wait for services to be healthy (30-60 seconds)
```

### Run Database Migrations

```bash
# Run Prisma migrations
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate deploy

# (Optional) Seed database
docker-compose -f docker-compose.dev.yml exec backend npm run prisma:seed
```

### Test Health Endpoints

```bash
# Basic health check
curl http://localhost:5000/health

# Detailed health check
curl http://localhost:5000/health/detailed

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "uptime": 123.45,
#   "environment": "development",
#   "version": "1.0.0"
# }
```

### Access Services

- **Backend API**: http://localhost:5000
- **Bull Board (Queue Dashboard)**: http://localhost:3001
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

### Stop Services

```bash
# Stop all services
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (clean slate)
docker-compose -f docker-compose.dev.yml down -v
```

## 🔧 Step 3: GitLab CI/CD Setup

### Prerequisites

1. **GitLab Account**: ✅ Created
2. **GitLab Repository**: Create a new repository
3. **GitLab Runner**: Use shared runners or set up your own

### A. Create GitLab Repository

```bash
# Initialize git (if not already done)
cd backend
git init

# Add GitLab remote
git remote add origin https://gitlab.com/YOUR_USERNAME/whatsapp-crm-backend.git

# Add files
git add .

# Commit
git commit -m "Initial commit with Docker and CI/CD setup"

# Push to GitLab
git push -u origin main
```

### B. Configure GitLab CI/CD Variables

Go to: **Settings > CI/CD > Variables** and add:

#### Required Variables:

1. **POSTGRES_USER**: `postgres`
2. **POSTGRES_PASSWORD**: `your-secure-password`
3. **POSTGRES_DB**: `whatsapp_crm_test`
4. **REDIS_PASSWORD**: `your-redis-password`
5. **JWT_SECRET**: `your-jwt-secret-min-32-chars`
6. **JWT_REFRESH_SECRET**: `your-jwt-refresh-secret-min-32-chars`
7. **ENCRYPTION_KEY**: `your-encryption-key-min-32-chars`

#### For Staging Deployment (Optional):

8. **STAGING_HOST**: Your staging server IP/domain
9. **STAGING_USER**: SSH username
10. **STAGING_SSH_PRIVATE_KEY**: SSH private key (for deployment)
11. **STAGING_PORT**: SSH port (default: 22)

#### For Production Deployment (Optional):

12. **PROD_HOST**: Your production server IP/domain
13. **PROD_USER**: SSH username
14. **PROD_SSH_PRIVATE_KEY**: SSH private key
15. **PROD_PORT**: SSH port (default: 22)

#### For Notifications (Optional):

16. **SLACK_WEBHOOK_URL**: Slack webhook for notifications

### C. Enable GitLab Container Registry

1. Go to **Settings > General > Visibility**
2. Enable **Container Registry**
3. Note your registry URL: `registry.gitlab.com/YOUR_USERNAME/whatsapp-crm-backend`

### D. Update .gitlab-ci.yml

The `.gitlab-ci.yml` file is already configured. Update these values:

```yaml
# Line 8: Update image name
IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA

# Line 9: Update latest tag
LATEST_TAG: $CI_REGISTRY_IMAGE:latest
```

### E. Test CI/CD Pipeline

```bash
# Push to trigger pipeline
git add .
git commit -m "Test CI/CD pipeline"
git push origin main
```

### F. Monitor Pipeline

1. Go to **CI/CD > Pipelines**
2. Click on the running pipeline
3. View job logs for each stage:
   - **lint**: Code linting
   - **test**: Unit tests with coverage
   - **security-scan**: Security vulnerability scan
   - **build**: Docker image build
   - **deploy-staging**: Auto-deploy to staging (if configured)

### G. Pipeline Stages

The pipeline includes:

1. **Lint Stage**: ESLint and Prettier checks
2. **Test Stage**: Jest tests with PostgreSQL and Redis
3. **Security Scan Stage**: Trivy vulnerability scanning
4. **Build Stage**: Docker image build and push
5. **Deploy Staging Stage**: Auto-deploy to staging (on main branch)
6. **Deploy Production Stage**: Manual deployment (on tags)

## 🚀 Step 4: Production Deployment (Optional)

### Using Docker Compose

```bash
# On production server
cd /opt/whatsapp-crm-backend

# Copy production environment
cp .env.prod .env

# Update environment variables
nano .env

# Initialize SSL certificates
./scripts/init-letsencrypt.sh

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Check health
curl https://api.your-domain.com/health
```

### Access Monitoring

- **Grafana**: http://your-server:3000 (admin/admin)
- **Prometheus**: http://your-server:9090
- **Alertmanager**: http://your-server:9093
- **Uptime Kuma**: http://your-server:3001

## 📊 Step 5: Verify Everything Works

### Checklist

- [ ] Docker image builds successfully
- [ ] Development environment starts with docker-compose
- [ ] Health endpoints return 200
- [ ] Database migrations run successfully
- [ ] Redis connection works
- [ ] Bull Board dashboard accessible
- [ ] GitLab repository created
- [ ] GitLab CI/CD variables configured
- [ ] Pipeline runs successfully
- [ ] Tests pass in CI
- [ ] Docker image pushed to registry
- [ ] (Optional) Staging deployment works
- [ ] (Optional) Production deployment works
- [ ] (Optional) Monitoring dashboards accessible

## 🐛 Troubleshooting

### Docker Build Issues

**Issue**: `package-lock.json not found`
**Solution**: Removed from `.dockerignore` ✅

**Issue**: Puppeteer Chromium download fails
**Solution**: Added `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` ✅

### Docker Compose Issues

**Issue**: Port already in use
```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>
```

**Issue**: Database connection failed
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify DATABASE_URL in .env
```

### GitLab CI/CD Issues

**Issue**: Pipeline fails on test stage
- Check CI/CD variables are set correctly
- Verify DATABASE_URL format
- Check Redis connection

**Issue**: Docker build fails in CI
- Verify GitLab Runner has Docker support
- Check Docker image size limits
- Verify registry authentication

**Issue**: Deployment fails
- Verify SSH keys are correct
- Check server accessibility
- Verify deployment paths exist

## 📚 Next Steps

1. ✅ Build Docker image locally
2. ⏳ Test development environment
3. ⏳ Set up GitLab repository
4. ⏳ Configure CI/CD variables
5. ⏳ Test CI/CD pipeline
6. ⏳ Deploy to staging (optional)
7. ⏳ Set up monitoring (optional)
8. ⏳ Deploy to production (optional)

## 📞 Support

- **Documentation**: See `docs/` directory
- **Deployment Guide**: `docs/DEPLOYMENT.md`
- **DevOps Setup**: `docs/DEVOPS_SETUP.md`
- **Environment Variables**: `docs/ENVIRONMENT_VARIABLES.md`

---

**Current Status**: ✅ Docker image build successful
**Next Step**: Test development environment with Docker Compose
