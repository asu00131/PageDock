
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
      onDelete(item.id); // Delete if text is empty
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
      draggable={true}
      onDragStart={(e) => onDragStartHandler(e, item.id)}
      onDragOver={(e) => onDragOverHandler(e, item.id)}
      onDrop={(e) => onDropHandler(e, item.id)}
      onDragLeave={onDragLeaveHandler}
      onDragEnd={onDragEndHandler}
      className={cn(
        "todo-item group/todo-item p-2 rounded-md hover:bg-accent/50", // Added group/todo-item here
        isDragging && "opacity-50 cursor-grabbing",
        isDragOver && "ring-2 ring-primary ring-offset-1"
      )}
    >
      <div className="flex items-center">
        <GripVertical
          className="todo-item__drag-handle h-5 w-5"
          aria-label="Drag to reorder"
        />
        <div className="todo-item__checkbox">
           <Checkbox
            id={`todo-${item.id}`}
            checked={item.completed}
            onCheckedChange={() => onToggle(item.id)}
            aria-label={item.completed ? `Mark ${item.text} as incomplete` : `Mark ${item.text} as complete`}
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
            aria-label={`Edit todo text for ${item.text}`}
          />
        ) : (
          <div
            className={cn(
              "todo-item__text-content",
              item.completed && "todo-item__text-content_completed"
            )}
            onClick={() => setIsEditing(true)}
            onDoubleClick={() => setIsEditing(true)} // For accessibility
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {if(e.key === 'Enter' || e.key === ' ') setIsEditing(true)}}
            aria-label={`Todo item: ${item.text}. Status: ${item.completed ? 'Completed' : 'Incomplete'}. Click to edit.`}
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
                aria-label={`Delete ${item.text}`}
                className="h-7 w-7 p-1 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the task "{item.text}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id);}}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

