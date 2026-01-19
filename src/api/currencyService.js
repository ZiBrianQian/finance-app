// Currency Exchange Rate Service
// Uses ExchangeRate-API (free tier, no API key required for open access)

import { db } from './database';

const API_BASE = 'https://open.er-api.com/v6/latest';
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch latest exchange rates from API
 * @param {string} baseCurrency - Base currency code (e.g., 'USD')
 * @returns {Promise<{rates: Object, lastUpdated: string}>}
 */
export async function fetchRatesFromAPI(baseCurrency = 'USD') {
    try {
        const response = await fetch(`${API_BASE}/${baseCurrency}`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.result !== 'success') {
            throw new Error(data['error-type'] || 'Unknown API error');
        }

        return {
            base: data.base_code,
            rates: data.rates,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        throw error;
    }
}

/**
 * Get cached rates from IndexedDB
 * @param {string} baseCurrency
 * @returns {Promise<Object|null>}
 */
export async function getCachedRates(baseCurrency = 'USD') {
    try {
        const cached = await db.exchangeRates.get(baseCurrency);
        return cached || null;
    } catch (error) {
        console.error('Error reading cached rates:', error);
        return null;
    }
}

/**
 * Save rates to IndexedDB cache
 * @param {string} baseCurrency
 * @param {Object} rates
 * @param {string} lastUpdated
 */
export async function cacheRates(baseCurrency, rates, lastUpdated) {
    try {
        await db.exchangeRates.put({
            base: baseCurrency,
            rates,
            lastUpdated
        });
    } catch (error) {
        console.error('Error caching rates:', error);
    }
}

/**
 * Check if cached rates are still valid (less than 1 hour old)
 * @param {Object} cached
 * @returns {boolean}
 */
export function isCacheValid(cached) {
    if (!cached || !cached.lastUpdated) return false;
    const age = Date.now() - new Date(cached.lastUpdated).getTime();
    return age < CACHE_DURATION_MS;
}

/**
 * Get exchange rates, using cache if valid or fetching new ones
 * @param {string} baseCurrency
 * @param {boolean} forceRefresh - Force fetch from API
 * @returns {Promise<{rates: Object, lastUpdated: string, fromCache: boolean}>}
 */
export async function getExchangeRates(baseCurrency = 'USD', forceRefresh = false) {
    // Try cache first
    if (!forceRefresh) {
        const cached = await getCachedRates(baseCurrency);
        if (cached && isCacheValid(cached)) {
            return {
                rates: cached.rates,
                lastUpdated: cached.lastUpdated,
                fromCache: true
            };
        }
    }

    // Fetch fresh rates
    try {
        const { rates, lastUpdated } = await fetchRatesFromAPI(baseCurrency);
        await cacheRates(baseCurrency, rates, lastUpdated);
        return {
            rates,
            lastUpdated,
            fromCache: false
        };
    } catch (error) {
        // If fetch fails, try to use stale cache as fallback
        const cached = await getCachedRates(baseCurrency);
        if (cached) {
            console.warn('Using stale cached rates due to API error');
            return {
                rates: cached.rates,
                lastUpdated: cached.lastUpdated,
                fromCache: true,
                stale: true
            };
        }
        throw error;
    }
}

/**
 * Convert amount between currencies using live rates
 * @param {number} amount - Amount in cents/smallest unit
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {Object} rates - Rates object from getExchangeRates
 * @returns {number} - Converted amount in cents
 */
export function convertWithRates(amount, fromCurrency, toCurrency, rates) {
    if (!amount || fromCurrency === toCurrency) return amount;
    if (!rates || !rates[fromCurrency] || !rates[toCurrency]) {
        console.warn(`Missing rate for ${fromCurrency} or ${toCurrency}, using 1:1`);
        return amount;
    }

    // rates are relative to base currency
    // To convert FROM -> TO: amount / rates[FROM] * rates[TO]
    const fromRate = rates[fromCurrency];
    const toRate = rates[toCurrency];

    return Math.round(amount / fromRate * toRate);
}

/**
 * Get single exchange rate between two currencies
 * @param {string} fromCurrency
 * @param {string} toCurrency
 * @param {string} baseCurrency - Base currency for rates lookup
 * @returns {Promise<number>} - Exchange rate
 */
export async function getRate(fromCurrency, toCurrency, baseCurrency = 'USD') {
    if (fromCurrency === toCurrency) return 1;

    const { rates } = await getExchangeRates(baseCurrency);

    if (!rates[fromCurrency] || !rates[toCurrency]) {
        console.warn(`Rate not found for ${fromCurrency}/${toCurrency}`);
        return 1;
    }

    // Rate = toCurrency / fromCurrency (relative to base)
    return rates[toCurrency] / rates[fromCurrency];
}
