import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from 'lucide-react';

export default function QuickActions({ onAddExpense, onAddIncome, onAddTransfer }) {
    return (
        <div className="flex gap-2">
            <Button
                onClick={onAddExpense}
                className="bg-red-600 hover:bg-red-700 text-white gap-2 rounded-xl shadow-lg shadow-red-500/20"
            >
                <ArrowUpRight className="w-4 h-4" />
                <span className="hidden sm:inline">Расход</span>
            </Button>
            <Button
                onClick={onAddIncome}
                className="bg-green-600 hover:bg-green-700 text-white gap-2 rounded-xl shadow-lg shadow-green-500/20"
            >
                <ArrowDownLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Доход</span>
            </Button>
            <Button
                onClick={onAddTransfer}
                variant="outline"
                className="border-blue-200 text-blue-600 hover:bg-blue-50 gap-2 rounded-xl"
            >
                <ArrowLeftRight className="w-4 h-4" />
                <span className="hidden sm:inline">Перевод</span>
            </Button>
        </div>
    );
}
