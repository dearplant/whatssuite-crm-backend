# Authentication System Documentation

## Overview

The authentication system implements secure user authentication with JWT tokens, password hashing using bcrypt (12 rounds), refresh token management, and account lockout protection.

## Components

### 1. User Model (`src/models/user.js`)

Database queries for user operations:

- `create(data)` - Create new user
- `findByEmail(email, includePassword)` - Find user by email
- `findById(id)` - Find user by ID
- `update(id, data)` - Update user
- `incrementLoginAttempts(id)` - Increment failed login attempts
- `resetLoginAttempts(id)` - Reset login attempts to 0
- `lockAccount(id, duration)` - Lock account for specified duration
- `updateLastLogin(id)` - Update last login timestamp
- `setPasswordResetToken(email, token, expires)` - Set password reset token
- `clearPasswordResetToken(id)` - Clear password reset token
- `setEmailVerificationToken(id, token)` - Set email verification token
- `verifyEmail(token)` - Verify email with token
- `findByPasswordResetToken(token)` - Find user by reset token

### 2. RefreshToken Model (`src/models/refreshToken.js`)

Database queries for refresh token operations:

- `create(data)` - Create new refresh token
- `findByToken(token)` - Find token by string
- `findByUserId(userId)` - Find all active tokens for user
- `revoke(token)` - Revoke a token
- `revokeAllForUser(userId)` - Revoke all user tokens
- `deleteExpired()` - Delete expired tokens
- `deleteOldRevoked(days)` - Delete old revoked tokens

### 3. Password Utilities (`src/utils/password.js`)

Password hashing and validation:

```javascript
import { hashPassword, verifyPassword, validatePasswordStrength } from './utils/password.js';

// Hash password with bcrypt (12 rounds)
const hash = await hashPassword('MyPassword123!');

// Verify password
const isValid = await verifyPassword('MyPassword123!', hash);

// Validate password strength
const result = validatePasswordStrength('MyPassword123!');
// Returns: { valid: true } or { valid: false, message: 'Error message' }
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### 4. JWT Utilities (`src/utils/jwt.js`)

Token generation and verification:

```javascript
import {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  verifyRefreshToken,
  revokeRefreshToken,
  extractTokenFromHeader,
} from './utils/jwt.js';

// Generate access token (7 days)
const accessToken = generateAccessToken(user);

// Generate refresh token (30 days) and store in DB
const refreshToken = await generateRefreshToken(user);

// Generate both tokens
const { accessToken, refreshToken } = await generateTokens(user);

// Verify access token
const decoded = verifyToken(accessToken);

// Verify refresh token (checks DB)
const tokenData = await verifyRefreshToken(refreshToken);

// Revoke refresh token
await revokeRefreshToken(refreshToken);

// Extract token from Authorization header
const token = extractTokenFromHeader(req.headers.authorization);
```

**Token Payload Structure:**

Access Token:
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "Owner",
  "iat": 1234567890,
  "exp": 1234987890
}
```

Refresh Token:
```json
{
  "sub": "user-uuid",
  "tokenId": "token-uuid",
  "iat": 1234567890,
  "exp": 1237587890
}
```

### 5. Authentication Middleware (`src/middleware/auth.js`)

Express middleware for protecting routes:

```javascript
import { authenticate, optionalAuthenticate, requireEmailVerification } from './middleware/auth.js';

// Require authentication
router.get('/protected', authenticate, (req, res) => {
  // req.user is available
  res.json({ user: req.user });
});

// Optional authentication
router.get('/public', optionalAuthenticate, (req, res) => {
  // req.user is available if token was provided
  res.json({ user: req.user || null });
});

// Require email verification
router.get('/verified-only', authenticate, requireEmailVerification, (req, res) => {
  // User is authenticated and email is verified
  res.json({ user: req.user });
});
```

**Middleware Behavior:**

- `authenticate`: Requires valid JWT token, loads user, checks if active/locked
- `optionalAuthenticate`: Loads user if token is present, doesn't fail if missing
- `requireEmailVerification`: Requires user to have verified email

**Error Responses:**

```json
{
  "error": "Unauthorized",
  "message": "No authentication token provided",
  "code": "NO_TOKEN"
}
```

Possible error codes:
- `NO_TOKEN` - No token provided
- `TOKEN_EXPIRED` - Token has expired
- `INVALID_TOKEN` - Token is invalid
- `USER_NOT_FOUND` - User doesn't exist
- `ACCOUNT_INACTIVE` - Account is inactive
- `ACCOUNT_DELETED` - Account is deleted
- `ACCOUNT_LOCKED` - Account is locked
- `EMAIL_NOT_VERIFIED` - Email not verified

### 6. Authentication Service (`src/services/authService.js`)

Business logic for authentication operations:

```javascript
import authService from './services/authService.js';

// Login
const result = await authService.login(email, password);
// Returns: { user, accessToken, refreshToken }

// Register
const result = await authService.register({
  email,
  password,
  firstName,
  lastName,
  phone,
  role: 'Owner',
});
// Returns: { user, accessToken, refreshToken, emailVerificationToken }

// Refresh access token
const result = await authService.refreshAccessToken(refreshToken);
// Returns: { accessToken, user }

// Logout
await authService.logout(refreshToken);

// Request password reset
const result = await authService.requestPasswordReset(email);
// Returns: { resetToken, email, message }

// Reset password
await authService.resetPassword(resetToken, newPassword);
// Returns: { message }

// Verify email
await authService.verifyEmail(verificationToken);
// Returns: { message }

// Change password (authenticated)
await authService.changePassword(userId, currentPassword, newPassword);
// Returns: { message }
```

## Account Lockout Protection

The system implements automatic account lockout after failed login attempts:

1. **Failed Login Tracking**: Each failed login increments `loginAttempts` counter
2. **Lockout Threshold**: After 5 failed attempts (configurable), account is locked
3. **Lockout Duration**: Account is locked for 15 minutes (configurable)
4. **Automatic Unlock**: Account unlocks automatically after duration expires
5. **Reset on Success**: Login attempts reset to 0 on successful login

**Configuration:**

```javascript
// config/index.js
security: {
  maxLoginAttempts: 5,
  lockoutDuration: 900000, // 15 minutes in milliseconds
}
```

**Database Fields:**

- `loginAttempts` (Int) - Number of failed login attempts
- `lockedUntil` (DateTime) - When the account lock expires

## Token Management

### Access Tokens

- **Expiration**: 7 days (configurable)
- **Storage**: Client-side (localStorage, memory, etc.)
- **Usage**: Sent in Authorization header for API requests
- **Revocation**: Cannot be revoked (short-lived by design)

### Refresh Tokens

- **Expiration**: 30 days (configurable)
- **Storage**: Database + Client-side (httpOnly cookie recommended)
- **Usage**: Used to obtain new access tokens
- **Revocation**: Can be revoked individually or all at once

**Token Rotation:**

When refreshing an access token, the refresh token remains valid. For enhanced security, implement token rotation by:

1. Generating a new refresh token on each refresh
2. Revoking the old refresh token
3. Returning both new access and refresh tokens

## Security Best Practices

### Password Security

- ✅ Bcrypt with 12 rounds (OWASP recommended)
- ✅ Password strength validation
- ✅ No password in API responses
- ✅ Secure password reset flow

### Token Security

- ✅ JWT with HS256 algorithm
- ✅ Secret key validation (min 32 characters)
- ✅ Token expiration
- ✅ Refresh token storage in database
- ✅ Token revocation support

### Account Security

- ✅ Account lockout after failed attempts
- ✅ Email verification
- ✅ Password reset with expiring tokens
- ✅ Active/inactive account status
- ✅ Soft delete support

### API Security

- ✅ Authentication middleware
- ✅ Role-based access control ready
- ✅ Detailed error codes
- ✅ Logging of security events

## Usage Examples

### Complete Registration Flow

```javascript
// 1. Register user
const { user, accessToken, refreshToken, emailVerificationToken } = await authService.register({
  email: 'user@example.com',
  password: 'SecurePass123!',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1234567890',
});

// 2. Send verification email (implement email service)
await emailService.sendVerificationEmail(user.email, emailVerificationToken);

// 3. User clicks link and verifies email
await authService.verifyEmail(emailVerificationToken);
```

### Complete Login Flow

```javascript
// 1. Login
try {
  const { user, accessToken, refreshToken } = await authService.login(email, password);

  // 2. Store tokens
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  // 3. Use access token for API requests
  const response = await fetch('/api/v1/protected', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
} catch (error) {
  // Handle login errors (invalid credentials, account locked, etc.)
  console.error(error.message);
}
```

### Token Refresh Flow

```javascript
// When access token expires
try {
  const refreshToken = localStorage.getItem('refreshToken');
  const { accessToken } = await authService.refreshAccessToken(refreshToken);

  // Update stored access token
  localStorage.setItem('accessToken', accessToken);
} catch (error) {
  // Refresh token invalid/expired - redirect to login
  window.location.href = '/login';
}
```

### Password Reset Flow

```javascript
// 1. Request password reset
const { resetToken } = await authService.requestPasswordReset(email);

// 2. Send reset email (implement email service)
await emailService.sendPasswordResetEmail(email, resetToken);

// 3. User clicks link and resets password
await authService.resetPassword(resetToken, newPassword);
```

## Testing

Run authentication tests:

```bash
npm test -- auth.test.js
```

**Test Coverage:**

- ✅ Password hashing and verification
- ✅ Password strength validation
- ✅ JWT token generation
- ✅ JWT token verification
- ✅ Token extraction from headers
- ✅ Invalid token handling

## Configuration

Required environment variables:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_ACCESS_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d

# Security Configuration
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900000  # 15 minutes in milliseconds
```

## Next Steps

To complete the authentication system:

1. **Implement Auth Controllers** - Create API endpoints for auth operations
2. **Implement Auth Routes** - Set up Express routes
3. **Implement RBAC Middleware** - Add role-based permission checking
4. **Implement Email Service** - Send verification and reset emails
5. **Add Rate Limiting** - Protect auth endpoints from brute force
6. **Add Validation** - Validate request bodies with Joi/Zod

## Related Documentation

- [Middleware Documentation](./MIDDLEWARE.md)
- [Configuration Documentation](./CONFIGURATION.md)
- [Database Setup](./DATABASE_SETUP.md)
