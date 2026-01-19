import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Bell, AlertTriangle, Target, Calendar, TrendingDown } from 'lucide-react';

export default function NotificationSettingsCard({ settings, onUpdate }) {
    const [localSettings, setLocalSettings] = useState(settings || {
        budgetAlerts: true,
        budgetThreshold: 80,
        goalAchieved: true,
        recurringReminders: true,
        recurringDaysBefore: 1,
        lowBalance: false,
        lowBalanceThreshold: 100
    });

    const handleChange = (field, value) => {
        const newSettings = { ...localSettings, [field]: value };
        setLocalSettings(newSettings);
        onUpdate(newSettings);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 mt-1">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <Label className="text-base text-foreground">Бюджетные алерты</Label>
                            <p className="text-sm text-muted-foreground">Уведомления о превышении лимита</p>
                        </div>
                        <Switch
                            checked={localSettings.budgetAlerts}
                            onCheckedChange={(v) => handleChange('budgetAlerts', v)}
                        />
                    </div>
                    {localSettings.budgetAlerts && (
                        <div className="mt-3">
                            <Label className="text-sm text-muted-foreground">Порог уведомления (%)</Label>
                            <Input
                                type="number"
                                min="1"
                                max="100"
                                value={localSettings.budgetThreshold}
                                onChange={(e) => handleChange('budgetThreshold', parseInt(e.target.value) || 80)}
                                className="mt-2 w-32 bg-background border-input"
                            />
                        </div>
                    )}
                </div>
            </div>

            <Separator />

            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0 mt-1">
                    <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-base text-foreground">Достижение целей</Label>
                            <p className="text-sm text-muted-foreground">Уведомления о достижении финансовых целей</p>
                        </div>
                        <Switch
                            checked={localSettings.goalAchieved}
                            onCheckedChange={(v) => handleChange('goalAchieved', v)}
                        />
                    </div>
                </div>
            </div>

            <Separator />

            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0 mt-1">
                    <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <Label className="text-base text-foreground">Рекуррентные платежи</Label>
                            <p className="text-sm text-muted-foreground">Напоминания о предстоящих платежах</p>
                        </div>
                        <Switch
                            checked={localSettings.recurringReminders}
                            onCheckedChange={(v) => handleChange('recurringReminders', v)}
                        />
                    </div>
                    {localSettings.recurringReminders && (
                        <div className="mt-3">
                            <Label className="text-sm text-muted-foreground">Напоминать за (дней)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="7"
                                value={localSettings.recurringDaysBefore}
                                onChange={(e) => handleChange('recurringDaysBefore', parseInt(e.target.value) || 1)}
                                className="mt-2 w-32 bg-background border-input"
                            />
                        </div>
                    )}
                </div>
            </div>

            <Separator />

            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0 mt-1">
                    <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <Label className="text-base text-foreground">Низкий баланс</Label>
                            <p className="text-sm text-muted-foreground">Предупреждение о низком балансе счёта</p>
                        </div>
                        <Switch
                            checked={localSettings.lowBalance}
                            onCheckedChange={(v) => handleChange('lowBalance', v)}
                        />
                    </div>
                    {localSettings.lowBalance && (
                        <div className="mt-3">
                            <Label className="text-sm text-muted-foreground">Порог баланса</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={(localSettings.lowBalanceThreshold / 100).toFixed(2)}
                                onChange={(e) => handleChange('lowBalanceThreshold', Math.round(parseFloat(e.target.value || 0) * 100))}
                                className="mt-2 w-32 bg-background border-input"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
