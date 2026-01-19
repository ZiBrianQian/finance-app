import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MoneyInput from '@/components/finance/MoneyInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Target, MoreHorizontal, Pencil, Trash2, ArrowUpRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useGoals, useAccounts, useAppSettings, convertCurrency } from '@/components/finance/useFinanceData';
import { formatMoney, parseMoney } from '@/components/finance/constants';
import GoalCard from '@/components/finance/GoalCard';
import GoalForm from '@/components/finance/GoalForm';

export default function Goals() {
    const { goals, createGoal, updateGoal, deleteGoal } = useGoals();
    const { accounts } = useAccounts();
    const { settings } = useAppSettings();

    const [formOpen, setFormOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [addFundsOpen, setAddFundsOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState(null);
    const [addAmount, setAddAmount] = useState('');
    const [deleteId, setDeleteId] = useState(null);

    const activeGoals = useMemo(() => goals.filter(g => !g.isCompleted), [goals]);
    const completedGoals = useMemo(() => goals.filter(g => g.isCompleted), [goals]);

    const handleCreateGoal = async (data) => {
        if (editingGoal) {
            await updateGoal.mutateAsync({ id: editingGoal.id, data });
            toast.success('Цель обновлена');
        } else {
            await createGoal.mutateAsync(data);
            toast.success('Цель создана');
        }
        setEditingGoal(null);
    };

    const handleEdit = (goal) => {
        setEditingGoal(goal);
        setFormOpen(true);
    };

    const handleDelete = (id) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await deleteGoal.mutateAsync(deleteId);
            toast.success('Цель удалена');
            setDeleteId(null);
        }
    };

    const handleMarkComplete = async (goal) => {
        await updateGoal.mutateAsync({
            id: goal.id,
            data: { isCompleted: !goal.isCompleted }
        });
        toast.success(goal.isCompleted ? 'Цель возобновлена' : 'Цель достигнута! 🎉');
    };

    const handleAddFunds = async () => {
        if (!selectedGoal || !addAmount) return;

        const amount = parseMoney(addAmount);
        const newAmount = selectedGoal.currentAmount + amount;
        const isNowComplete = newAmount >= selectedGoal.targetAmount;

        await updateGoal.mutateAsync({
            id: selectedGoal.id,
            data: {
                currentAmount: newAmount,
                isCompleted: isNowComplete
            }
        });

        setAddFundsOpen(false);
        setAddAmount('');
        setSelectedGoal(null);

        if (isNowComplete) {
            toast.success('Цель достигнута! 🎉');
        } else {
            toast.success('Сумма добавлена');
        }
    };

    const openAddFunds = (goal) => {
        setSelectedGoal(goal);
        setAddAmount('');
        setAddFundsOpen(true);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">Цели</h1>
                        <p className="text-muted-foreground mt-1">Отслеживайте прогресс накоплений</p>
                    </div>
                    <Button onClick={() => { setEditingGoal(null); setFormOpen(true); }} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-500/20">
                        <Plus className="w-4 h-4 mr-2" />
                        Новая цель
                    </Button>
                </div>

                {activeGoals.length > 0 ? (
                    <>
                        {/* Active goals */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {activeGoals.map(goal => (
                                <div key={goal.id} className="relative group">
                                    <GoalCard goal={goal} onClick={() => openAddFunds(goal)} />
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="secondary" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openAddFunds(goal)}>
                                                    <ArrowUpRight className="w-4 h-4 mr-2" /> Добавить средства
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleEdit(goal)}>
                                                    <Pencil className="w-4 h-4 mr-2" /> Редактировать
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleMarkComplete(goal)}>
                                                    <CheckCircle className="w-4 h-4 mr-2" /> Отметить достигнутой
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(goal.id)} className="text-red-600 dark:text-red-400">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Удалить
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Completed goals */}
                        {completedGoals.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-foreground mb-4">Достигнутые цели</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {completedGoals.map(goal => (
                                        <div key={goal.id} className="relative group opacity-75 hover:opacity-100 transition-opacity">
                                            <GoalCard goal={goal} onClick={() => handleEdit(goal)} />
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="secondary" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleMarkComplete(goal)}>
                                                            <Target className="w-4 h-4 mr-2" /> Возобновить
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDelete(goal.id)} className="text-red-600 dark:text-red-400">
                                                            <Trash2 className="w-4 h-4 mr-2" /> Удалить
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <Card className="p-12 bg-card border-border text-center">
                        <div className="max-w-sm mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
                                <Target className="w-8 h-8 text-amber-500" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">Нет целей</h3>
                            <p className="text-muted-foreground mb-6">
                                Создайте финансовую цель, чтобы отслеживать прогресс накоплений
                            </p>
                            <Button onClick={() => setFormOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-500/20">
                                <Plus className="w-4 h-4 mr-2" />
                                Создать цель
                            </Button>
                        </div>
                    </Card>
                )}
            </div>

            <GoalForm
                open={formOpen}
                onOpenChange={(open) => {
                    setFormOpen(open);
                    if (!open) setEditingGoal(null);
                }}
                accounts={accounts}
                onSubmit={handleCreateGoal}
                initialData={editingGoal}
                defaultCurrency={settings?.defaultCurrency || 'USD'}
            />

            {/* Add funds dialog */}
            <Dialog open={addFundsOpen} onOpenChange={setAddFundsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Добавить средства</DialogTitle>
                    </DialogHeader>
                    {selectedGoal && (
                        <div className="space-y-4 mt-4">
                            <div className="p-4 bg-muted/50 rounded-xl">
                                <p className="text-sm text-muted-foreground">Цель</p>
                                <p className="font-semibold text-foreground">{selectedGoal.name}</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Текущий прогресс: {formatMoney(selectedGoal.currentAmount, selectedGoal.currency)} / {formatMoney(selectedGoal.targetAmount, selectedGoal.currency)}
                                </p>
                            </div>
                            <div>
                                <label className="text-sm text-muted-foreground">Сумма для добавления</label>
                                <MoneyInput
                                    value={addAmount}
                                    onChange={setAddAmount}
                                    placeholder="0.00"
                                    className="mt-2"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setAddFundsOpen(false)}>
                                    Отмена
                                </Button>
                                <Button className="flex-1" onClick={handleAddFunds} disabled={!addAmount}>
                                    Добавить
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить цель?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите удалить эту финансовую цель? Данное действие нельзя отменить.
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
