# Deployment Guide

This document provides comprehensive deployment instructions for the WhatsApp CRM Backend system.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Docker Deployment](#docker-deployment)
- [PM2 Deployment](#pm2-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Zero-Downtime Deployment](#zero-downtime-deployment)
- [Rollback Procedures](#rollback-procedures)
- [Scaling Guidelines](#scaling-guidelines)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **CPU**: Minimum 2 cores, recommended 4+ cores
- **RAM**: Minimum 4GB, recommended 8GB+
- **Disk**: Minimum 20GB, recommended 50GB+ SSD
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / macOS / Windows with WSL2

### Software Requirements

- **Node.js**: v20.x LTS
- **PostgreSQL**: v15+
- **Redis**: v7+
- **Docker**: v24+ (for containerized deployment)
- **Docker Compose**: v2.20+ (for containerized deployment)
- **Kubernetes**: v1.27+ (for K8s deployment)
- **PM2**: v5+ (for process management)

---

## Deployment Options

### 1. Docker Compose (Recommended for most use cases)
- Easy setup and management
- Includes all services (backend, database, Redis, monitoring)
- Suitable for single-server deployments

### 2. PM2 (For traditional VPS/bare metal)
- Direct Node.js process management
- Cluster mode for multi-core utilization
- Suitable for VPS or dedicated servers

### 3. Kubernetes (For enterprise/high-scale)
- Container orchestration
- Auto-scaling and self-healing
- Suitable for cloud deployments (AWS EKS, GCP GKE, Azure AKS)

---

## Docker Deployment

### Development Environment

```bash
# 1. Clone repository
git clone https://github.com/your-org/whatsapp-crm-backend.git
cd whatsapp-crm-backend/backend

# 2. Copy environment file
cp .env.dev .env

# 3. Update environment variables
nano .env

# 4. Start services
docker-compose -f docker-compose.dev.yml up -d

# 5. Run migrations
docker-compose -f docker-compose.dev.yml exec backend npx prisma migrate deploy

# 6. Seed database (optional)
docker-compose -f docker-compose.dev.yml exec backend npm run prisma:seed

# 7. View logs
docker-compose -f docker-compose.dev.yml logs -f backend
```

### Production Environment

```bash
# 1. Clone repository
git clone https://github.com/your-org/whatsapp-crm-backend.git
cd whatsapp-crm-backend/backend

# 2. Copy environment file
cp .env.prod .env

# 3. Update environment variables (use strong secrets!)
nano .env

# 4. Initialize SSL certificates
./scripts/init-letsencrypt.sh

# 5. Start services
docker-compose -f docker-compose.prod.yml up -d

# 6. Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# 7. Verify deployment
curl https://api.whatsapp-crm.com/health
```

### With Monitoring Stack

```bash
# Start main services
docker-compose -f docker-compose.prod.yml up -d

# Start monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Access dashboards
# Grafana: http://localhost:3000 (admin/admin)
# Prometheus: http://localhost:9090
# Alertmanager: http://localhost:9093
```

---

## PM2 Deployment

### Installation

```bash
# 1. Install Node.js v20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Install PM2 globally
npm install -g pm2

# 3. Clone repository
git clone https://github.com/your-org/whatsapp-crm-backend.git
cd whatsapp-crm-backend/backend

# 4. Install dependencies
npm ci --production

# 5. Copy environment file
cp .env.prod .env

# 6. Update environment variables
nano .env

# 7. Generate Prisma Client
npx prisma generate

# 8. Run migrations
npx prisma migrate deploy
```

### Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup

# View logs
pm2 logs whatsapp-crm-backend

# Monitor processes
pm2 monit
```

### PM2 Commands

```bash
# Restart application
pm2 restart whatsapp-crm-backend

# Reload with zero-downtime
pm2 reload whatsapp-crm-backend

# Stop application
pm2 stop whatsapp-crm-backend

# Delete from PM2
pm2 delete whatsapp-crm-backend

# View process info
pm2 info whatsapp-crm-backend

# View logs
pm2 logs whatsapp-crm-backend --lines 100
```

---

## Kubernetes Deployment

### Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Configure kubectl
kubectl config use-context your-cluster
```

### Deploy to Kubernetes

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create secrets (from .env.prod)
kubectl create secret generic backend-secrets \
  --from-env-file=.env.prod \
  -n whatsapp-crm

# 3. Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# 4. Deploy application
kubectl apply -f k8s/deployment.yaml

# 5. Create service
kubectl apply -f k8s/service.yaml

# 6. Setup ingress
kubectl apply -f k8s/ingress.yaml

# 7. Setup auto-scaling
kubectl apply -f k8s/hpa.yaml

# 8. Verify deployment
kubectl get pods -n whatsapp-crm
kubectl get svc -n whatsapp-crm
kubectl get ingress -n whatsapp-crm
```

### Kubernetes Commands

```bash
# View pods
kubectl get pods -n whatsapp-crm

# View logs
kubectl logs -f deployment/backend-deployment -n whatsapp-crm

# Execute command in pod
kubectl exec -it deployment/backend-deployment -n whatsapp-crm -- /bin/sh

# Scale deployment
kubectl scale deployment backend-deployment --replicas=5 -n whatsapp-crm

# Rollout status
kubectl rollout status deployment/backend-deployment -n whatsapp-crm

# Rollback deployment
kubectl rollout undo deployment/backend-deployment -n whatsapp-crm
```

---

## Zero-Downtime Deployment

### Docker Compose Strategy

```bash
# 1. Pull latest image
docker-compose -f docker-compose.prod.yml pull backend

# 2. Scale up (run 2 instances temporarily)
docker-compose -f docker-compose.prod.yml up -d --scale backend=2 --no-recreate

# 3. Wait for new instance to be healthy
sleep 30

# 4. Run migrations (if any)
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# 5. Scale down to 1 instance (removes old container)
docker-compose -f docker-compose.prod.yml up -d --scale backend=1

# 6. Verify
curl https://api.whatsapp-crm.com/health
```

### PM2 Strategy

```bash
# Reload with zero-downtime (cluster mode)
pm2 reload ecosystem.config.js --env production

# Or use graceful reload
pm2 gracefulReload whatsapp-crm-backend
```

### Kubernetes Strategy

```bash
# Update image
kubectl set image deployment/backend-deployment \
  backend=ghcr.io/your-org/whatsapp-crm-backend:v1.2.0 \
  -n whatsapp-crm

# Monitor rollout
kubectl rollout status deployment/backend-deployment -n whatsapp-crm
```

---

## Rollback Procedures

### Docker Compose Rollback

```bash
# 1. Find backup directory
ls -lt /opt/backups/whatsapp-crm-*

# 2. Stop current deployment
docker-compose -f docker-compose.prod.yml down

# 3. Restore from backup
BACKUP_DIR="/opt/backups/whatsapp-crm-20240101-120000"
tar -xzf $BACKUP_DIR/deployment.tar.gz -C /opt/whatsapp-crm-backend

# 4. Restore database (if needed)
gunzip < $BACKUP_DIR/database.sql.gz | \
  docker-compose exec -T postgres psql -U postgres whatsapp_crm_prod

# 5. Start services
docker-compose -f docker-compose.prod.yml up -d
```

### PM2 Rollback

```bash
# 1. Checkout previous version
git log --oneline
git checkout <previous-commit-hash>

# 2. Install dependencies
npm ci --production

# 3. Reload PM2
pm2 reload ecosystem.config.js --env production
```

### Kubernetes Rollback

```bash
# Rollback to previous revision
kubectl rollout undo deployment/backend-deployment -n whatsapp-crm

# Rollback to specific revision
kubectl rollout undo deployment/backend-deployment --to-revision=2 -n whatsapp-crm

# View rollout history
kubectl rollout history deployment/backend-deployment -n whatsapp-crm
```

---

## Scaling Guidelines

### Vertical Scaling (Increase Resources)

**Docker Compose:**
```yaml
# In docker-compose.prod.yml
deploy:
  resources:
    limits:
      cpus: '4'      # Increase from 2
      memory: 4G     # Increase from 2G
```

**Kubernetes:**
```yaml
# In k8s/deployment.yaml
resources:
  requests:
    memory: "1Gi"    # Increase from 512Mi
    cpu: "1000m"     # Increase from 500m
  limits:
    memory: "4Gi"    # Increase from 2Gi
    cpu: "4000m"     # Increase from 2000m
```

### Horizontal Scaling (Add Instances)

**Docker Compose:**
```bash
# Scale to 3 instances
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

**PM2:**
```bash
# Scale to 4 instances
pm2 scale whatsapp-crm-backend 4
```

**Kubernetes:**
```bash
# Manual scaling
kubectl scale deployment backend-deployment --replicas=5 -n whatsapp-crm

# Auto-scaling (already configured in hpa.yaml)
# Scales between 3-10 replicas based on CPU/memory
```

### Load Metrics Thresholds

| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| CPU Usage | > 70% | < 30% |
| Memory Usage | > 80% | < 40% |
| Request Rate | > 1000 req/s | < 200 req/s |
| Response Time (p95) | > 500ms | < 100ms |
| Queue Depth | > 1000 jobs | < 100 jobs |

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check database status
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Test connection
docker-compose exec backend npx prisma db pull
```

#### 2. Redis Connection Failed

```bash
# Check Redis status
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

#### 3. High Memory Usage

```bash
# Check memory usage
docker stats

# Restart with memory limit
docker-compose up -d --force-recreate
```

#### 4. SSL Certificate Issues

```bash
# Renew certificates
docker-compose run --rm certbot renew

# Reload Nginx
docker-compose exec nginx nginx -s reload
```

#### 5. Application Not Starting

```bash
# View logs
docker-compose logs -f backend

# Check environment variables
docker-compose exec backend env

# Verify Prisma Client
docker-compose exec backend npx prisma generate
```

### Health Check Commands

```bash
# Basic health check
curl https://api.whatsapp-crm.com/health

# Detailed health check
curl https://api.whatsapp-crm.com/health/detailed

# Readiness check
curl https://api.whatsapp-crm.com/readiness
```

### Log Analysis

```bash
# View application logs
docker-compose logs -f --tail=100 backend

# View error logs only
docker-compose logs backend | grep ERROR

# View Nginx access logs
docker-compose exec nginx tail -f /var/log/nginx/access.log

# View Nginx error logs
docker-compose exec nginx tail -f /var/log/nginx/error.log
```

---

## Post-Deployment Checklist

- [ ] Verify all services are running
- [ ] Check health endpoints return 200
- [ ] Test authentication flow
- [ ] Verify database migrations applied
- [ ] Check Redis connection
- [ ] Test WebSocket connections
- [ ] Verify SSL certificates
- [ ] Check monitoring dashboards
- [ ] Test email sending
- [ ] Verify file uploads work
- [ ] Check queue processing
- [ ] Review error logs
- [ ] Test API endpoints
- [ ] Verify rate limiting
- [ ] Check backup system
- [ ] Update DNS records (if needed)

---

## Support

For deployment issues or questions:
- Documentation: https://docs.whatsapp-crm.com
- GitHub Issues: https://github.com/your-org/whatsapp-crm-backend/issues
- Email: support@whatsapp-crm.com
- Slack: #deployment-support

---

**Last Updated**: 2024-01-01
**Version**: 1.0.0
