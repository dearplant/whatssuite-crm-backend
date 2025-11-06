# Authentication API Endpoints

This document describes all authentication-related API endpoints implemented in the WhatsApp CRM backend.

## Base URL

All endpoints are prefixed with `/api/v1/auth`

## Endpoints

### 1. Register New User

**POST** `/api/v1/auth/register`

Register a new user account.

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "language": "en",
  "timezone": "UTC"
}
```

**Required Fields:**
- `email` (string): Valid email address
- `password` (string): Minimum 8 characters, must contain uppercase, lowercase, number, and special character
- `firstName` (string): 2-50 characters
- `lastName` (string): 2-50 characters

**Optional Fields:**
- `phone` (string): E.164 format (e.g., +1234567890)
- `language` (string): One of: en, es, fr, de, pt, ar, zh, ja
- `timezone` (string): Valid timezone string

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "Owner",
      "isActive": true,
      "isEmailVerified": false,
      "createdAt": "2025-11-05T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `409 Conflict`: Email already registered
- `429 Too Many Requests`: Rate limit exceeded

---

### 2. Login

**POST** `/api/v1/auth/login`

Authenticate user and receive JWT tokens.

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "Owner",
      "lastLoginAt": "2025-11-05T10:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Invalid credentials or account locked
- `429 Too Many Requests`: Rate limit exceeded

**Account Lockout:**
After 5 failed login attempts, the account is locked for 15 minutes.

---

### 3. Refresh Access Token

**POST** `/api/v1/auth/refresh`

Refresh the access token using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "Owner"
    }
  },
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token

---

### 4. Logout

**POST** `/api/v1/auth/logout`

Logout user by revoking the refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logout successful",
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

**Error Responses:**
- `500 Internal Server Error`: Logout failed

---

### 5. Forgot Password

**POST** `/api/v1/auth/forgot-password`

Request a password reset email.

**Rate Limit:** 5 requests per 15 minutes per IP

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent.",
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

**Note:** Always returns success to prevent email enumeration attacks.

---

### 6. Reset Password

**POST** `/api/v1/auth/reset-password`

Reset password using the reset token from email.

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "password": "NewStrongPass123!"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully. You can now login with your new password.",
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid or expired token, or validation error

---

### 7. Verify Email

**POST** `/api/v1/auth/verify-email`

Verify email address using the verification token from email.

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid verification token

---

### 8. Get Current User Profile

**GET** `/api/v1/auth/me`

Get the authenticated user's profile.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "role": "Owner",
      "isActive": true,
      "isEmailVerified": true,
      "profilePicture": "https://example.com/avatar.jpg",
      "language": "en",
      "timezone": "UTC",
      "lastLoginAt": "2025-11-05T10:00:00.000Z",
      "createdAt": "2025-11-01T10:00:00.000Z"
    }
  },
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Account inactive, deleted, or locked

---

### 9. Update User Profile

**PUT** `/api/v1/auth/profile`

Update the authenticated user's profile.

**Authentication:** Required (Bearer token)

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "language": "es",
  "timezone": "America/New_York",
  "profilePicture": "https://example.com/new-avatar.jpg"
}
```

**All fields are optional. At least one field must be provided.**

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "phone": "+1234567890",
      "role": "Owner",
      "language": "es",
      "timezone": "America/New_York",
      "updatedAt": "2025-11-05T10:00:00.000Z"
    }
  },
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Account inactive, deleted, or locked

---

## Token Information

### Access Token
- **Expiration:** 7 days
- **Usage:** Include in Authorization header for all authenticated requests
- **Format:** `Authorization: Bearer <access_token>`

### Refresh Token
- **Expiration:** 30 days
- **Usage:** Use to obtain new access tokens
- **Storage:** Store securely (httpOnly cookie recommended for web apps)

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field": "Field-specific error message"
  },
  "timestamp": "2025-11-05T10:00:00.000Z"
}
```

### Common Error Types
- `ValidationError`: Input validation failed
- `Unauthorized`: Authentication required or failed
- `Forbidden`: Insufficient permissions or account status issue
- `ConflictError`: Resource already exists
- `TooManyRequests`: Rate limit exceeded
- `InternalServerError`: Server error

---

## Rate Limiting

Rate limits are applied per IP address:

- **Authentication endpoints** (register, login, forgot-password): 5 requests per 15 minutes
- **Other endpoints**: 100 requests per 15 minutes

Rate limit headers are included in responses:
```
RateLimit-Limit: 5
RateLimit-Remaining: 4
RateLimit-Reset: 1699185600
```

---

## Security Features

1. **Password Requirements:**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character

2. **Account Lockout:**
   - 5 failed login attempts trigger a 15-minute lockout
   - Lockout duration increases with repeated violations

3. **Token Security:**
   - JWT tokens signed with HS256 algorithm
   - Refresh tokens stored in database and can be revoked
   - Tokens include user ID, email, and role

4. **Email Enumeration Prevention:**
   - Forgot password always returns success
   - Login errors don't reveal if email exists

5. **Rate Limiting:**
   - Prevents brute force attacks
   - Protects against DoS attacks

---

## Implementation Notes

- Email verification is required for certain features (implemented in Phase 2, Task 9)
- Password reset emails are sent asynchronously (implemented in Phase 2, Task 9)
- All passwords are hashed using bcrypt with 12 rounds
- Tokens are validated on every authenticated request
- User sessions can be revoked by logging out (revokes refresh token)
