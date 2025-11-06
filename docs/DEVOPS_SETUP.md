# DevOps & Deployment Setup - Complete Guide

This document provides an overview of the complete DevOps and deployment infrastructure for the WhatsApp CRM Backend.

## 📋 Overview

Task 0 "Initialize Docker environment" and all its subtasks have been successfully implemented, providing a production-ready deployment infrastructure with:

- ✅ Docker containerization with multi-stage builds
- ✅ Docker Compose configurations for all environments
- ✅ Environment-specific configurations (.env files)
- ✅ CI/CD pipelines (GitHub Actions & GitLab CI)
- ✅ Reverse proxy with SSL (Nginx & Traefik)
- ✅ Health checks and monitoring (Prometheus, Grafana, Alertmanager)
- ✅ Deployment strategies (PM2, Kubernetes)
- ✅ Comprehensive documentation

## 🚀 Quick Start

### Development

```bash
# Load development environment
./scripts/load-env.sh dev

# Start services
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Production

```bash
# Load production environment
./scripts/load-env.sh prod

# Initialize SSL certificates
./scripts/init-letsencrypt.sh

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Start monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

## 📁 File Structure

```
backend/
├── .dockerignore                    # Docker ignore patterns
├── Dockerfile                       # Production Docker image
├── Dockerfile.dev                   # Development Docker image
├── docker-compose.yml               # Base Docker Compose
├── docker-compose.dev.yml           # Development environment
├── docker-compose.prod.yml          # Production with Nginx
├── docker-compose.traefik.yml       # Production with Traefik
├── docker-compose.monitoring.yml    # Monitoring stack
├── ecosystem.config.js              # PM2 configuration
├── bull-board-server.js             # Queue monitoring server
│
├── .env.dev                         # Development environment variables
├── .env.staging                     # Staging environment variables
├── .env.prod                        # Production environment variables
│
├── .github/workflows/               # GitHub Actions CI/CD
│   ├── ci.yml                       # Continuous Integration
│   ├── cd-staging.yml               # Deploy to Staging
│   └── cd-production.yml            # Deploy to Production
│
├── .gitlab-ci.yml                   # GitLab CI/CD pipeline
│
├── nginx/                           # Nginx reverse proxy
│   ├── nginx.conf                   # Main Nginx config
│   └── conf.d/
│       └── backend.conf             # Backend server config
│
├── traefik/                         # Traefik reverse proxy
│   ├── traefik.yml                  # Main Traefik config
│   └── dynamic/
│       └── middleware.yml           # Middleware config
│
├── k8s/                             # Kubernetes manifests
│   ├── namespace.yaml               # Namespace definition
│   ├── configmap.yaml               # Configuration
│   ├── secrets.yaml                 # Secrets template
│   ├── deployment.yaml              # Deployment & PVC
│   ├── service.yaml                 # Services
│   ├── ingress.yaml                 # Ingress rules
│   └── hpa.yaml                     # Auto-scaling
│
├── monitoring/                      # Monitoring configuration
│   ├── prometheus/
│   │   ├── prometheus.yml           # Prometheus config
│   │   └── rules/
│   │       └── alerts.yml           # Alert rules
│   ├── grafana/
│   │   └── provisioning/
│   │       ├── datasources/         # Data sources
│   │       └── dashboards/          # Dashboard config
│   └── alertmanager/
│       └── config.yml               # Alert routing
│
├── scripts/                         # Utility scripts
│   ├── load-env.sh                  # Load environment config
│   └── init-letsencrypt.sh          # SSL certificate setup
│
└── docs/                            # Documentation
    ├── ENVIRONMENT_VARIABLES.md     # Environment variables guide
    ├── DEPLOYMENT.md                # Deployment guide
    └── DEVOPS_SETUP.md              # This file
```

## 🔧 Configuration Files

### Docker

- **Dockerfile**: Multi-stage production build with optimized layers
- **Dockerfile.dev**: Development build with hot reload
- **.dockerignore**: Excludes unnecessary files from Docker context

### Docker Compose

- **docker-compose.yml**: Base configuration
- **docker-compose.dev.yml**: Development with hot reload
- **docker-compose.prod.yml**: Production with Nginx and SSL
- **docker-compose.traefik.yml**: Production with Traefik
- **docker-compose.monitoring.yml**: Monitoring stack

### Environment Variables

- **.env.dev**: Development configuration
- **.env.staging**: Staging configuration
- **.env.prod**: Production configuration (use secrets manager in production!)

### CI/CD

- **.github/workflows/ci.yml**: Lint, test, build, security scan
- **.github/workflows/cd-staging.yml**: Auto-deploy to staging
- **.github/workflows/cd-production.yml**: Manual deploy to production
- **.gitlab-ci.yml**: GitLab CI/CD alternative

### Reverse Proxy

#### Nginx
- **nginx/nginx.conf**: Main configuration
- **nginx/conf.d/backend.conf**: Backend routing, SSL, rate limiting

#### Traefik
- **traefik/traefik.yml**: Main configuration
- **traefik/dynamic/middleware.yml**: Middleware (rate limiting, security headers)

### Kubernetes

- **k8s/namespace.yaml**: Namespace for isolation
- **k8s/configmap.yaml**: Non-sensitive configuration
- **k8s/secrets.yaml**: Sensitive data (template)
- **k8s/deployment.yaml**: Application deployment with 3 replicas
- **k8s/service.yaml**: ClusterIP service with sticky sessions
- **k8s/ingress.yaml**: Ingress with SSL and WebSocket support
- **k8s/hpa.yaml**: Horizontal Pod Autoscaler (3-10 replicas)

### Monitoring

- **monitoring/prometheus/prometheus.yml**: Metrics collection
- **monitoring/prometheus/rules/alerts.yml**: Alert rules
- **monitoring/grafana/provisioning/**: Grafana configuration
- **monitoring/alertmanager/config.yml**: Alert routing (Slack, PagerDuty, Email)

### Process Management

- **ecosystem.config.js**: PM2 configuration for cluster mode

## 🌐 Deployment Options

### 1. Docker Compose (Recommended)

**Best for**: Single-server deployments, small to medium scale

**Pros**:
- Easy setup and management
- All services included
- Good for most use cases

**Cons**:
- Limited to single server
- Manual scaling

**Setup**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 2. PM2

**Best for**: Traditional VPS/bare metal deployments

**Pros**:
- Direct Node.js process management
- Cluster mode for multi-core
- Simple and lightweight

**Cons**:
- Requires manual service setup (PostgreSQL, Redis)
- Less isolation than containers

**Setup**:
```bash
pm2 start ecosystem.config.js --env production
```

### 3. Kubernetes

**Best for**: Enterprise, high-scale, multi-region deployments

**Pros**:
- Auto-scaling and self-healing
- Rolling updates
- Multi-region support
- High availability

**Cons**:
- Complex setup
- Higher resource overhead
- Steeper learning curve

**Setup**:
```bash
kubectl apply -f k8s/
```

## 📊 Monitoring Stack

### Components

1. **Prometheus**: Metrics collection and storage
2. **Grafana**: Visualization and dashboards
3. **Alertmanager**: Alert routing and management
4. **Node Exporter**: System metrics
5. **PostgreSQL Exporter**: Database metrics
6. **Redis Exporter**: Cache metrics
7. **cAdvisor**: Container metrics
8. **Uptime Kuma**: Uptime monitoring

### Access

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **Uptime Kuma**: http://localhost:3001

### Alerts

Configured alerts for:
- Service down
- High error rate
- High response time
- High memory/CPU usage
- Database connection issues
- Redis connection issues
- Queue backlog
- Failed jobs
- Low disk space
- SSL certificate expiry

## 🔐 Security Features

### Implemented

- ✅ Multi-stage Docker builds (minimal attack surface)
- ✅ Non-root user in containers
- ✅ SSL/TLS with Let's Encrypt
- ✅ Rate limiting (Nginx/Traefik)
- ✅ Security headers (HSTS, CSP, etc.)
- ✅ Secrets management (Kubernetes secrets, environment variables)
- ✅ Network isolation (Docker networks)
- ✅ Health checks and liveness probes
- ✅ Security scanning in CI/CD (Trivy)
- ✅ Dependency auditing (npm audit)

### Recommended

- Use secrets management system (AWS Secrets Manager, HashiCorp Vault)
- Enable database encryption at rest
- Configure firewall rules
- Set up VPN for admin access
- Enable audit logging
- Implement intrusion detection (fail2ban)
- Regular security updates
- Penetration testing

## 🔄 CI/CD Pipeline

### GitHub Actions

**Continuous Integration** (on push/PR):
1. Lint code
2. Run tests with coverage
3. Build Docker image
4. Security scan (Trivy, npm audit)

**Continuous Deployment - Staging** (on push to main):
1. Build and push Docker image
2. Deploy to staging server
3. Run smoke tests
4. Notify team (Slack)
5. Rollback on failure

**Continuous Deployment - Production** (manual trigger):
1. Build and push Docker image
2. Manual approval gate
3. Create backup
4. Deploy with zero-downtime
5. Run smoke tests and load tests
6. Notify team (Slack)
7. Rollback on failure

### GitLab CI

Similar pipeline with GitLab-specific features:
- Integrated container registry
- Built-in security scanning
- Environment-specific deployments
- Manual approval for production

## 📈 Scaling Guidelines

### Vertical Scaling

Increase resources per instance:
- CPU: 2 → 4 cores
- Memory: 2GB → 4GB

### Horizontal Scaling

Add more instances:
- Docker Compose: `--scale backend=3`
- PM2: `pm2 scale app 4`
- Kubernetes: Auto-scales 3-10 replicas based on CPU/memory

### Metrics Thresholds

| Metric | Scale Up | Scale Down |
|--------|----------|------------|
| CPU | > 70% | < 30% |
| Memory | > 80% | < 40% |
| Request Rate | > 1000/s | < 200/s |
| Response Time (p95) | > 500ms | < 100ms |

## 🆘 Troubleshooting

### Common Issues

1. **Database connection failed**
   - Check DATABASE_URL
   - Verify PostgreSQL is running
   - Check network connectivity

2. **Redis connection failed**
   - Check REDIS_HOST and REDIS_PORT
   - Verify Redis is running
   - Check REDIS_PASSWORD

3. **SSL certificate issues**
   - Run `./scripts/init-letsencrypt.sh`
   - Check domain DNS records
   - Verify port 80/443 are open

4. **High memory usage**
   - Check for memory leaks
   - Increase memory limits
   - Scale horizontally

5. **Application not starting**
   - Check logs: `docker-compose logs backend`
   - Verify environment variables
   - Check Prisma Client generation

### Health Checks

```bash
# Basic health
curl https://api.whatsapp-crm.com/health

# Detailed health
curl https://api.whatsapp-crm.com/health/detailed

# Readiness
curl https://api.whatsapp-crm.com/readiness
```

## 📚 Documentation

- [Environment Variables](./ENVIRONMENT_VARIABLES.md) - Complete environment variable reference
- [Deployment Guide](./DEPLOYMENT.md) - Detailed deployment instructions
- [Setup Guide](./SETUP.md) - Initial setup and configuration
- [Configuration](./CONFIGURATION.md) - Application configuration

## 🎯 Next Steps

1. **Review environment variables** in `.env.prod`
2. **Update secrets** with strong, random values
3. **Configure DNS** to point to your server
4. **Initialize SSL certificates** with `./scripts/init-letsencrypt.sh`
5. **Deploy to staging** and test thoroughly
6. **Set up monitoring** and configure alerts
7. **Deploy to production** with manual approval
8. **Monitor metrics** and optimize as needed

## 📞 Support

For deployment issues:
- Documentation: https://docs.whatsapp-crm.com
- GitHub Issues: https://github.com/your-org/whatsapp-crm-backend/issues
- Email: devops@whatsapp-crm.com

---

**Status**: ✅ All subtasks completed
**Last Updated**: 2024-01-01
**Version**: 1.0.0
