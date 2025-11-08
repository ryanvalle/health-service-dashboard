# Quick Start Guide

## Local Development Setup (Recommended)

The fastest way to get started is to run the backend and frontend separately in development mode:

### 1. Start the Backend

```bash
cd backend
npm install
npm run migrate  # Initialize database
npm start        # Start backend server on port 3001
```

The backend API will be available at http://localhost:3001

### 2. Start the Frontend (in a new terminal)

```bash
cd frontend
npm install
npm start        # Start frontend dev server on port 3000
```

The dashboard will open automatically at http://localhost:3000

### 3. Access the Application

- **Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:3001/api-docs
- **Health Endpoint**: http://localhost:3001/health

## Docker Setup

### Build and Run

```bash
# Build the image
docker compose build

# Run the container
docker compose up -d

# View logs
docker compose logs -f app

# Stop
docker compose down
```

The application will be available at http://localhost:3000

**Note**: The Docker setup includes both frontend and backend in a single container. If you encounter issues, use the local development setup instead.

## Configuration

### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=3001
DB_PATH=./data/database.sqlite
NODE_ENV=development
```

### Frontend Proxy

The frontend development server is configured to proxy API requests to `http://localhost:3001`. This is set in `frontend/package.json`.

## Testing the API

### Create an Endpoint

```bash
curl -X POST http://localhost:3001/api/endpoints \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example API",
    "url": "https://jsonplaceholder.typicode.com/posts/1",
    "method": "GET",
    "expected_status_codes": [200],
    "check_frequency": 5
  }'
```

### List All Endpoints

```bash
curl http://localhost:3001/api/endpoints | jq .
```

### Trigger Manual Check

```bash
curl -X POST http://localhost:3001/api/endpoints/1/check | jq .
```

## Troubleshooting

### Port Already in Use

If port 3000 or 3001 is already in use:

```bash
# Find process using port
lsof -i :3000
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Database Lock Issues

If you encounter database lock issues:

```bash
cd backend
rm -rf data/
npm run migrate
```

### Module Not Found Errors

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Development Tips

- The backend automatically restarts when you save changes (if using `npm run dev`)
- The frontend hot-reloads when you save changes
- Check logs in the terminal where you started each service
- Use the Swagger UI at http://localhost:3001/api-docs to test API endpoints

## Next Steps

After starting the application:

1. Open http://localhost:3000
2. Click "Add Endpoint" to create your first health check
3. Configure the endpoint with URL, method, and validation rules
4. View the dashboard to see real-time health status
5. Click on an endpoint to see detailed history and metrics
