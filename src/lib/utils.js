import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { ru, enUS } from "date-fns/locale"

// Locale mapping for date-fns
const DATE_FNS_LOCALES = {
    ru: ru,
    en: enUS,
};

/**
 * Get date-fns locale object based on language code
 * @param {string} language - Language code ('ru', 'en')
 * @returns {Locale} date-fns locale object
 */
export function getDateFnsLocale(language = 'ru') {
    return DATE_FNS_LOCALES[language] || ru;
}

/**
 * Get Intl locale string based on language code
 * @param {string} language - Language code ('ru', 'en')
 * @returns {string} Intl locale string
 */
export function getIntlLocale(language = 'ru') {
    const locales = {
        ru: 'ru-RU',
        en: 'en-US',
    };
    return locales[language] || 'ru-RU';
}

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency = 'USD', language = 'ru') {
    const locale = getIntlLocale(language);
    // Check if amount is valid number
    if (amount === undefined || amount === null || isNaN(amount)) {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(0);
    }

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount / 100);
}

export function formatDate(date, formatStr = 'd MMMM yyyy', language = 'ru') {
    if (!date) return '';
    try {
        return format(new Date(date), formatStr, { locale: getDateFnsLocale(language) });
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
