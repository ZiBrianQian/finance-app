import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MoneyInput from './MoneyInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { parseMoney, formatMoney } from './constants';
import CategoryIcon from './CategoryIcon';
import { Plus, Trash2, CalendarIcon, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const emptyRow = () => ({
    id: crypto.randomUUID(),
    categoryId: '',
    amount: '',
    description: ''
});

export default function BatchTransactionForm({
    open,
    onOpenChange,
    accounts,
    categories,
    onSubmit,
    defaultCurrency = 'USD',
    initialDate = null
}) {
    const [type, setType] = useState('expense');
    const [date, setDate] = useState(initialDate || format(new Date(), 'yyyy-MM-dd'));
    const [accountId, setAccountId] = useState(accounts[0]?.id || '');
    const [rows, setRows] = useState([emptyRow(), emptyRow(), emptyRow()]);

    useEffect(() => {
        if (open) {
            setType('expense');
            setDate(initialDate || format(new Date(), 'yyyy-MM-dd'));
            setAccountId(accounts[0]?.id || '');
            setRows([emptyRow(), emptyRow(), emptyRow()]);
        }
    }, [open, accounts, initialDate]);

    const filteredCategories = categories.filter(c => c.type === type && !c.isArchived);

    const updateRow = (id, field, value) => {
        setRows(prev => prev.map(row =>
            row.id === id ? { ...row, [field]: value } : row
        ));
    };

    const addRow = () => {
        setRows(prev => [...prev, emptyRow()]);
    };

    const removeRow = (id) => {
        if (rows.length > 1) {
            setRows(prev => prev.filter(row => row.id !== id));
        }
    };

    const filledRows = rows.filter(r => r.categoryId && r.amount);

    const totalAmount = filledRows.reduce((sum, row) => {
        return sum + (parseMoney(row.amount) || 0);
    }, 0);

    const handleSubmit = async () => {
        if (filledRows.length === 0) return;

        const account = accounts.find(a => a.id === accountId);
        const currency = account?.currency || defaultCurrency;

        for (const row of filledRows) {
            await onSubmit({
                type,
                amount: parseMoney(row.amount),
                currency,
                date,
                accountId,
                categoryId: row.categoryId,
                merchant: row.description,
                notes: ''
            });
        }

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Быстрое добавление транзакций</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Tabs value={type} onValueChange={setType}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="expense" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
                                Расходы
                            </TabsTrigger>
                            <TabsTrigger value="income" className="data-[state=active]:bg-green-50 data-[state=active]:text-green-700">
                                Доходы
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    {/* Common settings */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
                        <div>
                            <Label className="text-xs text-muted-foreground">Дата для всех</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {date ? format(parseISO(date), 'd MMM yyyy', { locale: ru }) : 'Выбрать'}
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
                            <Label className="text-xs text-muted-foreground">Счёт для всех</Label>
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

                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
                        <div className="col-span-4">Категория</div>
                        <div className="col-span-3">Сумма</div>
                        <div className="col-span-4">Описание</div>
                        <div className="col-span-1"></div>
                    </div>

                    {/* Rows */}
                    <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-2">
                            {rows.map((row, index) => (
                                <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-4">
                                        <Select value={row.categoryId} onValueChange={(v) => updateRow(row.id, 'categoryId', v)}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Категория" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {filteredCategories.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        <div className="flex items-center gap-2">
                                                            <CategoryIcon icon={c.icon} color={c.color} size={14} />
                                                            <span>{c.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-3">
                                        <MoneyInput
                                            placeholder="0.00"
                                            value={row.amount}
                                            onChange={(v) => updateRow(row.id, 'amount', v)}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="col-span-4">
                                        <Input
                                            placeholder="Описание"
                                            value={row.description}
                                            onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                                            className="h-9"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 text-muted-foreground hover:text-red-600"
                                            onClick={() => removeRow(row.id)}
                                            disabled={rows.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Add row button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={addRow}
                        className="w-full border-dashed"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить строку
                    </Button>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm">
                            <span className="text-muted-foreground">Итого ({filledRows.length} {filledRows.length === 1 ? 'транзакция' : 'транзакций'}):</span>
                            <span className={`ml-2 text-lg font-bold ${type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {type === 'expense' ? '-' : '+'}{formatMoney(totalAmount, accounts.find(a => a.id === accountId)?.currency || defaultCurrency)}
                            </span>
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={filledRows.length === 0}
                            className={type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                        >
                            <Save className="h-4 w-4 mr-2" />
                            Сохранить все
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
