import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, subMonths, subYears, startOfYear, endOfYear, startOfWeek, endOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarIcon, ChevronRight } from 'lucide-react';

const PRESETS = [
    { label: 'Эта неделя', getValue: () => ({ start: startOfWeek(new Date(), { weekStartsOn: 1 }), end: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
    { label: 'Этот месяц', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
    { label: 'Прошлый месяц', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
    { label: 'Этот год', getValue: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) }) },
    { label: 'Прошлый год', getValue: () => ({ start: startOfYear(subYears(new Date(), 1)), end: endOfYear(subYears(new Date(), 1)) }) },
];

export default function DateRangePicker({
    value,
    onChange,
    label = 'Выберите период',
    showPresets = true,
    className = ''
}) {
    const [open, setOpen] = useState(false);
    const [selecting, setSelecting] = useState('start'); // 'start' or 'end'

    const handleDateSelect = (date) => {
        if (!date) return;

        if (selecting === 'start') {
            onChange({ start: date, end: value?.end || date });
            setSelecting('end');
        } else {
            // Ensure end is after start
            if (value?.start && date < value.start) {
                onChange({ start: date, end: value.start });
            } else {
                onChange({ start: value?.start || date, end: date });
            }
            setSelecting('start');
            setOpen(false);
        }
    };

    const handlePreset = (preset) => {
        const range = preset.getValue();
        onChange(range);
        setOpen(false);
    };

    const formatRange = () => {
        if (!value?.start || !value?.end) return label;

        const startStr = format(value.start, 'd MMM yyyy', { locale: ru });
        const endStr = format(value.end, 'd MMM yyyy', { locale: ru });

        if (startStr === endStr) return startStr;
        return `${format(value.start, 'd MMM', { locale: ru })} — ${endStr}`;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={`justify-start text-left font-normal ${!value?.start ? 'text-muted-foreground' : ''} ${className}`}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatRange()}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex">
                    {showPresets && (
                        <div className="border-r p-3 space-y-1">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Быстрый выбор</p>
                            {PRESETS.map((preset, i) => (
                                <Button
                                    key={i}
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start h-8 text-xs"
                                    onClick={() => handlePreset(preset)}
                                >
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    )}
                    <div className="p-3">
                        <div className="flex items-center gap-2 mb-3 text-sm">
                            <span
                                className={`px-2 py-1 rounded cursor-pointer transition-colors ${selecting === 'start'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-accent'
                                    }`}
                                onClick={() => setSelecting('start')}
                            >
                                {value?.start ? format(value.start, 'd MMM', { locale: ru }) : 'Начало'}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            <span
                                className={`px-2 py-1 rounded cursor-pointer transition-colors ${selecting === 'end'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:bg-accent'
                                    }`}
                                onClick={() => setSelecting('end')}
                            >
                                {value?.end ? format(value.end, 'd MMM', { locale: ru }) : 'Конец'}
                            </span>
                        </div>
                        <Calendar
                            mode="single"
                            selected={selecting === 'start' ? value?.start : value?.end}
                            onSelect={handleDateSelect}
                            locale={ru}
                            modifiers={{
                                range: value?.start && value?.end ? { from: value.start, to: value.end } : undefined,
                                rangeStart: value?.start,
                                rangeEnd: value?.end,
                            }}
                            modifiersClassNames={{
                                range: 'bg-primary/10',
                                rangeStart: 'bg-primary text-primary-foreground rounded-l-md',
                                rangeEnd: 'bg-primary text-primary-foreground rounded-r-md',
                            }}
                            initialFocus
                        />
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
