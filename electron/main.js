const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow;
let backendServer;

// Check if running in development mode
const isDev = process.argv.includes('--dev') || !app.isPackaged;

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  // Handle second instance
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Determine the backend path
// In development, backend is in ../backend relative to electron folder
// In packaged app, backend is in resources/backend
const backendPath = app.isPackaged
  ? path.join(process.resourcesPath, 'backend')
  : path.join(__dirname, '../backend');

// Determine the frontend path
const frontendPath = app.isPackaged
  ? `file://${path.join(__dirname, '../frontend/build/index.html')}`
  : 'http://localhost:3000';

function startBackendServer() {
  return new Promise((resolve, reject) => {
    try {
      // Set environment variables for the backend
      process.env.PORT = '3001';
      process.env.NODE_ENV = 'production';
      process.env.ELECTRON_APP = 'true'; // Disable swagger in electron
      process.env.DB_PATH = path.join(app.getPath('userData'), 'database.sqlite');

      console.log('Starting backend server...');
      console.log('Backend path:', backendPath);
      console.log('Database path:', process.env.DB_PATH);

      // Change to backend directory to ensure proper module resolution
      const originalDir = process.cwd();
      process.chdir(backendPath);

      // Load the backend application
      // The backend's index.js will start the server automatically
      const backendModule = require(path.join(backendPath, 'src', 'index.js'));
      backendServer = backendModule;

      // Restore original directory
      process.chdir(originalDir);

      // Wait a bit for the server to start
      setTimeout(() => {
        console.log('Backend server started successfully');
        resolve();
      }, 2000);

    } catch (error) {
      console.error('Failed to start backend:', error);
      reject(error);
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the frontend
  if (app.isPackaged) {
    // In production, load from the built files
    mainWindow.loadFile(path.join(__dirname, '../frontend/build/index.html'));
  } else {
    // In development, load from the webpack dev server or built files
    if (process.argv.includes('--dev')) {
      mainWindow.loadURL('http://localhost:3000');
      mainWindow.webContents.openDevTools();
    } else {
      // Running via npm start without --dev flag, load built files
      mainWindow.loadFile(path.join(__dirname, '../frontend/build/index.html'));
    }
  }

  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' },
        {
          label: 'Bring to Front',
          accelerator: 'CommandOrControl+1',
          click: () => {
            if (mainWindow) {
              if (mainWindow.isMinimized()) mainWindow.restore();
              mainWindow.show();
              mainWindow.focus();
            } else {
              // If window was closed, recreate it
              createWindow();
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Health Check Dashboard',
              message: 'Health Check Dashboard',
              detail: 'Version 1.0.0\n\nA desktop application for monitoring the health of your services.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // On Mac, hide the window instead of closing it when user clicks close button
  // This allows the app to continue running in the background
  mainWindow.on('close', (event) => {
    if (process.platform === 'darwin' && !app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize the app
app.whenReady().then(async () => {
  try {
    // Start the backend server
    await startBackendServer();
    
    // Create the main window
    createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked and no windows are open
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// Clean up on quit
app.on('before-quit', () => {
  console.log('Application shutting down...');
  app.isQuitting = true; // Set flag to allow window to close
  if (backendServer) {
    console.log('Stopping backend server...');
    // The backend server handles its own cleanup via SIGTERM/SIGINT handlers
    process.emit('SIGTERM');
    backendServer = null;
  }
});

// Handle any uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
