import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';

export default function MoneyInput({ value, onChange, className, ...props }) {
    // Determine initial display value
    const [displayValue, setDisplayValue] = useState('');

    const format = (val) => {
        if (!val && val !== 0) return '';
        const parts = val.toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts.join('.');
    };

    const unformat = (val) => {
        if (!val) return '';
        return val.toString().replace(/\s/g, '').replace(',', '.');
    };

    // Update display value when external value changes
    useEffect(() => {
        // Only update if the current display value (unformatted) doesn't match the new value
        // This prevents overwriting user input while typing weird chars (like trailing dot) 
        // if the parent value logic is simple.
        const currentRaw = unformat(displayValue);
        const newRaw = String(value);

        if (currentRaw !== newRaw && value !== undefined && value !== null) {
            setDisplayValue(format(value));
        } else if (value === '' && displayValue !== '') {
            setDisplayValue('');
        }
    }, [value]);

    const handleChange = (e) => {
        const val = e.target.value;

        // Allow digits, spaces, dots, commas
        if (/^[0-9\s.,]*$/.test(val)) {
            const raw = unformat(val);

            // Prevent multiple dots
            if ((raw.match(/\./g) || []).length > 1) return;

            // Update parent with raw value
            onChange(raw);

            // Update local display with formatted value immediately
            // Note: This forces cursor to end if we just replace content.
            // To properly handle cursor, we'd need selectionStart/End management.
            // For now, simpler: just update display, let cursor jump to end.
            // Most users type amount from left to right. Editing in middle will be annoying.
            // But implementing full cursor management is code-heavy.

            // Optimization: If user is deleting, we might not want to re-format immediately?
            // Let's just re-format.
            setDisplayValue(format(raw) + (val.endsWith('.') || val.endsWith(',') ? '.' : ''));
        }
    };

    return (
        <Input
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            className={`font-mono ${className}`}
            {...props}
        />
    );
}
