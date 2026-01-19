import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useRecurringRules, useCategories, useAccounts, useAppSettings } from '@/components/finance/useFinanceData';
import RecurringRuleForm from '@/components/finance/RecurringRuleForm';
import RecurringRuleCard from '@/components/finance/RecurringRuleCard';

export default function Recurring() {
    const { rules, createRule, updateRule, deleteRule } = useRecurringRules();
    const { categories } = useCategories();
    const { accounts } = useAccounts();
    const { settings } = useAppSettings();

    const [formOpen, setFormOpen] = useState(false);
    const [editingRule, setEditingRule] = useState(null);
    const [deleteId, setDeleteId] = useState(null);

    const handleSubmit = async (data) => {
        if (editingRule) {
            await updateRule.mutateAsync({ id: editingRule.id, data });
            toast.success('Правило обновлено');
        } else {
            await createRule.mutateAsync(data);
            toast.success('Правило создано');
        }
        setEditingRule(null);
    };

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setFormOpen(true);
    };

    const handleDelete = (id) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await deleteRule.mutateAsync(deleteId);
            toast.success('Правило удалено');
            setDeleteId(null);
        }
    };

    const handleToggle = async (rule) => {
        await updateRule.mutateAsync({
            id: rule.id,
            data: { isActive: !rule.isActive }
        });
        toast.success(rule.isActive ? 'Правило приостановлено' : 'Правило активировано');
    };

    const getCategory = (id) => categories.find(c => c.id === id);
    const getAccount = (id) => accounts.find(a => a.id === id);

    const activeRules = rules.filter(r => r.isActive);
    const pausedRules = rules.filter(r => !r.isActive);

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-500">Рекуррентные платежи</h1>
                        <p className="text-muted-foreground mt-1">Автоматические повторяющиеся операции</p>
                    </div>
                    <Button onClick={() => { setEditingRule(null); setFormOpen(true); }} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Новое правило
                    </Button>
                </div>

                {activeRules.length > 0 || pausedRules.length > 0 ? (
                    <div className="space-y-8">
                        {/* Active rules */}
                        {activeRules.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-foreground mb-4">
                                    Активные ({activeRules.length})
                                </h2>
                                <div className="space-y-3">
                                    {activeRules.map(rule => (
                                        <RecurringRuleCard
                                            key={rule.id}
                                            rule={rule}
                                            category={getCategory(rule.categoryId)}
                                            account={getAccount(rule.accountId)}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onToggle={handleToggle}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Paused rules */}
                        {pausedRules.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-foreground mb-4">
                                    Приостановленные ({pausedRules.length})
                                </h2>
                                <div className="space-y-3">
                                    {pausedRules.map(rule => (
                                        <RecurringRuleCard
                                            key={rule.id}
                                            rule={rule}
                                            category={getCategory(rule.categoryId)}
                                            account={getAccount(rule.accountId)}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                            onToggle={handleToggle}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <Card className="p-12 bg-card border-border text-center">
                        <div className="max-w-sm mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                                <Repeat className="w-8 h-8 text-purple-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Нет рекуррентных правил</h3>
                            <p className="text-muted-foreground mb-6">
                                Создайте автоматические правила для повторяющихся доходов и расходов
                            </p>
                            <Button onClick={() => setFormOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-500/20">
                                <Plus className="w-4 h-4 mr-2" />
                                Создать правило
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            <RecurringRuleForm
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditingRule(null);
                }}
                categories={categories}
                accounts={accounts}
                onSubmit={handleSubmit}
                initialData={editingRule}
                defaultCurrency={settings?.defaultCurrency || 'USD'}
            />

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить правило?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Это действие нельзя отменить. Правило будет удалено безвозвратно.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Удалить</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
