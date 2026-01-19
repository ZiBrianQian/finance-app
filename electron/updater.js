/**
 * Auto-Updater Module for Portable Electron App
 * 
 * Uses GitHub Releases to check for updates and downloads new versions.
 * For portable apps, creates a batch script to replace the executable.
 */

import { app, ipcMain, BrowserWindow } from 'electron';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Configuration - CHANGE THESE VALUES
const GITHUB_OWNER = 'ZiBrianQian'; // e.g., 'johndoe'
const GITHUB_REPO = 'finance-app';        // e.g., 'finance-app'

const CURRENT_VERSION = app.getVersion();

let updateInfo = null;
let downloadProgress = 0;
let isDownloading = false;

/**
 * Check GitHub for latest release
 */
async function checkForUpdates() {
    console.log('[Updater] Starting update check...');
    console.log('[Updater] Current version:', CURRENT_VERSION);
    console.log('[Updater] GitHub:', GITHUB_OWNER + '/' + GITHUB_REPO);

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
            headers: {
                'User-Agent': 'FinanceManager-Updater'
            }
        };

        console.log('[Updater] Fetching:', options.hostname + options.path);

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    console.log('[Updater] Response status:', res.statusCode);

                    if (res.statusCode === 404) {
                        console.log('[Updater] No releases found');
                        resolve({ updateAvailable: false, message: 'No releases found' });
                        return;
                    }

                    const release = JSON.parse(data);
                    const latestVersion = release.tag_name.replace('v', '');

                    console.log('[Updater] Latest version on GitHub:', latestVersion);
                    console.log('[Updater] Assets count:', release.assets?.length);

                    // Find portable exe asset
                    const portableAsset = release.assets.find(
                        a => a.name.toLowerCase().includes('portable') && a.name.endsWith('.exe')
                    );

                    console.log('[Updater] Portable asset found:', portableAsset?.name);

                    const isNewer = isNewerVersion(latestVersion, CURRENT_VERSION);
                    console.log('[Updater] Is newer version:', isNewer);

                    if (isNewer) {
                        updateInfo = {
                            version: latestVersion,
                            releaseNotes: release.body || 'No release notes',
                            downloadUrl: portableAsset?.browser_download_url || null,
                            publishedAt: release.published_at,
                            assetName: portableAsset?.name || null
                        };

                        console.log('[Updater] Update available!', updateInfo);

                        resolve({
                            updateAvailable: true,
                            ...updateInfo
                        });
                    } else {
                        console.log('[Updater] No update needed');
                        resolve({
                            updateAvailable: false,
                            currentVersion: CURRENT_VERSION,
                            latestVersion
                        });
                    }
                } catch (error) {
                    console.error('[Updater] Parse error:', error);
                    reject(error);
                }
            });
        }).on('error', (err) => {
            console.error('[Updater] Request error:', err);
            reject(err);
        });
    });
}

/**
 * Compare version strings (e.g., "1.0.0" vs "1.1.0")
 */
function isNewerVersion(latest, current) {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
        const l = latestParts[i] || 0;
        const c = currentParts[i] || 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
}

/**
 * Download update to updates folder
 */
async function downloadUpdate(mainWindow) {
    if (!updateInfo?.downloadUrl) {
        throw new Error('No update available to download');
    }

    if (isDownloading) {
        throw new Error('Download already in progress');
    }

    isDownloading = true;
    downloadProgress = 0;

    // Use portable exe location, not temp extraction folder
    const portableExeDir = process.env.PORTABLE_EXECUTABLE_DIR;
    const portableExeFile = process.env.PORTABLE_EXECUTABLE_FILE;

    console.log('[Updater] PORTABLE_EXECUTABLE_DIR:', portableExeDir);
    console.log('[Updater] PORTABLE_EXECUTABLE_FILE:', portableExeFile);

    // Fallback to process.execPath if not portable
    const targetDir = portableExeDir || path.dirname(process.execPath);
    const updatesDir = path.join(targetDir, 'updates');

    console.log('[Updater] Updates directory:', updatesDir);

    // Create updates directory
    if (!fs.existsSync(updatesDir)) {
        fs.mkdirSync(updatesDir, { recursive: true });
    }

    const downloadPath = path.join(updatesDir, updateInfo.assetName || 'update.exe');
    console.log('[Updater] Download path:', downloadPath);

    return new Promise((resolve, reject) => {
        const downloadFile = (url) => {
            https.get(url, (res) => {
                // Handle redirects
                if (res.statusCode === 302 || res.statusCode === 301) {
                    downloadFile(res.headers.location);
                    return;
                }

                const totalSize = parseInt(res.headers['content-length'], 10);
                let downloadedSize = 0;

                const file = fs.createWriteStream(downloadPath);

                res.on('data', (chunk) => {
                    downloadedSize += chunk.length;
                    downloadProgress = Math.round((downloadedSize / totalSize) * 100);

                    // Send progress to renderer
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('update-download-progress', {
                            progress: downloadProgress,
                            downloaded: downloadedSize,
                            total: totalSize
                        });
                    }
                });

                res.pipe(file);

                file.on('finish', () => {
                    file.close();
                    isDownloading = false;
                    console.log('[Updater] Download complete:', downloadPath);
                    resolve({ success: true, path: downloadPath });
                });

                file.on('error', (err) => {
                    fs.unlink(downloadPath, () => { });
                    isDownloading = false;
                    reject(err);
                });
            }).on('error', (err) => {
                isDownloading = false;
                reject(err);
            });
        };

        downloadFile(updateInfo.downloadUrl);
    });
}

/**
 * Install update by creating a batch script and restarting
 */
async function installUpdate() {
    // Use portable exe location, not temp extraction folder
    const portableExeDir = process.env.PORTABLE_EXECUTABLE_DIR;
    const portableExeFile = process.env.PORTABLE_EXECUTABLE_FILE;

    console.log('[Updater] Installing update...');
    console.log('[Updater] PORTABLE_EXECUTABLE_DIR:', portableExeDir);
    console.log('[Updater] PORTABLE_EXECUTABLE_FILE:', portableExeFile);

    if (!portableExeDir || !portableExeFile) {
        throw new Error('Cannot determine portable exe location. Update only works with portable version.');
    }

    const exeDir = portableExeDir;
    const exeName = path.basename(portableExeFile);
    const originalExePath = portableExeFile;
    const updatesDir = path.join(exeDir, 'updates');
    const newExePath = path.join(updatesDir, updateInfo?.assetName || 'update.exe');

    console.log('[Updater] Original exe:', originalExePath);
    console.log('[Updater] New exe:', newExePath);

    if (!fs.existsSync(newExePath)) {
        throw new Error('Update file not found. Please download the update first.');
    }

    // Create update batch script with proper escaping
    const batchScript = `@echo off
chcp 65001 >nul
echo Updating Finance Manager...
echo Please wait...
timeout /t 3 /nobreak >nul

:retry_delete
del "${originalExePath}" 2>nul
if exist "${originalExePath}" (
    timeout /t 1 /nobreak >nul
    goto retry_delete
)

move "${newExePath}" "${originalExePath}"

rmdir /s /q "${updatesDir}" 2>nul

echo Starting new version...
start "" "${originalExePath}"

del "%~f0"
`;

    const batchPath = path.join(exeDir, 'update.bat');
    console.log('[Updater] Batch script path:', batchPath);

    fs.writeFileSync(batchPath, batchScript, { encoding: 'utf8' });

    // Run the batch script and quit the app
    spawn('cmd.exe', ['/c', batchPath], {
        detached: true,
        stdio: 'ignore',
        shell: true,
        cwd: exeDir
    }).unref();

    // Quit the app
    app.quit();

    return { success: true };
}

/**
 * Initialize IPC handlers for renderer communication
 */
export function initUpdater(mainWindow) {
    // Get app version
    ipcMain.handle('get-app-version', () => {
        return CURRENT_VERSION;
    });

    // Check for updates
    ipcMain.handle('check-for-updates', async () => {
        try {
            return await checkForUpdates();
        } catch (error) {
            return { error: error.message };
        }
    });

    // Download update
    ipcMain.handle('download-update', async () => {
        try {
            return await downloadUpdate(mainWindow);
        } catch (error) {
            return { error: error.message };
        }
    });

    // Install update
    ipcMain.handle('install-update', async () => {
        try {
            return await installUpdate();
        } catch (error) {
            return { error: error.message };
        }
    });

    // Get download progress
    ipcMain.handle('get-download-progress', () => {
        return { progress: downloadProgress, isDownloading };
    });
}

/**
 * Check for updates on app start (optional auto-check)
 */
export async function checkOnStartup(mainWindow) {
    try {
        const result = await checkForUpdates();
        if (result.updateAvailable && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-available', result);
        }
    } catch (error) {
        console.error('Auto-update check failed:', error);
    }
}
