import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDebts, useAppSettings, useLiveRates, convertCurrency } from './useFinanceData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Trash2, Edit2, CheckCircle, XCircle, ArrowUpRight, ArrowDownLeft, Wallet, CalendarIcon, DollarSign, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import MoneyInput from './MoneyInput';
import { CURRENCIES, parseMoney, formatMoney } from './constants';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DebtManager() {
    const { debts, createDebt, updateDebt, deleteDebt } = useDebts();
    const { settings } = useAppSettings();
    const { rates } = useLiveRates(settings?.defaultCurrency);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDebt, setEditingDebt] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [dueDateOpen, setDueDateOpen] = useState(false);

    // Partial payment state
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [paymentDebt, setPaymentDebt] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        amount: '',
        currency: settings?.defaultCurrency || 'USD',
        type: 'owe_me', // owe_me (I lent), i_owe (I borrowed)
        dueDate: null,
        notes: '',
        payments: [], // Array of partial payments
    });

    const resetForm = () => {
        setFormData({
            name: '',
            amount: '',
            currency: settings?.defaultCurrency || 'USD',
            type: 'owe_me',
            dueDate: null,
            notes: '',
            payments: [],
        });
        setEditingDebt(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const data = {
            ...formData,
            amount: parseMoney(formData.amount),
            dueDate: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : null,
            isPaid: false,
            payments: formData.payments || [],
        };

        if (editingDebt) {
            await updateDebt.mutateAsync({ id: editingDebt.id, data });
        } else {
            await createDebt.mutateAsync(data);
        }
        setIsDialogOpen(false);
        resetForm();
    };

    const handleEdit = (debt) => {
        setEditingDebt(debt);
        setFormData({
            name: debt.name,
            amount: (debt.amount / 100).toString(),
            currency: debt.currency || settings?.defaultCurrency || 'USD',
            type: debt.type,
            dueDate: debt.dueDate ? new Date(debt.dueDate) : null,
            notes: debt.notes || '',
            payments: debt.payments || [],
        });
        setIsDialogOpen(true);
    };

    const togglePaidStatus = async (debt) => {
        await updateDebt.mutateAsync({
            id: debt.id,
            data: { isPaid: !debt.isPaid }
        });
    };

    const handleDelete = (id) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await deleteDebt.mutateAsync(deleteId);
            setDeleteId(null);
        }
    };

    // Partial payment handlers
    const openPaymentDialog = (debt) => {
        setPaymentDebt(debt);
        setPaymentAmount('');
        setPaymentDialogOpen(true);
    };

    const handleAddPayment = async () => {
        if (!paymentDebt || !paymentAmount) return;

        const paymentCents = parseMoney(paymentAmount);
        const newPayment = {
            id: Date.now(),
            amount: paymentCents,
            date: format(new Date(), 'yyyy-MM-dd'),
        };

        const existingPayments = paymentDebt.payments || [];
        const updatedPayments = [...existingPayments, newPayment];

        // Calculate remaining amount
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = paymentDebt.amount - totalPaid;

        await updateDebt.mutateAsync({
            id: paymentDebt.id,
            data: {
                payments: updatedPayments,
                isPaid: remaining <= 0
            }
        });

        setPaymentDialogOpen(false);
        setPaymentDebt(null);
        setPaymentAmount('');
    };

    // Helper to calculate remaining debt
    const getRemainingAmount = (debt) => {
        const totalPaid = (debt.payments || []).reduce((sum, p) => sum + p.amount, 0);
        return Math.max(0, debt.amount - totalPaid);
    };

    // Derived stats
    const iLent = debts.filter(d => d.type === 'owe_me' && !d.isPaid);
    const iOwe = debts.filter(d => d.type === 'i_owe' && !d.isPaid);

    const totalLent = iLent.reduce((sum, d) => {
        const remaining = getRemainingAmount(d);
        return sum + convertCurrency(remaining, d.currency || settings?.defaultCurrency || 'USD', settings?.defaultCurrency || 'USD', rates);
    }, 0);
    const totalOwe = iOwe.reduce((sum, d) => {
        const remaining = getRemainingAmount(d);
        return sum + convertCurrency(remaining, d.currency || settings?.defaultCurrency || 'USD', settings?.defaultCurrency || 'USD', rates);
    }, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-emerald-600">
                        Долги и Займы
                    </h1>
                    <p className="text-muted-foreground mt-1">Отслеживайте, кто должен вам и кому должны вы</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-500/20">
                            <Plus className="w-4 h-4 mr-2" /> Добавить долг
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingDebt ? 'Редактировать запись' : 'Новая запись долга'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Тип записи</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(val) => setFormData({ ...formData, type: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="owe_me">Мне должны</SelectItem>
                                            <SelectItem value="i_owe">Я должен</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Валюта</Label>
                                    <Select
                                        value={formData.currency}
                                        onValueChange={(val) => setFormData({ ...formData, currency: val })}
                                    >
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

                            <div className="space-y-2">
                                <Label>Сумма</Label>
                                <MoneyInput
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(val) => setFormData({ ...formData, amount: val })}
                                    className="text-lg font-medium"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Имя человека / Организации</Label>
                                <Input
                                    placeholder="Например, Иван Иванов"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Срок возврата (необязательно)</Label>
                                <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.dueDate
                                                ? format(formData.dueDate, 'd MMM yyyy', { locale: ru })
                                                : 'Выберите дату'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar
                                            mode="single"
                                            selected={formData.dueDate}
                                            onSelect={(d) => { setFormData({ ...formData, dueDate: d }); setDueDateOpen(false); }}
                                            locale={ru}
                                        />
                                    </PopoverContent>
                                </Popover>
                                {formData.dueDate && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-slate-500"
                                        onClick={() => setFormData({ ...formData, dueDate: null })}
                                    >
                                        Убрать дату
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Заметки</Label>
                                <Textarea
                                    placeholder="Дополнительная информация..."
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <DialogFooter>
                                <Button type="submit">Сохранить</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-emerald-500/10 bg-gradient-to-br from-emerald-500/5 to-transparent">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600">
                                <ArrowUpRight className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Вам должны</p>
                                <h2 className="text-3xl font-bold text-emerald-600">
                                    {formatCurrency(totalLent, settings?.defaultCurrency)}
                                </h2>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-red-500/10 bg-gradient-to-br from-red-500/5 to-transparent">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-red-500/10 rounded-xl text-red-600">
                                <ArrowDownLeft className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Вы должны</p>
                                <h2 className="text-3xl font-bold text-red-600">
                                    {formatCurrency(totalOwe, settings?.defaultCurrency)}
                                </h2>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="active">Активные</TabsTrigger>
                    <TabsTrigger value="history">История (Погашенные)</TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="mt-6 space-y-4">
                    {debts.filter(d => !d.isPaid).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>Нет активных долгов</p>
                        </div>
                    ) : (
                        debts.filter(d => !d.isPaid).map(debt => (
                            <DebtCard
                                key={debt.id}
                                debt={debt}
                                onEdit={handleEdit}
                                onTogglePaid={togglePaidStatus}
                                onDelete={handleDelete}
                                onAddPayment={openPaymentDialog}
                                currency={settings?.defaultCurrency}
                                getRemainingAmount={getRemainingAmount}
                            />
                        ))
                    )}
                </TabsContent>

                <TabsContent value="history" className="mt-6 space-y-4">
                    {debts.filter(d => d.isPaid).length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>История пуста</p>
                        </div>
                    ) : (
                        debts.filter(d => d.isPaid).map(debt => (
                            <DebtCard
                                key={debt.id}
                                debt={debt}
                                onEdit={handleEdit}
                                onTogglePaid={togglePaidStatus}
                                onDelete={handleDelete}
                                onAddPayment={openPaymentDialog}
                                currency={settings?.defaultCurrency}
                                getRemainingAmount={getRemainingAmount}
                            />
                        ))
                    )}
                </TabsContent>
            </Tabs>

            {/* Delete confirmation dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить запись о долге?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите удалить эту запись? История платежей будет утеряна.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Удалить</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Partial payment dialog */}
            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Частичное погашение</DialogTitle>
                    </DialogHeader>
                    {paymentDebt && (
                        <div className="space-y-4 pt-2">
                            <div className="p-4 bg-secondary/50 rounded-xl space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Должник:</span>
                                    <span className="font-medium">{paymentDebt.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Общий долг:</span>
                                    <span className="font-medium">{formatMoney(paymentDebt.amount, paymentDebt.currency)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Уже внесено:</span>
                                    <span className="font-medium text-emerald-600">
                                        {formatMoney((paymentDebt.payments || []).reduce((s, p) => s + p.amount, 0), paymentDebt.currency)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm border-t pt-2">
                                    <span className="text-muted-foreground">Осталось:</span>
                                    <span className="font-bold text-lg">
                                        {formatMoney(getRemainingAmount(paymentDebt), paymentDebt.currency)}
                                    </span>
                                </div>
                            </div>

                            {(paymentDebt.payments || []).length > 0 && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">История платежей</Label>
                                    <ScrollArea className="h-24 rounded-lg border p-2">
                                        {paymentDebt.payments.map((p, i) => (
                                            <div key={p.id || i} className="flex justify-between text-sm py-1">
                                                <span className="text-muted-foreground">{formatDate(p.date)}</span>
                                                <span className="text-emerald-600 font-medium">+{formatMoney(p.amount, paymentDebt.currency)}</span>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Сумма взноса</Label>
                                <MoneyInput
                                    placeholder="0.00"
                                    value={paymentAmount}
                                    onChange={setPaymentAmount}
                                    className="text-lg font-medium"
                                />
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Отмена</Button>
                                <Button
                                    onClick={handleAddPayment}
                                    disabled={!paymentAmount || parseMoney(paymentAmount) <= 0}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <DollarSign className="w-4 h-4 mr-2" />
                                    Добавить платёж
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function DebtCard({ debt, onEdit, onTogglePaid, onDelete, onAddPayment, currency, getRemainingAmount }) {
    const isOweMe = debt.type === 'owe_me';
    const remaining = getRemainingAmount(debt);
    const totalPaid = (debt.payments || []).reduce((s, p) => s + p.amount, 0);
    const hasPayments = totalPaid > 0;
    const progressPercent = debt.amount > 0 ? Math.min(100, (totalPaid / debt.amount) * 100) : 0;

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isOweMe ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40' : 'bg-red-100 text-red-600 dark:bg-red-900/40'}`}>
                            {isOweMe ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                        </div>
                        <div>
                            <h4 className="font-semibold text-lg">{debt.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{isOweMe ? 'Вам должны' : 'Вы должны'}</span>
                                {debt.dueDate && (
                                    <>
                                        <span>•</span>
                                        <span className={new Date(debt.dueDate) < new Date() && !debt.isPaid ? 'text-red-500 font-medium' : ''}>
                                            До {formatDate(debt.dueDate)}
                                        </span>
                                    </>
                                )}
                            </div>
                            {debt.notes && <p className="text-xs text-muted-foreground/80 mt-1">{debt.notes}</p>}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                            {hasPayments ? (
                                <>
                                    <span className={`block text-lg font-bold ${isOweMe ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formatCurrency(remaining, debt.currency || currency)}
                                    </span>
                                    <span className="text-xs text-muted-foreground line-through">
                                        {formatCurrency(debt.amount, debt.currency || currency)}
                                    </span>
                                </>
                            ) : (
                                <span className={`block text-lg font-bold ${isOweMe ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(debt.amount, debt.currency || currency)}
                                </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded-full ${debt.isPaid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {debt.isPaid ? 'Погашено' : hasPayments ? `${Math.round(progressPercent)}%` : 'Активен'}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            {!debt.isPaid && (
                                <Button variant="ghost" size="icon" onClick={() => onAddPayment(debt)} title="Частичное погашение">
                                    <DollarSign className="w-4 h-4 text-blue-600" />
                                </Button>
                            )}
                            {!debt.isPaid ? (
                                <Button variant="ghost" size="icon" onClick={() => onTogglePaid(debt)} title="Отметить как возвращенный">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </Button>
                            ) : (
                                <Button variant="ghost" size="icon" onClick={() => onTogglePaid(debt)} title="Вернуть в активные">
                                    <XCircle className="w-5 h-5 text-yellow-600" />
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => onEdit(debt)}>
                                <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => onDelete(debt.id)}>
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Progress bar for partial payments */}
                {hasPayments && !debt.isPaid && (
                    <div className="mt-4 pt-3 border-t">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Погашено</span>
                            <span>{formatCurrency(totalPaid, debt.currency || currency)} из {formatCurrency(debt.amount, debt.currency || currency)}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
