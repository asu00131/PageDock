
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
import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';

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

interface NoteWidgetProps extends WidgetDragProps {
  widget: NoteAppWidget;
  onOpenEditDialog: (widgetId: string) => void;
  onUpdateContent: (widgetId: string, newContent: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

export function NoteWidget({
  widget,
  onOpenEditDialog,
  onUpdateContent,
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
  isLayoutEditing, 
}: NoteWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(widget.data.content);

  useEffect(() => {
    if (!isEditing) {
      setEditedContent(widget.data.content);
    }
  }, [widget.data.content, isEditing]);

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLayoutEditing || isEditing) return;
    if (e.target instanceof HTMLElement && (e.target.closest('a, button'))) {
      return;
    }
    e.stopPropagation(); // Important to prevent widget body click if any
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdateContent(widget.id, editedContent);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(widget.data.content); 
    setIsEditing(false);
  };
  
  const handleBodyClickOrKeyDown = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditing || isLayoutEditing) {
      e.stopPropagation();
      return;
    }
    if (e.target instanceof HTMLElement && (e.target.closest('a, button, textarea') || e.target.closest('[role="button"]'))) {
      return;
    }
    
    let shouldTrigger = false;
    if (e.type === 'click') {
        shouldTrigger = true;
    } else if (e.type === 'keydown' && ( (e as React.KeyboardEvent).key === 'Enter' || (e as React.KeyboardEvent).key === ' ')) {
        shouldTrigger = true;
        e.preventDefault();
    }

    if (shouldTrigger) {
        e.stopPropagation();
        if (!widget.data.content) { // Only open full dialog if content is empty
            onOpenEditDialog(widget.id);
        }
    }
  };


  const isWidgetItselfDraggable = isLayoutEditing;

  return (
    <div 
      data-testid={`note-widget-${widget.id}`}
      className={cn(
        "page-section__widget",
        isLayoutEditing && "is-layout-editing",
        draggedWidgetId === widget.id && "opacity-50 cursor-grabbing",
        dragOverWidgetId === widget.id && draggedWidgetId !== widget.id && "ring-2 ring-primary ring-offset-2 rounded-lg"
      )}
      draggable={isWidgetItselfDraggable}
      onDragStart={(e) => {
        if (isWidgetItselfDraggable) {
          onWidgetDragStart(e, widget.id);
        } else {
          e.preventDefault();
        }
      }}
      onDragOver={(e) => { if (isLayoutEditing) onWidgetDragOver(e, widget.id);}}
      onDrop={(e) => { if (isLayoutEditing) onWidgetDrop(e, widget.id);}}
      onDragLeave={(e) => { if (isLayoutEditing) onWidgetDragLeave(e);}}
      onDragEnd={(e) => { if (isLayoutEditing) onWidgetDragEnd(e);}}
    >
      <article className="widget note-widget group/widget">
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
                         className="text-destructive focus:text-destructive-foreground hover:!text-destructive-foreground hover:!bg-destructive/90 focus:!bg-destructive focus:!text-destructive-foreground"
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
                className="widget__body relative" // Added relative for button positioning
                onClick={handleBodyClickOrKeyDown}
                onKeyDown={handleBodyClickOrKeyDown}
                role={!widget.data.content && !isLayoutEditing && !isEditing ? "button" : undefined}
                tabIndex={!widget.data.content && !isLayoutEditing && !isEditing ? 0 : undefined}
                aria-label={widget.data.content 
                    ? `笔记内容：${widget.title}。双击编辑。` 
                    : `空笔记：${widget.title}，点击开始写作`}
              >
                {isEditing ? (
                  <>
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="w-full min-h-[150px] p-2 border border-input focus:ring-1 focus:ring-ring bg-background text-foreground rounded-md text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        e.stopPropagation(); // Prevent widget drag/collapse while typing
                        if (e.ctrlKey && e.key === 'Enter') {
                           handleSave();
                        } else if (e.key === 'Escape') {
                           handleCancelEdit();
                        }
                      }}
                    />
                    <div className="absolute bottom-3 right-3 flex space-x-2">
                      <Button size="sm" onClick={(e) => {e.stopPropagation(); handleSave();}}>完成</Button>
                      <Button size="sm" variant="outline" onClick={(e) => {e.stopPropagation(); handleCancelEdit();}}>取消</Button>
                    </div>
                  </>
                ) : widget.data.content ? (
                   <div 
                      className="note-widget__content cursor-text" 
                      onDoubleClick={handleDoubleClick}
                      onClick={(e) => e.stopPropagation()} // Prevent body click opening dialog
                    >
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

