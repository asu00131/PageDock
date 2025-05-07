
"use client";

import type { TodoListAppWidget, TodoItem } from '@/types';
import { useState, useMemo }from 'react';
import { TodoItemCard } from './TodoItemCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ListChecks, Edit3, MoreVertical, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
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

interface TodoListWidgetProps {
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
}: TodoListWidgetProps) {
  const [newItemText, setNewItemText] = useState('');
  
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const handleAddItem = () => {
    if (newItemText.trim() !== '') {
      onAddItem(widget.id, newItemText.trim());
      setNewItemText('');
    }
  };

  const completedItems = useMemo(() => widget.data.items.filter(item => item.completed), [widget.data.items]);
  const progressPercentage = widget.data.items.length > 0 ? (completedItems.length / widget.data.items.length) * 100 : 0;

  const displayedItems = widget.data.showCompleted ? widget.data.items : widget.data.items.filter(item => !item.completed);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggedItemId(id);
    setDragOverItemId(null); 
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    e.preventDefault(); 
    if (id !== draggedItemId) {
        setDragOverItemId(id);
    }
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedItemId;
    
    setDragOverItemId(null); // Clear drag over item
    setDraggedItemId(null); // Clear dragged item

    if (!sourceId || sourceId === targetId) return;

    const sourceIndex = widget.data.items.findIndex(item => item.id === sourceId);
    const targetIndex = widget.data.items.findIndex(item => item.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) return;

    const reorderedItems = Array.from(widget.data.items);
    const [draggedItem] = reorderedItems.splice(sourceIndex, 1);
    reorderedItems.splice(targetIndex, 0, draggedItem);

    onReorderItems(widget.id, reorderedItems);
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLUListElement>) => {
    e.preventDefault();
  };

  const handleContainerDrop = (e: React.DragEvent<HTMLUListElement>) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedItemId;
    
    setDraggedItemId(null);
    setDragOverItemId(null);

    if (!sourceId) return;

    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('.todo-item')) {
      return; // Drop was on an item, handled by item's onDrop
    }
    
    const sourceIndex = widget.data.items.findIndex(item => item.id === sourceId);
    if (sourceIndex === -1) return;

    const reorderedItems = Array.from(widget.data.items);
    const [draggedItem] = reorderedItems.splice(sourceIndex, 1);
    reorderedItems.push(draggedItem); // Move to the end
    onReorderItems(widget.id, reorderedItems);
  };


  return (
    <div className="page-section__widget">
      <article className="widget todo-widget">
        <div className="widget__container">
          <header className="widget__header">
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
                    {widget.data.showCompleted ? "Hide completed" : "Show completed"}
                  </Label>
                  <Switch
                    id={`show-completed-${widget.id}`}
                    checked={widget.data.showCompleted}
                    onCheckedChange={() => onToggleShowCompleted(widget.id)}
                    aria-label={widget.data.showCompleted ? "Hide completed tasks" : "Show completed tasks"}
                  />
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">More options for {widget.title}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onOpenWidgetTitleDialog(widget.id)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>Edit List Title</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete List</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the list "{widget.title}" and all its tasks.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteWidget(widget.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
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
                  <Progress value={progressPercentage} className="flex-grow h-2" aria-label={`${Math.round(progressPercentage)}% completed`}/>
                  <span className="todo-widget__progress-amount">{`${Math.round(progressPercentage)}%`}</span>
                </div>
                
                {displayedItems.length === 0 && !widget.data.showCompleted && widget.data.items.length > 0 && (
                   <div className="todo-widget__empty-prompt">All tasks completed! 🎉</div>
                )}
                {widget.data.items.length === 0 && (
                    <div className="todo-widget__empty-prompt">No tasks yet. Add one below!</div>
                )}

                <ul 
                  className="todo-widget__list"
                  onDragOver={handleContainerDragOver}
                  onDrop={handleContainerDrop}
                >
                  {displayedItems.map(item => (
                    <li key={item.id}>
                      <TodoItemCard
                        item={item}
                        onToggle={(itemId) => onToggleItem(widget.id, itemId)}
                        onDelete={(itemId) => onDeleteItem(widget.id, itemId)}
                        onUpdateText={(itemId, text) => onUpdateItemText(widget.id, itemId, text)}
                        onDragStartHandler={handleDragStart}
                        onDragOverHandler={handleDragOver}
                        onDropHandler={handleDrop}
                        onDragLeaveHandler={handleDragLeave}
                        onDragEndHandler={handleDragEnd}
                        isDragging={draggedItemId === item.id}
                        isDragOver={dragOverItemId === item.id && draggedItemId !== item.id}
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
                    placeholder="Add a new task"
                    className="h-9 text-sm flex-grow"
                    aria-label="New task input"
                  />
                  <Button onClick={handleAddItem} size="sm" aria-label="Add new task">
                    <Plus className="h-4 w-4 mr-1" /> Add
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
