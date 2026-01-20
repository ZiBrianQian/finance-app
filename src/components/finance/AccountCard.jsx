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
                className="flex items-center justify-between p-3 bg-card rounded-xl border border-border hover:border-primary/50 cursor-pointer transition-all"
                onClick={onClick}
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: account.color ? `${account.color}15` : 'var(--muted)' }}
                    >
                        <Icon className="w-5 h-5" style={{ color: account.color || '#64748b' }} />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className="font-medium text-foreground">{account.name}</p>
                            {showPrimary && account.isPrimary && (
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">{account.currency}</p>
                    </div>
                </div>
                <p className={`font-semibold ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                    {formatMoney(balance, account.currency)}
                </p>
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
            <p className={`text-2xl font-bold ${isNegative ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                {formatMoney(balance, account.currency)}
            </p>
        </Card>
    );
}
