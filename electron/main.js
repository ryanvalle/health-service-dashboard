const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

// Check if running in development mode
const isDev = process.argv.includes('--dev');

// Determine the backend path
const backendPath = isDev 
  ? path.join(__dirname, '../backend')
  : path.join(process.resourcesPath, 'backend');

// Determine the frontend path
const frontendPath = isDev
  ? 'http://localhost:3000'
  : `file://${path.join(__dirname, '../frontend/build/index.html')}`;

function startBackendServer() {
  return new Promise((resolve, reject) => {
    const nodeExecutable = isDev ? 'node' : process.execPath;
    const backendEntry = path.join(backendPath, 'src', 'index.js');
    
    // Set environment variables for the backend
    const env = {
      ...process.env,
      PORT: '3001',
      NODE_ENV: 'production',
      DB_PATH: path.join(app.getPath('userData'), 'database.sqlite')
    };

    console.log('Starting backend server...');
    console.log('Backend path:', backendPath);
    console.log('Backend entry:', backendEntry);
    console.log('Database path:', env.DB_PATH);

    backendProcess = spawn(nodeExecutable, [backendEntry], {
      cwd: backendPath,
      env: env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data.toString().trim()}`);
      if (data.toString().includes('Server running on port')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data.toString().trim()}`);
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start backend:', error);
      reject(error);
    });

    backendProcess.on('exit', (code) => {
      console.log(`Backend process exited with code ${code}`);
      if (code !== 0 && code !== null) {
        reject(new Error(`Backend exited with code ${code}`));
      }
    });

    // Timeout if backend doesn't start within 30 seconds
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        resolve(); // Proceed anyway
      }
    }, 30000);
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
  if (isDev) {
    // In development, load from the webpack dev server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from the built files
    mainWindow.loadFile(path.join(__dirname, '../frontend/build/index.html'));
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
        { role: 'paste' }
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
  if (mainWindow === null) {
    createWindow();
  }
});

// Clean up on quit
app.on('before-quit', () => {
  if (backendProcess) {
    console.log('Stopping backend server...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
});

// Handle any uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
