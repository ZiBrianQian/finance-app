import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, Bell, AlertTriangle, X, Target, HandCoins } from 'lucide-react';
import { format, eachDayOfInterval, parseISO, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

import {
    useAccounts, useCategories, useTransactions, useBudgets, useAppSettings, useRecurringRules,
    usePeriod, calculateAccountBalance, filterTransactionsByPeriod, calculatePeriodStats, convertCurrency, useLiveRates,
    useGoals, useDebts
} from '@/components/finance/useFinanceData';
import { Progress } from '@/components/ui/progress';
import { formatMoney, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '@/components/finance/constants';
import PeriodSelector from '@/components/finance/PeriodSelector';
import AccountCard from '@/components/finance/AccountCard';
import StatsCard from '@/components/finance/StatsCard';
import QuickActions from '@/components/finance/QuickActions';
import TransactionForm from '@/components/finance/TransactionForm';
import OnboardingModal from '@/components/finance/OnboardingModal';
import { BalanceLineChart, CategoryPieChart } from '@/components/finance/Charts';
import CategoryIcon from '@/components/finance/CategoryIcon';
import BatchTransactionForm from '@/components/finance/BatchTransactionForm';

export default function Dashboard() {
    const { accounts, createAccount } = useAccounts();
    const { categories, createCategory } = useCategories();
    const { transactions, createTransaction } = useTransactions();
    const { budgets } = useBudgets();
    const { rules } = useRecurringRules();
    const { goals } = useGoals();
    const { debts } = useDebts();
    const { settings, isLoading: settingsLoading, updateSettings } = useAppSettings();
    const { rates, isLoading: ratesLoading, lastUpdated: ratesUpdated } = useLiveRates(settings?.defaultCurrency || 'USD');
    const { period, setPeriod, customRange, setCustomRange, getDateRange, getPrevDateRange } = usePeriod('month');

    const [txFormOpen, setTxFormOpen] = useState(false);
    const [txFormType, setTxFormType] = useState('expense');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [txListType, setTxListType] = useState(null); // 'income' or 'expense'
    const [batchFormOpen, setBatchFormOpen] = useState(false);

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
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Сводка</h1>
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
                            onAddBatch={() => setBatchFormOpen(true)}
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
                        onClick={() => setTxListType('income')}
                    />
                    <StatsCard
                        title="Расходы"
                        amount={currentStats.expense}
                        currency={settings?.defaultCurrency || 'USD'}
                        comparison={expenseComparison}
                        type="expense"
                        icon={ArrowUpRight}
                        onClick={() => setTxListType('expense')}
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
                        {/* Goals and Debts row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Goals widget */}
                            <Card className="p-5 bg-card border-border">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                        <Target className="w-4 h-4 text-blue-500" />
                                        Цели
                                    </h3>
                                    <Link to="/goals" className="text-xs text-primary hover:underline">
                                        Все →
                                    </Link>
                                </div>
                                {goals.filter(g => !g.isCompleted).length > 0 ? (
                                    <div className="space-y-3">
                                        {goals
                                            .filter(g => !g.isCompleted)
                                            .slice(0, 5)
                                            .map(goal => {
                                                const percent = goal.targetAmount > 0
                                                    ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
                                                    : 0;
                                                return (
                                                    <Link to="/goals" key={goal.id} className="block">
                                                        <div className="p-2.5 rounded-lg bg-muted/30 border border-border hover:bg-accent/50 transition-colors">
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <span className="font-medium text-sm text-foreground truncate">{goal.name}</span>
                                                                <span className="text-xs font-semibold text-primary">{percent}%</span>
                                                            </div>
                                                            <Progress value={Math.min(percent, 100)} className="h-1.5 mb-1.5" />
                                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                                <span>{formatMoney(goal.currentAmount, goal.currency)}</span>
                                                                <span>{formatMoney(goal.targetAmount, goal.currency)}</span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                    </div>
                                ) : (
                                    <p className="text-center py-4 text-muted-foreground text-sm">
                                        Нет активных целей
                                    </p>
                                )}
                            </Card>

                            {/* Debts widget */}
                            <Card className="p-5 bg-card border-border">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                                        <HandCoins className="w-4 h-4 text-amber-500" />
                                        Долги
                                    </h3>
                                    <Link to="/debts" className="text-xs text-primary hover:underline">
                                        Все →
                                    </Link>
                                </div>
                                {debts.filter(d => !d.isPaid).length > 0 ? (
                                    <div className="space-y-2">
                                        {debts
                                            .filter(d => !d.isPaid)
                                            .slice(0, 5)
                                            .map(debt => {
                                                const isOweMe = debt.type === 'owe_me';
                                                const totalPaid = (debt.payments || []).reduce((s, p) => s + p.amount, 0);
                                                const remaining = debt.amount - totalPaid;
                                                return (
                                                    <Link to="/debts" key={debt.id} className="block">
                                                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 border border-border hover:bg-accent/50 transition-colors">
                                                            <div className={`p-1.5 rounded-md ${isOweMe ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-red-100 text-red-600 dark:bg-red-900/40'}`}>
                                                                {isOweMe ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm text-foreground truncate">{debt.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {isOweMe ? 'Вам должны' : 'Вы должны'}
                                                                </p>
                                                            </div>
                                                            <span className={`font-semibold text-sm ${isOweMe ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                {isOweMe ? '+' : '-'}{formatMoney(remaining, debt.currency || settings?.defaultCurrency)}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                );
                                            })}
                                    </div>
                                ) : (
                                    <p className="text-center py-4 text-muted-foreground text-sm">
                                        Нет активных долгов
                                    </p>
                                )}
                            </Card>
                        </div>

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


                    </div>

                    {/* Right column */}
                    <div className="space-y-6">
                        {/* Accounts */}
                        <Card className="p-6 bg-card border-border">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Счета</h3>
                            {accounts.length > 0 ? (
                                <div className="space-y-3">
                                    {accounts.slice(0, 10).map(account => (
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

            {/* Transaction List Dialog */}
            <Dialog open={!!txListType} onOpenChange={(open) => !open && setTxListType(null)}>
                <DialogContent className="max-w-lg max-h-[80vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {txListType === 'income' ? (
                                <>
                                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                                    Доходы за период
                                </>
                            ) : (
                                <>
                                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                                    Расходы за период
                                </>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="h-[60vh] pr-4">
                        <div className="space-y-2">
                            {filterTransactionsByPeriod(transactions, start, end)
                                .filter(tx => tx.type === txListType)
                                .sort((a, b) => b.date.localeCompare(a.date))
                                .map(tx => {
                                    const cat = categories.find(c => c.id === tx.categoryId);
                                    const acc = accounts.find(a => a.id === tx.accountId);
                                    return (
                                        <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border hover:bg-accent/50 transition-colors">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                style={{ backgroundColor: cat?.color ? `${cat.color}15` : 'var(--muted)' }}
                                            >
                                                <CategoryIcon icon={cat?.icon} color={cat?.color} size={20} className="w-10 h-10" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm text-foreground truncate">
                                                    {tx.merchant || cat?.name || 'Без категории'}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{format(parseISO(tx.date), 'd MMM', { locale: ru })}</span>
                                                    {acc && <><span>•</span><span>{acc.name}</span></>}
                                                </div>
                                            </div>
                                            <span className={`font-semibold text-sm shrink-0 ${txListType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                                {txListType === 'income' ? '+' : '-'}{formatMoney(tx.amount, tx.currency)}
                                            </span>
                                        </div>
                                    );
                                })}
                            {filterTransactionsByPeriod(transactions, start, end).filter(tx => tx.type === txListType).length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <p>Нет {txListType === 'income' ? 'доходов' : 'расходов'} за этот период</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>

            <BatchTransactionForm
                open={batchFormOpen}
                onOpenChange={setBatchFormOpen}
                accounts={accounts}
                categories={categories}
                onSubmit={handleCreateTransaction}
                defaultCurrency={settings?.defaultCurrency || 'USD'}
            />
        </div>
    );
}
