import React from 'react';
import { Button } from '@/components/ui/button';
import { PERIOD_PRESETS } from './constants';

export default function PeriodSelector({ period, setPeriod, compact = false }) {
    return (
        <div className="flex items-center gap-1 flex-wrap">
            {PERIOD_PRESETS.filter(p => p.value !== 'custom').map(p => (
                <Button
                    key={p.value}
                    variant={period === p.value ? 'default' : 'ghost'}
                    size={compact ? 'sm' : 'default'}
                    onClick={() => setPeriod(p.value)}
                    className={`${compact ? 'h-8 px-3 text-xs' : 'h-9 px-4'} ${period === p.value
                        ? 'bg-foreground text-background hover:bg-foreground/90'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                >
                    {p.label}
                </Button>
            ))}
        </div>
    );
}
