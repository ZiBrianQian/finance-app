import React from 'react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { formatMoney, CURRENCIES } from './constants';
import { useLiveRates, convertCurrency, useAppSettings } from './useFinanceData';
import CategoryIcon from './CategoryIcon';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const formatDateGroup = (dateStr) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Сегодня';
    if (isYesterday(date)) return 'Вчера';
    return format(date, 'd MMMM yyyy', { locale: ru });
};

// Get currency symbol
const getCurrencySymbol = (code) => {
    const currency = CURRENCIES.find(c => c.code === code);
    return currency?.symbol || code;
};

export default function TransactionList({
    transactions,
    categories,
    accounts,
    groupBy = 'date',
    selectedIds = [],
    onSelectChange,
    onEdit,
    onDelete,
    showCheckbox = false,
    settings = null
}) {
    const { rates } = useLiveRates(settings?.defaultCurrency);
    const getCategory = (id) => categories.find(c => c.id === id);
    const getAccount = (id) => accounts.find(a => a.id === id);

    const defaultCurrency = settings?.defaultCurrency;

    const grouped = transactions.reduce((acc, tx) => {
        const key = groupBy === 'date'
            ? tx.date
            : tx.categoryId || 'uncategorized';
        if (!acc[key]) acc[key] = [];
        acc[key].push(tx);
        return acc;
    }, {});

    const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
        if (groupBy === 'date') return b.localeCompare(a);
        return 0;
    });

    if (transactions.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg mb-1">Нет транзакций</p>
                <p className="text-sm">Добавьте первую транзакцию, чтобы начать</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {sortedGroups.map(([group, txs]) => {
                const groupLabel = groupBy === 'date'
                    ? formatDateGroup(group)
                    : getCategory(group)?.name || 'Без категории';

                const groupTotal = txs.reduce((sum, tx) => {
                    const converted = convertCurrency(tx.amount, tx.currency || settings?.defaultCurrency || 'USD', settings?.defaultCurrency || 'USD', rates);
                    if (tx.type === 'income') return sum + converted;
                    if (tx.type === 'expense') return sum - converted;
                    return sum;
                }, 0);

                return (
                    <div key={group}>
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="text-sm font-medium text-muted-foreground">{groupLabel}</h3>
                            <span className={`text-sm font-medium ${groupTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {groupTotal > 0 ? '+' : ''}{formatMoney(groupTotal, settings?.defaultCurrency)}
                            </span>
                        </div>
                        <div className="space-y-2">
                            {txs.map(tx => {
                                const category = getCategory(tx.categoryId);
                                const account = getAccount(tx.accountId);
                                const toAccount = getAccount(tx.toAccountId);
                                const isSelected = selectedIds.includes(tx.id);

                                // Show saved exchange rate if transaction has one
                                const hasExchangeRate = tx.exchangeRate && tx.currency !== defaultCurrency;
                                const convertedAmount = hasExchangeRate ? tx.amount * tx.exchangeRate : null;

                                return (
                                    <div
                                        key={tx.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl bg-card border transition-all ${isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                                            }`}
                                    >
                                        {showCheckbox && (
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) => onSelectChange(tx.id, checked)}
                                            />
                                        )}

                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                            style={{
                                                backgroundColor: tx.type === 'transfer'
                                                    ? 'rgb(59 130 246 / 0.15)'
                                                    : category?.color ? `${category.color}15` : 'var(--muted)'
                                            }}
                                        >
                                            {tx.type === 'transfer' ? (
                                                <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            ) : tx.type === 'income' ? (
                                                <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            ) : (
                                                <CategoryIcon icon={category?.icon} color={category?.color} size={20} className="w-10 h-10" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-foreground truncate">
                                                    {tx.type === 'transfer'
                                                        ? `${account?.name || '?'} → ${toAccount?.name || '?'}`
                                                        : tx.merchant || category?.name || 'Без категории'
                                                    }
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {tx.type !== 'transfer' && category && (
                                                    <span>{category.name}</span>
                                                )}
                                                {account && tx.type !== 'transfer' && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{account.name}</span>
                                                    </>
                                                )}
                                                {tx.tags?.length > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="text-blue-600 dark:text-blue-400">#{tx.tags[0]}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className={`font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' :
                                                tx.type === 'expense' ? 'text-red-600 dark:text-red-400' :
                                                    'text-blue-600 dark:text-blue-400'
                                                }`}>
                                                {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                                                {formatMoney(tx.amount, tx.currency)}
                                            </p>
                                            {hasExchangeRate && (
                                                <p className="text-xs text-muted-foreground">
                                                    ≈ {getCurrencySymbol(defaultCurrency)}{(convertedAmount / 100).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                    <span className="opacity-60"> @ {tx.exchangeRate.toFixed(2)}</span>
                                                </p>
                                            )}
                                        </div>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => onEdit(tx)}>
                                                    <Pencil className="w-4 h-4 mr-2" /> Редактировать
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => onDelete(tx.id)} className="text-red-600 dark:text-red-400">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Удалить
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
