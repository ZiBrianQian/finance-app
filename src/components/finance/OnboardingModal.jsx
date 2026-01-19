import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Wallet } from 'lucide-react';
import { CURRENCIES, ACCOUNT_TYPES, COLORS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from './constants';

export default function OnboardingModal({
    open,
    onComplete,
    onCreateAccount,
    onCreateCategories,
    settings,
    updateSettings
}) {
    const [step, setStep] = useState(1);
    const [accountName, setAccountName] = useState('');
    const [accountType, setAccountType] = useState('card');
    const [currency, setCurrency] = useState(settings?.defaultCurrency || 'USD');
    const [initialBalance, setInitialBalance] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateAccount = async () => {
        setLoading(true);
        try {
            await onCreateAccount({
                name: accountName || 'Основной счёт',
                type: accountType,
                currency,
                initialBalance: Math.round(parseFloat(initialBalance || '0') * 100),
                color: COLORS[0],
                isArchived: false
            });
            setStep(2);
        } catch (error) {
            console.error('Error creating account:', error);
        }
        setLoading(false);
    };

    const handleCreateCategories = async () => {
        setLoading(true);
        try {
            await onCreateCategories();
            await updateSettings.mutateAsync({
                defaultCurrency: currency,
                onboardingCompleted: true
            });
            onComplete();
        } catch (error) {
            console.error('Error creating categories:', error);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Добро пожаловать!</DialogTitle>
                            <DialogDescription>Настройте приложение за пару шагов</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {step === 1 && (
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-600">
                                Шаг 1 из 2: Создайте ваш первый счёт
                            </p>
                        </div>

                        <div>
                            <Label>Название счёта</Label>
                            <Input
                                placeholder="Например: Основная карта"
                                value={accountName}
                                onChange={(e) => setAccountName(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Тип счёта</Label>
                                <Select value={accountType} onValueChange={setAccountType}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ACCOUNT_TYPES.map(t => (
                                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Валюта</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CURRENCIES.map(c => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.symbol} {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>Начальный баланс</Label>
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={initialBalance}
                                onChange={(e) => setInitialBalance(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={handleCreateAccount}
                            disabled={loading}
                        >
                            {loading ? 'Создание...' : 'Продолжить'}
                        </Button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl">
                            <p className="text-sm text-slate-600">
                                Шаг 2 из 2: Создание категорий
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Будут созданы категории расходов:</p>
                            <div className="flex flex-wrap gap-2">
                                {DEFAULT_EXPENSE_CATEGORIES.slice(0, 5).map(c => (
                                    <div
                                        key={c.name}
                                        className="px-3 py-1 rounded-full text-xs"
                                        style={{ backgroundColor: `${c.color}15`, color: c.color }}
                                    >
                                        {c.name}
                                    </div>
                                ))}
                                <span className="px-3 py-1 text-xs text-slate-500">+{DEFAULT_EXPENSE_CATEGORIES.length - 5}</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium">Будут созданы категории доходов:</p>
                            <div className="flex flex-wrap gap-2">
                                {DEFAULT_INCOME_CATEGORIES.map(c => (
                                    <div
                                        key={c.name}
                                        className="px-3 py-1 rounded-full text-xs"
                                        style={{ backgroundColor: `${c.color}15`, color: c.color }}
                                    >
                                        {c.name}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button
                            className="w-full bg-green-600 hover:bg-green-700"
                            onClick={handleCreateCategories}
                            disabled={loading}
                        >
                            {loading ? 'Завершение...' : 'Начать использовать'}
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
