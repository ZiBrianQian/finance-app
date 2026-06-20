import React from 'react';
import { Card } from '@/components/ui/card';
import { Wallet, CreditCard, Building2, PiggyBank, Landmark, Star } from 'lucide-react';
import { formatMoney } from './constants';

const icons = {
    cash: Wallet,
    card: CreditCard,
    bank: Building2,
    savings: PiggyBank,
    other: Landmark,
};

export default function AccountCard({ account, balance, onClick, compact = false, showPrimary = true }) {
    const Icon = icons[account.type] || Wallet;
    const isNegative = balance < 0;

    if (compact) {
        return (
            <div
                className="flex min-w-0 items-center gap-3 p-3 bg-card rounded-xl border border-border hover:border-primary/50 cursor-pointer transition-all"
                onClick={onClick}
            >
                <div
                    className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: account.color ? `${account.color}15` : 'var(--muted)' }}
                >
                    <Icon className="w-5 h-5" style={{ color: account.color || '#64748b' }} />
                </div>
                <div className="money-fit-container min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <p className="min-w-0 font-medium text-foreground truncate">{account.name}</p>
                        {showPrimary && account.isPrimary && (
                            <Star className="w-3.5 h-3.5 shrink-0 text-amber-500 fill-amber-500" />
                        )}
                    </div>
                    <div className="mt-1 flex min-w-0 items-baseline justify-between gap-2">
                        <p className="shrink-0 text-xs text-muted-foreground">{account.currency}</p>
                        <p className={`money-value money-value-compact money-value-truncate text-right font-semibold ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                            {formatMoney(balance, account.currency)}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <Card
            className="p-5 cursor-pointer hover:shadow-md transition-all border-border hover:border-primary/50 bg-card"
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-4">
                <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: account.color ? `${account.color}15` : 'var(--muted)' }}
                >
                    <Icon className="w-6 h-6" style={{ color: account.color || '#64748b' }} />
                </div>
                {showPrimary && account.isPrimary && (
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
            </div>
            <p className="text-sm text-muted-foreground mb-1">{account.name}</p>
            <p className={`money-value money-value-lg max-w-full font-bold ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {formatMoney(balance, account.currency)}
            </p>
        </Card>
    );
}
