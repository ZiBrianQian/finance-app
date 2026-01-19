import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, Bell, AlertTriangle } from 'lucide-react';
import { format, eachDayOfInterval, parseISO, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

import {
    useAccounts, useCategories, useTransactions, useBudgets, useAppSettings, useRecurringRules,
    usePeriod, calculateAccountBalance, filterTransactionsByPeriod, calculatePeriodStats, convertCurrency, useLiveRates
} from '@/components/finance/useFinanceData';
import { formatMoney, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/components/finance/constants';
import PeriodSelector from '@/components/finance/PeriodSelector';
import AccountCard from '@/components/finance/AccountCard';
import StatsCard from '@/components/finance/StatsCard';
import QuickActions from '@/components/finance/QuickActions';
import TransactionForm from '@/components/finance/TransactionForm';
import OnboardingModal from '@/components/finance/OnboardingModal';
import { BalanceLineChart, CategoryPieChart } from '@/components/finance/Charts';

export default function Dashboard() {
    const { accounts, createAccount } = useAccounts();
    const { categories, createCategory } = useCategories();
    const { transactions, createTransaction } = useTransactions();
    const { budgets } = useBudgets();
    const { rules } = useRecurringRules();
    const { settings, isLoading: settingsLoading, updateSettings } = useAppSettings();
    const { rates, isLoading: ratesLoading, lastUpdated: ratesUpdated } = useLiveRates(settings?.defaultCurrency || 'USD');
    const { period, setPeriod, customRange, setCustomRange, getDateRange, getPrevDateRange } = usePeriod('month');

    const [txFormOpen, setTxFormOpen] = useState(false);
    const [txFormType, setTxFormType] = useState('expense');
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        if (!settingsLoading && !settings?.onboardingCompleted && accounts.length === 0) {
            setShowOnboarding(true);
        }
    }, [settingsLoading, settings, accounts.length]);

    const { start, end } = getDateRange();
    const prevRange = getPrevDateRange();

    const currentStats = useMemo(() =>
        calculatePeriodStats(transactions, start, end, settings?.defaultCurrency, rates),
        [transactions, start, end, settings?.defaultCurrency, rates]
    );

    const prevStats = useMemo(() =>
        calculatePeriodStats(transactions, prevRange.start, prevRange.end, settings?.defaultCurrency, rates),
        [transactions, prevRange, settings?.defaultCurrency, rates]
    );

    const accountBalances = useMemo(() => {
        const balances = {};
        accounts.forEach(account => {
            balances[account.id] = calculateAccountBalance(account, transactions, rates);
        });
        return balances;
    }, [accounts, transactions, rates]);

    const totalBalance = useMemo(() =>
        Object.entries(accountBalances).reduce((sum, [accId, bal]) => {
            const acc = accounts.find(a => a.id === accId);
            return sum + convertCurrency(bal, acc?.currency || 'USD', settings?.defaultCurrency || 'USD', rates);
        }, 0),
        [accountBalances, accounts, settings?.defaultCurrency, rates]
    );

    const incomeComparison = prevStats.income > 0
        ? ((currentStats.income - prevStats.income) / prevStats.income) * 100
        : currentStats.income > 0 ? 100 : 0;

    const expenseComparison = prevStats.expense > 0
        ? ((currentStats.expense - prevStats.expense) / prevStats.expense) * 100
        : currentStats.expense > 0 ? 100 : 0;

    const balanceChartData = useMemo(() => {
        const days = eachDayOfInterval({ start, end });
        const filteredTxs = filterTransactionsByPeriod(transactions, start, end);

        const txByDate = {};
        filteredTxs.forEach(tx => {
            if (!txByDate[tx.date]) txByDate[tx.date] = [];
            txByDate[tx.date].push(tx);
        });

        let runningBalance = totalBalance - currentStats.net;

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTxs = txByDate[dateStr] || [];

            dayTxs.forEach(tx => {
                const amount = convertCurrency(tx.amount, tx.currency || 'USD', settings?.defaultCurrency || 'USD', rates);
                if (tx.type === 'income') runningBalance += amount;
                if (tx.type === 'expense') runningBalance -= amount;
            });

            return {
                date: format(day, 'd MMM', { locale: ru }),
                balance: runningBalance
            };
        });
    }, [transactions, start, end, totalBalance, currentStats.net, settings?.defaultCurrency, rates]);

    const categoryExpenses = useMemo(() => {
        const filtered = filterTransactionsByPeriod(transactions, start, end)
            .filter(t => t.type === 'expense');

        const byCategory = {};
        filtered.forEach(tx => {
            const cat = categories.find(c => c.id === tx.categoryId);
            const name = cat?.name || 'Без категории';
            const amount = convertCurrency(tx.amount, tx.currency || 'USD', settings?.defaultCurrency || 'USD', rates);

            if (!byCategory[name]) {
                byCategory[name] = { name, value: 0, color: cat?.color };
            }
            byCategory[name].value += amount;
        });

        return Object.values(byCategory)
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);
    }, [transactions, categories, start, end, settings?.defaultCurrency, rates]);

    const budgetAlerts = useMemo(() => {
        const alerts = [];
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());
        const monthTxs = filterTransactionsByPeriod(transactions, monthStart, monthEnd);

        budgets.filter(b => b.isActive).forEach(budget => {
            (budget.rules || []).forEach(rule => {
                const spent = monthTxs
                    .filter(t => t.type === 'expense' && t.categoryId === rule.categoryId)
                    .reduce((sum, t) => {
                        const amount = convertCurrency(t.amount, t.currency || 'USD', settings?.defaultCurrency || 'USD', rates);
                        return sum + amount;
                    }, 0);

                const limit = convertCurrency(rule.limitAmount, budget.currency || 'USD', settings?.defaultCurrency || 'USD', rates);
                const percent = limit > 0 ? (spent / limit) * 100 : 0;

                const cat = categories.find(c => c.id === rule.categoryId);

                if (percent >= (rule.alertThreshold || 80)) {
                    alerts.push({
                        type: percent >= 100 ? 'exceeded' : 'warning',
                        category: cat?.name || 'Категория',
                        percent: Math.round(percent),
                        budget: budget.name
                    });
                }
            });
        });

        return alerts;
    }, [budgets, transactions, categories, settings?.defaultCurrency, rates]);

    const upcomingRecurring = useMemo(() => {
        const today = new Date();
        return rules
            .filter(r => r.isActive && r.nextRunDate)
            .filter(r => {
                const nextDate = parseISO(r.nextRunDate);
                return differenceInDays(nextDate, today) <= 3 && differenceInDays(nextDate, today) >= 0;
            })
            .slice(0, 3);
    }, [rules]);



    const handleOpenTxForm = (type) => {
        setTxFormType(type);
        setTxFormOpen(true);
    };

    const handleCreateTransaction = async (data) => {
        await createTransaction.mutateAsync(data);
        toast.success('Транзакция добавлена');
    };

    const handleCreateCategories = async () => {
        for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
            await createCategory.mutateAsync({ ...cat, type: 'expense' });
        }
        for (const cat of DEFAULT_INCOME_CATEGORIES) {
            await createCategory.mutateAsync({ ...cat, type: 'income' });
        }
    };

    const handleOnboardingComplete = async () => {
        setShowOnboarding(false);
        toast.success('Добро пожаловать! Приложение настроено.');
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Сводка</h1>
                        <p className="text-muted-foreground mt-1">Ваши финансы за {period === 'month' ? 'месяц' : period === 'week' ? 'неделю' : 'период'}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <PeriodSelector
                            period={period}
                            setPeriod={setPeriod}
                            customRange={customRange}
                            setCustomRange={setCustomRange}
                            compact
                        />
                        <QuickActions
                            onAddExpense={() => handleOpenTxForm('expense')}
                            onAddIncome={() => handleOpenTxForm('income')}
                            onAddTransfer={() => handleOpenTxForm('transfer')}
                        />
                    </div>
                </div>

                {/* Alerts */}
                {(budgetAlerts.length > 0 || upcomingRecurring.length > 0) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {budgetAlerts.map((alert, i) => (
                            <div key={i} className={`flex items-center gap-3 p-4 rounded-xl ${alert.type === 'exceeded' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}>
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <span className="text-sm">
                                    {alert.type === 'exceeded'
                                        ? `Бюджет "${alert.category}" превышен (${alert.percent}%)`
                                        : `Бюджет "${alert.category}" достиг ${alert.percent}%`
                                    }
                                </span>
                            </div>
                        ))}
                        {upcomingRecurring.map((rule, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Bell className="w-5 h-5 shrink-0" />
                                <span className="text-sm">
                                    Ожидается: {rule.title} ({formatMoney(rule.amount, rule.currency)})
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatsCard
                        title="Общий баланс"
                        amount={totalBalance}
                        currency={settings?.defaultCurrency || 'USD'}
                        icon={Wallet}
                    />
                    <StatsCard
                        title="Доходы"
                        amount={currentStats.income}
                        currency={settings?.defaultCurrency || 'USD'}
                        comparison={incomeComparison}
                        type="income"
                        icon={ArrowDownLeft}
                    />
                    <StatsCard
                        title="Расходы"
                        amount={currentStats.expense}
                        currency={settings?.defaultCurrency || 'USD'}
                        comparison={expenseComparison}
                        type="expense"
                        icon={ArrowUpRight}
                    />
                    <StatsCard
                        title="Чистый итог"
                        amount={currentStats.net}
                        currency={settings?.defaultCurrency || 'USD'}
                        type={currentStats.net >= 0 ? 'income' : 'expense'}
                        icon={currentStats.net >= 0 ? TrendingUp : TrendingDown}
                    />
                </div>

                {/* Main content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Balance chart */}
                        <Card className="p-6 bg-card border-border">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Динамика баланса</h3>
                            {balanceChartData.length > 0 ? (
                                <BalanceLineChart data={balanceChartData} currency={settings?.defaultCurrency || 'USD'} />
                            ) : (
                                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                    Добавьте транзакции для отображения графика
                                </div>
                            )}
                        </Card>

                        {/* Category expenses */}
                        <Card className="p-6 bg-card border-border">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Расходы по категориям</h3>
                            {categoryExpenses.length > 0 ? (
                                <CategoryPieChart data={categoryExpenses} currency={settings?.defaultCurrency || 'USD'} />
                            ) : (
                                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                                    Нет расходов за выбранный период
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Right column */}
                    <div className="space-y-6">
                        {/* Accounts */}
                        <Card className="p-6 bg-card border-border">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Счета</h3>
                            {accounts.length > 0 ? (
                                <div className="space-y-3">
                                    {accounts.slice(0, 5).map(account => (
                                        <AccountCard
                                            key={account.id}
                                            account={account}
                                            balance={accountBalances[account.id] || 0}
                                            compact
                                            onClick={() => { }} // Pass dummy if needed or make interactive
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>Нет счетов</p>
                                    <Button
                                        variant="link"
                                        className="mt-2"
                                        onClick={() => setShowOnboarding(true)}
                                    >
                                        Добавить первый счёт
                                    </Button>
                                </div>
                            )}
                        </Card>

                        {/* Top categories */}
                        <Card className="p-6 bg-card border-border">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Топ расходов</h3>
                            {categoryExpenses.length > 0 ? (
                                <div className="space-y-3">
                                    {categoryExpenses.slice(0, 5).map((cat, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: cat.color || '#64748b' }}
                                                />
                                                <span className="text-sm text-muted-foreground">{cat.name}</span>
                                            </div>
                                            <span className="text-sm font-medium text-foreground">
                                                {formatMoney(cat.value, settings?.defaultCurrency || 'USD')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center py-6 text-muted-foreground text-sm">
                                    Нет данных
                                </p>
                            )}
                        </Card>
                    </div>
                </div>
            </div>

            <TransactionForm
                open={txFormOpen}
                onOpenChange={setTxFormOpen}
                accounts={accounts}
                categories={categories}
                onSubmit={handleCreateTransaction}
                defaultCurrency={settings?.defaultCurrency || 'USD'}
                initialData={txFormType !== 'expense' ? { type: txFormType } : null}
            />

            <OnboardingModal
                open={showOnboarding}
                onComplete={handleOnboardingComplete}
                onCreateAccount={(data) => createAccount.mutateAsync(data)}
                onCreateCategories={handleCreateCategories}
                settings={settings}
                updateSettings={updateSettings}
            />
        </div>
    );
}
