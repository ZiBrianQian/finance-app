import React, { useState, useEffect } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Rocket, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Auto-Update Dialog Component
 * Shows a modal dialog when an update is available on app startup.
 * Allows the user to download and install the update or dismiss it.
 */
export default function AutoUpdateDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [updateInfo, setUpdateInfo] = useState(null);
    const [status, setStatus] = useState('available'); // available, downloading, ready, error
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [error, setError] = useState(null);

    // Check if running in Electron
    const isElectron = typeof window !== 'undefined' && window.electronAPI;

    useEffect(() => {
        if (!isElectron) return;

        // Listen for update available event from startup check
        window.electronAPI.onUpdateAvailable((data) => {
            if (data.updateAvailable) {
                setUpdateInfo(data);
                setIsOpen(true);
                setStatus('available');
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

    const handleDownload = async () => {
        if (!isElectron) return;

        setStatus('downloading');
        setDownloadProgress(0);
        setError(null);

        try {
            const result = await window.electronAPI.downloadUpdate();

            if (result.error) {
                setError(result.error);
                setStatus('error');
            } else if (result.success) {
                setStatus('ready');
            }
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleInstall = async () => {
        if (!isElectron) return;

        try {
            await window.electronAPI.installUpdate();
            // App will close and restart with new version
        } catch (err) {
            setError(err.message);
            setStatus('error');
        }
    };

    const handleDismiss = () => {
        setIsOpen(false);
    };

    // Don't render in browser (non-Electron) or when not open
    if (!isElectron || !isOpen) {
        return null;
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Rocket className="w-5 h-5 text-blue-500" />
                        Доступно обновление
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            {/* Version info */}
                            <div className="flex items-center gap-2 text-base font-medium text-foreground">
                                Версия {updateInfo?.version}
                            </div>

                            {/* Release notes */}
                            {updateInfo?.releaseNotes && (
                                <div className="p-3 bg-muted/50 rounded-lg max-h-40 overflow-y-auto">
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {updateInfo.releaseNotes}
                                    </p>
                                </div>
                            )}

                            {/* Download progress */}
                            {status === 'downloading' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Скачивание... {downloadProgress}%
                                    </div>
                                    <Progress value={downloadProgress} className="h-2" />
                                </div>
                            )}

                            {/* Ready to install */}
                            {status === 'ready' && (
                                <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                        Обновление готово к установке
                                    </span>
                                </div>
                            )}

                            {/* Error state */}
                            {status === 'error' && (
                                <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg">
                                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    <span className="text-sm text-red-600 dark:text-red-400">
                                        {error}
                                    </span>
                                </div>
                            )}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                    {status === 'available' && (
                        <>
                            <AlertDialogCancel onClick={handleDismiss}>
                                Позже
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDownload}>
                                <Download className="w-4 h-4 mr-2" />
                                Скачать и установить
                            </AlertDialogAction>
                        </>
                    )}

                    {status === 'downloading' && (
                        <AlertDialogCancel disabled>
                            Скачивание...
                        </AlertDialogCancel>
                    )}

                    {status === 'ready' && (
                        <AlertDialogAction
                            onClick={handleInstall}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <Rocket className="w-4 h-4 mr-2" />
                            Установить и перезапустить
                        </AlertDialogAction>
                    )}

                    {status === 'error' && (
                        <>
                            <AlertDialogCancel onClick={handleDismiss}>
                                Закрыть
                            </AlertDialogCancel>
                            <AlertDialogAction onClick={handleDownload}>
                                Попробовать снова
                            </AlertDialogAction>
                        </>
                    )}
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
