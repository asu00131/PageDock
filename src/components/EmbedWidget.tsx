
"use client";

import type { EmbedAppWidget } from '@/types';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit3, Trash2, Code2, ChevronDown, ChevronUp, Link2, GripVertical } from 'lucide-react';
import Image from 'next/image';
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

interface EmbedWidgetProps extends WidgetDragProps {
  widget: EmbedAppWidget;
  onOpenEditDialog: (widgetId: string) => void;
  onOpenWidgetTitleDialog: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

export function EmbedWidget({
  widget,
  onOpenEditDialog,
  onOpenWidgetTitleDialog,
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
}: EmbedWidgetProps) {
  const { embedUrl, embedType, iframeHeight } = widget.data;

  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLayoutEditing) {
      e.stopPropagation(); 
      return;
    }
    if (e.target instanceof HTMLElement && (e.target.closest('a, button, iframe, img'))) {
      return; // Don't trigger edit if clicking interactive elements within the embed
    }
    e.stopPropagation(); 
    if (!embedUrl) {
        onOpenEditDialog(widget.id);
    }
  };
  
  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isLayoutEditing) {
      e.stopPropagation();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target instanceof HTMLElement && (e.target.closest('a, button, iframe, img'))) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
       if (!embedUrl) {
           onOpenEditDialog(widget.id);
       }
    }
  };

  const isWidgetItselfDraggable = isLayoutEditing;

  return (
    <div
      data-testid={`embed-widget-${widget.id}`}
      className={cn(
        "page-section__widget",
        isLayoutEditing && "is-layout-editing",
        draggedWidgetId === widget.id && "opacity-50 cursor-grabbing",
        dragOverWidgetId === widget.id && draggedWidgetId !== widget.id && "ring-2 ring-primary ring-offset-2 rounded-lg"
      )}
      draggable={isWidgetItselfDraggable}
      onDragStart={(e) => {
        if (isWidgetItselfDraggable) onWidgetDragStart(e, widget.id); else e.preventDefault();
      }}
      onDragOver={(e) => { if (isLayoutEditing) onWidgetDragOver(e, widget.id);}}
      onDrop={(e) => { if (isLayoutEditing) onWidgetDrop(e, widget.id);}}
      onDragLeave={(e) => { if (isLayoutEditing) onWidgetDragLeave(e);}}
      onDragEnd={(e) => { if (isLayoutEditing) onWidgetDragEnd(e);}}
    >
      <article className="widget embed-widget group/widget">
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
              <Code2 className="widget-header__feather-icon h-5 w-5 mr-2" />
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
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onOpenWidgetTitleDialog(widget.id)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>编辑标题</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenEditDialog(widget.id)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    <span>编辑嵌入设置</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()} 
                         className="text-destructive focus:text-destructive-foreground hover:!text-destructive-foreground hover:!bg-destructive/90 focus:!bg-destructive focus:!text-destructive-foreground"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>删除嵌入内容</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>您确定吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                          {`此操作无法撤销。这将永久删除嵌入内容 “${widget.title}”。`}
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
                onKeyDown={handleBodyKeyDown}
                role={!embedUrl && !isLayoutEditing ? "button" : undefined}
                tabIndex={!embedUrl && !isLayoutEditing ? 0 : undefined}
                aria-label={embedUrl ? `${widget.title} embedded content` : `设置 ${widget.title} 的嵌入源`}
              >
                {!embedUrl ? (
                  <div className="embed-widget__empty-prompt">
                    <Code2 className="w-10 h-10 text-muted-foreground mb-3"/>
                    <p className="text-lg font-medium text-foreground mb-2">嵌入内容为空</p>
                    <p className="text-sm text-muted-foreground mb-4">编辑以设置嵌入网址或图片链接。</p>
                    <Button onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }}>
                      <Link2 className="mr-2 h-4 w-4" /> 嵌入代码，自适应图片，网址，代码
                    </Button>
                  </div>
                ) : embedType === 'iframe' ? (
                  <div className="embed-widget__iframe-container">
                    <iframe
                      src={embedUrl}
                      width="100%"
                      height={iframeHeight || '400px'}
                      frameBorder="0"
                      title={widget.title}
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms" // Common permissions
                      className="rounded-b-md"
                      loading="lazy"
                    ></iframe>
                  </div>
                ) : embedType === 'image' ? (
                  <div className="embed-widget__image-container">
                    <Image
                      src={embedUrl}
                      alt={widget.title}
                      width={0} 
                      height={0}
                      sizes="100vw"
                      style={{ width: '100%', height: 'auto', maxHeight: iframeHeight || '400px', objectFit: 'contain' }}
                      className="rounded-b-md"
                      data-ai-hint="embedded content"
                    />
                  </div>
                ) : (
                     <p className="p-4 text-center text-destructive">未知的嵌入类型。</p>
                )}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

