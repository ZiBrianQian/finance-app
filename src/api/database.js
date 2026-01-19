import Dexie from 'dexie';

// Создаём базу данных
export const db = new Dexie('FinanceAppDB');

// Определяем схему
db.version(1).stores({
    accounts: 'id, name, type, currency, isArchived, groupId, initialBalance, icon, color',
    accountGroups: 'id, name',
    categories: 'id, name, type, icon, color, isArchived, parentId',
    transactions: 'id, type, amount, currency, date, categoryId, accountId, toAccountId, merchant, notes, paymentMethod, isRecurringInstance, recurringRuleId',
    budgets: 'id, name, isActive, period, startDate, endDate',
    goals: 'id, name, targetAmount, currentAmount, deadline, accountId, status, priority, color',
    recurringRules: 'id, title, type, amount, currency, categoryId, accountId, frequency, nextRunDate, isActive',
    notifications: 'id, type, title, message, isRead, data, created_date',
    notificationSettings: 'id',
    appSettings: 'id, defaultCurrency, dateFormat, theme, onboardingCompleted'
});

// Version 2: Add exchangeRates cache store
db.version(2).stores({
    accounts: 'id, name, type, currency, isArchived, groupId, initialBalance, icon, color',
    accountGroups: 'id, name',
    categories: 'id, name, type, icon, color, isArchived, parentId',
    transactions: 'id, type, amount, currency, date, categoryId, accountId, toAccountId, merchant, notes, paymentMethod, isRecurringInstance, recurringRuleId',
    budgets: 'id, name, isActive, period, startDate, endDate',
    goals: 'id, name, targetAmount, currentAmount, deadline, accountId, status, priority, color',
    recurringRules: 'id, title, type, amount, currency, categoryId, accountId, frequency, nextRunDate, isActive',
    notifications: 'id, type, title, message, isRead, data, created_date',
    notificationSettings: 'id',
    appSettings: 'id, defaultCurrency, dateFormat, theme, onboardingCompleted',
    exchangeRates: 'base, rates, lastUpdated'
});

// Version 3: Add debts store
db.version(3).stores({
    accounts: 'id, name, type, currency, isArchived, groupId, initialBalance, icon, color',
    accountGroups: 'id, name',
    categories: 'id, name, type, icon, color, isArchived, parentId',
    transactions: 'id, type, amount, currency, date, categoryId, accountId, toAccountId, merchant, notes, paymentMethod, isRecurringInstance, recurringRuleId',
    budgets: 'id, name, isActive, period, startDate, endDate',
    goals: 'id, name, targetAmount, currentAmount, deadline, accountId, status, priority, color',
    recurringRules: 'id, title, type, amount, currency, categoryId, accountId, frequency, nextRunDate, isActive',
    notifications: 'id, type, title, message, isRead, data, created_date',
    notificationSettings: 'id',
    appSettings: 'id, defaultCurrency, dateFormat, theme, onboardingCompleted',
    exchangeRates: 'base, rates, lastUpdated',
    debts: 'id, name, amount, currency, type, dueDate, notes, isPaid, createdDate'
});

// Генерируем уникальный ID
function generateId() {
    return crypto.randomUUID();
}

// CRUD операции для всех сущностей
export const entities = {
    Account: {
        list: async () => {
            return await db.accounts.toArray();
        },
        create: async (data) => {
            const id = generateId();
            await db.accounts.add({ ...data, id });
            return { ...data, id };
        },
        update: async (id, data) => {
            await db.accounts.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.accounts.delete(id);
        }
    },

    AccountGroup: {
        list: async () => {
            return await db.accountGroups.toArray();
        },
        create: async (data) => {
            const id = generateId();
            await db.accountGroups.add({ ...data, id });
            return { ...data, id };
        },
        update: async (id, data) => {
            await db.accountGroups.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.accountGroups.delete(id);
        }
    },

    Category: {
        list: async () => {
            return await db.categories.toArray();
        },
        create: async (data) => {
            const id = generateId();
            await db.categories.add({ ...data, id });
            return { ...data, id };
        },
        update: async (id, data) => {
            await db.categories.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.categories.delete(id);
        }
    },

    Transaction: {
        list: async (sortBy = '-date', limit = 10000) => {
            let query = db.transactions.toCollection();
            const results = await query.toArray();

            // Sort by date descending by default
            if (sortBy === '-date') {
                results.sort((a, b) => new Date(b.date) - new Date(a.date));
            }

            return results.slice(0, limit);
        },
        create: async (data) => {
            const id = generateId();
            await db.transactions.add({ ...data, id });
            return { ...data, id };
        },
        update: async (id, data) => {
            await db.transactions.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.transactions.delete(id);
        }
    },

    Budget: {
        list: async () => {
            return await db.budgets.toArray();
        },
        create: async (data) => {
            const id = generateId();
            await db.budgets.add({ ...data, id });
            return { ...data, id };
        },
        update: async (id, data) => {
            await db.budgets.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.budgets.delete(id);
        }
    },

    Goal: {
        list: async () => {
            return await db.goals.toArray();
        },
        create: async (data) => {
            const id = generateId();
            await db.goals.add({ ...data, id });
            return { ...data, id };
        },
        update: async (id, data) => {
            await db.goals.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.goals.delete(id);
        }
    },

    RecurringRule: {
        list: async () => {
            return await db.recurringRules.toArray();
        },
        create: async (data) => {
            const id = generateId();
            await db.recurringRules.add({ ...data, id });
            return { ...data, id };
        },
        update: async (id, data) => {
            await db.recurringRules.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.recurringRules.delete(id);
        }
    },

    Debt: {
        list: async () => {
            return await db.debts.toArray();
        },
        create: async (data) => {
            const id = generateId();
            const createdDate = new Date().toISOString();
            await db.debts.add({ ...data, id, createdDate });
            return { ...data, id, createdDate };
        },
        update: async (id, data) => {
            await db.debts.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.debts.delete(id);
        }
    },

    Notification: {
        list: async (sortBy = '-created_date', limit = 100) => {
            const results = await db.notifications.toArray();
            results.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
            return results.slice(0, limit);
        },
        create: async (data) => {
            const id = generateId();
            const created_date = new Date().toISOString();
            await db.notifications.add({ ...data, id, created_date });
            return { ...data, id, created_date };
        },
        update: async (id, data) => {
            await db.notifications.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.notifications.delete(id);
        }
    },

    NotificationSettings: {
        list: async () => {
            return await db.notificationSettings.toArray();
        },
        create: async (data) => {
            const id = generateId();
            await db.notificationSettings.add({ ...data, id });
            return { ...data, id };
        },
        update: async (id, data) => {
            await db.notificationSettings.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.notificationSettings.delete(id);
        }
    },

    AppSettings: {
        list: async () => {
            return await db.appSettings.toArray();
        },
        create: async (data) => {
            const id = generateId();
            await db.appSettings.add({ ...data, id });
            return { ...data, id };
        },
        update: async (id, data) => {
            await db.appSettings.update(id, data);
            return { id, ...data };
        },
        delete: async (id) => {
            await db.appSettings.delete(id);
        }
    }
};
