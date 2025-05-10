"use client";

import type { NoteAppWidget } from '@/types';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit3, Trash2, StickyNote, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
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
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
}

interface NoteWidgetProps extends WidgetDragProps {
  widget: NoteAppWidget;
  onOpenEditDialog: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

export function NoteWidget({
  widget,
  onOpenEditDialog,
  onDeleteWidget,
  isCollapsed,
  onToggleCollapse,
  onWidgetDragStart,
  onWidgetDragOver,
  onWidgetDragLeave,
  onWidgetDrop,
  onWidgetDragEnd,
  draggedWidgetId,
  dragOverWidgetId,
}: NoteWidgetProps) {
  
  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && (e.target.closest('a') || e.target.closest('button') || e.target.closest('[role="button"]'))) {
      return;
    }
    e.stopPropagation(); 
    onOpenEditDialog(widget.id);
  };
  
  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target instanceof HTMLElement && (e.target.closest('a') || e.target.closest('button') || e.target.closest('[role="button"]'))) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onOpenEditDialog(widget.id);
    }
  };

  return (
    <div 
      className={cn(
        "page-section__widget page-section__widget-draggable-area",
        draggedWidgetId === widget.id && "opacity-50 cursor-grabbing",
        dragOverWidgetId === widget.id && draggedWidgetId !== widget.id && "ring-2 ring-primary ring-offset-2 rounded-lg"
      )}
      draggable={true}
      onDragStart={(e) => onWidgetDragStart(e, widget.id)}
      onDragOver={(e) => onWidgetDragOver(e, widget.id)}
      onDrop={(e) => onWidgetDrop(e, widget.id)}
      onDragLeave={onWidgetDragLeave}
      onDragEnd={onWidgetDragEnd}
    >
      <article className="widget note-widget">
        <div className="widget__container">
          <header className="widget__header widget-header_hovered">
            <div className="widget-header__drag-handle">
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
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
              <StickyNote className="widget-header__feather-icon h-5 w-5 mr-2" />
              <span className="widget-header__text text-lg font-semibold">{widget.title}</span>
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
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>编辑笔记</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()} 
                        onClick={(e) => e.stopPropagation()} 
                        className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10 focus:text-destructive-foreground hover:!text-destructive-foreground focus:!bg-destructive focus:!text-destructive-foreground"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>删除笔记</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>您确定吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                          {`此操作无法撤销。这将永久删除笔记 “${widget.title}”。`}
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
              <div 
                className="widget__body"
                onClick={handleBodyClick}
                role="button" 
                tabIndex={0} 
                onKeyDown={handleBodyKeyDown}
                aria-label={widget.data.content ? `笔记内容：${widget.title}，点击编辑` : `空笔记：${widget.title}，点击开始写作`}
              >
                {widget.data.content ? (
                   <div className="note-widget__content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{widget.data.content}</ReactMarkdown>
                   </div>
                ) : (
                  <div 
                    className="note-widget__empty-prompt"
                  >
                    <p>开始写...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

