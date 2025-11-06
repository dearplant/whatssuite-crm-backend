# GitLab CI/CD Setup Guide

## 📋 Overview

This guide will help you set up GitLab CI/CD for the WhatsApp CRM Backend project.

## ✅ Prerequisites

- [x] GitLab account created
- [ ] Docker image builds successfully locally
- [ ] Development environment tested locally

## 🚀 Step-by-Step Setup

### Step 1: Create GitLab Repository

1. **Go to GitLab**: https://gitlab.com
2. **Click "New project"**
3. **Choose "Create blank project"**
4. **Fill in details**:
   - Project name: `whatsapp-crm-backend`
   - Visibility: Private (recommended)
   - Initialize with README: No (we already have code)
5. **Click "Create project"**

### Step 2: Push Code to GitLab

```bash
# Navigate to backend directory
cd backend

# Initialize git (if not already done)
git init

# Add GitLab remote (replace YOUR_USERNAME)
git remote add origin https://gitlab.com/YOUR_USERNAME/whatsapp-crm-backend.git

# Or if using SSH
git remote add origin git@gitlab.com:YOUR_USERNAME/whatsapp-crm-backend.git

# Check current branch
git branch

# If not on main, create and switch to main
git checkout -b main

# Add all files
git add .

# Commit
git commit -m "Initial commit: Docker and CI/CD setup"

# Push to GitLab
git push -u origin main
```

### Step 3: Enable GitLab Container Registry

1. Go to your project in GitLab
2. Navigate to **Settings > General**
3. Expand **Visibility, project features, permissions**
4. Enable **Container Registry**
5. Click **Save changes**

Your registry URL will be: `registry.gitlab.com/YOUR_USERNAME/whatsapp-crm-backend`

### Step 4: Configure CI/CD Variables

Go to: **Settings > CI/CD > Variables** and click **Add variable** for each:

#### Essential Variables (Required for CI/CD to work):

| Variable Name | Value | Protected | Masked | Description |
|---------------|-------|-----------|--------|-------------|
| `POSTGRES_USER` | `postgres` | No | No | PostgreSQL username |
| `POSTGRES_PASSWORD` | `your-secure-password` | No | Yes | PostgreSQL password |
| `POSTGRES_DB` | `whatsapp_crm_test` | No | No | Test database name |
| `REDIS_PASSWORD` | `redis123` | No | Yes | Redis password |
| `JWT_SECRET` | `test-jwt-secret-min-32-characters-long` | No | Yes | JWT signing secret |
| `JWT_REFRESH_SECRET` | `test-jwt-refresh-secret-min-32-characters` | No | Yes | JWT refresh secret |
| `ENCRYPTION_KEY` | `test-encryption-key-min-32-characters-long` | No | Yes | Encryption key |

**How to add variables:**
1. Click **Add variable**
2. Enter **Key** (variable name)
3. Enter **Value**
4. Check **Masked** for sensitive values
5. Leave **Protected** unchecked for now
6. Click **Add variable**

#### Optional: Staging Deployment Variables

Only add these if you have a staging server:

| Variable Name | Value | Protected | Masked |
|---------------|-------|-----------|--------|
| `STAGING_HOST` | `staging.example.com` | Yes | No |
| `STAGING_USER` | `deploy` | Yes | No |
| `STAGING_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Yes | Yes |
| `STAGING_PORT` | `22` | Yes | No |

#### Optional: Production Deployment Variables

Only add these if you have a production server:

| Variable Name | Value | Protected | Masked |
|---------------|-------|-----------|--------|
| `PROD_HOST` | `api.example.com` | Yes | No |
| `PROD_USER` | `deploy` | Yes | No |
| `PROD_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Yes | Yes |
| `PROD_PORT` | `22` | Yes | No |

#### Optional: Notification Variables

| Variable Name | Value | Protected | Masked |
|---------------|-------|-----------|--------|
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/services/...` | No | Yes |

### Step 5: Update .gitlab-ci.yml (if needed)

The `.gitlab-ci.yml` file is already configured, but you may want to update:

```yaml
# Line 5-6: Update image names if needed
variables:
  IMAGE_TAG: $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA
  LATEST_TAG: $CI_REGISTRY_IMAGE:latest
```

### Step 6: Enable GitLab Runners

GitLab provides shared runners by default. To verify:

1. Go to **Settings > CI/CD**
2. Expand **Runners**
3. Verify **Shared runners** are enabled
4. You should see available shared runners listed

If you want to use your own runner:
```bash
# Install GitLab Runner
curl -L https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.deb.sh | sudo bash
sudo apt-get install gitlab-runner

# Register runner
sudo gitlab-runner register
# Follow prompts and enter your project's registration token
```

### Step 7: Test the CI/CD Pipeline

```bash
# Make a small change to trigger pipeline
echo "# CI/CD Test" >> README.md

# Commit and push
git add README.md
git commit -m "Test CI/CD pipeline"
git push origin main
```

### Step 8: Monitor Pipeline Execution

1. Go to **CI/CD > Pipelines** in GitLab
2. Click on the running pipeline
3. Watch each job execute:
   - **lint**: Code quality checks
   - **test**: Unit tests with coverage
   - **security-scan**: Vulnerability scanning
   - **build**: Docker image build and push

### Step 9: View Pipeline Results

#### Successful Pipeline:
- All jobs show green checkmarks ✅
- Docker image pushed to registry
- Coverage report available

#### Failed Pipeline:
- Click on failed job to view logs
- Common issues:
  - Missing CI/CD variables
  - Test failures
  - Build errors

## 📊 Pipeline Stages Explained

### 1. Lint Stage
- Runs ESLint to check code quality
- Runs Prettier to check code formatting
- **Duration**: ~30 seconds
- **Fails if**: Code has linting errors or formatting issues

### 2. Test Stage
- Starts PostgreSQL and Redis services
- Runs Jest tests with coverage
- Generates coverage report
- **Duration**: ~2-3 minutes
- **Fails if**: Tests fail or coverage is too low

### 3. Security Scan Stage
- Runs Trivy to scan for vulnerabilities
- Runs npm audit for dependency issues
- **Duration**: ~1-2 minutes
- **Fails if**: Critical vulnerabilities found

### 4. Build Stage
- Builds Docker image
- Pushes to GitLab Container Registry
- **Duration**: ~3-5 minutes (first time), ~1-2 minutes (cached)
- **Fails if**: Docker build fails

### 5. Deploy Staging Stage (Optional)
- Automatically deploys to staging server
- Only runs on `main` branch
- **Duration**: ~1-2 minutes
- **Requires**: Staging server variables configured

### 6. Deploy Production Stage (Optional)
- Manual deployment to production
- Only runs on tags
- **Duration**: ~2-3 minutes
- **Requires**: Production server variables configured

## 🎯 Testing the Full Pipeline

### Test 1: Lint Check
```bash
# Intentionally break linting
echo "const x = 1" >> backend/src/test.js

git add .
git commit -m "Test lint failure"
git push origin main

# Pipeline should fail at lint stage
# Fix it:
rm backend/src/test.js
git add .
git commit -m "Fix lint"
git push origin main
```

### Test 2: Test Failure
```bash
# Modify a test to fail
# Edit backend/tests/auth.test.js
# Change an assertion to fail

git add .
git commit -m "Test test failure"
git push origin main

# Pipeline should fail at test stage
# Fix it and push again
```

### Test 3: Successful Build
```bash
# Make a valid change
echo "// Comment" >> backend/src/server.js

git add .
git commit -m "Test successful build"
git push origin main

# Pipeline should pass all stages
```

## 🔍 Viewing Build Artifacts

### Docker Images
1. Go to **Packages & Registries > Container Registry**
2. You'll see your Docker images with tags:
   - `latest`: Latest build from main
   - `main-abc123`: Build from main branch with commit SHA
   - `v1.0.0`: Tagged releases

### Coverage Reports
1. Go to **CI/CD > Pipelines**
2. Click on a pipeline
3. Click on **test** job
4. View coverage percentage in job output

### Test Results
1. In the **test** job logs
2. Look for test summary at the end
3. Coverage report shows:
   - Statements coverage
   - Branches coverage
   - Functions coverage
   - Lines coverage

## 🚀 Deploying to Staging/Production

### Staging Deployment (Automatic)
```bash
# Push to main branch
git push origin main

# Pipeline runs automatically
# If all tests pass, deploys to staging
```

### Production Deployment (Manual)
```bash
# Create a tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Go to GitLab: CI/CD > Pipelines
# Find the pipeline for the tag
# Click "Play" button on deploy-production job
# Confirm deployment
```

## 🐛 Troubleshooting

### Issue: Pipeline doesn't start
**Solution**: 
- Check if `.gitlab-ci.yml` exists in repository root
- Verify GitLab Runners are enabled
- Check repository settings allow CI/CD

### Issue: Test stage fails with database connection error
**Solution**:
- Verify `POSTGRES_*` variables are set correctly
- Check `DATABASE_URL` format in `.gitlab-ci.yml`
- Ensure PostgreSQL service is configured correctly

### Issue: Build stage fails with "unauthorized" error
**Solution**:
- Verify Container Registry is enabled
- Check if you're logged in to GitLab registry
- Verify `CI_REGISTRY_USER` and `CI_REGISTRY_PASSWORD` are available

### Issue: Deploy stage fails with SSH error
**Solution**:
- Verify SSH private key is correct
- Check server is accessible
- Verify SSH key has correct permissions
- Test SSH connection manually

### Issue: Security scan fails
**Solution**:
- Review vulnerability report
- Update dependencies: `npm audit fix`
- If false positives, adjust Trivy configuration

## 📈 Best Practices

### 1. Branch Protection
- Go to **Settings > Repository > Protected branches**
- Protect `main` branch
- Require pipeline to pass before merging

### 2. Merge Request Pipelines
- Create feature branches
- Open merge requests
- Pipeline runs automatically on MR
- Merge only if pipeline passes

### 3. Semantic Versioning
```bash
# Major release (breaking changes)
git tag -a v2.0.0 -m "Major release"

# Minor release (new features)
git tag -a v1.1.0 -m "New features"

# Patch release (bug fixes)
git tag -a v1.0.1 -m "Bug fixes"

git push origin --tags
```

### 4. Environment-Specific Deployments
- Use different variables for staging/production
- Test in staging before production
- Use manual approval for production

### 5. Monitoring Pipeline Performance
- Check pipeline duration trends
- Optimize slow jobs
- Use caching effectively
- Parallelize independent jobs

## 📚 Additional Resources

- **GitLab CI/CD Docs**: https://docs.gitlab.com/ee/ci/
- **Docker Registry Docs**: https://docs.gitlab.com/ee/user/packages/container_registry/
- **GitLab Runner Docs**: https://docs.gitlab.com/runner/
- **Pipeline Configuration**: https://docs.gitlab.com/ee/ci/yaml/

## ✅ Checklist

- [ ] GitLab repository created
- [ ] Code pushed to GitLab
- [ ] Container Registry enabled
- [ ] CI/CD variables configured
- [ ] Pipeline runs successfully
- [ ] Tests pass
- [ ] Docker image built and pushed
- [ ] (Optional) Staging deployment configured
- [ ] (Optional) Production deployment configured
- [ ] (Optional) Slack notifications configured

## 🎉 Success Criteria

Your CI/CD is working correctly when:

1. ✅ Pipeline runs automatically on push
2. ✅ All stages complete successfully
3. ✅ Docker image appears in Container Registry
4. ✅ Coverage report shows in pipeline
5. ✅ No security vulnerabilities found
6. ✅ (Optional) Staging deploys automatically
7. ✅ (Optional) Production deploys manually

---

**Next Steps After Setup**:
1. Set up branch protection rules
2. Configure merge request pipelines
3. Set up deployment environments
4. Configure monitoring and alerts
5. Document deployment procedures

**Need Help?**
- Check pipeline logs for detailed error messages
- Review GitLab CI/CD documentation
- Check `docs/DEPLOYMENT.md` for deployment guides
- Review `docs/DEVOPS_SETUP.md` for infrastructure overview
