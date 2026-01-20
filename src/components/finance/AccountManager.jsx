import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MoneyInput from './MoneyInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Archive, Trash2, MoreHorizontal, Wallet, CreditCard, Building2, PiggyBank, Landmark, Star, GripVertical } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
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
    onSetPrimary,
    onReorder,
    defaultCurrency
}) {
    const [showForm, setShowForm] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [name, setName] = useState('');
    const [type, setType] = useState('card');
    const [currency, setCurrency] = useState(defaultCurrency || 'USD');
    const [initialBalance, setInitialBalance] = useState('0');
    const [color, setColor] = useState(COLORS[0]);

    // Drag and drop state
    const [draggedId, setDraggedId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

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

    const handleSetPrimary = async (accountId) => {
        if (onSetPrimary) {
            await onSetPrimary(accountId);
        }
    };

    // Drag and drop handlers
    const handleDragStart = (e, accountId) => {
        setDraggedId(accountId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, accountId) => {
        e.preventDefault();
        if (accountId !== draggedId) {
            setDragOverId(accountId);
        }
    };

    const handleDragLeave = () => {
        setDragOverId(null);
    };

    const handleDrop = async (e, targetId) => {
        e.preventDefault();
        setDragOverId(null);

        if (draggedId && targetId && draggedId !== targetId && onReorder) {
            const currentOrder = accounts.map(a => a.id);
            const draggedIndex = currentOrder.indexOf(draggedId);
            const targetIndex = currentOrder.indexOf(targetId);

            // Remove dragged item and insert at new position
            currentOrder.splice(draggedIndex, 1);
            currentOrder.splice(targetIndex, 0, draggedId);

            await onReorder(currentOrder);
        }

        setDraggedId(null);
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverId(null);
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
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-sm text-muted-foreground">
                                Перетащите для изменения порядка
                            </p>
                            <Button size="sm" onClick={() => setShowForm(true)}>
                                <Plus className="w-4 h-4 mr-1" /> Добавить
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {accounts.map(account => {
                                const Icon = icons[account.type] || Wallet;
                                const balance = balances[account.id] || 0;
                                const isDragging = draggedId === account.id;
                                const isDragOver = dragOverId === account.id;

                                return (
                                    <div
                                        key={account.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, account.id)}
                                        onDragOver={(e) => handleDragOver(e, account.id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, account.id)}
                                        onDragEnd={handleDragEnd}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing
                                            ${account.isArchived ? 'bg-muted opacity-60' : 'bg-card'} 
                                            ${isDragging ? 'opacity-50 scale-95' : ''}
                                            ${isDragOver ? 'border-primary border-2' : 'border-border'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <GripVertical className="w-4 h-4 text-muted-foreground" />
                                            <div
                                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                style={{ backgroundColor: account.color ? `${account.color}15` : 'var(--muted)' }}
                                            >
                                                <Icon className="w-5 h-5" style={{ color: account.color || '#64748b' }} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`font-medium text-foreground ${account.isArchived ? 'line-through' : ''}`}>
                                                        {account.name}
                                                    </span>
                                                    {account.isPrimary && (
                                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                    )}
                                                </div>
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
                                                    {!account.isPrimary && !account.isArchived && (
                                                        <DropdownMenuItem onClick={() => handleSetPrimary(account.id)}>
                                                            <Star className="w-4 h-4 mr-2" /> Сделать основным
                                                        </DropdownMenuItem>
                                                    )}
                                                    {account.isPrimary && (
                                                        <DropdownMenuItem disabled className="text-amber-600">
                                                            <Star className="w-4 h-4 mr-2 fill-amber-500" /> Основной счёт
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
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
