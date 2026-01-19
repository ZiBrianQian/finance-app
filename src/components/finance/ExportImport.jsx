import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, FileJson, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ExportImport({
    open,
    onOpenChange,
    accounts,
    categories,
    transactions,
    budgets,
    goals,
    onImport
}) {
    const fileInputRef = useRef(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    const exportJSON = () => {
        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            accounts,
            categories,
            transactions,
            budgets,
            goals
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `finance-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Резервная копия сохранена');
    };

    const exportCSV = () => {
        const headers = ['Дата', 'Тип', 'Сумма', 'Валюта', 'Категория', 'Счёт', 'Описание', 'Заметки', 'Теги'];
        const getCategoryName = (id) => categories.find(c => c.id === id)?.name || '';
        const getAccountName = (id) => accounts.find(a => a.id === id)?.name || '';

        const rows = transactions.map(tx => [
            tx.date,
            tx.type === 'income' ? 'Доход' : tx.type === 'expense' ? 'Расход' : 'Перевод',
            (tx.amount / 100).toFixed(2),
            tx.currency,
            getCategoryName(tx.categoryId),
            getAccountName(tx.accountId),
            tx.merchant || '',
            tx.notes || '',
            (tx.tags || []).join('; ')
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Транзакции экспортированы в CSV');
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setImportResult(null);

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.version || !data.accounts || !data.transactions) {
                throw new Error('Неверный формат файла');
            }

            await onImport(data);
            setImportResult({
                success: true,
                message: `Импортировано: ${data.accounts?.length || 0} счетов, ${data.categories?.length || 0} категорий, ${data.transactions?.length || 0} транзакций`
            });
            toast.success('Данные успешно импортированы');
        } catch (error) {
            setImportResult({ success: false, message: error.message || 'Ошибка при импорте' });
            toast.error('Ошибка при импорте');
        } finally {
            setImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Экспорт и импорт данных</DialogTitle>
                    <DialogDescription>
                        Создайте резервную копию или восстановите данные
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="export" className="mt-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="export">Экспорт</TabsTrigger>
                        <TabsTrigger value="import">Импорт</TabsTrigger>
                    </TabsList>

                    <TabsContent value="export" className="space-y-4 mt-4">
                        <div className="p-4 border rounded-xl hover:border-slate-300 cursor-pointer transition-all" onClick={exportJSON}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <FileJson className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-medium">JSON (полная копия)</p>
                                    <p className="text-sm text-slate-500">Все данные включая настройки</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border rounded-xl hover:border-slate-300 cursor-pointer transition-all" onClick={exportCSV}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium">CSV (транзакции)</p>
                                    <p className="text-sm text-slate-500">Для открытия в Excel</p>
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="import" className="space-y-4 mt-4">
                        <div
                            className="p-6 border-2 border-dashed rounded-xl text-center hover:border-blue-300 cursor-pointer transition-all"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="font-medium text-slate-700">Выберите файл JSON</p>
                            <p className="text-sm text-slate-500 mt-1">или перетащите сюда</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </div>

                        {importResult && (
                            <div className={`p-4 rounded-xl flex items-start gap-3 ${importResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                                }`}>
                                {importResult.success ? (
                                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                ) : (
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                )}
                                <p className="text-sm">{importResult.message}</p>
                            </div>
                        )}

                        <p className="text-xs text-slate-500">
                            Внимание: импорт заменит существующие данные. Рекомендуем сначала создать резервную копию.
                        </p>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
