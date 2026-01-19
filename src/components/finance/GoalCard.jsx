import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target, Calendar, TrendingUp, CheckCircle } from 'lucide-react';
import { formatMoney } from './constants';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function GoalCard({ goal, onClick }) {
    const percentage = goal.targetAmount > 0
        ? Math.round((goal.currentAmount / goal.targetAmount) * 100)
        : 0;
    const remaining = goal.targetAmount - goal.currentAmount;
    const isCompleted = goal.isCompleted || percentage >= 100;

    const daysUntilDeadline = goal.deadlineDate
        ? differenceInDays(parseISO(goal.deadlineDate), new Date())
        : null;

    const dailyRequired = daysUntilDeadline && daysUntilDeadline > 0 && remaining > 0
        ? Math.ceil(remaining / daysUntilDeadline)
        : null;

    const weeklyRequired = dailyRequired ? dailyRequired * 7 : null;

    return (
        <Card
            className="p-5 bg-card border-border hover:border-primary/50 cursor-pointer transition-all"
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: goal.color ? `${goal.color}15` : 'rgb(59 130 246 / 0.1)' }}
                    >
                        {isCompleted ? (
                            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                        ) : (
                            <Target className="w-6 h-6" style={{ color: goal.color || '#3b82f6' }} />
                        )}
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{goal.name}</p>
                        {goal.deadlineDate && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(goal.deadlineDate), 'd MMM yyyy', { locale: ru })}
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-lg font-bold ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                        {percentage}%
                    </p>
                </div>
            </div>

            <Progress
                value={Math.min(percentage, 100)}
                className="h-3"
                indicatorClassName={isCompleted ? 'bg-green-500' : 'bg-primary'}
            />

            <div className="flex items-center justify-between mt-4">
                <div>
                    <p className="text-sm text-muted-foreground">Накоплено</p>
                    <p className="font-semibold text-foreground">
                        {formatMoney(goal.currentAmount, goal.currency)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Цель</p>
                    <p className="font-semibold text-foreground">
                        {formatMoney(goal.targetAmount, goal.currency)}
                    </p>
                </div>
            </div>

            {!isCompleted && remaining > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                    {dailyRequired && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            <span>
                                Откладывайте {formatMoney(weeklyRequired, goal.currency)}/нед, чтобы успеть
                            </span>
                        </div>
                    )}
                    {!daysUntilDeadline && (
                        <p className="text-sm text-muted-foreground">
                            Осталось: {formatMoney(remaining, goal.currency)}
                        </p>
                    )}
                </div>
            )}

            {isCompleted && (
                <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Цель достигнута!</span>
                    </div>
                </div>
            )}
        </Card>
    );
}
