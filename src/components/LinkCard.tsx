
"use client";

import type { LinkItem } from '@/types';
import { Button } from '@/components/ui/button';
import { LinkIcon, Pencil, Trash2, GripVertical } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';

interface LinkCardProps {
  link: LinkItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
  onDragStartHandler: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragOverHandler: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDropHandler: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDragLeaveHandler: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEndHandler: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

export function LinkCard({ 
  link, 
  onEdit, 
  onDelete, 
  className,
  onDragStartHandler,
  onDragOverHandler,
  onDropHandler,
  onDragLeaveHandler,
  onDragEndHandler,
  isDragging,
  isDragOver,
}: LinkCardProps) {
  return (
    <div 
      draggable={true}
      onDragStart={(e) => onDragStartHandler(e, link.id)}
      onDragOver={(e) => onDragOverHandler(e, link.id)}
      onDrop={(e) => onDropHandler(e, link.id)}
      onDragLeave={onDragLeaveHandler}
      onDragEnd={onDragEndHandler}
      className={cn(
        "bookmark-item bookmark-item_mode_cloud group/bookmark-item",
        "py-px px-[0.5em]", // Apply requested padding via Tailwind
        className,
        isDragging && "opacity-50 cursor-grabbing",
        isDragOver && "ring-2 ring-primary ring-offset-1"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground mr-2 cursor-grab flex-shrink-0" aria-label="Drag to reorder" />
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bookmark-item__link"
        title={`${link.title}\n${link.url}`}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.button === 1) return;
        }}
      >
        <div className="bookmark-item__icon-wrapper">
          <LinkIcon className="bookmark-item__icon" />
        </div>
        <div className="bookmark-item__info">
          <span className="bookmark-item__title-container">
            <span className="bookmark-item__title">{link.title}</span>
          </span>
        </div>
      </a>
      <div className="bookmark-item__actions">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(link.id); }}
          aria-label={`Edit ${link.title}`}
          className="h-6 w-6 p-1"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              aria-label={`Delete ${link.title}`}
              className="h-6 w-6 p-1 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the link "{link.title}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(link.id); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
