import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MoneyInput from './MoneyInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CURRENCIES, COLORS, parseMoney } from './constants';

export default function GoalForm({
    open,
    onOpenChange,
    accounts,
    onSubmit,
    initialData = null,
    defaultCurrency = 'USD'
}) {
    const [name, setName] = useState(initialData?.name || '');
    const [targetAmount, setTargetAmount] = useState(initialData ? (initialData.targetAmount / 100).toFixed(2) : '');
    const [currentAmount, setCurrentAmount] = useState(initialData ? (initialData.currentAmount / 100).toFixed(2) : '0');
    const [currency, setCurrency] = useState(initialData?.currency || defaultCurrency);
    const [deadlineDate, setDeadlineDate] = useState(initialData?.deadlineDate ? new Date(initialData.deadlineDate) : null);
    const [linkedAccountIds, setLinkedAccountIds] = useState(initialData?.linkedAccountIds || []);
    const [priority, setPriority] = useState(initialData?.priority || 3);
    const [color, setColor] = useState(initialData?.color || COLORS[4]);
    const [dateOpen, setDateOpen] = useState(false);

    useEffect(() => {
        if (open && !initialData) {
            setName('');
            setTargetAmount('');
            setCurrentAmount('0');
            setCurrency(defaultCurrency);
            setDeadlineDate(null);
            setLinkedAccountIds([]);
            setPriority(3);
            setColor(COLORS[4]);
        }
    }, [open, initialData, defaultCurrency]);

    const handleSubmit = () => {
        const data = {
            name,
            targetAmount: parseMoney(targetAmount),
            currentAmount: parseMoney(currentAmount),
            currency,
            deadlineDate: deadlineDate ? format(deadlineDate, 'yyyy-MM-dd') : null,
            linkedAccountIds,
            priority,
            color,
            isCompleted: false
        };
        onSubmit(data);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Редактировать цель' : 'Новая цель'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div>
                        <Label className="text-sm text-slate-500">Название</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Например: Новый ноутбук"
                            className="mt-2"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-sm text-slate-500">Целевая сумма</Label>
                            <MoneyInput
                                value={targetAmount}
                                onChange={setTargetAmount}
                                placeholder="0.00"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label className="text-sm text-slate-500">Валюта</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURRENCIES.map(c => (
                                        <SelectItem key={c.code} value={c.code}>
                                            {c.symbol} {c.code}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm text-slate-500">Уже накоплено</Label>
                        <MoneyInput
                            value={currentAmount}
                            onChange={setCurrentAmount}
                            placeholder="0.00"
                            className="mt-2"
                        />
                    </div>

                    <div>
                        <Label className="text-sm text-slate-500">Дедлайн (опционально)</Label>
                        <Popover open={dateOpen} onOpenChange={setDateOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full mt-2 justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {deadlineDate ? format(deadlineDate, 'd MMMM yyyy', { locale: ru }) : 'Выберите дату'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={deadlineDate}
                                    onSelect={(d) => { setDeadlineDate(d); setDateOpen(false); }}
                                    locale={ru}
                                    disabled={(date) => date < new Date()}
                                />
                            </PopoverContent>
                        </Popover>
                        {deadlineDate && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1 text-slate-500"
                                onClick={() => setDeadlineDate(null)}
                            >
                                Убрать дедлайн
                            </Button>
                        )}
                    </div>

                    <div>
                        <Label className="text-sm text-slate-500">Привязать счета (опционально)</Label>
                        <div className="mt-2 space-y-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                            {accounts.map(account => (
                                <label key={account.id} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={linkedAccountIds.includes(account.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setLinkedAccountIds([...linkedAccountIds, account.id]);
                                            } else {
                                                setLinkedAccountIds(linkedAccountIds.filter(id => id !== account.id));
                                            }
                                        }}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{account.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm text-slate-500">Приоритет</Label>
                        <div className="flex gap-2 mt-2">
                            {[1, 2, 3, 4, 5].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setPriority(p)}
                                    className={`w-10 h-10 rounded-lg border-2 transition-all ${priority === p
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">1 - низкий, 5 - высокий</p>
                    </div>

                    <div>
                        <Label className="text-sm text-slate-500">Цвет</Label>
                        <div className="flex gap-2 mt-2 flex-wrap">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                                        }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                            Отмена
                        </Button>
                        <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim() || !targetAmount}>
                            {initialData ? 'Сохранить' : 'Создать'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
