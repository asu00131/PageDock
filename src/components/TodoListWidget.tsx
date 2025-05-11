
"use client";

import type { TodoListAppWidget, TodoItem } from '@/types';
import { useState, useMemo }from 'react';
import { TodoItemCard } from './TodoItemCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ListChecks, Edit3, MoreVertical, Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type React from 'react';
import { cn } from '@/lib/utils';

interface WidgetDragProps {
  onWidgetDragStart: (e: React.DragEvent<HTMLDivElement>, widgetId: string) => void;
  onWidgetDragOver: (e: React.DragEvent<HTMLDivElement>, widgetId: string) => void;
  onWidgetDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onWidgetDrop: (e: React.DragEvent<HTMLDivElement>, widgetId: string) => void;
  onWidgetDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  draggedWidgetId: string | null;
  dragOverWidgetId: string | null;
  isLayoutEditing?: boolean;
}

interface TodoListWidgetProps extends WidgetDragProps {
  widget: TodoListAppWidget;
  onOpenWidgetTitleDialog: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  onAddItem: (widgetId: string, text: string) => void;
  onToggleItem: (widgetId: string, itemId: string) => void;
  onDeleteItem: (widgetId: string, itemId: string) => void;
  onUpdateItemText: (widgetId: string, itemId: string, text: string) => void;
  onReorderItems: (widgetId: string, items: TodoItem[]) => void;
  onToggleShowCompleted: (widgetId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

export function TodoListWidget({
  widget,
  onOpenWidgetTitleDialog,
  onDeleteWidget,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateItemText,
  onReorderItems,
  onToggleShowCompleted,
  isCollapsed,
  onToggleCollapse,
  onWidgetDragStart,
  onWidgetDragOver,
  onWidgetDragLeave,
  onWidgetDrop,
  onWidgetDragEnd,
  draggedWidgetId,
  dragOverWidgetId,
  isLayoutEditing,
}: TodoListWidgetProps) {
  const [newItemText, setNewItemText] = useState('');
  
  const [draggedTodoItemId, setDraggedTodoItemId] = useState<string | null>(null);
  const [dragOverTodoItemId, setDragOverTodoItemId] = useState<string | null>(null);

  const handleAddItem = () => {
    if (newItemText.trim() !== '') {
      onAddItem(widget.id, newItemText.trim());
      setNewItemText('');
    }
  };

  const completedItems = useMemo(() => widget.data.items.filter(item => item.completed), [widget.data.items]);
  const progressPercentage = widget.data.items.length > 0 ? (completedItems.length / widget.data.items.length) * 100 : 0;

  const displayedItems = widget.data.showCompleted ? widget.data.items : widget.data.items.filter(item => !item.completed);

  // Todo Item Drag Handlers
  const handleTodoItemDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (!isLayoutEditing) { e.preventDefault(); return; } // Allow item drag only in layout editing mode for consistency
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggedTodoItemId(id);
    setDragOverTodoItemId(null); 
  };

  const handleTodoItemDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (!isLayoutEditing || !draggedTodoItemId) return;
    e.preventDefault(); 
    if (id !== draggedTodoItemId) {
        setDragOverTodoItemId(id);
    }
  };
  
  const handleTodoItemDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isLayoutEditing) return;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOverTodoItemId(null);
  };

  const handleTodoItemDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    if (!isLayoutEditing || !draggedTodoItemId) return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedTodoItemId;
    
    setDragOverTodoItemId(null); 
    setDraggedTodoItemId(null); 

    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = widget.data.items.findIndex(item => item.id === sourceId);
    const targetIndex = widget.data.items.findIndex(item => item.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const reorderedItems = Array.from(widget.data.items);
    const [draggedItem] = reorderedItems.splice(sourceIndex, 1);
    reorderedItems.splice(targetIndex, 0, draggedItem);

    onReorderItems(widget.id, reorderedItems);
  };
  
  const handleTodoItemDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isLayoutEditing) return;
    setDraggedTodoItemId(null);
    setDragOverTodoItemId(null);
  };

  const handleTodoItemContainerDragOver = (e: React.DragEvent<HTMLUListElement>) => {
    if (!isLayoutEditing || !draggedTodoItemId) return;
    e.preventDefault();
  };

  const handleTodoItemContainerDrop = (e: React.DragEvent<HTMLUListElement>) => {
    if (!isLayoutEditing || !draggedTodoItemId) return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedTodoItemId;
    
    setDraggedTodoItemId(null);
    setDragOverTodoItemId(null);

    if (!sourceId) return;

    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('.todo-item')) { 
      return; 
    }
    
    const sourceIndex = widget.data.items.findIndex(item => item.id === sourceId);
    if (sourceIndex === -1) return;

    const reorderedItems = Array.from(widget.data.items);
    const [draggedItem] = reorderedItems.splice(sourceIndex, 1);
    reorderedItems.push(draggedItem); 
    onReorderItems(widget.id, reorderedItems);
  };


  return (
    <div 
      className={cn(
        "page-section__widget",
        isLayoutEditing && "is-layout-editing",
        draggedWidgetId === widget.id && "opacity-50 cursor-grabbing",
        dragOverWidgetId === widget.id && draggedWidgetId !== widget.id && "ring-2 ring-primary ring-offset-2 rounded-lg"
      )}
      draggable={isLayoutEditing}
      onDragStart={(e) => onWidgetDragStart(e, widget.id)}
      onDragOver={(e) => onWidgetDragOver(e, widget.id)}
      onDrop={(e) => onWidgetDrop(e, widget.id)}
      onDragLeave={onWidgetDragLeave}
      onDragEnd={onWidgetDragEnd}
    >
      <article className="widget todo-widget group/widget">
        <div className="widget__container">
          <header className="widget__header">
            <div className="widget-header__drag-handle">
                <GripVertical className="h-5 w-5" />
            </div>
             <div 
              className="widget-header__title-clickable-area"
              onClick={() => onToggleCollapse(widget.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse(widget.id); } }}
              aria-expanded={!isCollapsed}
              aria-controls={`widget-body-${widget.id}`}
            >
              <ListChecks className="widget-header__feather-icon h-5 w-5 mr-2" />
              <span className="widget-header__text text-lg font-semibold">{widget.title}</span>
              {isCollapsed ? <ChevronDown className="widget-header__chevron" /> : <ChevronUp className="widget-header__chevron" />}
            </div>
            <div className="widget-header__controls">
              {!isCollapsed && (
                <div className="flex items-center space-x-2 mr-2">
                  <Label htmlFor={`show-completed-${widget.id}`} className="widget-header__control-label text-sm">
                    {widget.data.showCompleted ? "隐藏已完成" : "显示已完成"}
                  </Label>
                  <Switch
                    id={`show-completed-${widget.id}`}
                    checked={widget.data.showCompleted}
                    onCheckedChange={() => onToggleShowCompleted(widget.id)}
                    aria-label={widget.data.showCompleted ? "隐藏已完成任务" : "显示已完成任务"}
                  />
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">{`${widget.title} 的更多选项`}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onOpenWidgetTitleDialog(widget.id)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>编辑列表标题</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                         className="text-destructive focus:text-destructive-foreground hover:!text-destructive-foreground hover:!bg-destructive/90 focus:!bg-destructive focus:!text-destructive-foreground"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>删除列表</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>您确定吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                          {`此操作无法撤销。这将永久删除列表 “${widget.title}” 及其所有任务。`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteWidget(widget.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          {!isCollapsed && (
            <div className="widget__box" id={`widget-body-${widget.id}`}>
              <div className="widget__body">
                <div className="todo-widget__progress-bar-container">
                  <Progress value={progressPercentage} className="flex-grow h-2" aria-label={`${Math.round(progressPercentage)}% 已完成`}/>
                  <span className="todo-widget__progress-amount">{`${Math.round(progressPercentage)}%`}</span>
                </div>
                
                {displayedItems.length === 0 && !widget.data.showCompleted && widget.data.items.length > 0 && (
                   <div className="todo-widget__empty-prompt">所有任务已完成！ 🎉</div>
                )}
                {widget.data.items.length === 0 && (
                    <div className="todo-widget__empty-prompt">暂无任务。在下方添加一个吧！</div>
                )}

                <ul 
                  className="todo-widget__list"
                  onDragOver={handleTodoItemContainerDragOver}
                  onDrop={handleTodoItemContainerDrop}
                >
                  {displayedItems.map(item => (
                    <li key={item.id}>
                      <TodoItemCard
                        item={item}
                        onToggle={(itemId) => onToggleItem(widget.id, itemId)}
                        onDelete={(itemId) => onDeleteItem(widget.id, itemId)}
                        onUpdateText={(itemId, text) => onUpdateItemText(widget.id, itemId, text)}
                        onDragStartHandler={handleTodoItemDragStart}
                        onDragOverHandler={handleTodoItemDragOver}
                        onDropHandler={handleTodoItemDrop}
                        onDragLeaveHandler={handleTodoItemDragLeave}
                        onDragEndHandler={handleTodoItemDragEnd}
                        isDragging={draggedTodoItemId === item.id}
                        isDragOver={dragOverTodoItemId === item.id && draggedTodoItemId !== item.id}
                        isLayoutEditing={isLayoutEditing}
                      />
                    </li>
                  ))}
                </ul>
                
                <div className="todo-widget__adder">
                  <Input
                    type="text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                    placeholder="添加新任务"
                    className="h-9 text-sm flex-grow"
                    aria-label="新任务输入框"
                  />
                  <Button onClick={handleAddItem} size="sm" aria-label="添加新任务按钮">
                    <Plus className="h-4 w-4 mr-1" /> 添加
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
