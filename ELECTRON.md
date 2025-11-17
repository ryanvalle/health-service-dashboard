# Electron Desktop Application

This document provides details about running the Health Check Dashboard as a desktop application.

## Overview

The desktop application uses Electron to wrap the existing web application, providing:
- Native desktop window
- Automatic backend server management
- Offline operation (no Docker required)
- Cross-platform support (Windows, macOS, Linux)

## Requirements

- Node.js 18 or higher
- npm 8 or higher

## Quick Start

1. **Install all dependencies:**
   ```bash
   # Install root (Electron) dependencies
   npm install
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   
   # Install backend dependencies
   cd backend && npm install && cd ..
   ```

2. **Build the frontend:**
   ```bash
   npm run build:frontend
   ```

3. **Run the desktop app:**
   ```bash
   npm start
   ```

## Development Mode

To run in development mode with React dev server:

1. Start the React dev server:
   ```bash
   cd frontend
   npm start
   ```

2. In a separate terminal, start the Electron app in dev mode:
   ```bash
   npm run dev
   ```

This will:
- Load the frontend from `http://localhost:3000` (hot reload enabled)
- Open DevTools automatically
- Allow you to develop and test simultaneously

## Building Installers

### Prerequisites

Install platform-specific build tools:

**Windows:**
- No additional tools needed

**macOS:**
- Xcode Command Line Tools

**Linux:**
```bash
sudo apt-get install -y rpm
```

### Build Commands

```bash
# Build for current platform only
npm run package

# Build for all platforms (requires appropriate host OS)
npm run package:all

# Build for specific platform
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux
```

### Output

Built applications will be in the `dist/` directory:
- Windows: `.exe` installer and portable `.exe`
- macOS: `.dmg` and `.zip`
- Linux: `.AppImage` and `.deb`

## Application Data

The desktop application stores data in the following locations:

**Windows:**
```
%APPDATA%/health-check-dashboard/database.sqlite
```

**macOS:**
```
~/Library/Application Support/health-check-dashboard/database.sqlite
```

**Linux:**
```
~/.config/health-check-dashboard/database.sqlite
```

## Architecture

The desktop application consists of:

1. **Main Process** (`electron/main.js`):
   - Manages the Electron app lifecycle
   - Starts the Node.js backend server
   - Creates and manages the application window
   - Handles cleanup on exit

2. **Preload Script** (`electron/preload.js`):
   - Provides secure communication between renderer and main process
   - Exposes limited APIs to the frontend

3. **Renderer Process**:
   - The React frontend application
   - Automatically detects Electron environment
   - Connects to the local backend server

## Troubleshooting

### Application won't start

1. Ensure all dependencies are installed:
   ```bash
   npm install
   cd frontend && npm install && cd ..
   cd backend && npm install && cd ..
   ```

2. Build the frontend:
   ```bash
   npm run build:frontend
   ```

3. Check for port conflicts (port 3001 must be available)

### Backend server errors

Check the console output from Electron. The backend logs are printed to the Electron console.

### Database issues

The database is created automatically on first run. If you need to reset:

1. Close the application
2. Delete the database file (see Application Data section above)
3. Restart the application

## Web vs Desktop

The application works identically in both modes:

| Feature | Web App | Desktop App |
|---------|---------|-------------|
| Deployment | Docker/Node.js server | Electron executable |
| Database | Configurable location | User data directory |
| Updates | Server restart | App reinstall/update |
| Access | Browser URL | Native window |
| Offline | Requires server running | Fully self-contained |

## Security Notes

- The desktop app runs with the same security model as the web app
- No authentication is included by default
- Consider adding authentication for production use
- Backend API is only accessible on localhost (127.0.0.1)
