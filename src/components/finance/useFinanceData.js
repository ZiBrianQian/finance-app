import { useState, useCallback } from 'react';
import { entities } from '@/api/database';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear,
    subMonths, subWeeks, subYears,
    isAfter, isBefore, isEqual, parseISO
} from 'date-fns';

export const usePeriod = (defaultPeriod = 'month') => {
    const [period, setPeriod] = useState(defaultPeriod);
    const [customRange, setCustomRange] = useState({ start: null, end: null });

    const getDateRange = useCallback(() => {
        const today = new Date();
        switch (period) {
            case 'week':
                return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
            case 'month':
                return { start: startOfMonth(today), end: endOfMonth(today) };
            case 'quarter':
                const quarterStart = startOfMonth(subMonths(today, 2));
                return { start: quarterStart, end: endOfMonth(today) };
            case 'year':
                return { start: startOfYear(today), end: endOfYear(today) };
            case 'custom':
                return { start: customRange.start || today, end: customRange.end || today };
            default:
                return { start: startOfMonth(today), end: endOfMonth(today) };
        }
    }, [period, customRange]);

    const getPrevDateRange = useCallback(() => {
        const { start, end } = getDateRange();
        switch (period) {
            case 'week':
                return { start: subWeeks(start, 1), end: subWeeks(end, 1) };
            case 'month':
                return { start: startOfMonth(subMonths(start, 1)), end: endOfMonth(subMonths(start, 1)) };
            case 'quarter':
                return { start: subMonths(start, 3), end: subMonths(end, 3) };
            case 'year':
                return { start: subYears(start, 1), end: subYears(end, 1) };
            default:
                const diff = end - start;
                return { start: new Date(start.getTime() - diff), end: new Date(end.getTime() - diff) };
        }
    }, [period, getDateRange]);

    return { period, setPeriod, customRange, setCustomRange, getDateRange, getPrevDateRange };
};

export const useAccounts = () => {
    const queryClient = useQueryClient();

    const { data: accounts = [], isLoading } = useQuery({
        queryKey: ['accounts'],
        queryFn: () => entities.Account.list(),
    });

    const createAccount = useMutation({
        mutationFn: (data) => entities.Account.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    });

    const updateAccount = useMutation({
        mutationFn: ({ id, data }) => entities.Account.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    });

    const deleteAccount = useMutation({
        mutationFn: (id) => entities.Account.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    });

    return { accounts: accounts.filter(a => !a.isArchived), allAccounts: accounts, isLoading, createAccount, updateAccount, deleteAccount };
};

export const useCategories = () => {
    const queryClient = useQueryClient();

    const { data: categories = [], isLoading } = useQuery({
        queryKey: ['categories'],
        queryFn: () => entities.Category.list(),
    });

    const createCategory = useMutation({
        mutationFn: (data) => entities.Category.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    });

    const updateCategory = useMutation({
        mutationFn: ({ id, data }) => entities.Category.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    });

    const deleteCategory = useMutation({
        mutationFn: (id) => entities.Category.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    });

    const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isArchived);
    const incomeCategories = categories.filter(c => c.type === 'income' && !c.isArchived);

    return { categories, expenseCategories, incomeCategories, isLoading, createCategory, updateCategory, deleteCategory };
};

export const useTransactions = () => {
    const queryClient = useQueryClient();

    const { data: transactions = [], isLoading } = useQuery({
        queryKey: ['transactions'],
        queryFn: () => entities.Transaction.list('-date', 10000),
    });

    const createTransaction = useMutation({
        mutationFn: (data) => entities.Transaction.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['transactions'] });
        },
    });

    const updateTransaction = useMutation({
        mutationFn: ({ id, data }) => entities.Transaction.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    });

    const deleteTransaction = useMutation({
        mutationFn: (id) => entities.Transaction.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    });

    const bulkUpdate = useMutation({
        mutationFn: async (updates) => {
            await Promise.all(updates.map(({ id, data }) => entities.Transaction.update(id, data)));
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    });

    const bulkDelete = useMutation({
        mutationFn: async (ids) => {
            await Promise.all(ids.map(id => entities.Transaction.delete(id)));
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }),
    });

    return { transactions, isLoading, createTransaction, updateTransaction, deleteTransaction, bulkUpdate, bulkDelete };
};

export const useBudgets = () => {
    const queryClient = useQueryClient();

    const { data: budgets = [], isLoading } = useQuery({
        queryKey: ['budgets'],
        queryFn: () => entities.Budget.list(),
    });

    const createBudget = useMutation({
        mutationFn: (data) => entities.Budget.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    });

    const updateBudget = useMutation({
        mutationFn: ({ id, data }) => entities.Budget.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    });

    const deleteBudget = useMutation({
        mutationFn: (id) => entities.Budget.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
    });

    return { budgets, isLoading, createBudget, updateBudget, deleteBudget };
};

export const useGoals = () => {
    const queryClient = useQueryClient();

    const { data: goals = [], isLoading } = useQuery({
        queryKey: ['goals'],
        queryFn: () => entities.Goal.list(),
    });

    const createGoal = useMutation({
        mutationFn: (data) => entities.Goal.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
    });

    const updateGoal = useMutation({
        mutationFn: ({ id, data }) => entities.Goal.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
    });

    const deleteGoal = useMutation({
        mutationFn: (id) => entities.Goal.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
    });

    return { goals, isLoading, createGoal, updateGoal, deleteGoal };
};

export const useRecurringRules = () => {
    const queryClient = useQueryClient();

    const { data: rules = [], isLoading } = useQuery({
        queryKey: ['recurringRules'],
        queryFn: () => entities.RecurringRule.list(),
    });

    const createRule = useMutation({
        mutationFn: (data) => entities.RecurringRule.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurringRules'] }),
    });

    const updateRule = useMutation({
        mutationFn: ({ id, data }) => entities.RecurringRule.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurringRules'] }),
    });

    const deleteRule = useMutation({
        mutationFn: (id) => entities.RecurringRule.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurringRules'] }),
    });

    return { rules, isLoading, createRule, updateRule, deleteRule };
};

export const useAccountGroups = () => {
    const queryClient = useQueryClient();

    const { data: groups = [], isLoading } = useQuery({
        queryKey: ['accountGroups'],
        queryFn: () => entities.AccountGroup.list(),
    });

    const createGroup = useMutation({
        mutationFn: (data) => entities.AccountGroup.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accountGroups'] }),
    });

    const updateGroup = useMutation({
        mutationFn: ({ id, data }) => entities.AccountGroup.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accountGroups'] }),
    });

    const deleteGroup = useMutation({
        mutationFn: (id) => entities.AccountGroup.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accountGroups'] }),
    });

    return { groups, isLoading, createGroup, updateGroup, deleteGroup };
};

export const useNotifications = () => {
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => entities.Notification.list('-created_date', 100),
    });

    const createNotification = useMutation({
        mutationFn: (data) => entities.Notification.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const updateNotification = useMutation({
        mutationFn: ({ id, data }) => entities.Notification.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const deleteNotification = useMutation({
        mutationFn: (id) => entities.Notification.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const markAsRead = useMutation({
        mutationFn: (id) => entities.Notification.update(id, { isRead: true }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    const markAllAsRead = useMutation({
        mutationFn: async () => {
            const unread = notifications.filter(n => !n.isRead);
            await Promise.all(unread.map(n => entities.Notification.update(n.id, { isRead: true })));
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    });

    return { notifications, isLoading, createNotification, updateNotification, deleteNotification, markAsRead, markAllAsRead };
};

export const useNotificationSettings = () => {
    const queryClient = useQueryClient();

    const { data: settingsArr = [], isLoading } = useQuery({
        queryKey: ['notificationSettings'],
        queryFn: () => entities.NotificationSettings.list(),
    });

    const settings = settingsArr[0] || {
        budgetAlerts: true,
        budgetThreshold: 80,
        goalAchieved: true,
        recurringReminders: true,
        recurringDaysBefore: 1,
        lowBalance: false,
        lowBalanceThreshold: 10000
    };

    const updateSettings = useMutation({
        mutationFn: async (data) => {
            if (settingsArr[0]?.id) {
                return entities.NotificationSettings.update(settingsArr[0].id, data);
            } else {
                return entities.NotificationSettings.create(data);
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificationSettings'] }),
    });

    return { settings, isLoading, updateSettings };
};

export const useAppSettings = () => {
    const queryClient = useQueryClient();

    const { data: settingsArr = [], isLoading } = useQuery({
        queryKey: ['appSettings'],
        queryFn: () => entities.AppSettings.list(),
    });

    const settings = settingsArr[0] || {
        defaultCurrency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        theme: 'light',
        onboardingCompleted: false,
        exchangeRates: [] // Array of { currency, rate } relative to defaultCurrency
    };

    const updateSettings = useMutation({
        mutationFn: async (data) => {
            if (settingsArr[0]?.id) {
                return entities.AppSettings.update(settingsArr[0].id, data);
            } else {
                return entities.AppSettings.create(data);
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appSettings'] }),
    });

    return { settings, isLoading, updateSettings };
};

export const calculateAccountBalance = (account, transactions, rates = {}) => {
    const accountTxs = transactions.filter(t =>
        t.accountId === account.id || t.toAccountId === account.id
    );

    let balance = account.initialBalance || 0;

    accountTxs.forEach(tx => {
        // Determine transaction currency (fallback to account currency if missing)
        const txCurrency = tx.currency || account.currency || 'USD';
        const accountCurrency = account.currency || 'USD';

        // Convert amount to account's currency
        const amountInAccountCurrency = convertCurrency(tx.amount, txCurrency, accountCurrency, rates);

        if (tx.type === 'income' && tx.accountId === account.id) {
            balance += amountInAccountCurrency;
        } else if (tx.type === 'expense' && tx.accountId === account.id) {
            balance -= amountInAccountCurrency;
        } else if (tx.type === 'transfer') {
            if (tx.accountId === account.id) {
                // Outgoing transfer: amount is in txCurrency (usually source currency)
                // Convert to source account currency
                balance -= convertCurrency(tx.amount, txCurrency, accountCurrency, rates);
            }
            if (tx.toAccountId === account.id) {
                // Incoming transfer: amount is in txCurrency
                // Convert to destination account currency
                balance += convertCurrency(tx.amount, txCurrency, accountCurrency, rates);
            }
        }
    });

    return balance;
};

export const filterTransactionsByPeriod = (transactions, startDate, endDate) => {
    return transactions.filter(tx => {
        const txDate = parseISO(tx.date);
        return (isEqual(txDate, startDate) || isAfter(txDate, startDate)) &&
            (isEqual(txDate, endDate) || isBefore(txDate, endDate));
    });
};

/**
 * Hook to get live exchange rates from API with caching
 * @param {string} baseCurrency - Base currency for rates (usually user's default)
 */
export const useLiveRates = (baseCurrency = 'USD') => {
    const queryClient = useQueryClient();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['exchangeRates', baseCurrency],
        queryFn: async () => {
            const { getExchangeRates } = await import('@/api/currencyService');
            return getExchangeRates(baseCurrency);
        },
        staleTime: 1000 * 60 * 60, // 1 hour
        gcTime: 1000 * 60 * 60 * 24, // 24 hours cache
        retry: 2,
    });

    const forceRefresh = useCallback(async () => {
        const { getExchangeRates } = await import('@/api/currencyService');
        const fresh = await getExchangeRates(baseCurrency, true);
        queryClient.setQueryData(['exchangeRates', baseCurrency], fresh);
        return fresh;
    }, [baseCurrency, queryClient]);

    return {
        rates: data?.rates || {},
        lastUpdated: data?.lastUpdated,
        fromCache: data?.fromCache,
        isLoading,
        error,
        refetch,
        forceRefresh
    };
};

/**
 * Convert currency using live API rates object
 * @param {number} amount - Amount in cents
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {Object} rates - Rates object from useLiveRates (keyed by currency code)
 */
export const convertCurrency = (amount, fromCurrency, toCurrency, rates = {}) => {
    if (!amount || fromCurrency === toCurrency) return amount;

    // Handle both old array format and new object format
    if (Array.isArray(rates)) {
        // Legacy format: [{currency, rate}]
        const fromRateObj = rates.find(r => r.currency === fromCurrency);
        const toRateObj = rates.find(r => r.currency === toCurrency);
        const fromRate = fromRateObj ? parseFloat(fromRateObj.rate) : 1;
        const toRate = toRateObj ? parseFloat(toRateObj.rate) : 1;
        return Math.round(amount * fromRate / toRate);
    }

    // New format: {USD: 1, EUR: 0.92, ...} (rates relative to base)
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    // Convert: amount in FROM -> base -> TO
    // amount / fromRate gives base, * toRate gives TO
    return Math.round(amount / fromRate * toRate);
};

/**
 * Calculate period statistics with currency conversion
 */
export const calculatePeriodStats = (transactions, startDate, endDate, targetCurrency, rates = {}) => {
    const filtered = filterTransactionsByPeriod(transactions, startDate, endDate);

    const income = filtered
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency || targetCurrency || 'USD', targetCurrency || 'USD', rates), 0);

    const expense = filtered
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency || targetCurrency || 'USD', targetCurrency || 'USD', rates), 0);

    return { income, expense, net: income - expense, count: filtered.length };
};


export const useDebts = () => {
    const queryClient = useQueryClient();

    const { data: debts = [], isLoading } = useQuery({
        queryKey: ['debts'],
        queryFn: () => entities.Debt.list(),
    });

    const createDebt = useMutation({
        mutationFn: (data) => entities.Debt.create(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts'] }),
    });

    const updateDebt = useMutation({
        mutationFn: ({ id, data }) => entities.Debt.update(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts'] }),
    });

    const deleteDebt = useMutation({
        mutationFn: (id) => entities.Debt.delete(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts'] }),
    });

    return { debts, isLoading, createDebt, updateDebt, deleteDebt };
};
