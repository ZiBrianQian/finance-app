import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, RefreshCw, CheckCircle2, AlertCircle, Loader2, Rocket } from 'lucide-react';

export default function UpdateChecker({ compact = false }) {
    const [currentVersion, setCurrentVersion] = useState('');
    const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, downloading, ready, error, upToDate
    const [updateInfo, setUpdateInfo] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [error, setError] = useState(null);

    // Check if running in Electron
    const isElectron = typeof window !== 'undefined' && window.electronAPI;

    useEffect(() => {
        if (!isElectron) return;

        // Get current version
        window.electronAPI.getAppVersion().then(version => {
            setCurrentVersion(version || '1.0.0');
        });

        // Listen for update available event (from auto-check on startup)
        window.electronAPI.onUpdateAvailable((data) => {
            if (data.updateAvailable) {
                setUpdateInfo(data);
                setUpdateStatus('available');
            }
        });

        // Listen for download progress
        window.electronAPI.onDownloadProgress((data) => {
            setDownloadProgress(data.progress);
        });

        return () => {
            window.electronAPI.removeUpdateListeners();
        };
    }, [isElectron]);

    const checkForUpdates = async () => {
        if (!isElectron) return;

        setUpdateStatus('checking');
        setError(null);

        try {
            const result = await window.electronAPI.checkForUpdates();

            if (result.error) {
                setError(result.error);
                setUpdateStatus('error');
            } else if (result.updateAvailable) {
                setUpdateInfo(result);
                setUpdateStatus('available');
            } else {
                setUpdateStatus('upToDate');
            }
        } catch (err) {
            setError(err.message);
            setUpdateStatus('error');
        }
    };

    const downloadUpdate = async () => {
        if (!isElectron) return;

        setUpdateStatus('downloading');
        setDownloadProgress(0);

        try {
            const result = await window.electronAPI.downloadUpdate();

            if (result.error) {
                setError(result.error);
                setUpdateStatus('error');
            } else if (result.success) {
                setUpdateStatus('ready');
            }
        } catch (err) {
            setError(err.message);
            setUpdateStatus('error');
        }
    };

    const installUpdate = async () => {
        if (!isElectron) return;

        try {
            await window.electronAPI.installUpdate();
            // App will close and restart with new version
        } catch (err) {
            setError(err.message);
            setUpdateStatus('error');
        }
    };

    // Don't render in browser (non-Electron)
    if (!isElectron) {
        return null;
    }

    if (compact) {
        // Compact version for header/notification
        if (updateStatus === 'available') {
            return (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                    <Rocket className="w-4 h-4" />
                    <span>Доступно обновление v{updateInfo?.version}</span>
                    <Button size="sm" variant="outline" onClick={downloadUpdate}>
                        Скачать
                    </Button>
                </div>
            );
        }
        return null;
    }

    return (
        <Card className="p-6 bg-card border-border">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Обновления</h3>
                    <p className="text-sm text-muted-foreground">
                        Текущая версия: {currentVersion}
                    </p>
                </div>

                {updateStatus === 'idle' && (
                    <Button variant="outline" onClick={checkForUpdates}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Проверить
                    </Button>
                )}
            </div>

            {/* Checking */}
            {updateStatus === 'checking' && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Проверка обновлений...</span>
                </div>
            )}

            {/* Up to date */}
            {updateStatus === 'upToDate' && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            Установлена последняя версия
                        </p>
                        <Button
                            variant="link"
                            className="h-auto p-0 text-xs text-muted-foreground"
                            onClick={checkForUpdates}
                        >
                            Проверить снова
                        </Button>
                    </div>
                </div>
            )}

            {/* Update available */}
            {updateStatus === 'available' && updateInfo && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-500/10 rounded-xl">
                        <Rocket className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                Доступна версия {updateInfo.version}
                            </p>
                            {updateInfo.releaseNotes && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {updateInfo.releaseNotes}
                                </p>
                            )}
                        </div>
                    </div>
                    <Button className="w-full" onClick={downloadUpdate}>
                        <Download className="w-4 h-4 mr-2" />
                        Скачать обновление
                    </Button>
                </div>
            )}

            {/* Downloading */}
            {updateStatus === 'downloading' && (
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                            Скачивание... {downloadProgress}%
                        </span>
                    </div>
                    <Progress value={downloadProgress} className="h-2" />
                </div>
            )}

            {/* Ready to install */}
            {updateStatus === 'ready' && (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            Обновление готово к установке
                        </p>
                    </div>
                    <Button className="w-full bg-green-600 hover:bg-green-700" onClick={installUpdate}>
                        <Rocket className="w-4 h-4 mr-2" />
                        Установить и перезапустить
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                        Приложение закроется и перезапустится автоматически
                    </p>
                </div>
            )}

            {/* Error */}
            {updateStatus === 'error' && (
                <div className="space-y-3">
                    <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                        <div>
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                Ошибка проверки обновлений
                            </p>
                            <p className="text-xs text-muted-foreground">{error}</p>
                        </div>
                    </div>
                    <Button variant="outline" className="w-full" onClick={checkForUpdates}>
                        Попробовать снова
                    </Button>
                </div>
            )}
        </Card>
    );
}
