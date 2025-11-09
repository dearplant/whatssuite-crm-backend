# Analytics API Documentation

This document describes the analytics endpoints available in the WhatsApp CRM backend.

## Overview

The Analytics API provides comprehensive metrics and insights across all aspects of the CRM system including messages, campaigns, contacts, revenue, chatbots, and flows.

## Base URL

```
/api/v1/analytics
```

## Authentication

All analytics endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Permissions

All analytics endpoints require the `analytics:read` permission.

## Common Query Parameters

Most analytics endpoints support the following query parameters:

- `startDate` (ISO 8601 date): Start date for the analytics period (default: 30 days ago)
- `endDate` (ISO 8601 date): End date for the analytics period (default: now)
- `groupBy` (string): Group results by time period - `day`, `week`, or `month`

## Endpoints

### 1. Get Overview Analytics

Get a summary of key metrics across all areas.

**Endpoint:** `GET /api/v1/analytics/overview`

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `compareWith` (optional): `previous` to compare with previous period
- `accountId` (optional): Filter by WhatsApp account ID

**Response:**
```json
{
  "success": true,
  "data": {
    "current": {
      "messages": {
        "total": 1500,
        "sent": 1200,
        "delivered": 1100,
        "read": 900,
        "failed": 50,
        "deliveryRate": 91.67,
        "readRate": 81.82
      },
      "campaigns": {
        "total": 10,
        "active": 2,
        "completed": 7,
        "failed": 1
      },
      "contacts": {
        "total": 500,
        "new": 50,
        "active": 300
      }
    },
    "comparison": { ... },
    "growth": {
      "messages": 15.5,
      "campaigns": 25.0,
      "contacts": 10.2
    },
    "period": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    }
  }
}
```


### 2. Get Message Analytics

Get detailed message statistics with filters and time series data.

**Endpoint:** `GET /api/v1/analytics/messages`

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `accountId` (optional): Filter by WhatsApp account ID
- `groupBy` (optional): Group by `day`, `week`, or `month`

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 1500,
    "byStatus": {
      "sent": 1200,
      "delivered": 1100,
      "read": 900,
      "failed": 50
    },
    "byType": {
      "text": 1200,
      "image": 200,
      "video": 50,
      "document": 50
    },
    "byDirection": {
      "user": 1000,
      "contact": 500
    },
    "rates": {
      "delivery": 91.67,
      "read": 81.82,
      "failure": 3.33
    },
    "timeSeries": [
      { "date": "2025-01-01", "value": 50 },
      { "date": "2025-01-02", "value": 75 }
    ],
    "period": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    }
  }
}
```

### 3. Get Campaign Analytics

Get campaign performance metrics and top performing campaigns.

**Endpoint:** `GET /api/v1/analytics/campaigns`

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `accountId` (optional): Filter by WhatsApp account ID
- `status` (optional): Filter by campaign status

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 10,
      "totalRecipients": 5000,
      "totalSent": 4800,
      "totalDelivered": 4500,
      "totalRead": 3600,
      "totalReplied": 500,
      "totalFailed": 200
    },
    "rates": {
      "avgDelivery": 93.75,
      "avgRead": 80.0,
      "avgReply": 10.42
    },
    "byStatus": {
      "completed": 7,
      "running": 2,
      "failed": 1
    },
    "topCampaigns": [
      {
        "id": "campaign-1",
        "name": "Summer Sale",
        "recipients": 1000,
        "sent": 980,
        "delivered": 950,
        "read": 800,
        "replied": 100,
        "deliveryRate": 96.94,
        "readRate": 84.21,
        "replyRate": 10.20
      }
    ],
    "period": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    }
  }
}
```


### 4. Get Contact Analytics

Get contact growth and segmentation statistics.

**Endpoint:** `GET /api/v1/analytics/contacts`

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `groupBy` (optional): Group by `day`, `week`, or `month`

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total": 500,
      "new": 50,
      "active": 300,
      "blocked": 10,
      "avgEngagementScore": 75.5
    },
    "bySource": {
      "manual": 100,
      "import": 200,
      "whatsapp": 150,
      "shopify": 50
    },
    "growthTimeSeries": [
      { "date": "2025-01-01", "value": 5 },
      { "date": "2025-01-02", "value": 8 }
    ],
    "topEngaged": [
      {
        "id": "contact-1",
        "first_name": "John",
        "last_name": "Doe",
        "phone": "+1234567890",
        "engagement_score": 95,
        "last_contacted_at": "2025-01-30T10:00:00.000Z"
      }
    ],
    "period": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    }
  }
}
```

### 5. Get Revenue Analytics

Get e-commerce revenue analytics including orders and abandoned carts.

**Endpoint:** `GET /api/v1/analytics/revenue`

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `integrationId` (optional): Filter by e-commerce integration ID
- `groupBy` (optional): Group by `day`, `week`, or `month`

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": {
      "total": 150,
      "totalRevenue": 15000.00,
      "avgOrderValue": 100.00,
      "byStatus": {
        "Completed": {
          "count": 120,
          "revenue": 12000.00
        },
        "Pending": {
          "count": 20,
          "revenue": 2000.00
        },
        "Cancelled": {
          "count": 10,
          "revenue": 1000.00
        }
      }
    },
    "abandonedCarts": {
      "total": 50,
      "recovered": 10,
      "totalValue": 5000.00,
      "recoveryRate": 20.00
    },
    "revenueTimeSeries": [
      { "date": "2025-01-01", "value": 500.00 },
      { "date": "2025-01-02", "value": 750.00 }
    ],
    "period": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    }
  }
}
```


### 6. Get Chatbot Analytics

Get chatbot performance metrics including conversations and satisfaction scores.

**Endpoint:** `GET /api/v1/analytics/chatbots`

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `chatbotId` (optional): Filter by specific chatbot ID

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalConversations": 200,
      "totalMessages": 1500,
      "totalTokensUsed": 50000,
      "avgResponseTime": 1200,
      "avgSatisfactionScore": 4.5
    },
    "rates": {
      "handoff": 15.00,
      "completion": 75.00
    },
    "byStatus": {
      "Completed": 150,
      "Active": 30,
      "HandedOff": 15,
      "Timeout": 5
    },
    "chatbots": [
      {
        "id": "chatbot-1",
        "name": "Customer Support Bot",
        "isActive": true,
        "totalConversations": 150,
        "totalMessages": 1200,
        "avgResponseTime": 1100,
        "avgSatisfactionScore": 4.6
      }
    ],
    "period": {
      "start": "2025-01-01T00:00:00.000Z",
      "end": "2025-01-31T23:59:59.999Z"
    }
  }
}
```

### 7. Get Flow Analytics

Get analytics for a specific flow or all flows.

**Endpoint:** `GET /api/v1/analytics/flows/:flowId` or `GET /api/v1/analytics/flows`

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `sortBy` (optional): Sort field
- `sortOrder` (optional): `asc` or `desc`

**Response:**
```json
{
  "success": true,
  "data": {
    "flow": {
      "id": "flow-1",
      "name": "Welcome Flow",
      "totalExecutions": 500,
      "successfulExecutions": 450,
      "failedExecutions": 50,
      "avgExecutionTime": 5000
    },
    "nodeAnalytics": [
      {
        "nodeId": "node-1",
        "nodeType": "send_message",
        "executions": 500,
        "successes": 480,
        "failures": 20,
        "avgExecutionTime": 1000
      }
    ]
  }
}
```

## Date Range Filtering

All endpoints support flexible date range filtering:

- **Default:** Last 30 days
- **Custom Range:** Specify both `startDate` and `endDate`
- **Comparison:** Use `compareWith=previous` to compare with the previous period

## Time Series Grouping

When using the `groupBy` parameter, data is aggregated by:

- `day`: Daily aggregation
- `week`: Weekly aggregation (Monday to Sunday)
- `month`: Monthly aggregation

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request (invalid parameters)
- `401`: Unauthorized (missing or invalid token)
- `403`: Forbidden (insufficient permissions)
- `500`: Internal Server Error

## Rate Limiting

Analytics endpoints are subject to the standard API rate limits:
- 100 requests per 15 minutes per user

## Caching

Analytics data is cached for performance:
- Real-time metrics: 30 seconds
- Dashboard metrics: 5 minutes
- Snapshot data: 1 hour

Cache can be bypassed by Super Admins using the `X-Bypass-Cache` header.
