# Contact Import/Export Documentation

## Overview

The contact import/export functionality allows users to bulk import contacts from CSV or Excel files and export contacts to CSV format. The system handles large imports (up to 100,000 contacts) using asynchronous queue processing with batching.

## Features

- **CSV Import**: Parse and import contacts from CSV files
- **Excel Import**: Parse and import contacts from Excel files (.xlsx, .xls)
- **Duplicate Detection**: Skip contacts with duplicate phone numbers
- **Validation**: Validate contact data before import
- **Batch Processing**: Process imports in batches of 100 contacts
- **Progress Tracking**: Track import progress and status
- **Error Reporting**: Detailed error reporting for failed imports
- **CSV Export**: Export contacts to CSV with filters

## API Endpoints

### Import Contacts

**Endpoint**: `POST /api/v1/contacts/import`

**Authentication**: Required (Bearer token)

**Authorization**: Requires `contacts:import` permission

**Request**:
- Content-Type: `multipart/form-data`
- Body:
  - `file`: CSV or Excel file (required)
  - `whatsappAccountId`: UUID of WhatsApp account (required)

**Response** (202 Accepted):
```json
{
  "success": true,
  "message": "Contact import started",
  "data": {
    "importId": "uuid",
    "jobId": "job-id",
    "totalContacts": 1000,
    "status": "Pending"
  }
}
```

### Get Import Status

**Endpoint**: `GET /api/v1/contacts/import/:importId`

**Authentication**: Required (Bearer token)

**Authorization**: Requires `contacts:import` permission

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "contacts.csv",
    "totalCount": 1000,
    "processedCount": 500,
    "importedCount": 450,
    "skippedCount": 30,
    "failedCount": 20,
    "status": "Processing",
    "errors": [],
    "startedAt": "2024-01-01T00:00:00Z",
    "completedAt": null,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Export Contacts

**Endpoint**: `GET /api/v1/contacts/export`

**Authentication**: Required (Bearer token)

**Authorization**: Requires `contacts:export` permission

**Query Parameters**:
- `whatsappAccountId`: Filter by WhatsApp account (optional)
- `search`: Search term for name, phone, or email (optional)
- `source`: Filter by contact source (optional)
- `startDate`: Filter by creation date (ISO 8601) (optional)
- `endDate`: Filter by creation date (ISO 8601) (optional)

**Response** (200 OK):
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename=contacts.csv`
- Body: CSV file content

## CSV Format

### Import CSV Format

The CSV file should have the following columns (case-insensitive):

**Required Columns**:
- `phone` or `Phone` or `phoneNumber` or `Phone Number`: Contact phone number
- `name` or `Name` or `fullName` or `Full Name`: Contact name

**Optional Columns**:
- `email` or `Email`: Email address
- `company` or `Company`: Company name
- `jobTitle` or `Job Title` or `title`: Job title
- `address` or `Address`: Street address
- `city` or `City`: City
- `state` or `State`: State/Province
- `country` or `Country`: Country
- `postalCode` or `Postal Code` or `zipCode`: Postal/ZIP code
- `tags` or `Tags`: Comma-separated tags
- `notes` or `Notes`: Additional notes

**Custom Fields**: Any additional columns will be stored in the `customFields` JSON field.

**Example CSV**:
```csv
phone,name,email,company,city,country,tags
+1234567890,John Doe,john@example.com,Acme Inc,New York,USA,"vip,customer"
+0987654321,Jane Smith,jane@example.com,Tech Corp,London,UK,"lead"
```

### Export CSV Format

The exported CSV includes the following columns:
- `phone`: Contact phone number
- `name`: Full name (first + last)
- `email`: Email address
- `company`: Company name
- `city`: City
- `country`: Country
- `source`: Contact source
- `engagement_score`: Engagement score
- `lastMessageAt`: Last message timestamp
- `totalMessages`: Total message count
- `createdAt`: Creation timestamp

## Excel Format

The system supports Excel files (.xlsx, .xls) with the same column structure as CSV. The first sheet in the workbook will be processed.

## Import Process

1. **File Upload**: User uploads CSV or Excel file via API
2. **File Parsing**: System parses file and extracts contact data
3. **Validation**: System validates file size (max 100,000 contacts) and format
4. **Queue Job**: Import job is queued for asynchronous processing
5. **Batch Processing**: Contacts are processed in batches of 100
6. **Duplicate Check**: System checks for existing contacts by phone number
7. **Contact Creation**: Valid contacts are created in database
8. **Progress Updates**: Import record is updated with progress
9. **Completion**: Import status is set to "Completed" with statistics

## Import Status Values

- `Pending`: Import job is queued but not started
- `Processing`: Import is currently being processed
- `Completed`: Import finished successfully
- `Failed`: Import failed due to an error

## Validation Rules

### Phone Number
- Required field
- Must be 10-15 digits (with optional + prefix)
- Format: `+1234567890`

### Name
- Required field
- Minimum 2 characters

### Email
- Optional field
- Must be valid email format if provided

## Error Handling

### Import Errors

The system tracks errors for individual contacts during import:

```json
{
  "phone": "+1234567890",
  "name": "John Doe",
  "errors": ["Phone number format may be invalid"]
}
```

Up to 100 errors are stored per import job.

### Common Error Messages

- `Phone number is required`: Missing phone number
- `Name is required`: Missing name
- `Phone number format may be invalid`: Invalid phone format
- `Email format may be invalid`: Invalid email format
- `Unsupported file type`: File is not CSV or Excel
- `No contacts found in file`: Empty file
- `File contains too many contacts`: More than 100,000 contacts

## Queue Configuration

The contact import queue uses the following configuration:

- **Queue Name**: `imports`
- **Batch Size**: 100 contacts per batch
- **Retry Attempts**: 1 (no retries for imports)
- **Timeout**: 10 minutes (600,000ms)
- **Concurrency**: Configurable via Bull queue workers

## Performance

- **Small Imports** (< 1,000 contacts): Complete in under 1 minute
- **Medium Imports** (1,000 - 10,000 contacts): Complete in 1-5 minutes
- **Large Imports** (10,000 - 100,000 contacts): Complete in 5-10 minutes

Processing speed: ~100-200 contacts per second

## Monitoring

Import jobs can be monitored via:

1. **API**: GET `/api/v1/contacts/import/:importId`
2. **Bull Board**: `/admin/queues` (requires authentication)
3. **Logs**: Check application logs for import progress

## Database Schema

### contact_imports Table

```sql
CREATE TABLE contact_imports (
  id              VARCHAR PRIMARY KEY,
  team_id         VARCHAR NOT NULL,
  user_id         VARCHAR NOT NULL,
  account_id      VARCHAR NOT NULL,
  filename        VARCHAR NOT NULL,
  file_type       VARCHAR NOT NULL,
  total_count     INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  imported_count  INTEGER DEFAULT 0,
  skipped_count   INTEGER DEFAULT 0,
  failed_count    INTEGER DEFAULT 0,
  status          VARCHAR DEFAULT 'Pending',
  errors          JSON DEFAULT '[]',
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);
```

## Implementation Files

- **Service**: `src/services/contactService.js`
  - `importContacts()`: Queue import job
  - `getImportStatus()`: Get import status
  - `exportContacts()`: Export contacts to CSV

- **Controller**: `src/controllers/contactController.js`
  - `importContacts()`: Handle import request
  - `getImportStatus()`: Handle status request
  - `exportContacts()`: Handle export request

- **Worker**: `src/workers/contactImportWorker.js`
  - Processes import jobs from queue
  - Handles batch processing
  - Updates import status

- **Queue**: `src/queues/contactImportQueue.js`
  - Bull queue configuration for imports

- **Utilities**: `src/utils/fileParser.js`
  - `parseCSV()`: Parse CSV files
  - `parseExcel()`: Parse Excel files
  - `validateContactData()`: Validate contact data
  - `normalizeContactData()`: Normalize field names
  - `generateCSV()`: Generate CSV from contacts

- **Validator**: `src/validators/contactValidator.js`
  - `importContactsSchema`: Validate import request
  - `exportContactsSchema`: Validate export request

- **Routes**: `src/routes/contactRoutes.js`
  - POST `/api/v1/contacts/import`
  - GET `/api/v1/contacts/import/:importId`
  - GET `/api/v1/contacts/export`

## Security Considerations

1. **File Size Limits**: Maximum 10MB file size (configurable in multer)
2. **Contact Limits**: Maximum 100,000 contacts per import
3. **Authentication**: All endpoints require valid JWT token
4. **Authorization**: RBAC permissions enforced
5. **File Type Validation**: Only CSV and Excel files accepted
6. **Input Sanitization**: All contact data is validated and sanitized
7. **Duplicate Prevention**: Phone number uniqueness enforced per team

## Future Enhancements

- Support for more file formats (JSON, XML)
- Scheduled imports from external sources
- Import templates and field mapping
- Bulk update via import
- Export to Excel format
- Compressed file support (.zip, .gz)
- Import history and audit trail
- Webhook notifications on import completion
