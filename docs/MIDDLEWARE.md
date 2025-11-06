# Middleware Documentation

This document describes the middleware stack used in the WhatsApp CRM backend application.

## Middleware Stack Order

The middleware is applied in the following order (order matters for proper functionality):

1. **Trust Proxy** - Enables proper IP detection behind load balancers
2. **Helmet** - Security headers
3. **CORS** - Cross-Origin Resource Sharing
4. **Body Parsers** - JSON and URL-encoded
5. **Compression** - Response compression
6. **Morgan** - Request logging
7. **Routes** - Application routes
8. **Multer Error Handler** - File upload error handling
9. **404 Handler** - Not found errors
10. **Global Error Handler** - All other errors

## Security Middleware

### Helmet

Helmet sets various HTTP headers to protect against common web vulnerabilities:

- **Content Security Policy (CSP)** - Prevents XSS attacks
- **X-Frame-Options** - Prevents clickjacking
- **X-Content-Type-Options** - Prevents MIME sniffing
- **X-DNS-Prefetch-Control** - Controls DNS prefetching
- **Strict-Transport-Security** - Enforces HTTPS

Configuration in `src/app.js`:

```javascript
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);
```

### CORS

Configures Cross-Origin Resource Sharing to allow frontend applications to access the API:

```javascript
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 hours
};
```

Environment variables:
- `CORS_ORIGIN` - Comma-separated list of allowed origins
- `CORS_CREDENTIALS` - Enable credentials (default: true)

## Body Parsing Middleware

### JSON Parser

Parses incoming JSON request bodies:

```javascript
app.use(express.json({ limit: '10mb' }));
```

- Maximum payload size: 10MB
- Automatically parses `Content-Type: application/json`

### URL-Encoded Parser

Parses URL-encoded form data:

```javascript
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

- Maximum payload size: 10MB
- Extended mode supports nested objects
- Automatically parses `Content-Type: application/x-www-form-urlencoded`

### Multipart Form Data (File Uploads)

Handled by Multer middleware in specific routes. See `src/middleware/upload.js`.

**Usage in routes:**

```javascript
import { uploadSingle, uploadMultiple } from '../middleware/upload.js';

// Single file upload
router.post('/upload', uploadSingle('file'), controller);

// Multiple files upload
router.post('/upload-multiple', uploadMultiple('files', 5), controller);
```

**Configuration:**
- Storage: Memory storage (files stored in buffer)
- Max file size: 10MB per file
- Max files: 5 files per request
- Allowed types: Images, videos, audio, documents

**Allowed MIME types:**
- Images: jpeg, jpg, png, gif, webp
- Videos: mp4, mpeg, quicktime, avi
- Audio: mpeg, mp3, wav, ogg, webm
- Documents: pdf, doc, docx, xls, xlsx, csv, txt

## Compression Middleware

Compresses response bodies for faster transmission:

```javascript
app.use(compression());
```

- Automatically compresses responses with gzip/deflate
- Reduces bandwidth usage
- Improves response times for large payloads

## Logging Middleware

### Morgan

HTTP request logger that logs all incoming requests:

**Development mode:**
```javascript
app.use(morgan('dev')); // Concise colored output
```

**Production mode:**
```javascript
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
    skip: (req, res) => res.statusCode < 400, // Only log errors
  })
);
```

## Error Handling Middleware

### Custom Error Classes

Located in `src/middleware/errorHandler.js`:

- **AppError** - Base error class
- **ValidationError** - 400 Bad Request
- **AuthenticationError** - 401 Unauthorized
- **AuthorizationError** - 403 Forbidden
- **NotFoundError** - 404 Not Found
- **ConflictError** - 409 Conflict
- **RateLimitError** - 429 Too Many Requests

**Usage:**

```javascript
import { NotFoundError, ValidationError } from '../middleware/errorHandler.js';

// Throw custom errors
throw new NotFoundError('User not found');
throw new ValidationError('Invalid email', [{ field: 'email', message: 'Invalid format' }]);
```

### Global Error Handler

Catches all errors and formats consistent error responses:

```javascript
{
  "success": false,
  "message": "Error message",
  "statusCode": 400,
  "errors": [], // For validation errors
  "stack": "..." // Only in development
}
```

### Async Handler

Wrapper for async route handlers to catch errors:

```javascript
import { asyncHandler } from '../middleware/errorHandler.js';

router.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll();
  res.json({ success: true, data: users });
}));
```

### 404 Handler

Handles requests to non-existent routes:

```javascript
app.use(notFoundHandler);
```

Returns:
```json
{
  "success": false,
  "message": "Route /api/v1/nonexistent not found",
  "statusCode": 404
}
```

### Multer Error Handler

Handles file upload errors:

```javascript
app.use(handleMulterError);
```

Catches:
- `LIMIT_FILE_SIZE` - File too large
- `LIMIT_FILE_COUNT` - Too many files
- `LIMIT_UNEXPECTED_FILE` - Unexpected field name

## API Versioning

All API routes are prefixed with `/api/v1`:

```javascript
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/messages', messageRoutes);
```

**Root endpoint:** `GET /api/v1`

Returns API information and available endpoints:

```json
{
  "success": true,
  "message": "WhatsApp CRM API v1",
  "version": "1.0.0",
  "status": "active",
  "endpoints": {
    "health": "/health",
    "queues": "/api/v1/queues",
    "auth": "/api/v1/auth",
    "contacts": "/api/v1/contacts",
    ...
  }
}
```

## Best Practices

### 1. Always Use Async Handler

Wrap async route handlers to catch errors:

```javascript
router.get('/users', asyncHandler(async (req, res) => {
  // Your async code here
}));
```

### 2. Throw Custom Errors

Use custom error classes for consistent error handling:

```javascript
if (!user) {
  throw new NotFoundError('User not found');
}
```

### 3. Validate Input

Use validation middleware before processing requests:

```javascript
router.post('/users', validateUser, asyncHandler(async (req, res) => {
  // Input is validated
}));
```

### 4. Handle File Uploads Properly

Always use multer error handler after file upload routes:

```javascript
router.post('/upload', uploadSingle('file'), handleMulterError, controller);
```

### 5. Set Appropriate Status Codes

Use correct HTTP status codes:
- 200 OK - Successful GET, PUT, PATCH
- 201 Created - Successful POST
- 204 No Content - Successful DELETE
- 400 Bad Request - Validation errors
- 401 Unauthorized - Authentication required
- 403 Forbidden - Insufficient permissions
- 404 Not Found - Resource not found
- 409 Conflict - Resource already exists
- 429 Too Many Requests - Rate limit exceeded
- 500 Internal Server Error - Server errors

## Environment Variables

Required environment variables for middleware configuration:

```env
# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=true

# Server Configuration
NODE_ENV=development
PORT=5000

# Logging
LOG_LEVEL=info
```

## Testing Middleware

Tests are located in `tests/app.test.js`:

```bash
npm test -- tests/app.test.js
```

Tests cover:
- Security headers (Helmet)
- CORS configuration
- Body parsing (JSON, URL-encoded)
- Compression
- API versioning
- Error handling
- Request logging
