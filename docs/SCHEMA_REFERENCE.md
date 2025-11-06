# Database Schema Reference

This document provides a quick reference for all database models in the WhatsApp CRM system.

## Table of Contents

- [User & Authentication](#user--authentication)
- [WhatsApp Integration](#whatsapp-integration)
- [Contact Management](#contact-management)
- [Messaging](#messaging)
- [Campaigns](#campaigns)
- [Flow Automation](#flow-automation)
- [AI & Chatbots](#ai--chatbots)
- [E-commerce](#e-commerce)
- [Payments](#payments)
- [Analytics](#analytics)
- [Webhooks](#webhooks)
- [Team Management](#team-management)

## User & Authentication

### User
Stores user account information with role-based access control.

**Key Fields:**
- `email` - Unique email address
- `password` - Bcrypt hashed password
- `role` - UserRole enum (Owner, Admin, Manager, Agent)
- `isActive` - Account status
- `isEmailVerified` - Email verification status
- `loginAttempts` - Failed login counter
- `lockedUntil` - Account lockout timestamp

**Relations:**
- Has many: RefreshTokens, WhatsAppAccounts, Contacts, Campaigns, Messages, Flows, AIProviders, Chatbots, etc.

### RefreshToken
Stores JWT refresh tokens for authentication.

**Key Fields:**
- `token` - Unique refresh token
- `expiresAt` - Token expiration timestamp
- `revokedAt` - Token revocation timestamp

**Relations:**
- Belongs to: User

## WhatsApp Integration

### WhatsAppAccount
Represents a connected WhatsApp Business account.

**Key Fields:**
- `phoneNumber` - Unique WhatsApp phone number
- `displayName` - Account display name
- `connectionStatus` - ConnectionStatus enum (Disconnected, Connecting, Connected, Failed)
- `sessionData` - Encrypted session data (JSON)
- `qrCode` - QR code for connection
- `healthStatus` - HealthStatus enum (Healthy, Warning, Critical)
- `messagesSentToday` - Daily message counter
- `dailyLimit` - Daily message limit

**Relations:**
- Belongs to: User
- Has many: Messages, Campaigns, Contacts

## Contact Management

### Contact
Stores customer/lead contact information.

**Key Fields:**
- `phone` - Contact phone number
- `name` - Contact name
- `email` - Contact email (optional)
- `company` - Company name (optional)
- `tags` - Array of tags
- `customFields` - JSON object for custom data
- `source` - ContactSource enum (Manual, Import, Shopify, WooCommerce, WhatsApp, API)
- `isBlocked` - Block status
- `lastMessageAt` - Last message timestamp
- `unreadCount` - Unread message counter

**Relations:**
- Belongs to: User, WhatsAppAccount
- Has many: Messages, CampaignRecipients

**Unique Constraint:** `[whatsappAccountId, phone]`

## Messaging

### Message
Stores WhatsApp messages (inbound and outbound).

**Key Fields:**
- `direction` - MessageDirection enum (Inbound, Outbound)
- `type` - MessageType enum (Text, Image, Video, Audio, Document)
- `content` - Message content (text)
- `mediaUrl` - Media file URL (optional)
- `whatsappMessageId` - Unique WhatsApp message ID
- `status` - MessageStatus enum (Queued, Sent, Delivered, Read, Failed)
- `errorMessage` - Error message if failed
- `scheduledFor` - Scheduled send time (optional)
- `sentAt`, `deliveredAt`, `readAt` - Status timestamps
- `isFromBot` - Whether message is from chatbot

**Relations:**
- Belongs to: User, WhatsAppAccount, Contact
- Optional: Campaign

**Indexes:**
- `[whatsappAccountId, contactId, createdAt]` - For conversation queries
- `[status]` - For status filtering
- `[campaignId]` - For campaign messages

## Campaigns

### Campaign
Broadcast campaigns for mass messaging.

**Key Fields:**
- `name` - Campaign name
- `description` - Campaign description
- `type` - CampaignType enum (Broadcast, Drip, ABTest)
- `status` - CampaignStatus enum (Draft, Scheduled, Running, Paused, Completed, Failed)
- `message` - Message template with variables
- `mediaUrl` - Media file URL (optional)
- `totalRecipients` - Total recipient count
- `sentCount`, `deliveredCount`, `readCount`, `failedCount` - Status counters
- `scheduledFor` - Scheduled start time (optional)
- `rateLimitPerMinute` - Message rate limit

**Relations:**
- Belongs to: User, WhatsAppAccount
- Has many: CampaignRecipients

### CampaignRecipient
Tracks individual campaign recipients.

**Key Fields:**
- `status` - MessageStatus enum
- `sentAt`, `deliveredAt`, `readAt` - Status timestamps
- `failedReason` - Failure reason if failed

**Relations:**
- Belongs to: Campaign, Contact

## Flow Automation

### Flow
Automated workflow definitions.

**Key Fields:**
- `name` - Flow name
- `description` - Flow description
- `trigger` - Trigger configuration (JSON)
- `nodes` - Flow nodes (JSONB)
- `edges` - Flow edges/connections (JSONB)
- `isActive` - Active status
- `totalExecutions`, `successfulExecutions`, `failedExecutions` - Execution counters

**Relations:**
- Belongs to: User
- Has many: FlowExecutions

### FlowExecution
Tracks individual flow executions.

**Key Fields:**
- `triggerData` - Trigger event data (JSON)
- `status` - FlowExecutionStatus enum (Running, Completed, Failed, Paused)
- `currentNodeId` - Current node being executed
- `executionPath` - Array of executed node IDs
- `variables` - Flow variables (JSON)
- `errorMessage` - Error message if failed

**Relations:**
- Belongs to: Flow
- Has many: FlowExecutionSteps

### FlowExecutionStep
Individual flow step execution.

**Key Fields:**
- `nodeId` - Node ID from flow definition
- `nodeType` - Node type (trigger, wait, send_message, etc.)
- `status` - StepStatus enum (Pending, Running, Completed, Failed, Skipped)
- `input`, `output` - Step input/output data (JSON)
- `errorMessage` - Error message if failed

**Relations:**
- Belongs to: FlowExecution

## AI & Chatbots

### AIProvider
AI provider configurations (OpenAI, Claude, Gemini, etc.).

**Key Fields:**
- `provider` - AIProviderType enum (OpenAI, Claude, Gemini, Cohere, Mistral, Groq, etc.)
- `isActive` - Active status
- `credentials` - Encrypted API credentials (JSON)
- `modelConfig` - Model configuration (JSON)
- `usageCount`, `totalTokens`, `totalCost` - Usage tracking

**Relations:**
- Belongs to: User
- Has many: Chatbots

### Chatbot
AI chatbot configurations.

**Key Fields:**
- `name` - Chatbot name
- `systemPrompt` - System prompt for AI
- `welcomeMessage` - Welcome message (optional)
- `fallbackMessage` - Fallback message
- `isActive` - Active status
- `triggers` - Trigger conditions (JSON)
- `conversationTimeout` - Timeout in minutes
- `maxConversationTurns` - Max turns per conversation
- `contextWindow` - Number of messages for context
- `totalConversations`, `totalMessages` - Usage counters
- `avgResponseTime`, `avgSatisfactionScore` - Performance metrics

**Relations:**
- Belongs to: User, AIProvider
- Has many: ChatbotConversations

### ChatbotConversation
Individual chatbot conversation sessions.

**Key Fields:**
- `status` - ChatbotConversationStatus enum (Active, Completed, Timeout, HandedOff)
- `turnCount` - Number of conversation turns
- `satisfactionScore` - User satisfaction rating (optional)
- `handoffReason` - Reason for human handoff (optional)

**Relations:**
- Belongs to: Chatbot
- Has many: ChatbotMessages

### ChatbotMessage
Individual messages in chatbot conversations.

**Key Fields:**
- `role` - Message role (user, assistant, system)
- `content` - Message content
- `tokens` - Token count (optional)
- `cost` - API cost (optional)

**Relations:**
- Belongs to: ChatbotConversation

### VoiceTranscription
Voice message transcriptions.

**Key Fields:**
- `messageId` - Reference to Message
- `audioUrl` - Audio file URL
- `transcription` - Transcribed text
- `language` - Detected language
- `duration` - Audio duration in seconds
- `provider` - TranscriptionProviderType enum (WhisperAPI, WhisperCpp, GoogleSTT, AssemblyAI)
- `confidence` - Transcription confidence score
- `processingTime` - Processing time in ms
- `cost` - API cost (optional)

**Relations:**
- Belongs to: User

## E-commerce

### EcommerceIntegration
Shopify/WooCommerce integration configurations.

**Key Fields:**
- `platform` - EcommercePlatform enum (Shopify, WooCommerce)
- `shopDomain` - Shop domain
- `credentials` - Encrypted API credentials (JSON)
- `webhookSecret` - Webhook secret for verification
- `isActive` - Active status
- `syncStatus` - SyncStatus enum (Syncing, Synced, Failed)
- `lastSyncAt` - Last sync timestamp
- `totalOrders`, `totalRevenue` - Statistics
- `settings` - Integration settings (JSON)

**Relations:**
- Belongs to: User
- Has many: Orders, AbandonedCarts

### Order
E-commerce orders.

**Key Fields:**
- `externalOrderId` - Order ID from e-commerce platform
- `orderNumber` - Human-readable order number
- `customerName`, `customerEmail`, `customerPhone` - Customer info
- `status` - OrderStatus enum (Pending, Processing, Completed, Cancelled, Refunded)
- `fulfillmentStatus` - FulfillmentStatus enum (Unfulfilled, PartiallyFulfilled, Fulfilled)
- `paymentStatus` - PaymentStatus enum (Pending, Paid, PartiallyRefunded, Refunded)
- `totalAmount`, `currency` - Order total
- `items` - Order items (JSON)
- `shippingAddress` - Shipping address (JSON)
- `trackingNumber`, `trackingUrl` - Shipping tracking
- `notificationsSent` - Sent notifications (JSON array)

**Relations:**
- Belongs to: User, EcommerceIntegration
- Optional: Contact

**Unique Constraint:** `[ecommerceIntegrationId, externalOrderId]`

### AbandonedCart
Abandoned cart tracking.

**Key Fields:**
- `externalCheckoutId` - Checkout ID from e-commerce platform
- `customerEmail`, `customerPhone` - Customer info
- `cartUrl` - Cart recovery URL
- `items` - Cart items (JSON)
- `totalAmount`, `currency` - Cart total
- `recoveryStatus` - RecoveryStatus enum (Pending, Sent, Recovered, Expired)
- `recoverySentAt`, `recoveredAt` - Recovery timestamps

**Relations:**
- Belongs to: User, EcommerceIntegration
- Optional: Contact

**Unique Constraint:** `[ecommerceIntegrationId, externalCheckoutId]`

## Payments

### PaymentGateway
Payment gateway configurations (Stripe, PayPal, Razorpay, etc.).

**Key Fields:**
- `provider` - PaymentProviderType enum (20+ providers)
- `region` - Gateway region
- `isActive` - Active status
- `credentials` - Encrypted API credentials (JSON)
- `webhookSecret` - Webhook secret
- `settings` - Gateway settings (JSON)
- `totalTransactions`, `totalVolume`, `successRate` - Statistics

**Relations:**
- Belongs to: User
- Has many: Subscriptions, Payments

### SubscriptionPlan
Subscription plan definitions.

**Key Fields:**
- `name` - Plan name
- `description` - Plan description
- `amount`, `currency` - Plan price
- `interval` - BillingInterval enum (Month, Year)
- `intervalCount` - Billing interval count
- `trialPeriodDays` - Trial period (optional)
- `features` - Plan features (JSON)
- `limits` - Plan limits (JSON)
- `isActive` - Active status

**Relations:**
- Has many: Subscriptions

### Subscription
User subscriptions.

**Key Fields:**
- `externalSubscriptionId` - Subscription ID from payment gateway
- `status` - SubscriptionStatus enum (Active, PastDue, Cancelled, Expired, Trialing)
- `currentPeriodStart`, `currentPeriodEnd` - Billing period
- `cancelledAt` - Cancellation timestamp
- `cancelAtPeriodEnd` - Cancel at period end flag
- `trialStart`, `trialEnd` - Trial period
- `billingCycleAnchor` - Billing cycle anchor date
- `metadata` - Additional metadata (JSON)

**Relations:**
- Belongs to: User, PaymentGateway, SubscriptionPlan
- Has many: Payments, Invoices

### Payment
Payment transactions.

**Key Fields:**
- `externalPaymentId` - Payment ID from gateway
- `externalCustomerId` - Customer ID from gateway
- `type` - PaymentType enum (Subscription, OneTime, Refund)
- `status` - PaymentStatusEnum (Pending, Processing, Succeeded, Failed, Cancelled, Refunded)
- `amount`, `currency` - Payment amount
- `description` - Payment description
- `paymentMethod` - Payment method used
- `failureReason` - Failure reason (optional)
- `receiptUrl` - Receipt URL (optional)
- `metadata` - Additional metadata (JSON)
- `processedAt` - Processing timestamp

**Relations:**
- Belongs to: User, PaymentGateway
- Optional: Subscription, Invoice

### Invoice
Generated invoices.

**Key Fields:**
- `invoiceNumber` - Unique invoice number
- `status` - InvoiceStatus enum (Draft, Open, Paid, Void, Uncollectible)
- `amount`, `currency` - Invoice amount
- `items` - Invoice items (JSON)
- `taxAmount`, `discountAmount`, `totalAmount` - Amounts
- `billingAddress` - Billing address (JSON)
- `dueDate` - Payment due date
- `paidAt`, `voidedAt` - Status timestamps
- `pdfUrl` - PDF invoice URL (optional)

**Relations:**
- Belongs to: User
- Optional: Subscription
- Has many: Payments

## Analytics

### AnalyticsSnapshot
Pre-aggregated analytics data.

**Key Fields:**
- `date` - Snapshot date
- `type` - SnapshotType enum (Daily, Weekly, Monthly)
- `metrics` - Aggregated metrics (JSONB)

**Relations:**
- Belongs to: User
- Optional: WhatsAppAccount

**Unique Constraint:** `[userId, whatsappAccountId, date, type]`

## Webhooks

### WebhookSubscription
Outbound webhook subscriptions.

**Key Fields:**
- `url` - Webhook URL
- `events` - Array of subscribed events
- `secret` - Webhook signing secret
- `isActive` - Active status
- `retryStrategy` - Retry configuration (JSON)
- `lastTriggeredAt` - Last trigger timestamp
- `successCount`, `failureCount` - Delivery statistics

**Relations:**
- Belongs to: User
- Has many: WebhookDeliveries

### WebhookDelivery
Webhook delivery tracking.

**Key Fields:**
- `event` - Event name
- `payload` - Event payload (JSONB)
- `status` - DeliveryStatus enum (Pending, Delivered, Failed)
- `attempts` - Delivery attempt count
- `lastAttemptAt` - Last attempt timestamp
- `nextRetryAt` - Next retry timestamp
- `responseStatus` - HTTP response status
- `responseBody` - HTTP response body
- `errorMessage` - Error message (optional)
- `deliveredAt` - Delivery timestamp

**Relations:**
- Belongs to: WebhookSubscription

## Team Management

### TeamMember
Team member records.

**Key Fields:**
- `email` - Member email
- `role` - UserRole enum
- `status` - TeamMemberStatus enum (Invited, Active, Suspended, Removed)
- `invitedAt`, `joinedAt`, `suspendedAt` - Status timestamps

**Relations:**
- Belongs to: User (member), User (inviter)

**Unique Constraint:** `[userId, email]`

### TeamInvitation
Team invitation tokens.

**Key Fields:**
- `email` - Invitee email
- `role` - UserRole enum
- `token` - Unique invitation token
- `expiresAt` - Token expiration
- `acceptedAt` - Acceptance timestamp

**Relations:**
- Belongs to: User (inviter)

### ActivityLog
Audit trail of user actions.

**Key Fields:**
- `action` - Action performed
- `resource` - Resource type
- `resourceId` - Resource ID (optional)
- `details` - Action details (JSON)
- `ipAddress` - User IP address
- `userAgent` - User agent string

**Relations:**
- Belongs to: User (owner), User (performer)

**Indexes:**
- `[userId, createdAt]` - For user activity queries
- `[performedBy]` - For performer queries
- `[action]` - For action filtering

## Enums

### UserRole
- Owner
- Admin
- Manager
- Agent

### ConnectionStatus
- Disconnected
- Connecting
- Connected
- Failed

### HealthStatus
- Healthy
- Warning
- Critical

### ContactSource
- Manual
- Import
- Shopify
- WooCommerce
- WhatsApp
- API

### MessageDirection
- Inbound
- Outbound

### MessageType
- Text
- Image
- Video
- Audio
- Document

### MessageStatus
- Queued
- Sent
- Delivered
- Read
- Failed

### CampaignType
- Broadcast
- Drip
- ABTest

### CampaignStatus
- Draft
- Scheduled
- Running
- Paused
- Completed
- Failed

### FlowExecutionStatus
- Running
- Completed
- Failed
- Paused

### StepStatus
- Pending
- Running
- Completed
- Failed
- Skipped

### AIProviderType
- OpenAI
- Claude
- Gemini
- Cohere
- Mistral
- Groq
- TogetherAI
- Ollama
- LocalAI
- HuggingFace
- Custom

### ChatbotConversationStatus
- Active
- Completed
- Timeout
- HandedOff

### TranscriptionProviderType
- WhisperAPI
- WhisperCpp
- GoogleSTT
- AssemblyAI

### EcommercePlatform
- Shopify
- WooCommerce

### SyncStatus
- Syncing
- Synced
- Failed

### OrderStatus
- Pending
- Processing
- Completed
- Cancelled
- Refunded

### FulfillmentStatus
- Unfulfilled
- PartiallyFulfilled
- Fulfilled

### PaymentStatus
- Pending
- Paid
- PartiallyRefunded
- Refunded

### RecoveryStatus
- Pending
- Sent
- Recovered
- Expired

### PaymentProviderType
- Stripe, PayPal, Razorpay, MercadoPago, Flutterwave
- PayTabs, Paddle, Paytm, Instamojo, Cashfree
- PayU, Mollie, Square, Braintree, Authorize
- TwoCheckout, Paystack, Coinbase, PayFast, Xendit

### BillingInterval
- Month
- Year

### SubscriptionStatus
- Active
- PastDue
- Cancelled
- Expired
- Trialing

### PaymentType
- Subscription
- OneTime
- Refund

### PaymentStatusEnum
- Pending
- Processing
- Succeeded
- Failed
- Cancelled
- Refunded

### InvoiceStatus
- Draft
- Open
- Paid
- Void
- Uncollectible

### SnapshotType
- Daily
- Weekly
- Monthly

### DeliveryStatus
- Pending
- Delivered
- Failed

### TeamMemberStatus
- Invited
- Active
- Suspended
- Removed
