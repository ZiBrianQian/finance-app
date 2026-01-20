import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/lib/utils';
import {
    LayoutDashboard, ArrowLeftRight, PiggyBank, Target,
    BarChart3, Settings, Menu, X, Wallet, Repeat, Bell,
    Calendar, CreditCard, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/components/finance/useFinanceData';
import NotificationCenter from '@/components/finance/NotificationCenter';

const navItems = [
    { name: 'Dashboard', label: 'Сводка', icon: LayoutDashboard },
    { name: 'Transactions', label: 'Транзакции', icon: ArrowLeftRight },
    { name: 'Calendar', label: 'Календарь', icon: Calendar },
    { name: 'Budgets', label: 'Бюджеты', icon: PiggyBank },
    { name: 'Goals', label: 'Цели', icon: Target },
    { name: 'Debts', label: 'Долги', icon: CreditCard },
    { name: 'Subscriptions', label: 'Подписки', icon: Zap },
    { name: 'Recurring', label: 'Рекуррентные', icon: Repeat },
    { name: 'Reports', label: 'Отчёты', icon: BarChart3 },
    { name: 'Settings', label: 'Настройки', icon: Settings },
];


export default function Layout({ children }) {
    const location = useLocation();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [notificationOpen, setNotificationOpen] = useState(false);
    const { notifications, deleteNotification, markAsRead, markAllAsRead } = useNotifications();

    const unreadCount = notifications.filter(n => !n.isRead).length;

    // Determine current page from location
    const getCurrentPage = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        const page = navItems.find(item => path.includes(item.name.toLowerCase()));
        return page?.name || 'Dashboard';
    };

    const currentPageName = getCurrentPage();

    return (
        <div className="min-h-screen bg-background">
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-64 bg-card border-r border-border">
                <div className="p-6">
                    <Link to={createPageUrl('Dashboard')} className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Wallet className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-foreground">Finance</span>
                    </Link>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-4 justify-start relative"
                        onClick={() => setNotificationOpen(true)}
                    >
                        <Bell className="w-4 h-4 mr-2" />
                        Уведомления
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-auto h-5 px-1.5 text-xs">
                                {unreadCount}
                            </Badge>
                        )}
                    </Button>
                </div>

                <nav className="flex-1 px-4">
                    <ul className="space-y-1">
                        {navItems.map(item => {
                            const isActive = currentPageName === item.name;
                            return (
                                <li key={item.name}>
                                    <Link
                                        to={createPageUrl(item.name)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                            }`}
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div className="p-4 border-t border-border">
                    <div className="px-4 py-3 bg-muted/50 rounded-xl">
                        <p className="text-xs text-muted-foreground">Personal Finance</p>
                        <p className="text-xs text-muted-foreground/80 mt-1">
                            Версия {typeof window !== 'undefined' && window.electronAPI
                                ? '1.4.1'
                                : '1.4.1'} • Все данные защищены
                        </p>
                    </div>
                </div>
            </aside>

            {/* Mobile header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
                <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-foreground">Finance</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative"
                        onClick={() => setNotificationOpen(true)}
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center">
                                {unreadCount}
                            </Badge>
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </Button>
                </div>
            </header>

            {/* Mobile menu */}
            {mobileMenuOpen && (
                <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
                    <div className="absolute top-16 left-0 right-0 bg-card border-b border-border shadow-lg" onClick={e => e.stopPropagation()}>
                        <nav className="p-4">
                            <ul className="space-y-1">
                                {navItems.map(item => {
                                    const isActive = currentPageName === item.name;
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                to={createPageUrl(item.name)}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                                    }`}
                                                onClick={() => setMobileMenuOpen(false)}
                                            >
                                                <item.icon className="w-5 h-5" />
                                                <span className="font-medium">{item.label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </nav>
                    </div>
                </div>
            )}

            {/* Mobile bottom nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
                <ul className="flex items-center justify-around h-16">
                    {navItems.slice(0, 5).map(item => {
                        const isActive = currentPageName === item.name;
                        return (
                            <li key={item.name}>
                                <Link
                                    to={createPageUrl(item.name)}
                                    className={`flex flex-col items-center gap-1 px-3 py-2 ${isActive ? 'text-primary' : 'text-muted-foreground'
                                        }`}
                                >
                                    <item.icon className="w-5 h-5" />
                                    <span className="text-xs font-medium">{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Main content */}
            <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0">
                {children}
            </main>

            <Toaster position="bottom-right" />

            <NotificationCenter
                open={notificationOpen}
                onOpenChange={setNotificationOpen}
                notifications={notifications}
                onMarkRead={(id) => markAsRead.mutateAsync(id)}
                onMarkAllRead={() => markAllAsRead.mutateAsync()}
                onDelete={(id) => deleteNotification.mutateAsync(id)}
            />
        </div>
    );
}
