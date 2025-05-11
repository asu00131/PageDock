
"use client";

import type { TodoItem } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface TodoItemCardProps {
  item: TodoItem;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateText: (id: string, text: string) => void;
  onDragStartHandler: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragOverHandler: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDropHandler: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragLeaveHandler: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEndHandler: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
  isLayoutEditing?: boolean; // Added to control dragability
}

export function TodoItemCard({
  item,
  onToggle,
  onDelete,
  onUpdateText,
  onDragStartHandler,
  onDragOverHandler,
  onDropHandler,
  onDragLeaveHandler,
  onDragEndHandler,
  isDragging,
  isDragOver,
  isLayoutEditing,
}: TodoItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleTextSubmit = () => {
    if (editText.trim() === '') {
      onDelete(item.id); 
    } else if (editText.trim() !== item.text) {
      onUpdateText(item.id, editText.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTextSubmit();
    } else if (e.key === 'Escape') {
      setEditText(item.text);
      setIsEditing(false);
    }
  };

  return (
    <div
      draggable={isLayoutEditing} // Only draggable if layout editing is active
      onDragStart={(e) => onDragStartHandler(e, item.id)}
      onDragOver={(e) => onDragOverHandler(e, item.id)}
      onDrop={(e) => onDropHandler(e, item.id)}
      onDragLeave={onDragLeaveHandler}
      onDragEnd={onDragEndHandler}
      className={cn(
        "todo-item group/todo-item", 
        isDragging && "opacity-50 cursor-grabbing",
        isDragOver && "ring-2 ring-primary ring-offset-1"
      )}
    >
      <div className="flex items-center">
        <GripVertical
          className={cn(
            "todo-item__drag-handle h-5 w-5",
            !isLayoutEditing && "opacity-0" // Hide drag handle if not in layout edit mode
          )}
          aria-label="拖动以重新排序"
        />
        <div className="todo-item__checkbox">
           <Checkbox
            id={`todo-${item.id}`}
            checked={item.completed}
            onCheckedChange={() => onToggle(item.id)}
            aria-label={item.completed ? `将 ${item.text} 标记为未完成` : `将 ${item.text} 标记为已完成`}
          />
        </div>

        {isEditing ? (
          <Input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleTextSubmit}
            onKeyDown={handleKeyDown}
            className="todo-item__input h-8 text-sm"
            aria-label={`编辑待办事项 ${item.text}`}
          />
        ) : (
          <div
            className={cn(
              "todo-item__text-content",
              item.completed && "todo-item__text-content_completed"
            )}
            onClick={() => { if (!isLayoutEditing) setIsEditing(true); }} // Don't allow edit by click if layout editing
            onDoubleClick={() => { if (!isLayoutEditing) setIsEditing(true); }} 
            role="button"
            tabIndex={isLayoutEditing ? -1 : 0} // Not focusable if layout editing
            onKeyDown={(e) => {if(!isLayoutEditing && (e.key === 'Enter' || e.key === ' ')) setIsEditing(true)}}
            aria-label={`待办事项：${item.text}。状态：${item.completed ? '已完成' : '未完成'}。点击以编辑。`}
          >
            {item.text}
          </div>
        )}

        <div className="todo-item__actions">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => e.stopPropagation()}
                aria-label={`删除 ${item.text}`}
                className="h-7 w-7 p-1 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>您确定吗？</AlertDialogTitle>
                <AlertDialogDescription>
                  {`此操作无法撤销。这将永久删除任务 “${item.text}”。`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id);}}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
