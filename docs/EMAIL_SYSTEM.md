# Email Notification System

## Overview

The email notification system provides a comprehensive solution for sending transactional emails with support for multiple email service providers (SMTP, SendGrid, AWS SES), template rendering, queue-based async processing, and retry logic.

## Features

- **Multiple Email Providers**: Support for SMTP, SendGrid, and AWS SES
- **Template Engine**: Handlebars-based email templates with caching
- **Async Processing**: Bull queue integration for non-blocking email sending
- **Retry Logic**: Automatic retry with exponential backoff (3 attempts)
- **Email Types**: Verification, password reset, welcome, account lockout, password changed
- **Rate Limiting**: Configurable rate limits per service
- **Testing Mode**: Email interception for development/testing
- **Logging**: Comprehensive logging with Winston

## Architecture

```
┌─────────────────┐
│  Auth Service   │
│  (Triggers)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Email Queue    │
│  (Bull/Redis)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Email Service   │
│ (Processing)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Email Provider  │
│ (SMTP/SendGrid) │
└─────────────────┘
```

## Configuration

### Environment Variables

```bash
# Email Service Selection
EMAIL_SERVICE=smtp  # smtp, sendgrid, ses

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@whatsappcrm.com
EMAIL_FROM_NAME=WhatsApp CRM

# SendGrid Configuration
SENDGRID_API_KEY=your-sendgrid-api-key

# Queue Settings
EMAIL_QUEUE_ENABLED=true
EMAIL_QUEUE_ATTEMPTS=3
EMAIL_QUEUE_BACKOFF_DELAY=5000

# Testing
EMAIL_TESTING_ENABLED=false
EMAIL_INTERCEPT_ALL=false
EMAIL_TEST_ADDRESS=test@example.com
```

### SMTP Setup (Gmail Example)

1. Enable 2-factor authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings → Security
   - Select "App passwords"
   - Generate a password for "Mail"
3. Use the generated password in `SMTP_PASSWORD`

### SendGrid Setup

1. Create a SendGrid account at https://sendgrid.com
2. Generate an API key with "Mail Send" permissions
3. Set `EMAIL_SERVICE=sendgrid` and `SENDGRID_API_KEY`

## Email Templates

All email templates are located in `src/templates/emails/` and use Handlebars syntax.

### Available Templates

1. **verification.hbs** - Email verification
   - Variables: `firstName`, `verificationUrl`, `appName`

2. **password-reset.hbs** - Password reset
   - Variables: `firstName`, `resetUrl`, `appName`, `expiryHours`

3. **welcome.hbs** - Welcome email
   - Variables: `firstName`, `appName`, `loginUrl`

4. **account-lockout.hbs** - Account lockout notification
   - Variables: `firstName`, `appName`, `lockoutMinutes`, `supportEmail`

5. **password-changed.hbs** - Password change confirmation
   - Variables: `firstName`, `appName`, `supportEmail`

### Creating New Templates

1. Create a new `.hbs` file in `src/templates/emails/`
2. Use Handlebars syntax for variables: `{{variableName}}`
3. Include responsive HTML/CSS
4. Test with the email service

Example:
```handlebars
<!DOCTYPE html>
<html>
<head>
  <title>{{subject}}</title>
</head>
<body>
  <h1>Hello {{firstName}},</h1>
  <p>{{message}}</p>
</body>
</html>
```

## Usage

### Sending Emails via Queue (Recommended)

```javascript
import {
  queueVerificationEmail,
  queuePasswordResetEmail,
  queueWelcomeEmail,
  queueAccountLockoutEmail,
  queuePasswordChangedEmail,
} from '../queues/emailQueue.js';

// Queue verification email
await queueVerificationEmail(user, verificationToken);

// Queue password reset email
await queuePasswordResetEmail(user, resetToken);

// Queue welcome email
await queueWelcomeEmail(user);

// Queue account lockout email
await queueAccountLockoutEmail(user);

// Queue password changed email
await queuePasswordChangedEmail(user);
```

### Sending Custom Emails

```javascript
import { queueCustomEmail } from '../queues/emailQueue.js';

await queueCustomEmail({
  to: 'user@example.com',
  subject: 'Custom Subject',
  template: 'custom-template',
  templateData: {
    name: 'John Doe',
    customField: 'value',
  },
});
```

### Direct Email Sending (Not Recommended for Production)

```javascript
import emailService from '../services/emailService.js';

// Send with template
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  template: 'verification',
  templateData: {
    firstName: 'John',
    verificationUrl: 'https://example.com/verify',
    appName: 'WhatsApp CRM',
  },
});

// Send with HTML
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Test Email',
  html: '<h1>Hello World</h1>',
  text: 'Hello World',
});
```

## Integration with Auth System

The email system is fully integrated with the authentication system:

### Registration Flow
1. User registers → `authService.register()`
2. Verification token generated
3. `queueVerificationEmail()` called
4. Email queued and sent asynchronously
5. Welcome email also queued

### Password Reset Flow
1. User requests reset → `authService.requestPasswordReset()`
2. Reset token generated
3. `queuePasswordResetEmail()` called
4. Email queued and sent asynchronously

### Account Lockout Flow
1. Failed login attempts exceed limit
2. Account locked → `userModel.lockAccount()`
3. `queueAccountLockoutEmail()` called
4. Email queued and sent asynchronously

### Password Change Flow
1. User changes password → `authService.resetPassword()`
2. Password updated in database
3. `queuePasswordChangedEmail()` called
4. Email queued and sent asynchronously

## Queue Processing

### Queue Configuration

```javascript
{
  attempts: 3,                    // Retry 3 times
  backoff: {
    type: 'exponential',
    delay: 5000                   // Start with 5 seconds
  },
  priority: {
    high: 1,                      // Verification, password reset
    normal: 5,                    // Welcome, notifications
    low: 10                       // Marketing emails
  }
}
```

### Queue Monitoring

Access the Bull Board dashboard at `/admin/queues` to monitor:
- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs
- Job details and logs

## Error Handling

### Retry Logic

Emails are automatically retried on failure:
1. First attempt: Immediate
2. Second attempt: After 5 seconds
3. Third attempt: After 25 seconds (exponential backoff)
4. After 3 failures: Job marked as failed

### Error Logging

All email errors are logged with Winston:
```javascript
logger.error('Failed to send email', {
  to: 'user@example.com',
  subject: 'Test',
  error: error.message,
  attempt: 2,
});
```

### Handling Failed Emails

Failed emails can be:
1. Viewed in Bull Board dashboard
2. Manually retried from the dashboard
3. Logged for investigation
4. Monitored with alerts

## Testing

### Running Email Tests

```bash
npm test -- tests/email.test.js
```

### Test Coverage

The email system includes tests for:
- Template loading and rendering
- Email queue functions
- HTML to text conversion
- Error handling
- Service initialization

### Testing in Development

Enable testing mode to intercept emails:

```bash
EMAIL_TESTING_ENABLED=true
EMAIL_INTERCEPT_ALL=true
EMAIL_TEST_ADDRESS=test@example.com
```

All emails will be logged instead of sent, or redirected to the test address.

## Performance

### Template Caching

Templates are cached in memory after first load:
- Reduces file I/O
- Improves rendering performance
- Can be disabled with `EMAIL_TEMPLATE_CACHE=false`

### Queue Performance

- Processes emails asynchronously
- Non-blocking API responses
- Handles high volume (1000+ emails/minute)
- Horizontal scaling with Redis

### Rate Limiting

Configure rate limits per provider:
```bash
EMAIL_RATE_LIMIT_MAX_PER_HOUR=1000
EMAIL_RATE_LIMIT_MAX_PER_DAY=10000
```

## Security

### Email Verification

- Tokens are cryptographically secure (32 bytes)
- Tokens expire after 24 hours
- One-time use only

### Password Reset

- Reset tokens are cryptographically secure
- Tokens expire after 1 hour
- One-time use only
- Old tokens invalidated on password change

### SMTP Security

- TLS/SSL encryption supported
- Secure authentication
- Connection pooling with limits

### SendGrid Security

- API key authentication
- HTTPS only
- Webhook signature verification

## Monitoring

### Metrics to Track

1. **Email Delivery Rate**: Successful sends / Total attempts
2. **Queue Depth**: Number of pending emails
3. **Processing Time**: Average time to send
4. **Failure Rate**: Failed sends / Total attempts
5. **Retry Rate**: Retried emails / Total emails

### Logging

All email operations are logged:
- Sent emails (optional, for compliance)
- Failed emails (always logged)
- Queue operations
- Service initialization

### Alerts

Set up alerts for:
- High failure rate (>5%)
- Queue depth exceeding threshold
- Service connection failures
- Rate limit exceeded

## Troubleshooting

### Common Issues

**1. Emails not sending**
- Check email service configuration
- Verify credentials
- Check queue is processing
- Review error logs

**2. SMTP authentication failed**
- Verify username/password
- Check if 2FA is enabled (use app password)
- Verify SMTP host and port
- Check firewall settings

**3. SendGrid API errors**
- Verify API key is valid
- Check API key permissions
- Review SendGrid dashboard for issues
- Check rate limits

**4. Emails in spam**
- Configure SPF records
- Set up DKIM signing
- Configure DMARC policy
- Use verified sender domain

**5. Queue not processing**
- Check Redis connection
- Verify queue worker is running
- Check for stuck jobs
- Review queue configuration

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug
SMTP_DEBUG=true
EMAIL_LOG_SENT=true
```

## Best Practices

1. **Always use queue for production** - Never send emails synchronously
2. **Use templates** - Maintain consistency and enable easy updates
3. **Monitor queue health** - Set up alerts for failures
4. **Test thoroughly** - Use testing mode in development
5. **Handle failures gracefully** - Don't block user actions on email failures
6. **Respect rate limits** - Configure appropriate limits
7. **Log important emails** - Keep audit trail for compliance
8. **Use verified domains** - Improve deliverability
9. **Implement unsubscribe** - For marketing emails
10. **Monitor metrics** - Track delivery rates and failures

## Future Enhancements

- [ ] Email analytics (open rates, click rates)
- [ ] A/B testing for email templates
- [ ] Multi-language email templates
- [ ] Email scheduling
- [ ] Bounce and complaint handling
- [ ] Email verification service integration
- [ ] Rich text editor for templates
- [ ] Email preview in dashboard
- [ ] Webhook notifications for email events
- [ ] Email template versioning

## References

- [Nodemailer Documentation](https://nodemailer.com/)
- [SendGrid API Documentation](https://docs.sendgrid.com/)
- [Handlebars Documentation](https://handlebarsjs.com/)
- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [Email Best Practices](https://www.emailonacid.com/blog/article/email-development/email-best-practices/)
