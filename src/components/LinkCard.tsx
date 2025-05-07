
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
}

export function LinkCard({ link, onEdit, onDelete, className }: LinkCardProps) {
  return (
    <div className={cn("bookmark-item bookmark-item_mode_cloud group/bookmark-item", className)}>
      <GripVertical className="h-4 w-4 text-muted-foreground mr-2 cursor-grab flex-shrink-0" aria-label="Drag to reorder" />
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bookmark-item__link"
        title={`${link.title}\n${link.url}`}
        onClick={(e) => {
          // Allow context menu or middle click to open in new tab without triggering SPA navigation if it were one
          if (e.ctrlKey || e.metaKey || e.button === 1) return;
          // e.preventDefault(); // No longer needed as it's a real link
          // window.open(link.url, '_blank');
        }}
      >
        <div className="bookmark-item__icon-wrapper">
          <LinkIcon className="bookmark-item__icon" />
        </div>
        <div className="bookmark-item__info">
          <span className="bookmark-item__title-container">
            <span className="bookmark-item__title">{link.title}</span>
          </span>
          {/* Optionally show URL if design requires it later */}
          {/* <p className="bookmark-item__url">{link.url}</p> */}
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
