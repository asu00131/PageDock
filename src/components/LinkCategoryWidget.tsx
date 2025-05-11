
"use client";

import type { LinkCollectionAppWidget, LinkItem } from '@/types';
import { LinkGrid } from './LinkGrid';
import { Button } from '@/components/ui/button';
import { Edit3, MoreVertical, PlusCircle, Trash2, Bookmark, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'; 
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
import { cn } from '@/lib/utils';
import type React from 'react';

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

interface LinkCollectionWidgetProps extends WidgetDragProps {
  widget: LinkCollectionAppWidget;
  onOpenLinkDialog: (widgetId: string, link?: LinkItem) => void;
  onOpenWidgetTitleDialog: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  onEditLink: (widgetId: string, linkId: string) => void;
  onDeleteLink: (widgetId: string, linkId: string) => void;
  onLinksReordered: (widgetId: string, newLinks: LinkItem[]) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

export function LinkCollectionWidget({
  widget,
  onOpenLinkDialog,
  onOpenWidgetTitleDialog,
  onDeleteWidget,
  onEditLink,
  onDeleteLink,
  onLinksReordered,
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
}: LinkCollectionWidgetProps) {
  
  const handleEditLink = (linkId: string) => {
    onEditLink(widget.id, linkId);
  };

  const handleDeleteLink = (linkId: string) => {
    onDeleteLink(widget.id, linkId);
  };

  const handleLinksReordered = (newLinks: LinkItem[]) => {
    onLinksReordered(widget.id, newLinks);
  };

  return (
    <div 
      data-testid={`link-collection-widget-${widget.id}`}
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
      <article className="widget bookmark-widget group/widget">
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
              <Bookmark className="widget-header__feather-icon h-5 w-5 mr-2 text-[hsl(var(--link-card-foreground))]" />
              <span className="widget-header__text text-lg font-semibold text-[hsl(var(--link-card-foreground))]">{widget.title}</span>
              {isCollapsed ? <ChevronDown className="widget-header__chevron" /> : <ChevronUp className="widget-header__chevron" />}
            </div>
            <div className="widget-header__controls">
              <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => { e.stopPropagation(); onOpenLinkDialog(widget.id); }}>
                <PlusCircle className="widget-header__feather-icon h-4 w-4" />
                <span className="sr-only">{`为 ${widget.title} 添加链接`}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">{`${widget.title} 的更多选项`}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenWidgetTitleDialog(widget.id); }}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>编辑合集标题</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <DropdownMenuItem 
                         onSelect={(e) => e.preventDefault()} 
                         onClick={(e) => e.stopPropagation()} 
                         className="text-destructive focus:text-destructive-foreground hover:!text-destructive-foreground hover:!bg-destructive/90 focus:!bg-destructive focus:!text-destructive-foreground"
                       >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>删除合集</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>您确定吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                          {`此操作无法撤销。这将永久删除合集 “${widget.title}” 及其所有链接。`}
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
                <LinkGrid
                  links={widget.data.links}
                  onEdit={handleEditLink}
                  onDelete={handleDeleteLink}
                  onLinksReordered={handleLinksReordered}
                  isLayoutEditing={isLayoutEditing}
                />
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
