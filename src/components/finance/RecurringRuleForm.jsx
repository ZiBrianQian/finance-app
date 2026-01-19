import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MoneyInput from './MoneyInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, addDays, addWeeks, addMonths, addYears } from 'date-fns';
import { ru } from 'date-fns/locale';
import { parseMoney, CURRENCIES } from './constants';
import CategoryIcon from './CategoryIcon';

export default function RecurringRuleForm({
    open,
    onOpenChange,
    categories,
    accounts,
    onSubmit,
    initialData = null,
    defaultCurrency = 'USD'
}) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [type, setType] = useState(initialData?.type || 'expense');
    const [amount, setAmount] = useState(initialData ? (initialData.amount / 100).toFixed(2) : '');
    const [currency, setCurrency] = useState(initialData?.currency || defaultCurrency);
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
    const [accountId, setAccountId] = useState(initialData?.accountId || accounts[0]?.id || '');
    const [frequency, setFrequency] = useState(initialData?.frequency || 'monthly');
    const [interval, setInterval] = useState(initialData?.interval || 1);
    const [startDate, setStartDate] = useState(initialData?.startDate ? new Date(initialData.startDate) : new Date());
    const [endDate, setEndDate] = useState(initialData?.endDate ? new Date(initialData.endDate) : null);
    const [description, setDescription] = useState(initialData?.description || '');
    const [startDateOpen, setStartDateOpen] = useState(false);
    const [endDateOpen, setEndDateOpen] = useState(false);

    useEffect(() => {
        if (open && !initialData) {
            setTitle('');
            setType('expense');
            setAmount('');
            setCategoryId('');
            setAccountId(accounts[0]?.id || '');
            setFrequency('monthly');
            setInterval(1);
            setStartDate(new Date());
            setEndDate(null);
            setDescription('');
        }
    }, [open, initialData, accounts]);

    const filteredCategories = categories.filter(c => c.type === type && !c.isArchived);

    const calculateNextRunDate = () => {
        const start = startDate;
        switch (frequency) {
            case 'daily':
                return addDays(start, interval);
            case 'weekly':
                return addWeeks(start, interval);
            case 'monthly':
                return addMonths(start, interval);
            case 'yearly':
                return addYears(start, interval);
            default:
                return start;
        }
    };

    const handleSubmit = () => {
        const data = {
            title,
            type,
            amount: parseMoney(amount),
            currency,
            categoryId,
            accountId,
            frequency,
            interval: parseInt(interval) || 1,
            startDate: format(startDate, 'yyyy-MM-dd'),
            endDate: endDate ? format(endDate, 'yyyy-MM-dd') : null,
            nextRunDate: initialData?.nextRunDate || format(calculateNextRunDate(), 'yyyy-MM-dd'),
            description,
            isActive: true
        };
        onSubmit(data);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Редактировать правило' : 'Новое рекуррентное правило'}</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div>
                        <Label className="text-sm text-slate-500">Название</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Например: Аренда квартиры"
                            className="mt-2"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-sm text-slate-500">Тип</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="expense">Расход</SelectItem>
                                    <SelectItem value="income">Доход</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-sm text-slate-500">Категория</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue placeholder="Выберите" />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredCategories.map(c => (
                                        <SelectItem key={c.id} value={c.id}>
                                            <div className="flex items-center gap-2">
                                                <CategoryIcon icon={c.icon} color={c.color} size={16} className="w-6 h-6" />
                                                {c.name}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <Label className="text-sm text-slate-500">Сумма</Label>
                            <MoneyInput
                                value={amount}
                                onChange={setAmount}
                                placeholder="0.00"
                                className="mt-2 text-lg font-medium"
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
                                        <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm text-slate-500">Счёт</Label>
                        <Select value={accountId} onValueChange={setAccountId}>
                            <SelectTrigger className="mt-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {accounts.map(a => (
                                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-sm text-slate-500">Частота</Label>
                            <Select value={frequency} onValueChange={setFrequency}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Ежедневно</SelectItem>
                                    <SelectItem value="weekly">Еженедельно</SelectItem>
                                    <SelectItem value="monthly">Ежемесячно</SelectItem>
                                    <SelectItem value="yearly">Ежегодно</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-sm text-slate-500">Интервал</Label>
                            <Input
                                type="number"
                                min="1"
                                value={interval}
                                onChange={(e) => setInterval(e.target.value)}
                                className="mt-2"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-sm text-slate-500">Начало</Label>
                            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full mt-2 justify-start">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {format(startDate, 'd MMM yyyy', { locale: ru })}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={(d) => { setStartDate(d || new Date()); setStartDateOpen(false); }}
                                        locale={ru}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label className="text-sm text-slate-500">Окончание</Label>
                            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full mt-2 justify-start">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, 'd MMM yyyy', { locale: ru }) : 'Без окончания'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={(d) => { setEndDate(d); setEndDateOpen(false); }}
                                        locale={ru}
                                    />
                                </PopoverContent>
                            </Popover>
                            {endDate && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-1 text-xs text-slate-500"
                                    onClick={() => setEndDate(null)}
                                >
                                    Убрать окончание
                                </Button>
                            )}
                        </div>
                    </div>

                    <div>
                        <Label className="text-sm text-slate-500">Описание</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Дополнительная информация..."
                            className="mt-2 h-20"
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                            Отмена
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSubmit}
                            disabled={!title.trim() || !amount || !categoryId}
                        >
                            {initialData ? 'Сохранить' : 'Создать'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
