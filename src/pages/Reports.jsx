import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Download, TrendingUp, TrendingDown, ArrowUpDown, CalendarDays, GitCompare } from 'lucide-react';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, parseISO, getDay, startOfMonth, endOfMonth, subMonths, subYears } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

import { useAccounts, useCategories, useTransactions, useAppSettings, filterTransactionsByPeriod, calculatePeriodStats, convertCurrency, useLiveRates } from '@/components/finance/useFinanceData';
import { formatMoney } from '@/components/finance/constants';
import DateRangePicker from '@/components/finance/DateRangePicker';
import { CategoryPieChart, IncomeExpenseChart } from '@/components/finance/Charts';
import CategoryIcon from '@/components/finance/CategoryIcon';

// Presets for comparison period
const COMPARE_PRESETS = [
    { value: 'prev', label: 'Прошлый период' },
    { value: 'lastYear', label: 'Год назад' },
    { value: 'custom', label: 'Произвольно' },
];

export default function Reports() {
    const { accounts } = useAccounts();
    const { categories } = useCategories();
    const { transactions } = useTransactions();
    const { settings } = useAppSettings();
    const { rates } = useLiveRates(settings?.defaultCurrency || 'USD');

    // Main period selection
    const [mainRange, setMainRange] = useState({
        start: startOfMonth(new Date()),
        end: endOfMonth(new Date())
    });

    // Comparison settings
    const [compareEnabled, setCompareEnabled] = useState(true);
    const [compareType, setCompareType] = useState('prev');
    const [customCompareRange, setCustomCompareRange] = useState({
        start: startOfMonth(subMonths(new Date(), 1)),
        end: endOfMonth(subMonths(new Date(), 1))
    });

    const [reportType, setReportType] = useState('expenses');
    const [accountFilter, setAccountFilter] = useState('all');
    const [currencyFilter, setCurrencyFilter] = useState('all');

    // Calculate comparison range based on type
    const compareRange = useMemo(() => {
        if (!compareEnabled) return null;

        switch (compareType) {
            case 'prev':
                // Same duration, immediately before main range
                const duration = mainRange.end - mainRange.start;
                return {
                    start: new Date(mainRange.start.getTime() - duration - 86400000),
                    end: new Date(mainRange.start.getTime() - 86400000)
                };
            case 'lastYear':
                // Same period, one year ago
                return {
                    start: subYears(mainRange.start, 1),
                    end: subYears(mainRange.end, 1)
                };
            case 'custom':
                return customCompareRange;
            default:
                return null;
        }
    }, [compareEnabled, compareType, mainRange, customCompareRange]);

    // Helper function to apply account and currency filters
    const applyFilters = (txList) => {
        let result = txList;
        if (accountFilter !== 'all') {
            result = result.filter(t => t.accountId === accountFilter);
        }
        if (currencyFilter !== 'all') {
            result = result.filter(t => t.currency === currencyFilter);
        }
        return result;
    };

    const filteredTransactions = useMemo(() => {
        const periodTxs = filterTransactionsByPeriod(transactions, mainRange.start, mainRange.end);
        return applyFilters(periodTxs);
    }, [transactions, mainRange, accountFilter, currencyFilter]);

    const compareFilteredTransactions = useMemo(() => {
        if (!compareRange) return [];
        const periodTxs = filterTransactionsByPeriod(transactions, compareRange.start, compareRange.end);
        return applyFilters(periodTxs);
    }, [transactions, compareRange, accountFilter, currencyFilter]);

    const currentStats = useMemo(() =>
        calculatePeriodStats(filteredTransactions, mainRange.start, mainRange.end, settings?.defaultCurrency, rates),
        [filteredTransactions, mainRange, settings?.defaultCurrency, rates]
    );

    const compareStats = useMemo(() => {
        if (!compareRange) return { income: 0, expense: 0, net: 0, count: 0 };
        return calculatePeriodStats(compareFilteredTransactions, compareRange.start, compareRange.end, settings?.defaultCurrency, rates);
    }, [compareFilteredTransactions, compareRange, settings?.defaultCurrency, rates]);

    const categoryData = useMemo(() => {
        const type = reportType === 'expenses' ? 'expense' : 'income';
        const filtered = filteredTransactions.filter(t => t.type === type);

        const byCategory = {};
        filtered.forEach(tx => {
            const cat = categories.find(c => c.id === tx.categoryId);
            const name = cat?.name || 'Без категории';
            const amount = convertCurrency(tx.amount, tx.currency || 'USD', settings?.defaultCurrency || 'USD', rates);

            if (!byCategory[name]) {
                byCategory[name] = { name, value: 0, color: cat?.color, icon: cat?.icon, id: tx.categoryId };
            }
            byCategory[name].value += amount;
        });

        return Object.values(byCategory).sort((a, b) => b.value - a.value);
    }, [filteredTransactions, categories, reportType, settings?.defaultCurrency, rates]);

    const timeSeriesData = useMemo(() => {
        const days = eachDayOfInterval({ start: mainRange.start, end: mainRange.end });

        return days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTxs = filteredTransactions.filter(t => t.date === dateStr);

            return {
                date: format(day, 'd MMM', { locale: ru }),
                income: dayTxs
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency || 'USD', settings?.defaultCurrency || 'USD', rates), 0),
                expense: dayTxs
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency || 'USD', settings?.defaultCurrency || 'USD', rates), 0)
            };
        });
    }, [filteredTransactions, mainRange, settings?.defaultCurrency, rates]);

    const heatmapData = useMemo(() => {
        const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const byDay = Array(7).fill(0).map(() => ({ total: 0, count: 0 }));

        filteredTransactions
            .filter(t => t.type === 'expense')
            .forEach(tx => {
                const day = getDay(parseISO(tx.date));
                const amount = convertCurrency(tx.amount, tx.currency || 'USD', settings?.defaultCurrency || 'USD', rates);
                byDay[day].total += amount;
                byDay[day].count += 1;
            });

        const maxTotal = Math.max(...byDay.map(d => d.total));

        return byDay.map((data, i) => ({
            day: dayNames[i],
            total: data.total,
            count: data.count,
            intensity: maxTotal > 0 ? data.total / maxTotal : 0
        }));
    }, [filteredTransactions, settings?.defaultCurrency, rates]);

    const comparisonData = useMemo(() => {
        if (!compareEnabled || !compareRange) return [];

        const currentCats = {};
        const prevCats = {};

        filteredTransactions
            .filter(t => t.type === 'expense')
            .forEach(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                const name = cat?.name || 'Без категории';
                const amount = convertCurrency(tx.amount, tx.currency || 'USD', settings?.defaultCurrency || 'USD', rates);
                currentCats[name] = (currentCats[name] || 0) + amount;
            });

        compareFilteredTransactions
            .filter(t => t.type === 'expense')
            .forEach(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                const name = cat?.name || 'Без категории';
                const amount = convertCurrency(tx.amount, tx.currency || 'USD', settings?.defaultCurrency || 'USD', rates);
                prevCats[name] = (prevCats[name] || 0) + amount;
            });

        const allCats = [...new Set([...Object.keys(currentCats), ...Object.keys(prevCats)])];

        return allCats.map(name => {
            const current = currentCats[name] || 0;
            const prev = prevCats[name] || 0;
            const change = prev > 0 ? ((current - prev) / prev) * 100 : (current > 0 ? 100 : 0);
            const cat = categories.find(c => c.name === name);

            return { name, current, prev, change, color: cat?.color, icon: cat?.icon };
        }).sort((a, b) => b.current - a.current);
    }, [filteredTransactions, compareFilteredTransactions, compareEnabled, compareRange, categories, settings?.defaultCurrency, rates]);

    const exportCSV = () => {
        const total = categoryData.reduce((sum, c) => sum + c.value, 0);

        const headers = ['Категория', 'Сумма', 'Процент'];
        const rows = categoryData.map(cat => [
            cat.name,
            cat.value.toFixed(2),
            total > 0 ? ((cat.value / total) * 100).toFixed(1) + '%' : '0%'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${reportType}-${format(mainRange.start, 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Отчёт экспортирован');
    };

    const currencies = [...new Set(transactions.map(t => t.currency))];
    const total = categoryData.reduce((sum, c) => sum + c.value, 0);

    // Format period label
    const formatPeriodLabel = (range) => {
        if (!range?.start || !range?.end) return '';
        return `${format(range.start, 'd MMM yyyy', { locale: ru })} — ${format(range.end, 'd MMM yyyy', { locale: ru })}`;
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-500 to-pink-600">Отчёты</h1>
                        <p className="text-muted-foreground mt-1">Анализ доходов и расходов</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={exportCSV}>
                            <Download className="w-4 h-4 mr-2" />
                            Экспорт
                        </Button>
                    </div>
                </div>

                {/* Period Selection */}
                <Card className="p-4 mb-6 bg-card border-border">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Main Period */}
                        <div className="flex items-center gap-3">
                            <CalendarDays className="w-5 h-5 text-primary" />
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">Период отчёта</p>
                                <DateRangePicker
                                    value={mainRange}
                                    onChange={setMainRange}
                                    label="Выберите период"
                                />
                            </div>
                        </div>

                        <div className="hidden lg:block h-10 w-px bg-border" />

                        {/* Comparison Toggle & Settings */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="compare-toggle"
                                    checked={compareEnabled}
                                    onCheckedChange={setCompareEnabled}
                                />
                                <Label htmlFor="compare-toggle" className="text-sm cursor-pointer">
                                    Сравнение
                                </Label>
                            </div>

                            {compareEnabled && (
                                <>
                                    <Select value={compareType} onValueChange={setCompareType}>
                                        <SelectTrigger className="w-44 bg-background border-input">
                                            <GitCompare className="w-4 h-4 mr-2 text-muted-foreground" />
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {COMPARE_PRESETS.map(p => (
                                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {compareType === 'custom' && (
                                        <DateRangePicker
                                            value={customCompareRange}
                                            onChange={setCustomCompareRange}
                                            label="Период сравнения"
                                            showPresets={true}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Selected periods display */}
                    {compareEnabled && compareRange && (
                        <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-medium">
                                    Текущий
                                </span>
                                <span className="text-muted-foreground">{formatPeriodLabel(mainRange)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-muted text-muted-foreground rounded-md font-medium">
                                    Сравнение
                                </span>
                                <span className="text-muted-foreground">{formatPeriodLabel(compareRange)}</span>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Filters */}
                <Card className="p-4 mb-6 bg-card border-border">
                    <div className="flex flex-wrap items-center gap-4">
                        <Tabs value={reportType} onValueChange={setReportType}>
                            <TabsList>
                                <TabsTrigger value="expenses">Расходы</TabsTrigger>
                                <TabsTrigger value="income">Доходы</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Select value={accountFilter} onValueChange={setAccountFilter}>
                            <SelectTrigger className="w-40 bg-background border-input">
                                <SelectValue placeholder="Все счета" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Все счета</SelectItem>
                                {accounts.map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {currencies.filter(c => c && c !== 'undefined').length > 1 && (
                            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                                <SelectTrigger className="w-32 bg-background border-input">
                                    <SelectValue placeholder="Валюта" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все</SelectItem>
                                    {currencies.filter(c => c && c !== 'undefined').map(c => (
                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </Card>

                {/* Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <Card className="p-5 bg-card border-border">
                        <p className="text-sm text-muted-foreground">
                            {reportType === 'expenses' ? 'Всего расходов' : 'Всего доходов'}
                        </p>
                        <p className={`text-2xl font-bold mt-1 ${reportType === 'expenses' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {formatMoney(reportType === 'expenses' ? currentStats.expense : currentStats.income, settings?.defaultCurrency)}
                        </p>
                        {compareEnabled && (
                            <div className="flex items-center gap-1 mt-2">
                                {(() => {
                                    const currentVal = reportType === 'expenses' ? currentStats.expense : currentStats.income;
                                    const prevVal = reportType === 'expenses' ? compareStats.expense : compareStats.income;
                                    const change = prevVal > 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0;
                                    return (
                                        <>
                                            {change > 0 ? (
                                                <TrendingUp className={`w-4 h-4 ${reportType === 'expenses' ? 'text-red-500' : 'text-green-500'}`} />
                                            ) : change < 0 ? (
                                                <TrendingDown className={`w-4 h-4 ${reportType === 'expenses' ? 'text-green-500' : 'text-red-500'}`} />
                                            ) : null}
                                            <span className={`text-sm font-medium ${change > 0
                                                ? (reportType === 'expenses' ? 'text-red-600' : 'text-green-600')
                                                : change < 0
                                                    ? (reportType === 'expenses' ? 'text-green-600' : 'text-red-600')
                                                    : 'text-muted-foreground'
                                                }`}>
                                                {change > 0 ? '+' : ''}{change.toFixed(1)}%
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-1">vs сравнение</span>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </Card>

                    <Card className="p-5 bg-card border-border">
                        <p className="text-sm text-muted-foreground">Транзакций</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">
                            {filteredTransactions.filter(t => t.type === (reportType === 'expenses' ? 'expense' : 'income')).length}
                        </p>
                        {compareEnabled && (
                            <p className="text-sm text-muted-foreground mt-2">
                                было: {compareFilteredTransactions.filter(t => t.type === (reportType === 'expenses' ? 'expense' : 'income')).length}
                            </p>
                        )}
                    </Card>

                    <Card className="p-5 bg-card border-border">
                        <p className="text-sm text-muted-foreground">Категорий</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">{categoryData.length}</p>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Pie chart */}
                    <Card className="p-6 bg-card border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                            По категориям
                        </h3>
                        {categoryData.length > 0 ? (
                            <CategoryPieChart data={categoryData} currency={settings?.defaultCurrency || 'USD'} />
                        ) : (
                            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                                Нет данных за выбранный период
                            </div>
                        )}
                    </Card>

                    {/* Time series */}
                    <Card className="p-6 bg-card border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                            Динамика по дням
                        </h3>
                        {timeSeriesData.length > 0 ? (
                            <IncomeExpenseChart data={timeSeriesData} currency={settings?.defaultCurrency || 'USD'} />
                        ) : (
                            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                                Нет данных
                            </div>
                        )}
                    </Card>
                </div>

                {/* Category table and comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Category breakdown */}
                    <Card className="p-6 bg-card border-border">
                        <h3 className="text-lg font-semibold text-foreground mb-4">Детализация</h3>
                        <div className="space-y-3">
                            {categoryData.map((cat) => (
                                <div key={cat.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <CategoryIcon icon={cat.icon} color={cat.color} size={18} className="w-9 h-9" />
                                        <div>
                                            <p className="font-medium text-foreground">{cat.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {total > 0 ? ((cat.value / total) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                    </div>
                                    <p className="font-semibold text-foreground">
                                        {formatMoney(cat.value, settings?.defaultCurrency)}
                                    </p>
                                </div>
                            ))}
                            {categoryData.length === 0 && (
                                <p className="text-center text-muted-foreground py-6">Нет данных</p>
                            )}
                        </div>
                    </Card>

                    {/* Period comparison */}
                    <Card className="p-6 bg-card border-border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-foreground">Сравнение периодов</h3>
                            {!compareEnabled && (
                                <Button variant="ghost" size="sm" onClick={() => setCompareEnabled(true)}>
                                    Включить
                                </Button>
                            )}
                        </div>
                        {compareEnabled ? (
                            <div className="space-y-3">
                                {comparisonData.slice(0, 8).map((cat) => (
                                    <div key={cat.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <CategoryIcon icon={cat.icon} color={cat.color} size={18} className="w-9 h-9" />
                                            <div>
                                                <p className="font-medium text-foreground">{cat.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    было: {formatMoney(cat.prev, settings?.defaultCurrency)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-foreground">
                                                {formatMoney(cat.current, settings?.defaultCurrency)}
                                            </p>
                                            <p className={`text-sm font-medium ${cat.change > 0 ? 'text-red-600 dark:text-red-400' : cat.change < 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                                {cat.change > 0 ? '+' : ''}{cat.change.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {comparisonData.length === 0 && (
                                    <p className="text-center text-muted-foreground py-6">Нет данных для сравнения</p>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>Включите сравнение для анализа изменений</p>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Heatmap */}
                <Card className="p-6 bg-card border-border mt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Расходы по дням недели</h3>
                    <div className="flex items-center justify-center gap-3">
                        {heatmapData.map((day) => (
                            <div key={day.day} className="text-center">
                                <div
                                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-2"
                                    style={{
                                        backgroundColor: `rgba(239, 68, 68, ${0.1 + day.intensity * 0.7})`,
                                    }}
                                >
                                    <span className="text-sm font-medium" style={{ color: day.intensity > 0.5 ? 'white' : '#64748b' }}>
                                        {day.count}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">{day.day}</p>
                                <p className="text-xs font-medium text-foreground">
                                    {formatMoney(day.total, settings?.defaultCurrency)}
                                </p>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
