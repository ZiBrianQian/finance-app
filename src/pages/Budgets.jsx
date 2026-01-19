import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, addMonths, subMonths, differenceInDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useCategories, useTransactions, useBudgets, useAppSettings, filterTransactionsByPeriod, convertCurrency, useLiveRates } from '@/components/finance/useFinanceData';
import { formatMoney } from '@/components/finance/constants';
import BudgetCard from '@/components/finance/BudgetCard';
import BudgetForm from '@/components/finance/BudgetForm';

export default function Budgets() {
    const { categories } = useCategories();
    const { transactions } = useTransactions();
    const { budgets, createBudget, updateBudget, deleteBudget } = useBudgets();
    const { settings } = useAppSettings();
    const { rates } = useLiveRates(settings?.defaultCurrency || 'USD');

    const [formOpen, setFormOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);
    const [viewDate, setViewDate] = useState(new Date());

    const getPeriodRange = (budget) => {
        switch (budget.period) {
            case 'weekly':
                return { start: startOfWeek(viewDate, { weekStartsOn: 1 }), end: endOfWeek(viewDate, { weekStartsOn: 1 }) };
            case 'monthly':
                return { start: startOfMonth(viewDate), end: endOfMonth(viewDate) };
            case 'yearly':
                return { start: startOfYear(viewDate), end: endOfYear(viewDate) };
            default:
                return { start: startOfMonth(viewDate), end: endOfMonth(viewDate) };
        }
    };

    const budgetStats = useMemo(() => {
        return budgets.filter(b => b.isActive).map(budget => {
            const { start, end } = getPeriodRange(budget);
            const periodTxs = filterTransactionsByPeriod(transactions, start, end);
            const totalDays = differenceInDays(end, start) + 1;
            const daysLeft = Math.max(0, differenceInDays(end, new Date()));

            const rulesWithStats = (budget.rules || []).map(rule => {
                const spent = periodTxs
                    .filter(t => t.type === 'expense' && t.categoryId === rule.categoryId)
                    .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency || 'USD', settings?.defaultCurrency || 'USD', rates), 0);

                // Assuming limitAmount is in default currency if budget currency not specified
                // Or if budget has currency, we should respect it. For now assume default.
                return { ...rule, spent };
            });

            const totalLimit = rulesWithStats.reduce((sum, r) => sum + (r.limitAmount || 0), 0);
            const totalSpent = rulesWithStats.reduce((sum, r) => sum + r.spent, 0);

            return {
                budget,
                rules: rulesWithStats,
                totalLimit,
                totalSpent,
                totalDays,
                daysLeft,
                start,
                end
            };
        });
    }, [budgets, transactions, viewDate, settings?.defaultCurrency, rates]);

    const handleCreateBudget = async (data) => {
        if (editingBudget) {
            await updateBudget.mutateAsync({ id: editingBudget.id, data });
            toast.success('Бюджет обновлён');
        } else {
            await createBudget.mutateAsync(data);
            toast.success('Бюджет создан');
        }
        setEditingBudget(null);
    };

    const handleEdit = (budget) => {
        setEditingBudget(budget);
        setFormOpen(true);
    };

    const handleDelete = async (id) => {
        await deleteBudget.mutateAsync(id);
        toast.success('Бюджет удалён');
    };

    const navigatePeriod = (direction) => {
        setViewDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    };

    const getCategory = (id) => categories.find(c => c.id === id);

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">Бюджеты</h1>
                        <p className="text-muted-foreground mt-1">Планируйте и контролируйте расходы</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigatePeriod('prev')}>
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <span className="text-sm font-medium px-2 text-foreground">
                                {format(viewDate, 'LLLL yyyy', { locale: ru })}
                            </span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigatePeriod('next')}>
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button onClick={() => { setEditingBudget(null); setFormOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20">
                            <Plus className="w-4 h-4 mr-2" />
                            Новый бюджет
                        </Button>
                    </div>
                </div>

                {budgetStats.length > 0 ? (
                    <div className="space-y-6">
                        {budgetStats.map(({ budget, rules, totalLimit, totalSpent, totalDays, daysLeft, start, end }) => (
                            <Card key={budget.id} className="p-6 bg-card border-border">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-foreground">{budget.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {format(start, 'd MMM', { locale: ru })} — {format(end, 'd MMM yyyy', { locale: ru })}
                                            {daysLeft > 0 && ` • Осталось ${daysLeft} дн.`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="text-sm text-muted-foreground">Всего</p>
                                            <p className="text-lg font-semibold text-foreground">
                                                {formatMoney(totalSpent, settings?.defaultCurrency)} / {formatMoney(totalLimit, settings?.defaultCurrency)}
                                            </p>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(budget)}>
                                                    <Pencil className="w-4 h-4 mr-2" /> Редактировать
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(budget.id)} className="text-red-600 dark:text-red-400">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Удалить
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {rules.map(rule => (
                                        <BudgetCard
                                            key={rule.id}
                                            rule={rule}
                                            category={getCategory(rule.categoryId)}
                                            spent={rule.spent}
                                            currency={settings?.defaultCurrency || 'USD'}
                                            daysLeft={daysLeft}
                                            totalDays={totalDays}
                                        />
                                    ))}
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="p-12 bg-card border-border text-center">
                        <div className="max-w-sm mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                                <Plus className="w-8 h-8 text-blue-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Нет бюджетов</h3>
                            <p className="text-muted-foreground mb-6">
                                Создайте бюджет, чтобы контролировать расходы по категориям
                            </p>
                            <Button onClick={() => setFormOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20">
                                <Plus className="w-4 h-4 mr-2" />
                                Создать бюджет
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            <BudgetForm
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditingBudget(null);
                }}
                categories={categories}
                onSubmit={handleCreateBudget}
                initialData={editingBudget}
            />
        </div>
    );
}
