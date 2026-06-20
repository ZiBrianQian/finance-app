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
const STARTUP_CHECK_CACHE_MS = 6 * 60 * 60 * 1000;

let updateInfo = null;
let downloadProgress = 0;
let isDownloading = false;

function getUpdateCachePath() {
    return path.join(app.getPath('userData'), 'update-check-cache.json');
}

function readUpdateCache() {
    try {
        const cachePath = getUpdateCachePath();
        if (!fs.existsSync(cachePath)) return null;
        return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } catch (error) {
        console.warn('[Updater] Failed to read update cache:', error);
        return null;
    }
}

function writeUpdateCache(data) {
    try {
        fs.writeFileSync(getUpdateCachePath(), JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.warn('[Updater] Failed to write update cache:', error);
    }
}

function formatRateLimitReset(headers) {
    const reset = Number(headers['x-ratelimit-reset']);
    if (!Number.isFinite(reset) || reset <= 0) return null;
    return new Date(reset * 1000).toLocaleString();
}

function createGitHubApiError(res, payload) {
    const message = payload?.message || `GitHub API returned HTTP ${res.statusCode}`;

    if (res.statusCode === 403 && /rate limit/i.test(message)) {
        const resetAtMs = Number(res.headers['x-ratelimit-reset']) * 1000;
        const resetAt = formatRateLimitReset(res.headers);
        const error = new Error(
            resetAt
                ? `Лимит запросов GitHub API исчерпан. Попробуйте после ${resetAt}.`
                : 'Лимит запросов GitHub API исчерпан. Попробуйте позже.'
        );
        if (Number.isFinite(resetAtMs) && resetAtMs > Date.now()) {
            error.rateLimitResetAt = resetAtMs;
        }
        return error;
    }

    return new Error(`${message} (HTTP ${res.statusCode})`);
}

/**
 * Check GitHub for latest release
 */
/**
 * Check GitHub for latest releases (cumulative)
 */
async function checkForUpdates({ useStartupCache = false } = {}) {
    console.log('[Updater] Starting update check...');
    console.log('[Updater] Current version:', CURRENT_VERSION);
    console.log('[Updater] GitHub:', GITHUB_OWNER + '/' + GITHUB_REPO);

    const cached = readUpdateCache();
    const now = Date.now();

    if (cached?.rateLimitResetAt && now < cached.rateLimitResetAt) {
        const resetAt = new Date(cached.rateLimitResetAt).toLocaleString();
        throw new Error(`Лимит запросов GitHub API исчерпан. Попробуйте после ${resetAt}.`);
    }

    if (
        useStartupCache &&
        cached?.lastCheckedAt &&
        cached?.result &&
        now - cached.lastCheckedAt < STARTUP_CHECK_CACHE_MS
    ) {
        console.log('[Updater] Using cached startup update check result');
        if (cached.result.updateAvailable) {
            updateInfo = {
                version: cached.result.version,
                releaseNotes: cached.result.releaseNotes,
                downloadUrl: cached.result.downloadUrl,
                publishedAt: cached.result.publishedAt,
                assetName: cached.result.assetName
            };
        }
        return cached.result;
    }

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`, // Changed from /releases/latest to /releases
            headers: {
                'Accept': 'application/vnd.github+json',
                'User-Agent': 'FinanceManager-Updater',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        };

        console.log('[Updater] Fetching:', options.hostname + options.path);

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    console.log('[Updater] Response status:', res.statusCode);

                    const payload = JSON.parse(data || 'null');

                    if (res.statusCode === 404) {
                        console.log('[Updater] No releases found');
                        resolve({ updateAvailable: false, message: 'No releases found' });
                        return;
                    }

                    if (res.statusCode < 200 || res.statusCode >= 300) {
                        const error = createGitHubApiError(res, payload);
                        if (error.rateLimitResetAt) {
                            writeUpdateCache({
                                ...cached,
                                rateLimitResetAt: error.rateLimitResetAt,
                                lastError: error.message
                            });
                        }
                        reject(error);
                        return;
                    }

                    if (!Array.isArray(payload)) {
                        reject(new Error('GitHub API вернул неожиданный формат ответа.'));
                        return;
                    }

                    const releases = payload;

                    // Filter releases that are newer than current version
                    const newReleases = releases.filter(release => {
                        if (!release?.tag_name) return false;
                        const version = release.tag_name.replace('v', '');
                        return isNewerVersion(version, CURRENT_VERSION);
                    });

                    // Sort by published_at desc (just in case, though GitHub usually does this)
                    newReleases.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

                    console.log(`[Updater] Found ${newReleases.length} new releases`);

                    if (newReleases.length > 0) {
                        const latestRelease = newReleases[0];
                        const latestVersion = latestRelease.tag_name.replace('v', '');

                        // Find portable exe asset from the LATEST release
                        const portableAsset = (latestRelease.assets || []).find(
                            a => a.name.toLowerCase().includes('portable') && a.name.endsWith('.exe')
                        );

                        if (!portableAsset) {
                            console.log('[Updater] No portable asset found in latest release');
                            resolve({ updateAvailable: false, message: 'No portable asset found' });
                            return;
                        }

                        // Aggregate release notes
                        let aggregatedNotes = '';
                        newReleases.forEach(release => {
                            aggregatedNotes += `## ${release.tag_name} (${new Date(release.published_at).toLocaleDateString()})\n`;
                            aggregatedNotes += `${release.body || 'No notes'}\n\n`;
                        });

                        updateInfo = {
                            version: latestVersion,
                            releaseNotes: aggregatedNotes.trim(),
                            downloadUrl: portableAsset.browser_download_url,
                            publishedAt: latestRelease.published_at,
                            assetName: portableAsset.name
                        };

                        console.log('[Updater] Update available:', latestVersion);

                        const result = {
                            updateAvailable: true,
                            ...updateInfo
                        };
                        writeUpdateCache({
                            lastCheckedAt: Date.now(),
                            rateLimitResetAt: null,
                            result
                        });
                        resolve(result);
                    } else {
                        console.log('[Updater] No update needed');
                        const result = {
                            updateAvailable: false,
                            currentVersion: CURRENT_VERSION
                        };
                        writeUpdateCache({
                            lastCheckedAt: Date.now(),
                            rateLimitResetAt: null,
                            result
                        });
                        resolve(result);
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
        const result = await checkForUpdates({ useStartupCache: true });
        if (result.updateAvailable && mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('update-available', result);
        }
    } catch (error) {
        console.error('Auto-update check failed:', error);
    }
}
