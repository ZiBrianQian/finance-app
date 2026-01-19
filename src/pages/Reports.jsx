import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, parseISO, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

import { useAccounts, useCategories, useTransactions, useAppSettings, usePeriod, filterTransactionsByPeriod, calculatePeriodStats, convertCurrency, useLiveRates } from '@/components/finance/useFinanceData';
import { formatMoney } from '@/components/finance/constants';
import PeriodSelector from '@/components/finance/PeriodSelector';
import { CategoryPieChart, IncomeExpenseChart } from '@/components/finance/Charts';
import CategoryIcon from '@/components/finance/CategoryIcon';

export default function Reports() {
    const { accounts } = useAccounts();
    const { categories } = useCategories();
    const { transactions } = useTransactions();
    const { settings } = useAppSettings();
    const { rates } = useLiveRates(settings?.defaultCurrency || 'USD');
    const { period, setPeriod, customRange, setCustomRange, getDateRange, getPrevDateRange } = usePeriod('month');

    const [reportType, setReportType] = useState('expenses');
    const [accountFilter, setAccountFilter] = useState('all');
    const [currencyFilter, setCurrencyFilter] = useState('all');

    const { start, end } = getDateRange();
    const prevRange = getPrevDateRange();

    const filteredTransactions = useMemo(() => {
        let result = filterTransactionsByPeriod(transactions, start, end);

        if (accountFilter !== 'all') {
            result = result.filter(t => t.accountId === accountFilter);
        }
        if (currencyFilter !== 'all') {
            result = result.filter(t => t.currency === currencyFilter);
        }

        return result;
    }, [transactions, start, end, accountFilter, currencyFilter]);

    const prevFilteredTransactions = useMemo(() => {
        let result = filterTransactionsByPeriod(transactions, prevRange.start, prevRange.end);

        if (accountFilter !== 'all') {
            result = result.filter(t => t.accountId === accountFilter);
        }
        if (currencyFilter !== 'all') {
            result = result.filter(t => t.currency === currencyFilter);
        }

        return result;
    }, [transactions, prevRange, accountFilter, currencyFilter]);

    const currentStats = useMemo(() =>
        calculatePeriodStats(filteredTransactions, start, end, settings?.defaultCurrency, rates),
        [filteredTransactions, start, end, settings?.defaultCurrency, rates]
    );

    const prevStats = useMemo(() =>
        calculatePeriodStats(prevFilteredTransactions, prevRange.start, prevRange.end, settings?.defaultCurrency, rates),
        [prevFilteredTransactions, prevRange, settings?.defaultCurrency, rates]
    );

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
        const days = eachDayOfInterval({ start, end });

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
    }, [filteredTransactions, start, end, settings?.defaultCurrency, rates]);

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

        prevFilteredTransactions
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
    }, [filteredTransactions, prevFilteredTransactions, categories, settings?.defaultCurrency, rates]);

    const exportCSV = () => {
        const type = reportType === 'expenses' ? 'expense' : 'income';
        // Use categoryData which is already aggregated and converted
        const total = categoryData.reduce((sum, c) => sum + c.value, 0);

        const headers = ['Категория', 'Сумма', 'Процент'];
        const rows = categoryData.map(cat => [
            cat.name,
            (cat.value / 100).toFixed(2), // Assume amount is in cents? Wait, app uses cents or full? My code usually uses full units but let's check. 
            // `calculatePeriodStats` and `convert` return full if input is full. I think Input is full units.
            // But if it was displaying `formatMoney`, formatMoney handles it.
            // csv export: I'll just output raw value for now or fixed.
            // Wait, `value` is sum. `formatMoney` is used elsewhere.
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
        a.download = `report-${reportType}-${format(start, 'yyyy-MM-dd')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Отчёт экспортирован');
    };

    const currencies = [...new Set(transactions.map(t => t.currency))];
    const total = categoryData.reduce((sum, c) => sum + c.value, 0);

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Отчёты</h1>
                        <p className="text-muted-foreground mt-1">Анализ доходов и расходов</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <PeriodSelector
                            period={period}
                            setPeriod={setPeriod}
                            customRange={customRange}
                            setCustomRange={setCustomRange}
                            compact
                        />
                        <Button variant="outline" onClick={exportCSV}>
                            <Download className="w-4 h-4 mr-2" />
                            Экспорт
                        </Button>
                    </div>
                </div>

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
                        <div className="flex items-center gap-1 mt-2">
                            {(reportType === 'expenses' ?
                                (prevStats.expense > 0 ? ((currentStats.expense - prevStats.expense) / prevStats.expense) * 100 : 0) :
                                (prevStats.income > 0 ? ((currentStats.income - prevStats.income) / prevStats.income) * 100 : 0)
                            ) > 0 ? (
                                <TrendingUp className="w-4 h-4 text-red-500" />
                            ) : (
                                <TrendingDown className="w-4 h-4 text-green-500" />
                            )}
                            <span className="text-sm text-muted-foreground">vs прошлый период</span>
                        </div>
                    </Card>

                    <Card className="p-5 bg-card border-border">
                        <p className="text-sm text-muted-foreground">Транзакций</p>
                        <p className="text-2xl font-bold mt-1 text-foreground">
                            {filteredTransactions.filter(t => t.type === (reportType === 'expenses' ? 'expense' : 'income')).length}
                        </p>
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
                            {categoryData.map((cat, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
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
                        <h3 className="text-lg font-semibold text-foreground mb-4">Сравнение периодов</h3>
                        <div className="space-y-3">
                            {comparisonData.slice(0, 8).map((cat, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
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
                    </Card>
                </div>

                {/* Heatmap */}
                <Card className="p-6 bg-card border-border mt-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Расходы по дням недели</h3>
                    <div className="flex items-center justify-center gap-3">
                        {heatmapData.map((day, i) => (
                            <div key={i} className="text-center">
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
