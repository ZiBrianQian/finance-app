import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Filter, X, Trash2, Tag, LayoutList, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

import { useAccounts, useCategories, useTransactions, useAppSettings, usePeriod, filterTransactionsByPeriod } from '@/components/finance/useFinanceData';
import PeriodSelector from '@/components/finance/PeriodSelector';
import TransactionList from '@/components/finance/TransactionList';
import TransactionForm from '@/components/finance/TransactionForm';

export default function Transactions() {
    const { accounts } = useAccounts();
    const { categories } = useCategories();
    const { transactions, createTransaction, updateTransaction, deleteTransaction, bulkUpdate, bulkDelete } = useTransactions();
    const { settings } = useAppSettings();
    const { period, setPeriod, customRange, setCustomRange, getDateRange } = usePeriod('month');

    const [txFormOpen, setTxFormOpen] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [accountFilter, setAccountFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [groupBy, setGroupBy] = useState('date');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'n' && !e.metaKey && !e.ctrlKey && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                setEditingTx(null);
                setTxFormOpen(true);
            }
            if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
                document.getElementById('search-input')?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const { start, end } = getDateRange();

    const filteredTransactions = useMemo(() => {
        let result = filterTransactionsByPeriod(transactions, start, end);

        if (typeFilter !== 'all') {
            result = result.filter(t => t.type === typeFilter);
        }
        if (accountFilter !== 'all') {
            result = result.filter(t => t.accountId === accountFilter || t.toAccountId === accountFilter);
        }
        if (categoryFilter !== 'all') {
            result = result.filter(t => t.categoryId === categoryFilter);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(t =>
                t.merchant?.toLowerCase().includes(q) ||
                t.notes?.toLowerCase().includes(q) ||
                t.tags?.some(tag => tag.toLowerCase().includes(q))
            );
        }

        return result.sort((a, b) => b.date.localeCompare(a.date));
    }, [transactions, start, end, typeFilter, accountFilter, categoryFilter, search]);

    const handleCreateTransaction = async (data) => {
        if (editingTx) {
            await updateTransaction.mutateAsync({ id: editingTx.id, data });
            toast.success('Транзакция обновлена');
        } else {
            await createTransaction.mutateAsync(data);
            toast.success('Транзакция добавлена');
        }
        setEditingTx(null);
    };

    const handleEdit = (tx) => {
        setEditingTx(tx);
        setTxFormOpen(true);
    };

    const handleDelete = async (id) => {
        await deleteTransaction.mutateAsync(id);
        toast('Транзакция удалена', {
            action: {
                label: 'Отменить',
                onClick: () => {
                    const tx = transactions.find(t => t.id === id);
                    if (tx) createTransaction.mutateAsync(tx);
                }
            }
        });
    };

    const handleSelectChange = (id, checked) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(i => i !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        await bulkDelete.mutateAsync(selectedIds);
        setSelectedIds([]);
        toast.success(`Удалено ${selectedIds.length} транзакций`);
    };

    const handleBulkCategoryChange = async (categoryId) => {
        if (selectedIds.length === 0) return;
        const updates = selectedIds.map(id => ({ id, data: { categoryId } }));
        await bulkUpdate.mutateAsync(updates);
        setSelectedIds([]);
        toast.success(`Обновлено ${selectedIds.length} транзакций`);
    };

    const clearFilters = () => {
        setTypeFilter('all');
        setAccountFilter('all');
        setCategoryFilter('all');
        setSearch('');
    };

    const hasFilters = typeFilter !== 'all' || accountFilter !== 'all' || categoryFilter !== 'all' || search.trim();

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Транзакции</h1>
                        <p className="text-muted-foreground mt-1">{filteredTransactions.length} записей</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <PeriodSelector
                            period={period}
                            setPeriod={setPeriod}
                            customRange={customRange}
                            setCustomRange={setCustomRange}
                            compact
                        />
                        <Button onClick={() => { setEditingTx(null); setTxFormOpen(true); }}>
                            <Plus className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Добавить</span>
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <Card className="p-4 mb-6 bg-card border-border">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                id="search-input"
                                placeholder="Поиск по описанию, заметкам, тегам... (нажмите /)"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant={showFilters ? 'secondary' : 'outline'}
                                size="icon"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter className="w-4 h-4" />
                            </Button>
                            <Tabs value={groupBy} onValueChange={setGroupBy}>
                                <TabsList>
                                    <TabsTrigger value="date">
                                        <LayoutList className="w-4 h-4" />
                                    </TabsTrigger>
                                    <TabsTrigger value="category">
                                        <LayoutGrid className="w-4 h-4" />
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-36">
                                    <SelectValue placeholder="Тип" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все типы</SelectItem>
                                    <SelectItem value="expense">Расходы</SelectItem>
                                    <SelectItem value="income">Доходы</SelectItem>
                                    <SelectItem value="transfer">Переводы</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={accountFilter} onValueChange={setAccountFilter}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Счёт" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все счета</SelectItem>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Категория" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Все категории</SelectItem>
                                    {categories.filter(c => !c.isArchived).map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {hasFilters && (
                                <Button variant="ghost" size="sm" onClick={clearFilters}>
                                    <X className="w-4 h-4 mr-1" />
                                    Сбросить
                                </Button>
                            )}
                        </div>
                    )}
                </Card>

                {/* Bulk actions */}
                {selectedIds.length > 0 && (
                    <Card className="p-4 mb-6 bg-blue-500/10 border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                            <span className="text-sm text-blue-800 dark:text-blue-300">
                                Выбрано: {selectedIds.length}
                            </span>
                            <div className="flex items-center gap-2">
                                <Select onValueChange={handleBulkCategoryChange}>
                                    <SelectTrigger className="w-44 bg-background">
                                        <Tag className="w-4 h-4 mr-2" />
                                        <SelectValue placeholder="Изменить категорию" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.filter(c => !c.isArchived).map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Удалить
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                                    Отменить
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Transactions list */}
                <Card className="p-6 bg-card border-border">
                    <TransactionList
                        transactions={filteredTransactions}
                        categories={categories}
                        accounts={accounts}
                        groupBy={groupBy}
                        selectedIds={selectedIds}
                        onSelectChange={handleSelectChange}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        showCheckbox={selectedIds.length > 0}
                        settings={settings}
                    />
                </Card>
            </div>

            <TransactionForm
                open={txFormOpen}
                onOpenChange={(open) => {
                    setTxFormOpen(open);
                    if (!open) setEditingTx(null);
                }}
                accounts={accounts}
                categories={categories}
                onSubmit={handleCreateTransaction}
                initialData={editingTx}
                defaultCurrency={settings?.defaultCurrency || 'USD'}
            />
        </div>
    );
}
