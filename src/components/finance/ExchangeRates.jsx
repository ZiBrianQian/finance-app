import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Save, AlertTriangle } from 'lucide-react';
import { CURRENCIES } from './constants';
import { toast } from 'sonner';

export default function ExchangeRates({ open, onOpenChange, settings, updateSettings }) {
    const [rates, setRates] = useState(settings?.exchangeRates || []);
    const [selectedCurrency, setSelectedCurrency] = useState('');
    const [newRate, setNewRate] = useState('');

    React.useEffect(() => {
        if (open) {
            setRates(settings?.exchangeRates || []);
        }
    }, [open, settings]);

    const handleAddRate = () => {
        if (!selectedCurrency || !newRate) return;
        if (rates.find(r => r.currency === selectedCurrency)) {
            toast.error('Эта валюта уже добавлена');
            return;
        }

        const newRates = [...rates, { currency: selectedCurrency, rate: parseFloat(newRate) }];
        setRates(newRates);
        setSelectedCurrency('');
        setNewRate('');
    };

    const handleRemoveRate = (currency) => {
        setRates(rates.filter(r => r.currency !== currency));
    };

    const handleRateChange = (currency, value) => {
        setRates(rates.map(r => r.currency === currency ? { ...r, rate: parseFloat(value) } : r));
    };

    const handleSave = async () => {
        await updateSettings.mutateAsync({ exchangeRates: rates });
        toast.success('Курсы валют сохранены');
        onOpenChange(false);
    };

    const addDefaults = () => {
        // Just as an example, add major currencies if missing
        const defaults = [
            { currency: 'USD', rate: 1 },
            { currency: 'EUR', rate: 0.92 },
            { currency: 'CNY', rate: 7.23 },
            { currency: 'RUB', rate: 92.5 }
        ];

        // Filter out default currency logic from defaults is tricky without knowing it
        // We assume rate is "Value of 1 {currency} in Base". 
        // Wait, the UI says "1 {currency} = [Input] {defaultCurrency}".
        // So valid inputs are: 1 USD = 1 USD (if default is USD).
        // 1 CNY = 0.14 USD.

        // Since we don't know real rates, we can't easily autofill correct values.
        // Better to just warn user.
        toast.info("Пожалуйста, введите актуальные курсы вручную");
    };

    const availableCurrencies = CURRENCIES.filter(c =>
        c.code !== settings?.defaultCurrency &&
        !rates.find(r => r.currency === c.code)
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-card text-card-foreground border-border">
                <DialogHeader>
                    <DialogTitle>Курсы валют</DialogTitle>
                    <DialogDescription>
                        Установите курсы обмена относительно 1 {settings?.defaultCurrency}
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/20 p-3 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-300">
                        <p className="font-medium">Важно!</p>
                        <p>Если курс не задан, конвертация будет происходить 1:1.</p>
                    </div>
                </div>

                <div className="space-y-4 py-4">
                    {/* Add new rate */}
                    <div className="flex items-end gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                        <div className="space-y-2 flex-1">
                            <Label>Валюта</Label>
                            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                                <SelectTrigger className="bg-background border-input">
                                    <SelectValue placeholder="Выберите валюту" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCurrencies.map(c => (
                                        <SelectItem key={c.code} value={c.code}>
                                            {c.code} - {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 w-24">
                            <Label>Курс</Label>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={newRate}
                                onChange={e => setNewRate(e.target.value)}
                                className="bg-background border-input"
                            />
                        </div>
                        <Button onClick={handleAddRate} size="icon" className="shrink-0 mb-[2px]">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Rates list */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {rates.length === 0 ? (
                            <div className="text-center py-4 space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    Нет добавленных курсов
                                </p>
                            </div>
                        ) : (
                            rates.map((rate) => (
                                <div key={rate.currency} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-2 flex-1">
                                        <div className="font-medium">{rate.currency}</div>
                                        <div className="text-xs text-muted-foreground hidden sm:block">
                                            {CURRENCIES.find(c => c.code === rate.currency)?.name}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm text-muted-foreground whitespace-nowrap">
                                            1 {rate.currency} =
                                        </div>
                                        <Input
                                            type="number"
                                            value={rate.rate}
                                            onChange={e => handleRateChange(rate.currency, e.target.value)}
                                            className="w-20 sm:w-24 h-8 bg-background border-input"
                                        />
                                        <div className="text-sm text-muted-foreground w-8">
                                            {settings?.defaultCurrency}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveRate(rate.currency)}
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Отмена
                    </Button>
                    <Button onClick={handleSave} className="gap-2">
                        <Save className="w-4 h-4" />
                        Сохранить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
