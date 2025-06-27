
"use client";

import type { LinkCollectionAppWidget, LinkItem } from '@/types';
import { LinkGrid } from './LinkGrid';
import { Button } from '@/components/ui/button';
import { Edit3, MoreVertical, PlusCircle, Trash2, Bookmark, ChevronDown, ChevronUp, GripVertical, SlidersHorizontal, ListOrdered, Check, Upload } from 'lucide-react'; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useState } from 'react';


interface WidgetDragProps {
  onWidgetDragStart: (e: React.DragEvent<HTMLDivElement>, widgetId: string) => void;
  onWidgetDragOver: (e: React.DragEvent<HTMLDivElement>, widgetId: string) => void;
  onWidgetDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onWidgetDrop: (e: React.DragEvent<HTMLDivElement>, widgetId: string) => void;
  onWidgetDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  draggedWidgetId: string | null;
  dragOverWidgetId: string | null;
  isLayoutEditing?: boolean; // This is the GLOBAL layout editing state from HomePage
}

interface LinkCollectionWidgetProps extends WidgetDragProps {
  widget: LinkCollectionAppWidget;
  onOpenLinkDialog: (widgetId: string, link?: LinkItem) => void;
  onOpenBulkLinkDialog: (widgetId: string) => void;
  onOpenWidgetTitleDialog: (widgetId: string) => void;
  onOpenLinkDisplaySettingsDialog: (widgetId: string) => void; 
  onDeleteWidget: (widgetId: string) => void;
  onEditLink: (widgetId: string, linkId: string) => void;
  onDeleteLink: (widgetId: string, linkId: string) => void;
  onMoveLink: (source: { widgetId: string; linkId: string }, target: { widgetId: string; linkId: string | null }) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

export function LinkCollectionWidget({
  widget,
  onOpenLinkDialog,
  onOpenBulkLinkDialog,
  onOpenWidgetTitleDialog,
  onOpenLinkDisplaySettingsDialog, 
  onDeleteWidget,
  onEditLink,
  onDeleteLink,
  onMoveLink,
  isCollapsed,
  onToggleCollapse,
  onWidgetDragStart,
  onWidgetDragOver,
  onWidgetDragLeave,
  onWidgetDrop,
  onWidgetDragEnd,
  draggedWidgetId,
  dragOverWidgetId,
  isLayoutEditing, // This is the global layout editing mode from HomePage
}: LinkCollectionWidgetProps) {
  const [isItemSortingActive, setIsItemSortingActive] = useState(false);
  
  const handleEditLink = (linkId: string) => {
    onEditLink(widget.id, linkId);
  };

  const handleDeleteLink = (linkId: string) => {
    onDeleteLink(widget.id, linkId);
  };

  const handleToggleItemSorting = () => {
    setIsItemSortingActive(prev => !prev);
  };
  
  // Items are draggable if either the global layout editing is active OR item sorting for this widget is active
  const effectiveItemEditing = isLayoutEditing || isItemSortingActive;
  
  const isWidgetItselfDraggable = isLayoutEditing;

  return ( 
    <div 
      data-testid={`link-collection-widget-${widget.id}`}
      className={cn(
        "page-section__widget",
        isLayoutEditing && "is-layout-editing", 
        isItemSortingActive && "is-item-sorting",
        draggedWidgetId === widget.id && "opacity-50 cursor-grabbing",
        dragOverWidgetId === widget.id && draggedWidgetId !== widget.id && "ring-2 ring-primary ring-offset-2 rounded-lg"
      )}
      draggable={isWidgetItselfDraggable} 
      onDragStart={(e) => {
        e.stopPropagation();
        if (isWidgetItselfDraggable) {
          onWidgetDragStart(e, widget.id);
        } else {
          e.preventDefault(); 
        }
      }}
      // These handlers are for when ANOTHER widget is dragged over THIS widget.
      // They should be active if global layout editing is on.
      onDragOver={(e) => { e.stopPropagation(); if (isLayoutEditing) onWidgetDragOver(e, widget.id);}}
      onDrop={(e) => { e.stopPropagation(); if (isLayoutEditing) onWidgetDrop(e, widget.id);}}
      onDragLeave={(e) => { e.stopPropagation(); if (isLayoutEditing) onWidgetDragLeave(e);}}
      onDragEnd={(e) => { e.stopPropagation(); if (isLayoutEditing) onWidgetDragEnd(e);}}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">{`${widget.title} 的更多选项`}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenLinkDialog(widget.id); }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>添加书签</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenBulkLinkDialog(widget.id); }}>
                    <Upload className="mr-2 h-4 w-4" />
                    <span>批量添加书签</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenWidgetTitleDialog(widget.id); }}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>编辑合集标题</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenLinkDisplaySettingsDialog(widget.id); }}> 
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    <span>显示设置</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleToggleItemSorting(); }}>
                    {isItemSortingActive 
                      ? <Check className="mr-2 h-4 w-4" /> 
                      : <ListOrdered className="mr-2 h-4 w-4" />
                    }
                    <span>{isItemSortingActive ? "完成排序" : "书签排序"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <DropdownMenuItem 
                         onSelect={(e) => e.preventDefault()} 
                         className="text-destructive focus:text-destructive-foreground hover:!text-destructive-foreground hover:!bg-destructive/90 focus:!bg-destructive focus:!text-destructive-foreground"
                       >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>删除合集</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
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
                  displaySettings={widget.data.displaySettings} 
                  onEdit={handleEditLink}
                  onDelete={handleDeleteLink}
                  onMoveLink={onMoveLink}
                  widgetId={widget.id}
                  isLayoutEditing={effectiveItemEditing} 
                />
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
