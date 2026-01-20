import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Settings as SettingsIcon, Palette, Globe, Database, Tag,
    Wallet, Download, Upload, Sun, Moon, Monitor, Bell, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

import { useAccounts, useCategories, useTransactions, useBudgets, useGoals, useAppSettings, useNotificationSettings, calculateAccountBalance } from '@/components/finance/useFinanceData';
import { CURRENCIES, DATE_FORMATS } from '@/components/finance/constants';
import CategoryManager from '@/components/finance/CategoryManager';
import AccountManager from '@/components/finance/AccountManager';
import ExportImport from '@/components/finance/ExportImport';
import NotificationSettingsCard from '@/components/finance/NotificationSettings';
import UpdateChecker from '@/components/finance/UpdateChecker';

import { useLiveRates } from '@/components/finance/useFinanceData';
import { APP_VERSION } from '@/version';

export default function Settings() {
    const { accounts, allAccounts, createAccount, updateAccount, deleteAccount, setPrimaryAccount, reorderAccounts } = useAccounts();
    const { categories, createCategory, updateCategory, deleteCategory } = useCategories();
    const { transactions, createTransaction } = useTransactions();
    const { budgets } = useBudgets();
    const { goals } = useGoals();
    const { settings, updateSettings } = useAppSettings();
    const { settings: notifSettings, updateSettings: updateNotifSettings } = useNotificationSettings();

    const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
    const [accountManagerOpen, setAccountManagerOpen] = useState(false);
    const [exportImportOpen, setExportImportOpen] = useState(false);

    const { rates, lastUpdated, isLoading: ratesLoading, forceRefresh } = useLiveRates(settings?.defaultCurrency || 'USD');

    const accountBalances = React.useMemo(() => {
        const balances = {};
        allAccounts.forEach(account => {
            balances[account.id] = calculateAccountBalance(account, transactions, rates);
        });
        return balances;
    }, [allAccounts, transactions, rates]);

    const handleCurrencyChange = async (currency) => {
        await updateSettings.mutateAsync({ defaultCurrency: currency });
        toast.success('Валюта обновлена');
    };

    const handleDateFormatChange = async (format) => {
        await updateSettings.mutateAsync({ dateFormat: format });
        toast.success('Формат даты обновлён');
    };

    const handleThemeChange = async (theme) => {
        await updateSettings.mutateAsync({ theme });
        // Apply theme
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // System
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
        toast.success('Тема обновлена');
    };

    const handleRefreshRates = async () => {
        try {
            await forceRefresh();
            toast.success('Курсы валют обновлены');
        } catch (e) {
            toast.error('Не удалось обновить курсы');
        }
    };

    const handleImport = async (data) => {
        // Import accounts
        if (data.accounts?.length > 0) {
            for (const account of data.accounts) {
                const { id, created_date, updated_date, created_by, ...accountData } = account;
                await createAccount.mutateAsync(accountData);
            }
        }

        // Import categories
        if (data.categories?.length > 0) {
            for (const category of data.categories) {
                const { id, created_date, updated_date, created_by, ...categoryData } = category;
                await createCategory.mutateAsync(categoryData);
            }
        }

        // Import transactions
        if (data.transactions?.length > 0) {
            // Loop through transactions and create them one by one
            for (const tx of data.transactions) {
                const { id, created_date, updated_date, created_by, ...txData } = tx;
                await createTransaction.mutateAsync(txData);
            }
        }
        toast.success('Импорт завершен');
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-700 to-slate-900 dark:from-gray-200 dark:to-slate-400">Настройки</h1>
                    <p className="text-muted-foreground mt-1">Управление приложением</p>
                </div>

                <div className="space-y-6">
                    {/* General */}
                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Общие настройки</h3>
                                <p className="text-sm text-muted-foreground">Валюта, дата, язык</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Основная валюта</Label>
                                    <p className="text-sm text-muted-foreground">Для отображения в отчётах</p>
                                </div>
                                <Select
                                    value={settings?.defaultCurrency || 'USD'}
                                    onValueChange={handleCurrencyChange}
                                >
                                    <SelectTrigger className="w-40 bg-background border-input">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map(c => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.symbol} {c.code}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Курсы валют</Label>
                                    <p className="text-sm text-muted-foreground">
                                        {lastUpdated
                                            ? `Обновлено: ${new Date(lastUpdated).toLocaleString()}`
                                            : 'Автоматическое обновление'}
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRefreshRates}
                                    disabled={ratesLoading}
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${ratesLoading ? 'animate-spin' : ''}`} />
                                    Обновить
                                </Button>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Формат даты</Label>
                                    <p className="text-sm text-muted-foreground">Как отображать даты</p>
                                </div>
                                <Select
                                    value={settings?.dateFormat || 'MM/DD/YYYY'}
                                    onValueChange={handleDateFormatChange}
                                >
                                    <SelectTrigger className="w-48 bg-background border-input">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DATE_FORMATS.map(f => (
                                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </Card>

                    {/* Appearance */}
                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                                <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Оформление</h3>
                                <p className="text-sm text-muted-foreground">Тема приложения</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <Label>Тема</Label>
                                <p className="text-sm text-muted-foreground">Светлая или тёмная</p>
                            </div>
                            <div className="flex gap-2">
                                {[
                                    { value: 'light', icon: Sun, label: 'Светлая' },
                                    { value: 'dark', icon: Moon, label: 'Тёмная' },
                                    { value: 'system', icon: Monitor, label: 'Авто' },
                                ].map(theme => (
                                    <Button
                                        key={theme.value}
                                        variant={settings?.theme === theme.value ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleThemeChange(theme.value)}
                                        className="gap-2"
                                    >
                                        <theme.icon className="w-4 h-4" />
                                        {theme.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </Card>

                    {/* Accounts */}
                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Счета</h3>
                                    <p className="text-sm text-muted-foreground">{accounts.length} активных счетов</p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={() => setAccountManagerOpen(true)}>
                                Управление
                            </Button>
                        </div>
                    </Card>

                    {/* Categories */}
                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                    <Tag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Категории</h3>
                                    <p className="text-sm text-muted-foreground">{categories.filter(c => !c.isArchived).length} активных категорий</p>
                                </div>
                            </div>
                            <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
                                Управление
                            </Button>
                        </div>
                    </Card>

                    {/* Notifications */}
                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Уведомления</h3>
                                <p className="text-sm text-muted-foreground">Настройте оповещения</p>
                            </div>
                        </div>

                        <NotificationSettingsCard
                            settings={notifSettings}
                            onUpdate={(data) => updateNotifSettings.mutateAsync(data)}
                        />
                    </Card>

                    {/* Data */}
                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                                <Database className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Данные</h3>
                                <p className="text-sm text-muted-foreground">Экспорт и резервное копирование</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                                <div>
                                    <p className="font-medium">Всего транзакций</p>
                                    <p className="text-sm text-muted-foreground">{transactions.length} записей</p>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={() => setExportImportOpen(true)}
                            >
                                <Download className="w-4 h-4" />
                                Экспорт / Импорт данных
                            </Button>
                        </div>
                    </Card>

                    {/* Updates */}
                    <UpdateChecker />

                    {/* Version info */}
                    <Card className="p-6 bg-card border-border">
                        <div className="text-center text-sm text-muted-foreground">
                            <p>Personal Finance v{APP_VERSION}</p>
                            <p className="mt-1">Данные хранятся локально рядом с приложением</p>
                        </div>
                    </Card>
                </div>
            </div>

            <CategoryManager
                open={categoryManagerOpen}
                onOpenChange={setCategoryManagerOpen}
                categories={categories}
                onCreate={(data) => createCategory.mutateAsync(data)}
                onUpdate={({ id, data }) => updateCategory.mutateAsync({ id, data })}
                onDelete={(id) => deleteCategory.mutateAsync(id)}
            />

            <AccountManager
                open={accountManagerOpen}
                onOpenChange={setAccountManagerOpen}
                accounts={allAccounts}
                balances={accountBalances}
                onCreate={(data) => createAccount.mutateAsync(data)}
                onUpdate={({ id, data }) => updateAccount.mutateAsync({ id, data })}
                onDelete={(id) => deleteAccount.mutateAsync(id)}
                onSetPrimary={(id) => setPrimaryAccount.mutateAsync(id)}
                onReorder={(orderedIds) => reorderAccounts.mutateAsync(orderedIds)}
                defaultCurrency={settings?.defaultCurrency || 'USD'}
            />

            <ExportImport
                open={exportImportOpen}
                onOpenChange={setExportImportOpen}
                accounts={accounts}
                categories={categories}
                transactions={transactions}
                budgets={budgets}
                goals={goals}
                onImport={handleImport}
            />


        </div>
    );
}
