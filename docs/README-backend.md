# Telegram Sender Backend

A Flask-based REST API backend for the Telegram message sender application. This backend integrates with the Telethon library to provide secure Telegram messaging capabilities.

## 🚀 Quick Start

### Option 1: Automatic Setup (Recommended)

```bash
python start_backend.py
```

This will automatically:

- Check Python version compatibility
- Install all required dependencies
- Create necessary directories
- Set up environment configuration
- Start the Flask server

### Option 2: Manual Setup

1. **Install dependencies:**

   ```bash
   pip install -r requirements-backend.txt
   ```

2. **Create directories:**

   ```bash
   mkdir sessions logs
   ```

3. **Run the server:**
   ```bash
   python backend_server.py
   ```

## 📋 Requirements

- **Python 3.7+**
- **Dependencies** (automatically installed):
  - Flask 2.3.3
  - Flask-CORS 4.0.0
  - Telethon 1.29.3
  - PyJWT 2.8.0
  - python-dotenv 1.0.0
  - cryptg 0.4.0

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
SECRET_KEY=your-secret-key-change-this-in-production
FLASK_ENV=development
FLASK_DEBUG=1
```

### Telegram API Credentials

You'll need to obtain these from [my.telegram.org/apps](https://my.telegram.org/apps):

- API ID
- API Hash
- Phone Number

## 📡 API Endpoints

### Authentication

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "api_id": "your_api_id",
  "api_hash": "your_api_hash",
  "phone_number": "+1234567890"
}
```

**Response:**

```json
{
  "success": false,
  "requires_code": true,
  "message": "Verification code sent to your phone. Please provide the code."
}
```

#### Verify Code

```http
POST /api/auth/verify
Content-Type: application/json

{
  "phone_number": "+1234567890",
  "code": "12345",
  "password": "optional_2fa_password"
}
```

**Response:**

```json
{
  "success": true,
  "session_token": "jwt_token_here",
  "message": "Successfully authenticated with Telegram"
}
```

#### Check Status

```http
GET /api/auth/status
Authorization: Bearer <jwt_token>
```

### Chat Management

#### Get All Chats

```http
GET /api/chats
Authorization: Bearer <jwt_token>
```

**Response:**

```json
{
  "chats": [
    {
      "id": "123456789",
      "name": "Group Name",
      "type": "group",
      "username": "groupusername",
      "participants_count": 50
    }
  ]
}
```

### Message Operations

#### Send Message

```http
POST /api/messages/send
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "recipients": [
    {
      "name": "Group Name",
      "identifier": "@groupusername"
    }
  ],
  "message": "Hello, world!",
  "schedule_for": "2024-01-01T12:00:00"  // Optional
}
```

#### Get Scheduled Messages

```http
GET /api/messages/scheduled
Authorization: Bearer <jwt_token>
```

#### Execute Scheduled Message

```http
POST /api/messages/execute/123
Authorization: Bearer <jwt_token>
```

#### Delete Scheduled Message

```http
DELETE /api/messages/123
Authorization: Bearer <jwt_token>
```

## 🗄️ Database

The backend uses SQLite for data persistence:

- **File:** `telegram_sender.db`
- **Tables:**
  - `scheduled_messages` - Stores scheduled messages
  - `user_sessions` - Stores user session information

## 🔐 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Session Management** - Persistent Telegram sessions
- **CORS Protection** - Configured for frontend domains
- **Input Validation** - Comprehensive request validation
- **Error Handling** - Detailed error responses

## 📁 File Structure

```
telegram-bot/
├── backend_server.py          # Main Flask application
├── start_backend.py           # Startup script
├── requirements-backend.txt   # Python dependencies
├── .env                      # Environment configuration
├── sessions/                 # Telegram session files
├── logs/                     # Application logs
└── telegram_sender.db        # SQLite database
```

## 🔄 Integration with Frontend

The backend is designed to work seamlessly with the Next.js frontend:

1. **CORS Configuration** - Allows requests from `localhost:3000` and Vercel domains
2. **JWT Tokens** - Secure authentication between frontend and backend
3. **RESTful API** - Standard HTTP methods and JSON responses
4. **Error Handling** - Consistent error format for frontend consumption

## 🐛 Troubleshooting

### Common Issues

1. **"Client not connected" error**

   - Make sure you've completed the authentication flow
   - Check if your session file exists in the `sessions/` directory

2. **"Invalid phone number format" error**

   - Ensure phone number includes country code (e.g., +1234567890)

3. **"Failed to resolve entity" error**

   - Check if the group/user identifier is correct
   - Try using different identifier formats (@username, ID, etc.)

4. **Import errors**
   - Make sure all dependencies are installed: `pip install -r requirements-backend.txt`

### Debug Mode

The server runs in debug mode by default, providing detailed error messages and auto-reload on code changes.

### Logs

Check the console output for detailed logs including:

- Authentication attempts
- Message sending results
- Error details

## 🔧 Development

### Adding New Features

1. **New API Endpoint:**

   ```python
   @app.route('/api/new-endpoint', methods=['POST'])
   def new_endpoint():
       # Your code here
       return jsonify({'success': True})
   ```

2. **Database Operations:**
   ```python
   def new_db_operation(self):
       with self.get_connection() as conn:
           # Your SQL operations
           conn.commit()
   ```

### Testing

Test the API endpoints using tools like:

- **Postman** - GUI testing
- **curl** - Command line testing
- **Frontend** - Integration testing

Example curl command:

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"api_id":"123","api_hash":"abc","phone_number":"+1234567890"}'
```

## 🚀 Production Deployment

For production deployment:

1. **Change SECRET_KEY** in environment variables
2. **Disable debug mode** (`FLASK_DEBUG=0`)
3. **Use production WSGI server** (e.g., Gunicorn)
4. **Set up proper logging**
5. **Configure firewall** to allow only necessary ports

Example production command:

```bash
gunicorn -w 4 -b 0.0.0.0:8000 backend_server:app
```

## 📄 License

This project is for educational and personal use. Please respect Telegram's terms of service.

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the console logs for error details
3. Ensure all dependencies are properly installed
4. Verify your Telegram API credentials

## 🎯 Roadmap

Future enhancements:

- [ ] Message scheduling with cron jobs
- [ ] Multi-user support
- [ ] Message templates
- [ ] Analytics and reporting
- [ ] Rate limiting improvements
- [ ] WebSocket support for real-time updates
