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
                // Calculate actual financial quarter (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec)
                const currentMonth = today.getMonth();
                const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
                const quarterStartDate = new Date(today.getFullYear(), quarterStartMonth, 1);
                const quarterEndDate = endOfMonth(new Date(today.getFullYear(), quarterStartMonth + 2, 1));
                return { start: quarterStartDate, end: quarterEndDate };
            case 'year':
                return { start: startOfYear(today), end: endOfYear(today) };
            case 'all':
                return { start: new Date(2000, 0, 1), end: endOfYear(today) };
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

    // Sort accounts by sortOrder (accounts without sortOrder go to end)
    const sortedAccounts = [...accounts].sort((a, b) => {
        const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
    });

    const createAccount = useMutation({
        mutationFn: async (data) => {
            // Set sortOrder to be last if not provided
            const maxOrder = accounts.reduce((max, acc) => Math.max(max, acc.sortOrder ?? 0), 0);
            return entities.Account.create({ ...data, sortOrder: maxOrder + 1 });
        },
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

    // Set an account as primary (only one can be primary)
    const setPrimaryAccount = useMutation({
        mutationFn: async (accountId) => {
            // First, unset isPrimary for all accounts
            await Promise.all(
                accounts
                    .filter(a => a.isPrimary)
                    .map(a => entities.Account.update(a.id, { isPrimary: false }))
            );
            // Then set the new primary
            if (accountId) {
                await entities.Account.update(accountId, { isPrimary: true });
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    });

    // Reorder accounts by updating their sortOrder
    const reorderAccounts = useMutation({
        mutationFn: async (orderedIds) => {
            await Promise.all(
                orderedIds.map((id, index) =>
                    entities.Account.update(id, { sortOrder: index })
                )
            );
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts'] }),
    });

    // Get primary account (for default selection)
    const primaryAccount = sortedAccounts.find(a => a.isPrimary && !a.isArchived) || sortedAccounts.find(a => !a.isArchived);

    return {
        accounts: sortedAccounts.filter(a => !a.isArchived),
        allAccounts: sortedAccounts,
        primaryAccount,
        isLoading,
        createAccount,
        updateAccount,
        deleteAccount,
        setPrimaryAccount,
        reorderAccounts
    };
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
        const txCurrency = tx.currency || account.currency || 'USD';
        const accountCurrency = account.currency || 'USD';

        // Helper: convert using saved exchange rate if available
        const convertAmount = (amount, fromCurrency, toCurrency) => {
            if (fromCurrency === toCurrency) return amount;

            if (tx.exchangeRate && tx.exchangeRateBase) {
                if (fromCurrency === txCurrency && toCurrency === tx.exchangeRateBase) {
                    return Math.round(amount * tx.exchangeRate);
                }
                if (fromCurrency === tx.exchangeRateBase && toCurrency === txCurrency) {
                    return Math.round(amount / tx.exchangeRate);
                }
            }

            return convertCurrency(amount, fromCurrency, toCurrency, rates);
        };

        if (tx.type === 'income' && tx.accountId === account.id) {
            balance += convertAmount(tx.amount, txCurrency, accountCurrency);
        } else if (tx.type === 'expense' && tx.accountId === account.id) {
            balance -= convertAmount(tx.amount, txCurrency, accountCurrency);
        } else if (tx.type === 'transfer') {
            if (tx.accountId === account.id) {
                balance -= convertAmount(tx.amount, txCurrency, accountCurrency);
            }
            if (tx.toAccountId === account.id) {
                balance += convertAmount(tx.amount, txCurrency, accountCurrency);
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

    return Math.round(amount / fromRate * toRate);
};

/**
 * Calculate period statistics with currency conversion
 */
export const calculatePeriodStats = (transactions, startDate, endDate, targetCurrency, rates = {}) => {
    const filtered = filterTransactionsByPeriod(transactions, startDate, endDate);

    // Helper function: convert using saved exchange rate if available
    const convertTx = (tx) => {
        const txCurrency = tx.currency || targetCurrency || 'USD';
        const target = targetCurrency || 'USD';

        if (txCurrency === target) return tx.amount;

        // Use saved exchange rate if available
        if (tx.exchangeRate && tx.exchangeRateBase) {
            if (txCurrency !== target && target === tx.exchangeRateBase) {
                // Converting to the base currency that was saved
                return Math.round(tx.amount * tx.exchangeRate);
            }
            if (txCurrency === tx.exchangeRateBase && target !== txCurrency) {
                // Converting from base currency
                return Math.round(tx.amount / tx.exchangeRate);
            }
        }

        // Fallback to live rates
        return convertCurrency(tx.amount, txCurrency, target, rates);
    };

    const income = filtered
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + convertTx(t), 0);

    const expense = filtered
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + convertTx(t), 0);

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
