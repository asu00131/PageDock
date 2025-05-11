
"use client";

import type { LinkItem, LinkCollectionDisplaySettings } from '@/types';
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
  displaySettings: LinkCollectionDisplaySettings;
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
  isLayoutEditing?: boolean;
}

export function LinkCard({ 
  link, 
  displaySettings,
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
  isLayoutEditing,
}: LinkCardProps) {
  const { displayMode, iconSize, titleLines } = displaySettings;

  const iconClasses = cn("bookmark-item__icon", {
    "h-4 w-4": iconSize === 'small', // Default
    "h-5 w-5": iconSize === 'medium',
    "h-6 w-6": iconSize === 'large',
  });

  const titleContainerClasses = cn("bookmark-item__title-container", {
    "hidden": titleLines === 0,
  });
  
  const titleClasses = cn("bookmark-item__title", {
    "truncate": titleLines === 1,
    "line-clamp-2": titleLines === 2,
    // No specific class for -1 (full title) or other positive numbers, relies on default behavior or parent width
  });


  return (
    <div 
      draggable={isLayoutEditing}
      onDragStart={(e) => onDragStartHandler(e, link.id)}
      onDragOver={(e) => onDragOverHandler(e, link.id)}
      onDrop={(e) => onDropHandler(e, link.id)}
      onDragLeave={onDragLeaveHandler}
      onDragEnd={onDragEndHandler}
      className={cn(
        "bookmark-item group/bookmark-item",
        {
          "bookmark-item_mode_cloud": displayMode === 'cloud',
          "bookmark-item_mode_icons": displayMode === 'icons',
          "bookmark-item_mode_list": displayMode === 'list',
          "bookmark-item_mode_detailed-list": displayMode === 'detailedList',
          "py-px px-[0.5em]": displayMode === 'cloud' || displayMode === 'icons', 
        },
        className,
        isDragging && "opacity-50 cursor-grabbing",
        isDragOver && "ring-2 ring-primary ring-offset-1",
        isLayoutEditing && "cursor-grab"
      )}
    >
      <GripVertical 
        className={cn(
            "h-4 w-4 text-muted-foreground mr-2 flex-shrink-0",
            isLayoutEditing ? "cursor-grab opacity-100" : "opacity-0 group-hover/bookmark-item:opacity-100" 
        )} 
        aria-label="拖动以重新排序" 
      />
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="bookmark-item__link"
        title={`${link.title}\n${link.url}`}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey || e.button === 1) return;
        }}
        draggable="false" 
      >
        {(displayMode === 'cloud' || displayMode === 'icons' || displayMode === 'detailedList' || displayMode === 'list') && (
          <div className="bookmark-item__icon-wrapper">
            <LinkIcon className={iconClasses} />
          </div>
        )}
        <div className="bookmark-item__info">
          <span className={titleContainerClasses}>
            <span className={titleClasses} style={titleLines > 2 ? { WebkitLineClamp: titleLines, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden'} : {}}>
              {link.title}
            </span>
          </span>
          {(displayMode === 'detailedList') && (
             <span className="bookmark-item__url">{link.url}</span>
          )}
        </div>
      </a>
      <div className={cn(
          "bookmark-item__actions",
          !isLayoutEditing && "opacity-0 group-hover/bookmark-item:opacity-100"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(link.id); }}
          aria-label={`编辑 ${link.title}`}
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
              aria-label={`删除 ${link.title}`}
              className="h-6 w-6 p-1 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>您确定吗？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作无法撤销。这将永久删除链接 “{link.title}”。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(link.id); }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
