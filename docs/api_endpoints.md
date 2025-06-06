# Python Backend API Endpoints

## Required endpoints for Next.js frontend integration:

### 1. Authentication & Configuration

```
POST /api/auth/login
- Body: { api_id, api_hash, phone_number }
- Response: { success, session_token, message }

GET /api/auth/status
- Headers: Authorization: Bearer <token>
- Response: { connected, phone_number }
```

### 2. Group/Chat Management

```
GET /api/chats
- Headers: Authorization: Bearer <token>
- Response: { chats: [{ id, name, type, username }] }

POST /api/chats/search
- Body: { query }
- Response: { results: [{ id, name, type, username }] }
```

### 3. Message Sending

```
POST /api/messages/send
- Body: {
    recipients: [{ id, type }],
    message: string,
    schedule_for?: datetime
  }
- Response: { success, sent_count, failed_count, errors }

GET /api/messages/scheduled
- Response: { messages: [{ id, recipients, message, scheduled_for, status }] }

POST /api/messages/execute/:id
- Execute a scheduled message immediately
- Response: { success, message }

DELETE /api/messages/:id
- Delete a scheduled message
- Response: { success }
```

### 4. Health Check

```
GET /api/health
- Response: { status: "ok", telegram_connected: boolean }
```
