# Electron Desktop Application

This document provides details about running the Health Check Dashboard as a desktop application.

## Overview

The desktop application uses Electron to wrap the existing web application, providing:
- Native desktop window
- Automatic backend server management
- Offline operation (no Docker required)
- Cross-platform support (Windows, macOS, Linux)
- Optimized build size (~270MB unpacked, ~100-150MB compressed installer)

## Requirements

- Node.js 18 or higher
- npm 8 or higher

## Performance Optimizations

The Electron build has been optimized for size and performance:

**Build Optimizations:**
- Production-only dependencies (dev dependencies excluded)
- Swagger UI disabled in desktop app (saves ~12MB)
- Excluded test files, documentation, and source maps from dependencies
- Excluded build tools (node-gyp, gyp) from distribution
- Backend dependencies: ~15MB (down from ~50MB)
- Total unpacked size: ~270MB (down from ~300MB+)
- Compressed installer: ~100-150MB depending on platform

**Memory Optimizations:**
- Backend runs in the same Node.js process as Electron (no separate process overhead)
- Single instance enforcement prevents multiple app instances
- Database cleanup service prevents unbounded growth
- Conditional swagger loading (only when needed for web deployments)

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
   - Runs the Node.js backend server **directly in the Electron process** (no separate Node.js required)
   - Backend dependencies are bundled with the application
   - Creates and manages the application window
   - Handles cleanup on exit
   - Implements single-instance lock to prevent multiple app instances

2. **Preload Script** (`electron/preload.js`):
   - Provides secure communication between renderer and main process
   - Exposes limited APIs to the frontend

3. **Renderer Process**:
   - The React frontend application
   - Automatically detects Electron environment
   - Connects to the local backend server

## Key Features

- **No External Node.js Required**: The backend runs within Electron's Node.js runtime
- **Single Instance**: Only one instance of the app can run at a time
- **Bundled Dependencies**: All backend dependencies are included in the application package
- **Self-contained**: No external services or installations needed

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

4. Try running in development mode first to see detailed logs:
   ```bash
   npm run dev
   ```

### Multiple app instances opening

This issue has been fixed with single-instance locking. If you still experience this:
1. Make sure you're using the latest version of the code
2. Completely quit all instances of the app
3. Rebuild the application: `npm run package`

### Backend server errors

- In development mode: Check the Electron console (DevTools are auto-opened)
- In production: Check the terminal where you launched the app
- The backend runs directly in the Electron process, so all logs appear in the Electron console

### Database issues

The database is created automatically on first run. If you need to reset:

1. Close the application
2. Delete the database file (see Application Data section above)
3. Restart the application

### Build errors

If you encounter errors during packaging:
1. Ensure Node.js 18+ is installed (check with `node --version`)
2. Clear the dist folder: `rm -rf dist`
3. Rebuild: `npm run package`
4. Check that all backend dependencies are installed: `cd backend && npm install`

## Build Optimization Details

The Electron desktop app has been optimized to reduce size and improve performance:

### Size Optimizations

**Before Optimization:**
- Unpacked app: ~303MB
- Backend dependencies: ~49MB
- Included: Swagger UI docs, test files, dev dependencies

**After Optimization:**
- Unpacked app: ~269MB (11% reduction)
- Backend dependencies: ~15MB (69% reduction)
- Compressed installers: ~100-150MB
- Total savings: ~34MB

**Techniques Used:**

1. **Production Dependencies Only**
   - Build script uses `--omit=dev --omit=optional` flags
   - Swagger dependencies moved to optionalDependencies
   - No dev tools (nodemon, testing libraries) in production build

2. **Conditional Swagger Loading**
   - Swagger UI only loads when `ELECTRON_APP` env var is not set
   - Saves ~12MB of swagger-ui-dist package
   - API docs available in Docker/web deployments only

3. **File Exclusions**
   - Tests and test fixtures excluded
   - Documentation files (.md, docs/) excluded
   - Source maps (.map files) excluded
   - Build tools (node-gyp, gyp) excluded
   - Examples and .github folders excluded

4. **Electron-Builder Configuration**
   - Extensive file filters in package.json
   - Backend included via extraResources with filters
   - Only necessary node_modules content packaged

### Memory Optimization

The desktop app is designed to use minimal memory:

1. **Single Process Architecture**
   - Backend runs in Electron's Node.js runtime
   - No separate Node.js process needed
   - Shared memory between frontend and backend

2. **Database Cleanup**
   - Automatic cleanup service removes old check results
   - Prevents unbounded database growth
   - Configurable retention period

3. **Single Instance Lock**
   - Prevents multiple app instances
   - Reduces overall memory footprint
   - Better resource management

### Further Optimization Options

If you need even smaller builds, consider:

1. **Remove unused Electron features:**
   ```javascript
   // In electron/main.js, disable unused features
   app.commandLine.appendSwitch('disable-http-cache');
   ```

2. **Use different compression:**
   - 7z compression for Windows installers
   - DMG vs. ZIP for macOS (DMG is larger but better UX)

3. **Locale filtering:**
   - electron-builder can filter locales (currently includes all)
   - Could save ~20MB by including only English

4. **Replace lodash:**
   - Currently a transitive dependency via express-validator
   - Could be replaced with native JS methods if needed

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
