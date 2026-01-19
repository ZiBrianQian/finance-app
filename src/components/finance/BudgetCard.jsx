import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { formatMoney } from './constants';
import CategoryIcon from './CategoryIcon';

export default function BudgetCard({ rule, category, spent, currency, daysLeft, totalDays }) {
    const limit = rule.limitAmount;
    const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const remaining = limit - spent;
    const isOver = percentage >= 100;
    const isWarning = percentage >= (rule.alertThreshold || 80);

    const dailyPace = totalDays > 0 ? spent / (totalDays - daysLeft || 1) : 0;
    const projectedSpend = dailyPace * totalDays;
    const willExceed = projectedSpend > limit;

    return (
        <Card className="p-4 bg-card border-border">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    {category && (
                        <CategoryIcon icon={category.icon} color={category.color} size={20} className="w-10 h-10" />
                    )}
                    <div>
                        <p className="font-medium text-foreground">{category?.name || 'Все расходы'}</p>
                        <p className="text-sm text-muted-foreground">
                            {formatMoney(spent, currency)} из {formatMoney(limit, currency)}
                        </p>
                    </div>
                </div>
                {isOver ? (
                    <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Превышен</span>
                    </div>
                ) : isWarning ? (
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">{percentage}%</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">{percentage}%</span>
                    </div>
                )}
            </div>

            <Progress
                value={Math.min(percentage, 100)}
                className="h-2"
                indicatorClassName={isOver ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'}
            />

            <div className="flex items-center justify-between mt-3 text-sm">
                <span className={`${remaining >= 0 ? 'text-muted-foreground' : 'text-red-600 dark:text-red-400'}`}>
                    {remaining >= 0 ? `Осталось: ${formatMoney(remaining, currency)}` : `Перерасход: ${formatMoney(-remaining, currency)}`}
                </span>
                {daysLeft > 0 && remaining > 0 && (
                    <span className="text-muted-foreground">
                        ~{formatMoney(Math.round(remaining / daysLeft), currency)}/день
                    </span>
                )}
            </div>

            {willExceed && !isOver && daysLeft > 0 && (
                <div className="flex items-center gap-2 mt-3 p-2 bg-amber-500/10 rounded-lg text-amber-700 dark:text-amber-400 text-sm">
                    <TrendingUp className="w-4 h-4" />
                    <span>При текущем темпе вы превысите лимит</span>
                </div>
            )}
        </Card>
    );
}
