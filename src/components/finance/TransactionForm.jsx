import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MoneyInput from './MoneyInput';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { parseMoney, formatMoney, CURRENCIES } from './constants';
import CategoryIcon from './CategoryIcon';
import { useLiveRates, convertCurrency } from '@/components/finance/useFinanceData';
import { Loader2, CalendarIcon } from 'lucide-react';

export default function TransactionForm({
    open,
    onOpenChange,
    accounts,
    categories,
    onSubmit,
    initialData = null,
    defaultCurrency = 'USD'
}) {
    const [type, setType] = useState(initialData?.type || 'expense');
    const [amount, setAmount] = useState(initialData ? (initialData.amount / 100).toFixed(2) : '');
    const [currency, setCurrency] = useState(initialData?.currency || defaultCurrency);
    const [date, setDate] = useState(initialData?.date ? initialData.date : format(new Date(), 'yyyy-MM-dd'));
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
    // Find primary account or fall back to first account
    const getDefaultAccountId = () => {
        if (initialData?.accountId) return initialData.accountId;
        const primaryAccount = accounts.find(a => a.isPrimary);
        return primaryAccount?.id || accounts[0]?.id || '';
    };
    const [accountId, setAccountId] = useState(getDefaultAccountId());
    const [toAccountId, setToAccountId] = useState(initialData?.toAccountId || '');
    const [merchant, setMerchant] = useState(initialData?.merchant || '');
    const [notes, setNotes] = useState(initialData?.notes || '');

    const { rates, isLoading: ratesLoading } = useLiveRates(defaultCurrency);

    useEffect(() => {
        if (open && !initialData) {
            setType('expense');
            setAmount('');
            setDate(format(new Date(), 'yyyy-MM-dd'));
            setCategoryId('');
            // Use primary account or first account as default
            const primaryAccount = accounts.find(a => a.isPrimary);
            setAccountId(primaryAccount?.id || accounts[0]?.id || '');
            setToAccountId('');
            setMerchant('');
            setNotes('');
        }
    }, [open, accounts, initialData, defaultCurrency]);

    useEffect(() => {
        if (initialData?.type) {
            setType(initialData.type);
        }
    }, [initialData]);

    // Update currency when account changes if it's a new transaction
    useEffect(() => {
        if (!initialData && accountId) {
            const account = accounts.find(a => a.id === accountId);
            if (account) {
                setCurrency(account.currency);
            }
        }
    }, [accountId, accounts, initialData]);

    const filteredCategories = categories.filter(c => c.type === type && !c.isArchived);
    const availableToAccounts = accounts.filter(a => a.id !== accountId);

    const handleSubmit = (e) => {
        e.preventDefault();

        // Валидация обязательных полей
        if (!accountId) {
            return; // Счёт не выбран
        }
        if (type === 'transfer' && !toAccountId) {
            return; // Для перевода нужен счёт назначения
        }
        if (type !== 'transfer' && !categoryId) {
            return; // Для дохода/расхода нужна категория
        }
        if (!amount || parseMoney(amount) <= 0) {
            return; // Сумма должна быть положительной
        }

        const data = {
            type,
            amount: parseMoney(amount),
            currency,
            date,
            accountId,
            merchant,
            notes,
        };

        if (type !== 'transfer') {
            data.categoryId = categoryId;
        } else {
            data.toAccountId = toAccountId;
        }

        // Save exchange rate if transaction currency differs from default
        if (currency !== defaultCurrency && rates && rates[currency]) {
            // Rate relative to base (defaultCurrency): 1 defaultCurrency = rates[currency] of currency
            // We want: 1 currency = X defaultCurrency, so X = 1/rates[currency]
            data.exchangeRate = 1 / rates[currency];
            data.exchangeRateBase = defaultCurrency;
        }

        onSubmit(data);
        onOpenChange(false);
    };

    const parsedAmount = amount ? parseMoney(amount) : 0;
    const showConversion = currency !== defaultCurrency && parsedAmount > 0;
    const convertedAmount = showConversion ? convertCurrency(parsedAmount, currency, defaultCurrency, rates) : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Редактировать' : 'Новая транзакция'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Tabs value={type} onValueChange={setType}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="expense" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                                Расход
                            </TabsTrigger>
                            <TabsTrigger value="income" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
                                Доход
                            </TabsTrigger>
                            <TabsTrigger value="transfer" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                                Перевод
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <Label className="text-xs text-slate-500">Сумма</Label>
                            <MoneyInput
                                placeholder="0.00"
                                value={amount}
                                onChange={setAmount}
                                className="text-lg font-medium"
                                required
                                autoFocus
                            />
                            {showConversion && (
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    {ratesLoading ? (
                                        <>
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span>Обновление курса...</span>
                                        </>
                                    ) : (
                                        <span>≈ {formatMoney(convertedAmount, defaultCurrency)}</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <div>
                            <Label className="text-xs text-slate-500">Валюта</Label>
                            <Select value={currency} onValueChange={setCurrency}>
                                <SelectTrigger>
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

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs text-slate-500">Дата</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(parseISO(date), 'd MMM yyyy', { locale: ru }) : 'Выбрать дату'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={date ? parseISO(date) : undefined}
                                        onSelect={(d) => d && setDate(format(d, 'yyyy-MM-dd'))}
                                        locale={ru}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label className="text-xs text-slate-500">
                                {type === 'transfer' ? 'Со счёта' : 'Счёт'}
                            </Label>
                            <Select value={accountId} onValueChange={setAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите счёт" />
                                </SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {type === 'transfer' ? (
                        <div>
                            <Label className="text-xs text-slate-500">На счёт</Label>
                            <Select value={toAccountId} onValueChange={setToAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите счёт" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableToAccounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div>
                            <Label className="text-xs text-slate-500">Категория</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Выберите категорию" />
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
                    )}

                    <div>
                        <Label className="text-xs text-slate-500">Описание</Label>
                        <Input
                            placeholder="Например: Продукты в магазине"
                            value={merchant}
                            onChange={(e) => setMerchant(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label className="text-xs text-slate-500">Заметка</Label>
                        <Textarea
                            placeholder="Дополнительная информация..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="h-16"
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            className={`flex-1 ${type === 'expense' ? 'bg-red-600 hover:bg-red-700' :
                                type === 'income' ? 'bg-green-600 hover:bg-green-700' :
                                    'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {initialData ? 'Сохранить' : 'Добавить'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
