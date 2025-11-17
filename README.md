# Service Health Check Dashboard

A full-stack web application for monitoring the health of your services with automated health checks, detailed reporting, and a responsive dashboard interface.

![Health Check Dashboard](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 Features

### Core Functionality
- **Configuration Interface**: Web UI to add, edit, and delete health check endpoints
- **Flexible Health Checks**: Support for multiple HTTP methods, custom headers, and validation rules
- **Automated Scheduling**: Run checks at intervals or using cron expressions
- **Real-time Monitoring**: Dashboard with color-coded status indicators
- **Detailed History**: View check results, response times, and error messages
- **Data Retention**: Configurable automatic cleanup of old check results
- **RESTful API**: Well-documented API with Swagger/OpenAPI

### Health Check Configuration
For each endpoint, you can configure:
- URL and HTTP method (GET, POST, PUT, DELETE, PATCH, HEAD)
- Custom request headers (key-value pairs)
- Expected HTTP status codes
- JSON path assertions for response validation
- Response time thresholds
- Check frequency (minutes) or cron schedule
- Request timeout settings

### Validation Rules
- **Status Code Validation**: Ensure responses match expected HTTP status codes
- **Response Time Validation**: Alert when responses exceed time thresholds
- **JSON Path Assertions**: Validate response body content with operators:
  - `equals`: Exact match
  - `notEquals`: Must not match
  - `contains`: String contains check
  - `exists`: Field must exist

### Dashboard Features
- Overview page showing all endpoints with current status
- Real-time status updates (auto-refresh every 30 seconds)
- Search and filter capabilities
- Detailed endpoint view with:
  - Check history timeline
  - Response details for each check
  - Uptime percentage (7-day and 30-day)
  - Average response time metrics
- Manual trigger for immediate health checks

## 🏗️ Architecture

### Technology Stack
- **Backend**: Node.js with Express
- **Frontend**: React with React Router
- **Database**: SQLite (lightweight, no separate server needed)
- **Scheduler**: node-cron for background health checks
- **API Documentation**: Swagger/OpenAPI
- **Containerization**: Docker with multi-stage builds

### Project Structure
```
health-service-dashboard/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and app configuration
│   │   ├── models/          # Data models (Endpoint, CheckResult)
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (HealthCheck, Scheduler, Cleanup)
│   │   └── index.js         # Application entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client
│   │   └── App.js           # Main React app
│   ├── public/
│   └── package.json
├── docker-compose.yml       # Docker Compose configuration
├── Dockerfile               # Multi-stage Docker build
└── README.md
```

## 📦 Installation & Setup

### Prerequisites
- Docker and Docker Compose
- (Optional) Node.js 18+ and npm for local development

### Quick Start with Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/ryanvalle/health-service-dashboard.git
   cd health-service-dashboard
   ```

2. **Build and start with Docker**
   ```bash
   docker compose build
   docker compose up -d
   ```

3. **Access the application**
   - Dashboard: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs

That's it! The application will be running with a persistent SQLite database.

For local development setup or troubleshooting, see the [Quick Start Guide](QUICKSTART.md).

### Local Development Setup

#### Backend Setup
```bash
cd backend
npm install
npm run migrate  # Initialize database
npm start        # Production mode
# or
npm run dev      # Development mode with auto-reload
```

The backend API will be available at http://localhost:3001

#### Frontend Setup
```bash
cd frontend
npm install
npm start        # Development mode
# or
npm run build    # Production build
```

The frontend will be available at http://localhost:3000

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database
DB_PATH=/app/data/database.sqlite

# Optional: For development
# DB_PATH=./data/database.sqlite
```

### Data Retention

Configure the retention period through the Settings page in the UI, or via API:

```bash
curl -X PUT http://localhost:3001/api/settings/retention \
  -H "Content-Type: application/json" \
  -d '{"retention_days": 30}'
```

Default retention is 30 days. Old check results are automatically deleted daily at 2 AM.

## 📖 Usage Examples

### Adding a Health Check Endpoint

1. Click "Add Endpoint" in the dashboard
2. Fill in the form:
   - **Name**: My API Service
   - **URL**: https://api.example.com/health
   - **Method**: GET
   - **Expected Status Codes**: 200, 201
   - **Check Frequency**: 5 (minutes)
   - **Timeout**: 30000 (ms)

3. **Advanced Configuration**:
   
   **Custom Headers**:
   ```json
   {
     "Authorization": "Bearer your-token",
     "Content-Type": "application/json"
   }
   ```

   **JSON Path Assertions**:
   ```json
   [
     {
       "path": "status",
       "operator": "equals",
       "value": "healthy"
     },
     {
       "path": "data.uptime",
       "operator": "exists",
       "value": null
     }
   ]
   ```

   **Cron Schedule** (instead of frequency):
   ```
   */15 * * * *    # Every 15 minutes
   0 */2 * * *     # Every 2 hours
   0 9 * * 1-5     # 9 AM on weekdays
   ```

### API Usage

#### Create an Endpoint
```bash
curl -X POST http://localhost:3001/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API",
    "url": "https://api.example.com/health",
    "method": "GET",
    "expected_status_codes": [200, 201],
    "check_frequency": 5,
    "timeout": 30000,
    "response_time_threshold": 5000,
    "headers": {
      "Authorization": "Bearer token"
    },
    "json_path_assertions": [
      {
        "path": "status",
        "operator": "equals",
        "value": "ok"
      }
    ]
  }'
```

#### List All Endpoints
```bash
curl http://localhost:3001/api/endpoints
```

#### Manually Trigger a Check
```bash
curl -X POST http://localhost:3001/api/endpoints/1/check
```

#### Get Check History
```bash
curl http://localhost:3001/api/endpoints/1/history?limit=50
```

## 🔌 API Documentation

Full API documentation is available via Swagger UI at:
```
http://localhost:3001/api-docs
```

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/endpoints | List all endpoints |
| GET | /api/endpoints/:id | Get endpoint details |
| POST | /api/endpoints | Create new endpoint |
| PUT | /api/endpoints/:id | Update endpoint |
| DELETE | /api/endpoints/:id | Delete endpoint |
| POST | /api/endpoints/:id/check | Trigger manual check |
| GET | /api/endpoints/:id/history | Get check history |
| GET | /api/settings | Get settings |
| PUT | /api/settings/retention | Update retention period |

## 🐳 Docker Configuration

### Building the Image
```bash
docker build -t health-check-dashboard .
```

### Running with Docker Compose
```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down

# Stop and remove data
docker-compose down -v
```

### Volume Mounts
The application uses a volume to persist the SQLite database:
```yaml
volumes:
  - ./data:/app/data
```

This ensures your health check configurations and history survive container restarts.

## 🛠️ Advanced Configuration

### Using PostgreSQL Instead of SQLite

While SQLite is the default for simplicity, you can modify the database configuration to use PostgreSQL:

1. Install `pg` package in backend
2. Update `backend/src/config/database.js` to use PostgreSQL connection
3. Update environment variables with PostgreSQL connection string

### HTTPS Support

For HTTPS endpoints with self-signed certificates, you may need to set:
```javascript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

**Note**: Only use this in development environments.

### Custom Scheduling Examples

**Check every 30 seconds**:
```json
{
  "check_frequency": 0.5
}
```

**Check at specific times**:
```json
{
  "cron_schedule": "0 0,6,12,18 * * *"
}
```
This checks at midnight, 6 AM, noon, and 6 PM daily.

## 🔒 Security Considerations

- The application does not include authentication by default
- For production use, consider adding:
  - Authentication middleware (JWT, OAuth)
  - Rate limiting
  - Input validation and sanitization (basic validation included)
  - HTTPS/TLS encryption
  - Network isolation using Docker networks
- Sensitive headers (like API keys) are stored in the database
- Consider encrypting sensitive data at rest

## 🧪 Testing

To test a health check endpoint manually:
```bash
# Test the health check service itself
curl http://localhost:3001/health

# Response: {"status":"healthy","timestamp":"...","uptime":123.456}
```

## 📊 Monitoring

The application includes:
- Self-health check endpoint at `/health`
- Docker health checks (configured in docker-compose.yml)
- Automatic data cleanup to prevent database bloat
- Detailed logging of all health check operations

## 🐛 Troubleshooting

### Docker Build Issues

If `docker compose build` fails with npm errors:

```bash
# The build uses npm install with --prefer-offline flag
# If you still have issues, try clearing Docker cache:
docker builder prune -a
docker compose build --no-cache
```

For environments with restricted network access, the Dockerfile uses `npm install` instead of `npm ci` with flags to minimize network calls:
- `--production`: Install only production dependencies (backend)
- `--no-audit`: Skip security audit (speeds up build)
- `--prefer-offline`: Use cached packages when available

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up -d
```

### Port Conflicts
If port 3000 is already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "8080:3001"  # Use port 8080 instead
```

### Check Logs
```bash
# View application logs
docker-compose logs -f app

# View specific time range
docker-compose logs --since 30m app
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙋 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Built with ❤️ for reliable service monitoring**