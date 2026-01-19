import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
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
    };
    return routes[pageName] || '/';
}
