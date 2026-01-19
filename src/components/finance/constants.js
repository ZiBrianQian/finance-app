export const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'Доллар США' },
    { code: 'EUR', symbol: '€', name: 'Евро' },
    { code: 'RUB', symbol: '₽', name: 'Российский рубль' },
    { code: 'GBP', symbol: '£', name: 'Британский фунт' },
    { code: 'JPY', symbol: '¥', name: 'Японская иена' },
    { code: 'CNY', symbol: '¥', name: 'Китайский юань' },
    { code: 'CHF', symbol: 'Fr', name: 'Швейцарский франк' },
    { code: 'CAD', symbol: 'C$', name: 'Канадский доллар' },
    { code: 'AUD', symbol: 'A$', name: 'Австралийский доллар' },
    { code: 'UAH', symbol: '₴', name: 'Украинская гривна' },
    { code: 'KZT', symbol: '₸', name: 'Казахстанский тенге' },
    { code: 'BYN', symbol: 'Br', name: 'Белорусский рубль' },
];

export const DATE_FORMATS = [
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (01/31/2024)' },
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/01/2024)' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2024-01-31)' },
    { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (31.01.2024)' },
];

export const ACCOUNT_TYPES = [
    { value: 'cash', label: 'Наличные', icon: 'Wallet' },
    { value: 'card', label: 'Карта', icon: 'CreditCard' },
    { value: 'bank', label: 'Банковский счёт', icon: 'Building2' },
    { value: 'savings', label: 'Сбережения', icon: 'PiggyBank' },
    { value: 'other', label: 'Другое', icon: 'Landmark' },
];

export const CATEGORY_ICONS = [
    'ShoppingCart', 'Coffee', 'Car', 'Home', 'Utensils', 'Plane',
    'Heart', 'Gift', 'Smartphone', 'Laptop', 'Gamepad2', 'Music',
    'Book', 'GraduationCap', 'Dumbbell', 'Pill', 'Scissors', 'Shirt',
    'Baby', 'Dog', 'Bus', 'Fuel', 'Lightbulb', 'Wifi', 'Phone',
    'Tv', 'Film', 'Ticket', 'Briefcase', 'DollarSign', 'TrendingUp',
    'Building', 'Store', 'ShoppingBag', 'Pizza', 'Wine', 'IceCream'
];

export const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    '#14B8A6', '#A855F7', '#F43F5E', '#0EA5E9', '#22C55E'
];

export const PERIOD_PRESETS = [
    { value: 'week', label: 'Неделя' },
    { value: 'month', label: 'Месяц' },
    { value: 'quarter', label: 'Квартал' },
    { value: 'year', label: 'Год' },
    { value: 'custom', label: 'Период' },
];

export const DEFAULT_EXPENSE_CATEGORIES = [
    { name: 'Продукты', icon: 'ShoppingCart', color: '#10B981' },
    { name: 'Транспорт', icon: 'Car', color: '#3B82F6' },
    { name: 'Развлечения', icon: 'Film', color: '#8B5CF6' },
    { name: 'Рестораны', icon: 'Utensils', color: '#F59E0B' },
    { name: 'Здоровье', icon: 'Heart', color: '#EF4444' },
    { name: 'Одежда', icon: 'Shirt', color: '#EC4899' },
    { name: 'ЖКХ', icon: 'Home', color: '#06B6D4' },
    { name: 'Связь', icon: 'Smartphone', color: '#6366F1' },
    { name: 'Подписки', icon: 'Tv', color: '#A855F7' },
    { name: 'Другое', icon: 'ShoppingBag', color: '#64748B' },
];

export const DEFAULT_INCOME_CATEGORIES = [
    { name: 'Зарплата', icon: 'Briefcase', color: '#10B981' },
    { name: 'Фриланс', icon: 'Laptop', color: '#3B82F6' },
    { name: 'Инвестиции', icon: 'TrendingUp', color: '#8B5CF6' },
    { name: 'Подарки', icon: 'Gift', color: '#F59E0B' },
    { name: 'Другое', icon: 'DollarSign', color: '#64748B' },
];

export const formatMoney = (cents, currency = 'USD', showSign = false) => {
    const amount = cents / 100;
    const curr = CURRENCIES.find(c => c.code === currency) || { symbol: currency };

    const formatted = new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: (cents % 100 === 0) ? 0 : 2,
        maximumFractionDigits: 2,
        useGrouping: true
    }).format(Math.abs(amount));

    // Ensure space separator is used (replace NBSP if present)
    const withSpace = formatted.replace(/\u00A0/g, ' ');

    const sign = showSign && cents > 0 ? '+' : (cents < 0 ? '-' : '');
    return `${sign}${curr.symbol} ${withSpace}`;
};

export const parseMoney = (value) => {
    const cleaned = String(value).replace(/[^\d.,\-]/g, '').replace(',', '.');
    return Math.round(parseFloat(cleaned) * 100) || 0;
};
