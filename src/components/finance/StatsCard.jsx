import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatMoney } from './constants';

export default function StatsCard({ title, amount, currency, comparison, type = 'neutral', icon: Icon }) {
    const isPositive = comparison > 0;
    const isNegative = comparison < 0;

    const colors = {
        income: 'text-green-600 dark:text-green-400',
        expense: 'text-red-600 dark:text-red-400',
        neutral: 'text-foreground',
    };

    const bgColors = {
        income: 'bg-green-50 dark:bg-green-500/10',
        expense: 'bg-red-50 dark:bg-red-500/10',
        neutral: 'bg-secondary',
    };

    return (
        <Card className="p-5 bg-card border-border shadow-sm">
            <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                {Icon && (
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bgColors[type]}`}>
                        <Icon className={`w-5 h-5 ${colors[type]}`} />
                    </div>
                )}
            </div>
            <p className={`text-2xl font-bold mb-2 ${colors[type]}`}>
                {type === 'expense' ? '-' : ''}{formatMoney(Math.abs(amount), currency)}
            </p>
            {comparison !== undefined && comparison !== null && (
                <div className="flex items-center gap-1">
                    {isPositive ? (
                        <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : isNegative ? (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                        <Minus className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : isNegative ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'
                        }`}>
                        {isPositive ? '+' : ''}{comparison.toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">vs прошлый период</span>
                </div>
            )}
        </Card>
    );
}
