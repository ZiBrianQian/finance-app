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
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
            headers: {
                'User-Agent': 'FinanceManager-Updater'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode === 404) {
                        resolve({ updateAvailable: false, message: 'No releases found' });
                        return;
                    }

                    const release = JSON.parse(data);
                    const latestVersion = release.tag_name.replace('v', '');

                    // Find portable exe asset
                    const portableAsset = release.assets.find(
                        a => a.name.toLowerCase().includes('portable') && a.name.endsWith('.exe')
                    );

                    if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
                        updateInfo = {
                            version: latestVersion,
                            releaseNotes: release.body || 'No release notes',
                            downloadUrl: portableAsset?.browser_download_url || null,
                            publishedAt: release.published_at,
                            assetName: portableAsset?.name || null
                        };

                        resolve({
                            updateAvailable: true,
                            ...updateInfo
                        });
                    } else {
                        resolve({
                            updateAvailable: false,
                            currentVersion: CURRENT_VERSION,
                            latestVersion
                        });
                    }
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
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

    const exeDir = path.dirname(process.execPath);
    const updatesDir = path.join(exeDir, 'updates');

    // Create updates directory
    if (!fs.existsSync(updatesDir)) {
        fs.mkdirSync(updatesDir, { recursive: true });
    }

    const downloadPath = path.join(updatesDir, updateInfo.assetName || 'update.exe');

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
    const exeDir = path.dirname(process.execPath);
    const exeName = path.basename(process.execPath);
    const updatesDir = path.join(exeDir, 'updates');
    const newExePath = path.join(updatesDir, updateInfo?.assetName || 'update.exe');

    if (!fs.existsSync(newExePath)) {
        throw new Error('Update file not found. Please download the update first.');
    }

    // Create update batch script
    const batchScript = `@echo off
chcp 65001 >nul
echo Обновление Finance Manager...
echo Пожалуйста, подождите...
timeout /t 2 /nobreak >nul

:: Try to delete old exe (may need multiple attempts)
:retry_delete
del "${path.join(exeDir, exeName)}" 2>nul
if exist "${path.join(exeDir, exeName)}" (
    timeout /t 1 /nobreak >nul
    goto retry_delete
)

:: Move new exe to app directory
move "${newExePath}" "${path.join(exeDir, exeName)}"

:: Clean up updates folder
rmdir /s /q "${updatesDir}" 2>nul

:: Start new version
echo Запуск новой версии...
start "" "${path.join(exeDir, exeName)}"

:: Delete this batch file
del "%~f0"
`;

    const batchPath = path.join(exeDir, 'update.bat');
    fs.writeFileSync(batchPath, batchScript, { encoding: 'utf8' });

    // Run the batch script and quit the app
    spawn('cmd.exe', ['/c', batchPath], {
        detached: true,
        stdio: 'ignore',
        shell: true
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
