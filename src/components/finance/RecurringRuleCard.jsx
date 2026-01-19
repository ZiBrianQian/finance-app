import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MoreHorizontal, Pencil, Trash2, Calendar, Repeat } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatMoney } from './constants';
import CategoryIcon from './CategoryIcon';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

const frequencyLabels = {
    daily: 'Ежедневно',
    weekly: 'Еженедельно',
    monthly: 'Ежемесячно',
    yearly: 'Ежегодно'
};

export default function RecurringRuleCard({ rule, category, account, onEdit, onDelete, onToggle }) {
    return (
        <Card className={`p-4 ${rule.isActive ? 'bg-card' : 'bg-muted opacity-60'} border-border`}>
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                    {category && (
                        <CategoryIcon icon={category.icon} color={category.color} size={20} className="w-10 h-10" />
                    )}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground">{rule.title}</h4>
                            <Badge variant={rule.type === 'income' ? 'default' : 'secondary'} className={
                                rule.type === 'income' ? 'bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-500/20 text-red-700 dark:text-red-400'
                            }>
                                {rule.type === 'income' ? 'Доход' : 'Расход'}
                            </Badge>
                        </div>

                        <p className={`text-lg font-bold mb-2 ${rule.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {rule.type === 'income' ? '+' : '-'}{formatMoney(rule.amount, rule.currency)}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Repeat className="w-4 h-4" />
                                <span>{frequencyLabels[rule.frequency]}</span>
                                {rule.interval > 1 && <span>(каждые {rule.interval})</span>}
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                <span>След.: {format(parseISO(rule.nextRunDate), 'd MMM yyyy', { locale: ru })}</span>
                            </div>
                            {category && <span>• {category.name}</span>}
                            {account && <span>• {account.name}</span>}
                        </div>

                        {rule.description && (
                            <p className="text-sm text-muted-foreground mt-2">{rule.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                    <Switch
                        checked={rule.isActive}
                        onCheckedChange={() => onToggle(rule)}
                    />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(rule)}>
                                <Pencil className="w-4 h-4 mr-2" /> Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(rule.id)} className="text-red-600 dark:text-red-400">
                                <Trash2 className="w-4 h-4 mr-2" /> Удалить
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </Card>
    );
}
