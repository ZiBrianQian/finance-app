import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRecurringRules, useAppSettings, useCategories, useAccounts } from './useFinanceData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, CreditCard, CalendarDays, ExternalLink, Zap, Edit2, Trash2 } from 'lucide-react';
import RecurringRuleForm from './RecurringRuleForm';
import { Progress } from '@/components/ui/progress';

export default function SubscriptionManager() {
    const { rules, createRule, updateRule, deleteRule } = useRecurringRules();
    const { settings } = useAppSettings();
    const { categories } = useCategories();
    const { accounts } = useAccounts();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    const subscriptions = rules.filter(r => r.type === 'expense');

    const totalMonthly = subscriptions.reduce((sum, sub) => {
        let amount = sub.amount;
        if (sub.frequency === 'weekly') amount *= 4;
        if (sub.frequency === 'daily') amount *= 30;
        if (sub.frequency === 'yearly') amount /= 12;
        return sum + amount;
    }, 0);

    const totalYearly = totalMonthly * 12;

    const upcoming = [...subscriptions].sort((a, b) => {
        return new Date(a.nextRunDate) - new Date(b.nextRunDate);
    }).slice(0, 3);

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setIsFormOpen(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Вы уверены, что хотите удалить эту подписку?')) {
            await deleteRule.mutateAsync(id);
        }
    };

    const handleFormSubmit = async (data) => {
        if (editingRule) {
            await updateRule.mutateAsync({ id: editingRule.id, data });
        } else {
            await createRule.mutateAsync(data);
        }
        setIsFormOpen(false);
        setEditingRule(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-600">
                        Подписки
                    </h1>
                    <p className="text-muted-foreground mt-1">Управление регулярными платежами и сервисами</p>
                </div>
                <Button
                    onClick={() => { setEditingRule(null); setIsFormOpen(true); }}
                    className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                >
                    <Plus className="w-4 h-4 mr-2" /> Добавить подписку
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-xl text-purple-600">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">В месяц</p>
                                <h3 className="text-2xl font-bold">{formatCurrency(totalMonthly, settings?.defaultCurrency)}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-pink-500/10 to-transparent border-pink-500/20">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-pink-500/20 rounded-xl text-pink-600">
                                <CalendarDays className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">В год</p>
                                <h3 className="text-2xl font-bold">{formatCurrency(totalYearly, settings?.defaultCurrency)}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-600">
                                <Zap className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Активных подписок</p>
                                <h3 className="text-2xl font-bold">{subscriptions.length}</h3>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold">Ближайшие списания</h3>
                    {upcoming.length === 0 ? (
                        <Card>
                            <CardContent className="p-6 text-center text-muted-foreground">
                                Нет запланированных списаний
                            </CardContent>
                        </Card>
                    ) : (
                        upcoming.map(sub => (
                            <Card key={sub.id} className="border-l-4 border-l-purple-500">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{sub.title}</p>
                                        <p className="text-sm text-muted-foreground">{formatDate(sub.nextRunDate)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{formatCurrency(sub.amount, sub.currency)}</p>
                                        <span className="text-[10px] text-muted-foreground uppercase">{sub.frequency}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-lg font-semibold">Все подписки</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {subscriptions.length === 0 ? (
                            <div className="col-span-2 text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                <p>Список подписок пуст</p>
                                <Button variant="link" onClick={() => setIsFormOpen(true)}>Добавить первую</Button>
                            </div>
                        ) : (
                            subscriptions.map(sub => (
                                <Card key={sub.id} className="group hover:shadow-lg transition-all duration-300">
                                    <CardContent className="p-6 relative overflow-hidden">
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleEdit(sub)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-500" onClick={() => handleDelete(sub.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>

                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                                                {sub.title.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="text-right">
                                                <span className="text-2xl font-bold block">
                                                    {formatCurrency(sub.amount, sub.currency)}
                                                </span>
                                                <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                                                    {sub.frequency === 'monthly' ? 'Ежемесячно' :
                                                        sub.frequency === 'yearly' ? 'Ежегодно' :
                                                            sub.frequency === 'weekly' ? 'Еженедельно' : sub.frequency}
                                                </span>
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-lg mb-1">{sub.title}</h4>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Следующая оплата: {formatDate(sub.nextRunDate)}
                                        </p>

                                        {sub.frequency === 'monthly' && (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                                    <span>Прогресс периода</span>
                                                    <span>Осталось {
                                                        Math.max(0, Math.ceil((new Date(sub.nextRunDate) - new Date()) / (1000 * 60 * 60 * 24)))
                                                    } дн.</span>
                                                </div>
                                                <Progress value={Math.random() * 100} className="h-1" />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <RecurringRuleForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                categories={categories}
                accounts={accounts}
                onSubmit={handleFormSubmit}
                initialData={editingRule}
                defaultCurrency={settings?.defaultCurrency || 'USD'}
            />
        </div>
    );
}
