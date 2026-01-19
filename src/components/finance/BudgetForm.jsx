import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MoneyInput from './MoneyInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import CategoryIcon from './CategoryIcon';
import { parseMoney } from './constants';

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function BudgetForm({
    open,
    onOpenChange,
    categories,
    onSubmit,
    initialData = null
}) {
    const [name, setName] = useState(initialData?.name || '');
    const [period, setPeriod] = useState(initialData?.period || 'monthly');
    const [rules, setRules] = useState(initialData?.rules || []);

    useEffect(() => {
        if (open && !initialData) {
            setName('');
            setPeriod('monthly');
            setRules([]);
        } else if (initialData) {
            setName(initialData.name);
            setPeriod(initialData.period);
            setRules(initialData.rules || []);
        }
    }, [open, initialData]);

    const expenseCategories = categories.filter(c => c.type === 'expense' && !c.isArchived);

    const addRule = () => {
        setRules([...rules, {
            id: generateId(),
            categoryId: '',
            limitAmount: 0,
            alertThreshold: 80,
            rollover: false
        }]);
    };

    const updateRule = (index, field, value) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [field]: value };
        setRules(newRules);
    };

    const removeRule = (index) => {
        setRules(rules.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        const data = {
            name,
            period,
            rules: rules.map(r => ({
                ...r,
                limitAmount: typeof r.limitAmount === 'string' ? parseMoney(r.limitAmount) : r.limitAmount
            })),
            isActive: true
        };
        onSubmit(data);
        onOpenChange(false);
    };

    const getCategory = (id) => categories.find(c => c.id === id);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Редактировать бюджет' : 'Новый бюджет'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div>
                        <Label className="text-sm text-muted-foreground">Название</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Например: Бюджет на месяц"
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label className="text-sm text-muted-foreground">Период</Label>
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="weekly">Еженедельно</SelectItem>
                                <SelectItem value="monthly">Ежемесячно</SelectItem>
                                <SelectItem value="yearly">Ежегодно</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <Label className="text-sm text-muted-foreground">Лимиты по категориям</Label>
                            <Button variant="outline" size="sm" onClick={addRule}>
                                <Plus className="w-4 h-4 mr-1" /> Добавить
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {rules.map((rule, index) => {
                                const category = getCategory(rule.categoryId);
                                return (
                                    <div key={rule.id} className="p-4 border border-border rounded-xl bg-muted/50">
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 space-y-3">
                                                <Select
                                                    value={rule.categoryId}
                                                    onValueChange={(v) => updateRule(index, 'categoryId', v)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Выберите категорию">
                                                            {category && (
                                                                <div className="flex items-center gap-2">
                                                                    <CategoryIcon icon={category.icon} color={category.color} size={16} className="w-6 h-6" />
                                                                    {category.name}
                                                                </div>
                                                            )}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {expenseCategories.map(c => (
                                                            <SelectItem key={c.id} value={c.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <CategoryIcon icon={c.icon} color={c.color} size={16} className="w-6 h-6" />
                                                                    {c.name}
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Лимит</Label>
                                                        <MoneyInput
                                                            value={typeof rule.limitAmount === 'number' ? (rule.limitAmount / 100).toFixed(2) : rule.limitAmount}
                                                            onChange={(v) => updateRule(index, 'limitAmount', v)}
                                                            placeholder="0.00"
                                                            className="mt-1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-xs text-muted-foreground">Алерт при %</Label>
                                                        <Input
                                                            type="number"
                                                            value={rule.alertThreshold}
                                                            onChange={(e) => updateRule(index, 'alertThreshold', parseInt(e.target.value) || 80)}
                                                            placeholder="80"
                                                            className="mt-1"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs text-muted-foreground">Переносить остаток</Label>
                                                    <Switch
                                                        checked={rule.rollover}
                                                        onCheckedChange={(v) => updateRule(index, 'rollover', v)}
                                                    />
                                                </div>
                                            </div>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 dark:text-red-400"
                                                onClick={() => removeRule(index)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}

                            {rules.length === 0 && (
                                <p className="text-center text-muted-foreground py-6 text-sm">
                                    Добавьте лимиты для категорий
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                            Отмена
                        </Button>
                        <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim() || rules.length === 0}>
                            {initialData ? 'Сохранить' : 'Создать'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
