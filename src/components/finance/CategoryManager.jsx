import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Pencil, Archive, Trash2, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import CategoryIcon from './CategoryIcon';
import { CATEGORY_ICONS, COLORS } from './constants';

export default function CategoryManager({
    open,
    onOpenChange,
    categories,
    onCreate,
    onUpdate,
    onDelete
}) {
    const [editingCategory, setEditingCategory] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState('expense');
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('ShoppingCart');
    const [color, setColor] = useState(COLORS[0]);

    const expenseCategories = categories.filter(c => c.type === 'expense');
    const incomeCategories = categories.filter(c => c.type === 'income');

    const resetForm = () => {
        setName('');
        setIcon('ShoppingCart');
        setColor(COLORS[0]);
        setEditingCategory(null);
        setShowForm(false);
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setName(category.name);
        setIcon(category.icon);
        setColor(category.color);
        setFormType(category.type);
        setShowForm(true);
    };

    const handleSubmit = async () => {
        const data = { name, icon, color, type: formType };

        if (editingCategory) {
            await onUpdate({ id: editingCategory.id, data });
        } else {
            await onCreate(data);
        }
        resetForm();
    };

    const handleArchive = async (category) => {
        await onUpdate({ id: category.id, data: { isArchived: !category.isArchived } });
    };

    const renderCategoryList = (cats) => (
        <div className="space-y-2">
            {cats.map(category => (
                <div
                    key={category.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${category.isArchived ? 'bg-muted/50 opacity-60' : 'bg-card'
                        } border-border`}
                >
                    <div className="flex items-center gap-3">
                        <CategoryIcon icon={category.icon} color={category.color} size={20} className="w-10 h-10" />
                        <span className={`font-medium ${category.isArchived ? 'line-through' : ''}`}>
                            {category.name}
                        </span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(category)}>
                                <Pencil className="w-4 h-4 mr-2" /> Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(category)}>
                                <Archive className="w-4 h-4 mr-2" />
                                {category.isArchived ? 'Восстановить' : 'Архивировать'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDelete(category.id)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" /> Удалить
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ))}
            {cats.length === 0 && (
                <p className="text-center text-slate-500 py-8">Нет категорий</p>
            )}
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Управление категориями</DialogTitle>
                </DialogHeader>

                {showForm ? (
                    <div className="space-y-4 mt-4">
                        <div>
                            <Label className="text-sm text-slate-500">Название</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Название категории"
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <Label className="text-sm text-slate-500">Иконка</Label>
                            <div className="grid grid-cols-8 gap-2 mt-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
                                {CATEGORY_ICONS.map(i => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setIcon(i)}
                                        className={`p-2 rounded-lg transition-all ${icon === i ? 'bg-blue-100 dark:bg-blue-900/20 ring-2 ring-blue-500' : 'hover:bg-accent'
                                            }`}
                                    >
                                        <CategoryIcon icon={i} color={icon === i ? color : '#64748b'} size={20} className="w-8 h-8" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <Label className="text-sm text-slate-500">Цвет</Label>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {COLORS.map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button variant="outline" className="flex-1" onClick={resetForm}>
                                Отмена
                            </Button>
                            <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim()}>
                                {editingCategory ? 'Сохранить' : 'Создать'}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Tabs defaultValue="expense" value={formType} onValueChange={setFormType} className="mt-4">
                        <div className="flex items-center justify-between mb-4">
                            <TabsList>
                                <TabsTrigger value="expense">Расходы</TabsTrigger>
                                <TabsTrigger value="income">Доходы</TabsTrigger>
                            </TabsList>
                            <Button size="sm" onClick={() => setShowForm(true)}>
                                <Plus className="w-4 h-4 mr-1" /> Добавить
                            </Button>
                        </div>

                        <TabsContent value="expense">
                            {renderCategoryList(expenseCategories)}
                        </TabsContent>
                        <TabsContent value="income">
                            {renderCategoryList(incomeCategories)}
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
