# Third-Party Services & Environment Variables Setup Guide

## Overview

This document lists all 3rd party services, APIs, and environment variables required for the WhatsApp CRM Backend (Tasks 1-28 completed).

---

## 🔴 REQUIRED Services (System Won't Work Without These)

### 1. PostgreSQL Database
**Status:** ✅ REQUIRED  
**Purpose:** Primary data storage  
**Setup:**
```bash
# Install PostgreSQL
brew install postgresql  # macOS
# or
sudo apt-get install postgresql  # Linux

# Create database
createdb whatsapp_crm_dev

# Set environment variable
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_crm_dev
```

**Environment Variables:**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_crm_dev
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

**Verification:**
```bash
cd backend
npx prisma migrate status
```

---

### 2. Redis
**Status:** ✅ REQUIRED  
**Purpose:** Queue management, caching, Socket.io adapter  
**Setup:**
```bash
# Install Redis
brew install redis  # macOS
# or
sudo apt-get install redis-server  # Linux

# Start Redis
redis-server

# Verify
redis-cli ping  # Should return PONG
```

**Environment Variables:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**Impact if Missing:**
- ❌ Queue system won't work
- ❌ Background jobs fail
- ❌ Socket.io won't scale
- ❌ Campaign processing fails

---

### 3. JWT Secret
**Status:** ✅ REQUIRED  
**Purpose:** Authentication token signing  
**Setup:**
```bash
# Generate secure secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Environment Variables:**
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
```

**Impact if Missing:**
- ❌ Authentication won't work
- ❌ Users can't login

---

### 4. Encryption Key
**Status:** ✅ REQUIRED  
**Purpose:** Encrypt sensitive data (AI API keys, credentials)  
**Setup:**
```bash
# Generate 32-character key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

**Environment Variables:**
```env
ENCRYPTION_KEY=your-32-character-encryption-key-change-this
```

**Impact if Missing:**
- ❌ AI provider credentials can't be stored
- ❌ Sensitive data storage fails

---

## 🟡 OPTIONAL Services (Features Work Without These)

### 5. Email Service (SMTP or SendGrid)
**Status:** 🟡 OPTIONAL  
**Purpose:** Send emails (verification, password reset, notifications)  
**Impact:** Email features disabled, but system works

**Option A: SMTP (Gmail, Outlook, etc.)**
```env
EMAIL_SERVICE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@whatsappcrm.com
```

**Option B: SendGrid**
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxx
EMAIL_FROM=noreply@whatsappcrm.com
```

**Features Affected:**
- Email verification
- Password reset
- Email notifications
- Welcome emails

**Workaround:** System works, but users need manual verification

---

### 6. File Storage (AWS S3 or Cloudinary)
**Status:** 🟡 OPTIONAL  
**Purpose:** Store media files (images, videos, documents)  
**Impact:** Files stored locally if not configured

**Option A: AWS S3**
```env
AWS_ACCESS_KEY_ID=AKIAXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=whatsapp-crm-media
```

**Option B: Cloudinary**
```env
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=xxxxx
CLOUDINARY_API_SECRET=xxxxx
```

**Features Affected:**
- Media file uploads
- Campaign media
- Contact profile pictures

**Workaround:** Files stored in `./uploads` directory

---

### 7. AI Providers (OpenAI, Claude, Gemini, etc.)
**Status:** 🟡 OPTIONAL  
**Purpose:** Chatbot functionality  
**Impact:** Chatbot features disabled if not configured

**Supported Providers:**

**OpenAI (GPT-4, GPT-3.5)**
```env
OPENAI_API_KEY=sk-xxxxx
```
- Cost: $0.03/1K tokens (GPT-4)
- Signup: https://platform.openai.com

**Anthropic Claude**
```env
ANTHROPIC_API_KEY=sk-ant-xxxxx
```
- Cost: $0.015/1K tokens
- Signup: https://console.anthropic.com

**Google Gemini**
```env
GOOGLE_AI_API_KEY=AIzaSyxxxxx
```
- Cost: Free tier available
- Signup: https://makersuite.google.com

**Cohere**
```env
COHERE_API_KEY=xxxxx
```
- Cost: Free tier available
- Signup: https://cohere.com

**Ollama (Self-hosted, FREE)**
```env
OLLAMA_BASE_URL=http://localhost:11434
```
- Cost: FREE (runs locally)
- Setup: https://ollama.ai

**Features Affected:**
- AI Chatbots
- Automated responses
- Conversation AI

**Workaround:** Use Ollama (free, self-hosted) or disable chatbot features

---

### 8. Voice Transcription (Whisper API or Whisper.cpp)
**Status:** 🟡 OPTIONAL  
**Purpose:** Transcribe voice messages  
**Impact:** Voice transcription disabled if not configured

**Option A: OpenAI Whisper API**
```env
OPENAI_API_KEY=sk-xxxxx
```
- Cost: $0.006/minute
- Same key as OpenAI above

**Option B: Whisper.cpp (Self-hosted, FREE)**
```bash
# Install whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make
bash ./models/download-ggml-model.sh base

# Set environment
WHISPER_CPP_PATH=/path/to/whisper.cpp/main
WHISPER_MODEL_PATH=/path/to/whisper.cpp/models
WHISPER_MODEL=base
```

**Features Affected:**
- Voice message transcription
- Audio to text conversion

**Workaround:** Use Whisper.cpp (free) or disable transcription

---

### 9. Error Tracking (Sentry)
**Status:** 🟡 OPTIONAL  
**Purpose:** Error monitoring and tracking  
**Impact:** No error tracking, but system works

```env
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=production
```

**Signup:** https://sentry.io (Free tier available)

---

### 10. E-commerce Integrations
**Status:** 🟡 OPTIONAL  
**Purpose:** Shopify/WooCommerce integration  
**Impact:** E-commerce features disabled

**Shopify**
```env
SHOPIFY_API_KEY=xxxxx
SHOPIFY_API_SECRET=xxxxx
SHOPIFY_SCOPES=read_orders,write_orders
```

**WooCommerce**
```env
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx
```

**Features Affected:**
- Order sync
- Product catalog
- Customer sync

---

### 11. Payment Gateways
**Status:** 🟡 OPTIONAL  
**Purpose:** Payment processing  
**Impact:** Payment features disabled

**Stripe**
```env
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

**PayPal**
```env
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx
PAYPAL_MODE=sandbox
```

**Razorpay**
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
```

---

## 📋 Quick Setup Checklist

### Minimum Required (System Won't Start)
- [ ] PostgreSQL installed and running
- [ ] Database created (`whatsapp_crm_dev`)
- [ ] Redis installed and running
- [ ] `DATABASE_URL` set in `.env`
- [ ] `JWT_SECRET` generated and set
- [ ] `ENCRYPTION_KEY` generated and set
- [ ] Run `npx prisma migrate deploy`

### Recommended for Full Features
- [ ] Email service configured (SMTP or SendGrid)
- [ ] File storage configured (S3 or Cloudinary)
- [ ] At least one AI provider (Ollama is free)
- [ ] Whisper.cpp for transcription (free)

### Optional Enhancements
- [ ] Sentry for error tracking
- [ ] E-commerce integrations
- [ ] Payment gateways

---

## 🚀 Quick Start Commands

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Generate Secrets
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Encryption Key
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

### 4. Setup Database
```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. Start Services
```bash
# Start Redis
redis-server

# Start PostgreSQL (if not running)
brew services start postgresql

# Start application
npm start
```

---

## 🔍 Verification Commands

### Check PostgreSQL
```bash
psql -U postgres -c "SELECT version();"
```

### Check Redis
```bash
redis-cli ping
```

### Check Database Connection
```bash
cd backend
npx prisma db pull
```

### Check Environment Variables
```bash
node -e "require('dotenv').config(); console.log('DB:', !!process.env.DATABASE_URL, 'Redis:', !!process.env.REDIS_HOST, 'JWT:', !!process.env.JWT_SECRET)"
```

### Test API
```bash
curl http://localhost:4000/health
```

---

## 💰 Cost Breakdown

### FREE Options
- ✅ PostgreSQL (self-hosted)
- ✅ Redis (self-hosted)
- ✅ Ollama AI (self-hosted)
- ✅ Whisper.cpp (self-hosted)
- ✅ Local file storage

**Total: $0/month**

### Paid Options (Optional)
- OpenAI GPT-4: ~$30-100/month (depending on usage)
- AWS S3: ~$5-20/month
- SendGrid: Free tier (100 emails/day), then $15/month
- Sentry: Free tier (5K errors/month)
- Stripe: 2.9% + $0.30 per transaction

---

## 🐛 Troubleshooting

### "No transcription providers configured"
**Solution:** Add `OPENAI_API_KEY` or setup Whisper.cpp

### "Redis connection failed"
**Solution:** Start Redis with `redis-server`

### "Database connection failed"
**Solution:** Check PostgreSQL is running and `DATABASE_URL` is correct

### "Email sending failed"
**Solution:** Configure SMTP or SendGrid, or disable email features

### "AI provider not found"
**Solution:** Add at least one AI provider API key or use Ollama

---

## 📝 Environment Variable Priority

1. **CRITICAL** (System won't start):
   - `DATABASE_URL`
   - `REDIS_HOST`
   - `JWT_SECRET`
   - `ENCRYPTION_KEY`

2. **HIGH** (Core features affected):
   - `SMTP_*` or `SENDGRID_API_KEY`
   - `AWS_*` or `CLOUDINARY_*`

3. **MEDIUM** (Optional features):
   - `OPENAI_API_KEY` (or other AI providers)
   - `WHISPER_*`

4. **LOW** (Nice to have):
   - `SENTRY_DSN`
   - `SHOPIFY_*`
   - `STRIPE_*`

---

## 🎯 Recommended Setup for Development

```env
# Required
DATABASE_URL=postgresql://postgres:password@localhost:5432/whatsapp_crm_dev
REDIS_HOST=localhost
JWT_SECRET=<generated-secret>
ENCRYPTION_KEY=<generated-key>

# Recommended
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Optional (use free alternatives)
OLLAMA_BASE_URL=http://localhost:11434
WHISPER_CPP_PATH=/usr/local/bin/whisper
```

---

## 🎯 Recommended Setup for Production

```env
# Required
DATABASE_URL=<production-postgres-url>
REDIS_HOST=<production-redis-host>
JWT_SECRET=<strong-secret>
ENCRYPTION_KEY=<strong-key>

# Recommended
SENDGRID_API_KEY=<sendgrid-key>
AWS_S3_BUCKET=<s3-bucket>
SENTRY_DSN=<sentry-dsn>

# AI (choose one)
OPENAI_API_KEY=<openai-key>
# or
ANTHROPIC_API_KEY=<claude-key>
```

---

## Summary

**Minimum to run:** PostgreSQL + Redis + JWT Secret + Encryption Key  
**Recommended:** + Email service + File storage  
**Full features:** + AI provider + Transcription service  

The system is designed to work with minimal setup and gracefully degrade features when optional services aren't configured.
