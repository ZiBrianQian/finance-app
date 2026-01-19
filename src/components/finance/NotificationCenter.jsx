import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, Check, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function NotificationCenter({
    open,
    onOpenChange,
    notifications,
    onMarkRead,
    onMarkAllRead,
    onDelete
}) {
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5" />
                            Уведомления
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-700 dark:text-red-400 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </DialogTitle>
                        {unreadCount > 0 && (
                            <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
                                Прочитать все
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <ScrollArea className="h-[400px] pr-4">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <Bell className="w-12 h-12 mb-4" />
                            <p>Нет уведомлений</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`p-4 rounded-xl border transition-all ${notification.isRead
                                        ? 'bg-card border-border'
                                        : 'bg-primary/10 border-primary/30'
                                        }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm text-foreground">
                                                {notification.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {formatDistanceToNow(new Date(notification.created_date), {
                                                    addSuffix: true,
                                                    locale: ru
                                                })}
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            {!notification.isRead && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => onMarkRead(notification.id)}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                                onClick={() => onDelete(notification.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
