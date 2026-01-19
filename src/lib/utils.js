import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency = 'USD') {
    // Check if amount is valid number
    if (amount === undefined || amount === null || isNaN(amount)) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(0);
    }

    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount / 100);
}

export function formatDate(date, formatStr = 'd MMMM yyyy') {
    if (!date) return '';
    try {
        return format(new Date(date), formatStr, { locale: ru });
    } catch (e) {
        return '';
    }
}

export function createPageUrl(pageName) {
    const routes = {
        'Dashboard': '/',
        'Transactions': '/transactions',
        'Budgets': '/budgets',
        'Goals': '/goals',
        'Recurring': '/recurring',
        'Reports': '/reports',
        'Settings': '/settings',
        'Calendar': '/calendar',
        'Debts': '/debts',
        'Subscriptions': '/subscriptions',
    };
    return routes[pageName] || '/';
}
