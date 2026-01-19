import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initUpdater, checkOnStartup } from './updater.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// PORTABLE DATA STORAGE CONFIGURATION
// ============================================

// Determine if running as portable or development
const isDev = process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL;

// Get the directory where the executable is located
const getPortableDataPath = () => {
    if (isDev) {
        // In development, use default userData path
        return null;
    }

    // For packaged app, store data next to the executable
    const exeDir = path.dirname(process.execPath);
    const dataPath = path.join(exeDir, 'data');

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
    }

    return dataPath;
};

// Set portable data path before app is ready
const portableDataPath = getPortableDataPath();
if (portableDataPath) {
    app.setPath('userData', portableDataPath);
}

// ============================================
// WINDOW CREATION
// ============================================

let mainWindow = null;

function createWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        autoHideMenuBar: true,
        show: false,
    });

    // Initialize updater with window reference
    initUpdater(mainWindow);

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Check for updates on startup (after 3 seconds delay)
        if (!isDev) {
            setTimeout(() => {
                checkOnStartup(mainWindow);
            }, 3000);
        }
    });

    // Load the app
    if (isDev) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
