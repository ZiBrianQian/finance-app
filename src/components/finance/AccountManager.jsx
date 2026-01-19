import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MoneyInput from './MoneyInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Archive, Trash2, MoreHorizontal, Wallet, CreditCard, Building2, PiggyBank, Landmark } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CURRENCIES, COLORS, ACCOUNT_TYPES, formatMoney } from './constants';

const icons = {
    cash: Wallet,
    card: CreditCard,
    bank: Building2,
    savings: PiggyBank,
    other: Landmark,
};

export default function AccountManager({
    open,
    onOpenChange,
    accounts,
    balances,
    onCreate,
    onUpdate,
    onDelete,
    defaultCurrency
}) {
    const [showForm, setShowForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [name, setName] = useState('');
    const [type, setType] = useState('card');
    const [currency, setCurrency] = useState(defaultCurrency || 'USD');
    const [initialBalance, setInitialBalance] = useState('0');
    const [color, setColor] = useState(COLORS[0]);

    const resetForm = () => {
        setName('');
        setType('card');
        setCurrency(defaultCurrency || 'USD');
        setInitialBalance('0');
        setColor(COLORS[0]);
        setEditingAccount(null);
        setShowForm(false);
    };

    const handleEdit = (account) => {
        setEditingAccount(account);
        setName(account.name);
        setType(account.type);
        setCurrency(account.currency);
        setInitialBalance((account.initialBalance / 100).toFixed(2));
        setColor(account.color || COLORS[0]);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        const data = {
            name,
            type,
            currency,
            initialBalance: Math.round(parseFloat(initialBalance || 0) * 100),
            color
        };

        if (editingAccount) {
            await onUpdate({ id: editingAccount.id, data });
        } else {
            await onCreate(data);
        }
        resetForm();
    };

    const handleArchive = async (account) => {
        await onUpdate({ id: account.id, data: { isArchived: !account.isArchived } });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Управление счетами</DialogTitle>
                </DialogHeader>

                {showForm ? (
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label className="text-sm text-muted-foreground">Название</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Название счёта"
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <Label className="text-sm text-muted-foreground">Тип счёта</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="mt-2">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {ACCOUNT_TYPES.map(t => {
                                        const Icon = icons[t.value];
                                        return (
                                            <SelectItem key={t.value} value={t.value}>
                                                <div className="flex items-center gap-2">
                                                    <Icon className="w-4 h-4" />
                                                    {t.label}
                                                </div>
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-sm text-muted-foreground">Валюта</Label>
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

                        <div>
                            <Label className="text-sm text-muted-foreground">Начальный баланс</Label>
                            <MoneyInput
                                value={initialBalance}
                                onChange={setInitialBalance}
                                placeholder="0.00"
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <Label className="text-sm text-muted-foreground">Цвет</Label>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-primary' : ''
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button variant="outline" className="flex-1" onClick={resetForm}>
                                Отмена
                            </Button>
                            <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim()}>
                                {editingAccount ? 'Сохранить' : 'Создать'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="mt-4">
                        <div className="flex justify-end mb-4">
                            <Button size="sm" onClick={() => setShowForm(true)}>
                                <Plus className="w-4 h-4 mr-1" /> Добавить
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {accounts.map(account => {
                                const Icon = icons[account.type] || Wallet;
                                const balance = balances[account.id] || 0;

                                return (
                                    <div
                                        key={account.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border ${account.isArchived ? 'bg-muted opacity-60' : 'bg-card'
                                            } border-border`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                style={{ backgroundColor: account.color ? `${account.color}15` : 'var(--muted)' }}
                                            >
                                                <Icon className="w-5 h-5" style={{ color: account.color || '#64748b' }} />
                                            </div>
                                            <div>
                                                <span className={`font-medium text-foreground ${account.isArchived ? 'line-through' : ''}`}>
                                                    {account.name}
                                                </span>
                                                <p className="text-sm text-muted-foreground">{account.currency}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-semibold ${balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                                {formatMoney(balance, account.currency)}
                                            </span>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(account)}>
                                                        <Pencil className="w-4 h-4 mr-2" /> Редактировать
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleArchive(account)}>
                                                        <Archive className="w-4 h-4 mr-2" />
                                                        {account.isArchived ? 'Восстановить' : 'Архивировать'}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onDelete(account.id)} className="text-red-600 dark:text-red-400">
                                                        <Trash2 className="w-4 h-4 mr-2" /> Удалить
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                );
                            })}
                            {accounts.length === 0 && (
                                <p className="text-center text-muted-foreground py-8">Нет счетов</p>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
