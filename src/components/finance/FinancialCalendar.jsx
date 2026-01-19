import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransactions, useRecurringRules, useAppSettings, useLiveRates, convertCurrency, useCategories, useAccounts } from './useFinanceData';
import TransactionForm from './TransactionForm';
import BatchTransactionForm from './BatchTransactionForm';
import {
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
    isToday, parseISO
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Clock, Calendar as CalendarIcon, Plus, TableProperties } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function FinancialCalendar() {
    const { settings } = useAppSettings();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [txFormOpen, setTxFormOpen] = useState(false);
    const [txFormType, setTxFormType] = useState('expense');
    const [batchFormOpen, setBatchFormOpen] = useState(false);

    const { transactions, createTransaction } = useTransactions();
    const { rules } = useRecurringRules();
    const { rates } = useLiveRates(settings?.defaultCurrency);
    const { categories } = useCategories();
    const { accounts } = useAccounts();

    const getCategory = (id) => categories.find(c => c.id === id);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const today = () => {
        const now = new Date();
        setCurrentMonth(now);
        setSelectedDate(now);
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getDayData = (date) => {
        const dayTransactions = transactions.filter(t => isSameDay(parseISO(t.date), date));

        const income = dayTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency || settings?.defaultCurrency || 'USD', settings?.defaultCurrency || 'USD', rates), 0);

        const expense = dayTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency || settings?.defaultCurrency || 'USD', settings?.defaultCurrency || 'USD', rates), 0);

        const projected = rules.filter(rule => {
            if (!rule.isActive) return false;
            if (rule.frequency === 'monthly') {
                const ruleDate = parseISO(rule.nextRunDate);
                return ruleDate.getDate() === date.getDate() && date >= new Date();
            }
            return false;
        });

        return { dayTransactions, income, expense, projected };
    };

    const selectedDayData = getDayData(selectedDate);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">
            <Card className="flex-1 flex flex-col h-full border-none shadow-none bg-transparent">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold capitalize">
                            {format(currentMonth, 'LLLL yyyy', { locale: ru })}
                        </h2>
                        <p className="text-muted-foreground">Обзор ваших финансов по дням</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={prevMonth}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" onClick={today}>Сегодня</Button>
                        <Button variant="outline" size="icon" onClick={nextMonth}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-2 text-center text-sm font-medium text-muted-foreground">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                        <div key={day} className="py-2">{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1 lg:gap-2 flex-1 auto-rows-fr">
                    {calendarDays.map((day) => {
                        const { income, expense, projected } = getDayData(day);
                        const isSelected = isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isTodayDate = isToday(day);

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    relative p-2 rounded-xl cursor-pointer transition-all border
                                    flex flex-col justify-between min-h-[80px]
                                    ${!isCurrentMonth ? 'opacity-30 bg-muted/20 border-transparent' : 'bg-card border-border'}
                                    ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/5' : 'hover:border-primary/50'}
                                    ${isTodayDate ? 'bg-accent/50' : ''}
                                `}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`
                                        text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                                        ${isTodayDate ? 'bg-primary text-primary-foreground' : 'text-foreground'}
                                    `}>
                                        {format(day, 'd')}
                                    </span>
                                    {projected.length > 0 && (
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Запланированные платежи" />
                                    )}
                                </div>

                                <div className="space-y-1 mt-2">
                                    {income > 0 && (
                                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-500/10 px-1 py-0.5 rounded-full w-fit">
                                            <TrendingUp className="w-3 h-3" />
                                            <span className="hidden xl:inline">{formatCurrency(income, settings?.defaultCurrency)}</span>
                                        </div>
                                    )}
                                    {expense > 0 && (
                                        <div className="flex items-center gap-1 text-[10px] text-red-600 bg-red-500/10 px-1 py-0.5 rounded-full w-fit">
                                            <TrendingDown className="w-3 h-3" />
                                            <span className="hidden xl:inline">{formatCurrency(expense, settings?.defaultCurrency)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Card className="w-full lg:w-96 flex flex-col h-full overflow-hidden border-l border-border bg-card/50 backdrop-blur-sm">
                <CardHeader className="border-b bg-card">
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CalendarIcon className="w-5 h-5 text-primary" />
                            {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setBatchFormOpen(true)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            title="Добавить несколько"
                        >
                            <TableProperties className="w-5 h-5" />
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 relative group">
                            <div className="flex justify-between items-start">
                                <p className="text-xs text-muted-foreground mb-1">Доходы</p>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 -mt-1 -mr-1"
                                    onClick={() => { setTxFormType('income'); setTxFormOpen(true); }}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-lg font-bold text-emerald-600">
                                +{formatCurrency(selectedDayData.income, settings?.defaultCurrency)}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 relative group">
                            <div className="flex justify-between items-start">
                                <p className="text-xs text-muted-foreground mb-1">Расходы</p>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/20 hover:bg-red-500/30 text-red-700 -mt-1 -mr-1"
                                    onClick={() => { setTxFormType('expense'); setTxFormOpen(true); }}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <p className="text-lg font-bold text-red-600">
                                -{formatCurrency(selectedDayData.expense, settings?.defaultCurrency)}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Операции
                        </h3>
                        {selectedDayData.dayTransactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic text-center py-4 bg-muted/30 rounded-lg">
                                Нет операций за этот день
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {selectedDayData.dayTransactions.map(tx => {
                                    const cat = getCategory(tx.categoryId);
                                    return (
                                        <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/50 hover:bg-accent/50 transition-colors">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-medium text-sm">{cat?.name || tx.merchant || 'Без категории'}</span>
                                                {tx.notes && <span className="text-xs text-muted-foreground">{tx.notes}</span>}
                                            </div>
                                            <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {selectedDayData.projected.length > 0 && (
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                Планируемые
                            </h3>
                            <div className="space-y-2">
                                {selectedDayData.projected.map(rule => (
                                    <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium text-sm text-blue-700 dark:text-blue-300">{rule.title}</span>
                                            <Badge variant="secondary" className="w-fit text-[10px] h-5">Рекуррентный</Badge>
                                        </div>
                                        <span className="font-bold text-sm text-blue-600 dark:text-blue-400">
                                            ~{formatCurrency(rule.amount, rule.currency)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
            <TransactionForm
                open={txFormOpen}
                onOpenChange={setTxFormOpen}
                accounts={accounts}
                categories={categories}
                onSubmit={async (data) => {
                    await createTransaction.mutateAsync(data);
                    setTxFormOpen(false);
                }}
                defaultCurrency={settings?.defaultCurrency}
                initialData={{
                    type: txFormType,
                    date: format(selectedDate, 'yyyy-MM-dd')
                }}
            />

            <BatchTransactionForm
                open={batchFormOpen}
                onOpenChange={setBatchFormOpen}
                accounts={accounts}
                categories={categories}
                onSubmit={(data) => createTransaction.mutateAsync(data)}
                defaultCurrency={settings?.defaultCurrency}
                initialDate={format(selectedDate, 'yyyy-MM-dd')}
            />
        </div >
    );
}
