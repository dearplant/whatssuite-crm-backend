# Voice Transcription System

## Overview

The Voice Transcription System provides automatic transcription of voice messages using multiple AI providers. It supports both cloud-based (Whisper API) and self-hosted (Whisper.cpp) transcription services.

## Features

- **Multiple Providers**: Support for Whisper API (OpenAI) and Whisper.cpp (self-hosted)
- **Async Processing**: Background job processing using Bull Queue
- **Real-time Updates**: Socket.io events for transcription status
- **Chatbot Integration**: Automatic chatbot triggering for transcribed messages
- **Cost Tracking**: Track transcription costs and usage
- **Multi-language Support**: Support for 13+ languages

## Architecture

```
┌─────────────────┐
│  Audio Message  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  POST /ai/transcribe    │
│  (Queue Job)            │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Transcription Worker   │
│  - Download Audio       │
│  - Call Provider        │
│  - Save Result          │
└────────┬────────────────┘
         │
         ├──────────────────┐
         ▼                  ▼
┌──────────────────┐  ┌──────────────────┐
│  Socket.io Event │  │  Chatbot Trigger │
│  (Real-time)     │  │  (Optional)      │
└──────────────────┘  └──────────────────┘
```

## Providers

### Whisper API (OpenAI)

**Configuration:**
```env
OPENAI_API_KEY=sk-...
```

**Features:**
- Cloud-based transcription
- High accuracy
- Fast processing
- Automatic language detection
- Cost: $0.006 per minute

**Usage:**
```javascript
{
  "provider": "WhisperAPI",
  "audioUrl": "https://example.com/audio.ogg",
  "language": "en" // optional
}
```

### Whisper.cpp (Self-hosted)

**Configuration:**
```env
WHISPER_CPP_PATH=/usr/local/bin/whisper
WHISPER_MODEL_PATH=/path/to/models
WHISPER_MODEL=base
```

**Features:**
- Self-hosted transcription
- No API costs
- Privacy-focused
- Requires local compute resources
- Models: tiny, base, small, medium, large

**Installation:**
```bash
# Clone whisper.cpp
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp

# Build
make

# Download model
bash ./models/download-ggml-model.sh base

# Set environment variables
export WHISPER_CPP_PATH=/path/to/whisper.cpp/main
export WHISPER_MODEL_PATH=/path/to/whisper.cpp/models
export WHISPER_MODEL=base
```

## API Endpoints

### Create Transcription

**POST** `/api/v1/ai/transcribe`

Create a transcription job for an audio message.

**Request:**
```json
{
  "messageId": "msg_123",
  "audioUrl": "https://example.com/audio.ogg",
  "language": "en",
  "provider": "WhisperAPI",
  "triggerChatbot": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transcription job queued",
  "data": {
    "jobId": "job_456",
    "messageId": "msg_123",
    "status": "queued"
  }
}
```

### Get Transcription

**GET** `/api/v1/ai/transcriptions/:id`

Get transcription by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "trans_789",
    "user_id": "user_123",
    "message_id": "msg_123",
    "audio_url": "https://example.com/audio.ogg",
    "transcription": "Hello, this is a test message",
    "language": "en",
    "duration": 5,
    "provider": "WhisperAPI",
    "confidence": null,
    "processing_time": 1234,
    "cost": 0.0005,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Get Transcription by Message

**GET** `/api/v1/ai/transcriptions/message/:messageId`

Get transcription for a specific message.

### List Transcriptions

**GET** `/api/v1/ai/transcriptions`

List all transcriptions for the authenticated user.

**Query Parameters:**
- `limit` (default: 50) - Number of results
- `offset` (default: 0) - Pagination offset

### Get Available Providers

**GET** `/api/v1/ai/transcription/providers`

Get list of configured transcription providers.

**Response:**
```json
{
  "success": true,
  "data": ["WhisperAPI", "WhisperCpp"]
}
```

## Socket.io Events

### Transcription Completed

**Event:** `transcription:completed`

Emitted when transcription is successfully completed.

**Payload:**
```json
{
  "messageId": "msg_123",
  "transcriptionId": "trans_789",
  "transcription": "Hello, this is a test message",
  "language": "en",
  "duration": 5,
  "provider": "WhisperAPI"
}
```

### Transcription Failed

**Event:** `transcription:failed`

Emitted when transcription fails.

**Payload:**
```json
{
  "messageId": "msg_123",
  "error": "Transcription failed: API error"
}
```

## Chatbot Integration

When `triggerChatbot: true` is set, the transcription service will automatically:

1. Transcribe the audio message
2. Check if any active chatbot matches the transcribed text
3. Queue a chatbot response if triggers match
4. Send the AI-generated response to the contact

**Example Flow:**
```
Voice Message → Transcription → "Hello, I need help"
                                        ↓
                                 Chatbot Trigger Match
                                        ↓
                                 AI Response Generated
                                        ↓
                                 "Hi! How can I help you?"
```

## Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Dutch (nl)
- Polish (pl)
- Russian (ru)
- Arabic (ar)
- Chinese (zh)
- Japanese (ja)
- Korean (ko)

## Database Schema

```sql
CREATE TABLE voice_transcriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message_id TEXT UNIQUE NOT NULL,
  audio_url TEXT NOT NULL,
  transcription TEXT NOT NULL,
  language TEXT NOT NULL,
  duration INTEGER NOT NULL,
  provider TranscriptionProvider NOT NULL,
  confidence DECIMAL(3,2),
  processing_time INTEGER NOT NULL,
  cost DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TYPE TranscriptionProvider AS ENUM (
  'WhisperAPI',
  'WhisperCpp',
  'GoogleSTT',
  'AssemblyAI'
);
```

## Error Handling

The transcription system handles various error scenarios:

1. **Audio Download Failed**: Retries up to 2 times
2. **Provider API Error**: Falls back to alternative provider if configured
3. **Invalid Audio Format**: Returns clear error message
4. **Timeout**: Fails after 5 minutes of processing

## Performance

- **Whisper API**: ~2-5 seconds for 1-minute audio
- **Whisper.cpp (base model)**: ~5-10 seconds for 1-minute audio
- **Concurrent Jobs**: 2 transcription jobs processed simultaneously
- **Queue Priority**: Medium priority (5)

## Cost Optimization

1. **Use Whisper.cpp for high volume**: No API costs
2. **Cache transcriptions**: Avoid re-transcribing same audio
3. **Set language hint**: Improves accuracy and speed
4. **Use appropriate model size**: Balance accuracy vs. speed

## Monitoring

Monitor transcription performance:

```javascript
// Get queue health
GET /api/v1/health/queues

// Check transcription statistics
SELECT 
  provider,
  COUNT(*) as total,
  AVG(processing_time) as avg_time,
  SUM(cost) as total_cost
FROM voice_transcriptions
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider;
```

## Best Practices

1. **Always provide language hint** when known for better accuracy
2. **Use triggerChatbot** for automated customer support
3. **Monitor costs** for Whisper API usage
4. **Set up Whisper.cpp** for high-volume scenarios
5. **Handle Socket.io events** for real-time UI updates
6. **Store audio files** in S3/Cloudinary for reliability

## Troubleshooting

### Transcription Not Starting

- Check if provider is configured (API key or whisper.cpp path)
- Verify audio URL is accessible
- Check queue health: `GET /api/v1/health/queues`

### Low Accuracy

- Provide language hint
- Use higher quality audio
- Try different provider
- Use larger model (for Whisper.cpp)

### High Costs

- Switch to Whisper.cpp for self-hosted
- Implement audio duration limits
- Cache transcriptions
- Use smaller model for non-critical transcriptions

## Future Enhancements

- [ ] Support for Google Speech-to-Text
- [ ] Support for AssemblyAI
- [ ] Speaker diarization
- [ ] Sentiment analysis on transcriptions
- [ ] Translation after transcription
- [ ] Confidence score thresholds
- [ ] Custom vocabulary support
