# Service Health Check Dashboard

A full-stack application for monitoring the health of your services with automated health checks, detailed reporting, and a responsive dashboard interface. **Available as both a web application and a standalone desktop app!**

![Health Check Dashboard](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 Features

### Deployment Options
- **🖥️ Desktop Application**: Run as a standalone Electron app on Windows, macOS, or Linux
- **🌐 Web Application**: Deploy with Docker or run locally with Node.js
- **📦 No Dependencies**: Desktop app requires no Docker or external database setup

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
  - RESTful API with Express.js framework
  - SQLite3 for database operations
  - node-cron for scheduled health checks
  - Axios for HTTP requests
  - Helmet for security headers
  - Express-validator for input validation
  - Swagger UI Express for API documentation
- **Frontend**: React with React Router
  - Single Page Application (SPA)
  - React Router for navigation
  - Built with Create React App
  - API client service for backend communication
- **Database**: SQLite (lightweight, file-based, no separate server needed)
  - Stores endpoint configurations
  - Stores check results and history
  - Automatic migrations on first run
- **Scheduler**: node-cron for automated health checks
  - Supports both interval-based and cron expression scheduling
  - Automatic retry logic
  - Concurrent check execution
- **API Documentation**: Swagger/OpenAPI 3.0
  - Interactive API documentation at `/api-docs`
  - Complete endpoint specifications
- **Desktop App**: Electron (cross-platform desktop wrapper)
  - Embeds backend server within Electron process
  - No external Node.js installation required for end users
  - Native desktop window with system tray integration
- **Containerization**: Docker with multi-stage builds
  - Optimized image size
  - Separate build stages for frontend and backend
  - Production-ready configuration

### Project Structure
```
health-service-dashboard/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js      # SQLite database configuration
│   │   │   ├── migrate.js       # Database migration script
│   │   │   └── swagger.js       # Swagger/OpenAPI setup
│   │   ├── models/
│   │   │   ├── Endpoint.js      # Endpoint data model and CRUD
│   │   │   └── CheckResult.js   # Check result data model
│   │   ├── routes/
│   │   │   ├── endpoints.js     # Endpoint API routes
│   │   │   └── settings.js      # Settings API routes
│   │   ├── services/
│   │   │   ├── HealthCheckService.js  # Health check execution logic
│   │   │   ├── SchedulerService.js    # Cron job scheduling
│   │   │   └── CleanupService.js      # Data retention cleanup
│   │   └── index.js             # Express app setup and entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.js     # Main dashboard view
│   │   │   ├── EndpointDetail.js # Endpoint details and history
│   │   │   ├── EndpointForm.js  # Add/edit endpoint form
│   │   │   └── Settings.js      # Application settings
│   │   ├── services/
│   │   │   └── api.js           # API client service
│   │   ├── App.js               # Main React app component
│   │   └── index.js             # React entry point
│   ├── public/                  # Static assets
│   └── package.json
├── electron/
│   ├── main.js                  # Electron main process
│   └── preload.js               # Electron preload script
├── scripts/
│   ├── install.sh               # Unix installation script
│   └── install.bat              # Windows installation script
├── docker-compose.yml           # Docker Compose configuration
├── Dockerfile                   # Multi-stage Docker build
├── package.json                 # Root package.json for Electron
├── README.md                    # This file
├── ELECTRON.md                  # Detailed Electron documentation
└── QUICKSTART.md                # Quick start development guide
```

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │   React Frontend (SPA)                           │   │
│  │   - Dashboard, Forms, Detail Views               │   │
│  │   - Auto-refresh, Real-time status updates       │   │
│  └──────────────────┬───────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────┘
                      │ HTTP/REST API
┌─────────────────────┼───────────────────────────────────┐
│                     ▼                                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │   Express.js Backend API                         │   │
│  │   - RESTful endpoints                            │   │
│  │   - Request validation                           │   │
│  │   - Swagger documentation                        │   │
│  └─────┬────────────────────────┬──────────────────┘   │
│        │                        │                       │
│        ▼                        ▼                       │
│  ┌─────────────┐         ┌──────────────┐              │
│  │   SQLite    │         │  Scheduler   │              │
│  │   Database  │         │  (node-cron) │              │
│  │  - Endpoints│         │  - Job queue │              │
│  │  - Results  │         │  - Intervals │              │
│  │  - Settings │         │  - Cron expr │              │
│  └─────────────┘         └──────┬───────┘              │
│                                 │                       │
│                                 ▼                       │
│                    ┌────────────────────────┐           │
│                    │  Health Check Service  │           │
│                    │  - HTTP requests       │           │
│                    │  - Validation logic    │           │
│                    │  - Result storage      │           │
│                    └────────────────────────┘           │
└─────────────────────────────────────────────────────────┘

Deployment Options:
1. Docker Container: All components in single container
2. Electron Desktop: Backend embedded in Electron process
3. Separate Processes: Frontend dev server + Backend server
```

## 📦 Installation & Setup

Choose your preferred deployment method based on your needs:

### Deployment Options Comparison

| Feature | Docker | Electron Desktop | Local Development |
|---------|--------|------------------|-------------------|
| **Best For** | Production, servers | End users, offline use | Development, testing |
| **Prerequisites** | Docker, Docker Compose | Node.js 18+ | Node.js 18+ |
| **Installation Time** | 3-5 minutes | 2-3 minutes | 1-2 minutes |
| **Disk Space** | ~200MB (image) | ~500MB (with dependencies) | ~300MB |
| **Updates** | Rebuild container | Reinstall app | `git pull` + `npm install` |
| **Database Location** | `./data/` in project | User data directory | `backend/data/` |
| **Internet Required** | Initial build only | Initial install only | Initial install only |
| **Multi-user** | ✅ Yes (shared server) | ❌ No (single user) | ⚠️ Manual setup |
| **Auto-start** | ✅ With restart policy | ⚠️ OS-dependent | ❌ Manual |
| **Hot Reload** | ❌ No | ✅ In dev mode | ✅ Yes |
| **Port Configuration** | docker-compose.yml | Hardcoded (3001) | .env file |

### Option 1: Docker (Recommended for Production)

Perfect for deploying to servers or running in containers. No Node.js installation needed.

#### Prerequisites
- Docker 20.10+ and Docker Compose V2
- 2GB RAM minimum
- Port 3000 available

#### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/ryanvalle/health-service-dashboard.git
   cd health-service-dashboard
   ```

2. **Build the Docker image**
   ```bash
   docker compose build
   ```
   
   This multi-stage build process will:
   - Install backend dependencies
   - Install and build the frontend
   - Create an optimized production image
   - First build may take 3-5 minutes

3. **Start the application**
   ```bash
   docker compose up -d
   ```
   
   The application starts in detached mode (background)

4. **Verify the application is running**
   ```bash
   docker compose ps
   docker compose logs -f app
   ```

5. **Access the application**
   - Dashboard: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs
   - Health Check: http://localhost:3000/health

#### Docker Commands Reference

```bash
# View logs
docker compose logs -f app

# Stop the application
docker compose down

# Restart the application
docker compose restart

# Stop and remove all data (WARNING: deletes database)
docker compose down -v

# Rebuild after code changes
docker compose build --no-cache
docker compose up -d
```

#### Data Persistence

The SQLite database is stored in a Docker volume mounted to `./data/database.sqlite`. Your endpoint configurations and check history persist across container restarts.

```bash
# Backup database
cp data/database.sqlite data/database.backup.sqlite

# Restore database
docker compose down
cp data/database.backup.sqlite data/database.sqlite
docker compose up -d
```

### Option 2: Desktop Application (Electron)

Run as a standalone desktop application on Windows, macOS, or Linux. No Docker required!

#### Prerequisites
- Node.js 18+ and npm 8+
- 4GB RAM minimum
- 500MB free disk space

#### Installation Steps

**Method 1: Using Installation Script (Recommended)**

For Unix/Linux/macOS:
```bash
# Make script executable (if needed)
chmod +x scripts/install.sh

# Run installation script
./scripts/install.sh

# Start the desktop app
npm start
```

For Windows:
```cmd
# Run installation script
scripts\install.bat

# Start the desktop app
npm start
```

The installation script will:
1. Check Node.js version compatibility
2. Install Electron dependencies (root)
3. Install frontend dependencies
4. Install backend dependencies
5. Build the frontend for production
6. Initialize the SQLite database

**Method 2: Manual Installation**

```bash
# Install all dependencies
npm install                    # Electron dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Build the frontend
npm run build:frontend

# Initialize database
cd backend && npm run migrate && cd ..

# Start the desktop app
npm start
```

#### What You Get

The desktop application provides:
- ✅ Native desktop window (no browser needed)
- ✅ Backend server runs automatically within Electron
- ✅ Database stored in your user data directory
- ✅ Works completely offline
- ✅ System tray integration
- ✅ Single-instance enforcement (only one app runs at a time)
- ✅ Auto-starts backend on launch
- ✅ Graceful shutdown handling

#### Database Location

The desktop app stores data in platform-specific locations:

- **Windows**: `%APPDATA%/health-check-dashboard/database.sqlite`
- **macOS**: `~/Library/Application Support/health-check-dashboard/database.sqlite`
- **Linux**: `~/.config/health-check-dashboard/database.sqlite`

#### Building Distributable Packages

Create installer packages for distribution:

```bash
# Build for all platforms (requires appropriate OS)
npm run package:all

# Build for specific platform
npm run package:win    # Windows (NSIS installer + portable EXE)
npm run package:mac    # macOS (DMG + ZIP)
npm run package:linux  # Linux (AppImage + DEB)
```

**Platform Build Limitations:**
- Windows: Can build for Windows only
- macOS: Can build for macOS and Windows
- Linux: Can build for Linux and Windows

Built packages will be in the `dist/` directory.

#### Desktop Development Mode

For development with hot-reload:

```bash
# Terminal 1: Start React dev server
cd frontend
npm start

# Terminal 2: Start Electron in dev mode
npm run dev
```

This enables:
- Hot reload for frontend changes
- DevTools automatically opened
- Frontend served from http://localhost:3000

For more details, see [ELECTRON.md](ELECTRON.md).

### Option 3: Local Development Setup

Best for development and testing. Run backend and frontend separately.

#### Prerequisites
- Node.js 18+ and npm 8+
- Port 3000 and 3001 available

#### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize database**
   ```bash
   npm run migrate
   ```
   
   This creates the SQLite database and tables at `backend/data/database.sqlite`

4. **Start backend server**
   ```bash
   # Production mode
   npm start
   
   # Development mode (auto-reload on file changes)
   npm run dev
   ```

The backend API will be available at http://localhost:3001

#### Frontend Setup

In a new terminal:

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start frontend dev server**
   ```bash
   npm start
   ```
   
   The dashboard will automatically open at http://localhost:3000

4. **Build for production (optional)**
   ```bash
   npm run build
   ```
   
   Creates optimized production build in `frontend/build/`

#### Quick Reference

```bash
# Start everything quickly
cd backend && npm install && npm run migrate && npm start &
cd frontend && npm install && npm start
```

#### Environment Configuration

Create `backend/.env` for custom configuration:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DB_PATH=./data/database.sqlite

# Optional: CORS settings for development
CORS_ORIGIN=http://localhost:3000
```

For detailed local development instructions, see [QUICKSTART.md](QUICKSTART.md).

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

## 🐳 Docker Details

### Dockerfile Architecture

The application uses a multi-stage Docker build for optimal image size and security:

**Stage 1: Backend Builder**
- Base: `node:18-alpine`
- Installs backend production dependencies
- Uses npm flags: `--production --no-audit --prefer-offline`

**Stage 2: Frontend Builder**
- Base: `node:18-alpine`
- Installs frontend dependencies and builds React app
- Creates optimized production bundle

**Stage 3: Final Production Image**
- Base: `node:18-alpine`
- Copies backend dependencies and source from Stage 1
- Copies built frontend from Stage 2
- Configures environment and health checks
- Final image size: ~200MB

### Docker Compose Configuration

```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: health-check-dashboard
    ports:
      - "3000:3001"           # Maps host:3000 to container:3001
    environment:
      - NODE_ENV=production
      - PORT=3001
      - DB_PATH=/app/data/database.sqlite
    volumes:
      - ./data:/app/data      # Persist SQLite database
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get(...)"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Customizing Docker Deployment

#### Change Port Mapping

Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:3001"  # Access at http://localhost:8080
```

#### Use External Database Volume

```yaml
volumes:
  - db_data:/app/data

volumes:
  db_data:
    driver: local
```

#### Add Environment Variables

```yaml
environment:
  - NODE_ENV=production
  - PORT=3001
  - DB_PATH=/app/data/database.sqlite
  - LOG_LEVEL=info
```

### Building for Different Environments

```bash
# Development build (with source maps)
docker build -t health-check-dashboard:dev \
  --build-arg NODE_ENV=development .

# Production build (optimized)
docker build -t health-check-dashboard:prod .

# Run specific version
docker run -d -p 3000:3001 \
  -v $(pwd)/data:/app/data \
  health-check-dashboard:prod
```

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

### Docker Issues

#### Build Failures

If `docker compose build` fails:

```bash
# Clear Docker cache and rebuild
docker builder prune -a
docker compose build --no-cache

# Check for network issues
docker build --progress=plain -t test-build .
```

Common causes:
- Network connectivity issues during `npm install`
- Insufficient disk space
- Docker daemon not running

#### Container Won't Start

```bash
# Check container logs
docker compose logs -f app

# Check container status
docker compose ps

# Restart container
docker compose restart app
```

#### Port Conflicts

Error: "Port 3000 is already allocated"

```bash
# Find process using port 3000
lsof -i :3000  # Unix/Mac
netstat -ano | findstr :3000  # Windows

# Kill the process or change port in docker-compose.yml
ports:
  - "8080:3001"  # Use port 8080 instead
```

#### Database Lock Issues

```bash
# Reset database (WARNING: deletes all data)
docker compose down -v
rm -rf data/
docker compose up -d
```

#### Permission Issues on Linux

```bash
# If database file has permission errors
sudo chown -R $USER:$USER data/
chmod 644 data/database.sqlite
```

### Electron Desktop App Issues

#### Application Won't Start

1. **Check Node.js version**
   ```bash
   node --version  # Should be 18.0.0 or higher
   ```

2. **Reinstall dependencies**
   ```bash
   rm -rf node_modules frontend/node_modules backend/node_modules
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```

3. **Rebuild frontend**
   ```bash
   npm run build:frontend
   ```

4. **Check for port conflicts**
   ```bash
   # Port 3001 must be available
   lsof -i :3001  # Unix/Mac
   netstat -ano | findstr :3001  # Windows
   ```

5. **Try development mode for detailed logs**
   ```bash
   npm run dev
   ```

#### Backend Server Errors in Electron

Check the Electron console (DevTools):
- In development mode: DevTools open automatically
- In production: Not accessible (check terminal output)

Common issues:
- Database file permissions
- Missing backend dependencies
- Port already in use

#### Multiple App Instances

The app should enforce single-instance locking. If multiple instances open:

```bash
# Quit all instances
pkill -f "Electron"  # Unix/Mac
taskkill /F /IM "Health Check Dashboard.exe"  # Windows

# Rebuild
npm run package
```

#### Database Issues in Desktop App

Reset the database:

1. **Locate database file** (see paths in Electron section above)
2. **Close the application**
3. **Delete database file**
4. **Restart application** (database recreated automatically)

#### Build/Package Errors

```bash
# Clear build artifacts
rm -rf dist/
rm -rf frontend/build/

# Ensure all dependencies are installed
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Rebuild everything
npm run build:frontend
npm run package
```

### Local Development Issues

#### Module Not Found Errors

```bash
# Backend
cd backend && npm install

# Frontend
cd frontend && npm install
```

#### Database Locked

```bash
# Close all connections and delete database
cd backend
rm -rf data/
npm run migrate
```

#### Port Already in Use

**Backend (Port 3001):**
```bash
# Unix/Mac
lsof -i :3001
kill -9 <PID>

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Frontend (Port 3000):**
```bash
# Unix/Mac
lsof -i :3000
kill -9 <PID>

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### Frontend Can't Connect to Backend

1. **Verify backend is running**: http://localhost:3001/health
2. **Check proxy configuration** in `frontend/package.json`:
   ```json
   "proxy": "http://localhost:3001"
   ```
3. **Check CORS settings** if running on different domains

#### Build Warnings or Errors

```bash
# Frontend build issues
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build

# Backend issues
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Network and Connectivity

#### Checking External Endpoints

```bash
# Test health check endpoint manually
curl http://localhost:3001/health

# Test API endpoint
curl http://localhost:3001/api/endpoints

# Test external URL from backend
docker compose exec app curl https://api.example.com/health
```

#### HTTPS/TLS Issues

For endpoints with self-signed certificates, you may need to configure Node.js to accept them. **Only use in development:**

```javascript
// In backend/src/index.js (development only)
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
```

### Getting Help

If you're still experiencing issues:

1. **Check logs**: 
   - Docker: `docker compose logs -f app`
   - Electron: Console/DevTools
   - Local: Terminal output

2. **Verify versions**:
   ```bash
   node --version  # 18+
   npm --version   # 8+
   docker --version  # 20.10+
   ```

3. **Search existing issues**: Check GitHub Issues for similar problems

4. **Create new issue**: Include:
   - Operating system and version
   - Node.js and npm versions
   - Complete error messages
   - Steps to reproduce
   - Deployment method (Docker/Electron/Local)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙋 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Built with ❤️ for reliable service monitoring**