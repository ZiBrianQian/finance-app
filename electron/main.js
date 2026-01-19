import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// PORTABLE DATA STORAGE CONFIGURATION
// ============================================

// Portable detection - electron-builder sets PORTABLE_EXECUTABLE_DIR for portable apps
const PORTABLE_EXE_DIR = process.env.PORTABLE_EXECUTABLE_DIR;
const isPortable = !!PORTABLE_EXE_DIR;

// Log for debugging
console.log('[Portable] PORTABLE_EXECUTABLE_DIR:', PORTABLE_EXE_DIR);
console.log('[Portable] isPortable:', isPortable);
console.log('[Portable] process.execPath:', process.execPath);
console.log('[Portable] app.isPackaged:', app.isPackaged);

// Set portable data path BEFORE app is ready (critical!)
if (isPortable && PORTABLE_EXE_DIR) {
    const dataPath = path.join(PORTABLE_EXE_DIR, 'data');

    console.log('[Portable] Setting userData to:', dataPath);

    // Create directory synchronously before setting path
    try {
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
            console.log('[Portable] Created data directory');
        }

        // Set the userData path
        app.setPath('userData', dataPath);
        console.log('[Portable] userData successfully set to:', app.getPath('userData'));
    } catch (err) {
        console.error('[Portable] Error setting up portable data:', err);
    }
} else if (app.isPackaged) {
    // Fallback for non-portable packaged app - still try to use exe directory
    const exeDir = path.dirname(process.execPath);
    const dataPath = path.join(exeDir, 'data');

    console.log('[Portable] Fallback - trying exe directory:', dataPath);

    try {
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }
        app.setPath('userData', dataPath);
        console.log('[Portable] Fallback userData set to:', app.getPath('userData'));
    } catch (err) {
        console.error('[Portable] Fallback failed, using default:', err);
    }
} else {
    console.log('[Portable] Development mode - using default userData:', app.getPath('userData'));
}

// Import updater after path is set
import { initUpdater, checkOnStartup } from './updater.js';

// Check if running in development mode
const isDev = !app.isPackaged;

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
