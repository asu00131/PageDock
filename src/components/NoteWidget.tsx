
"use client";

import type { NoteAppWidget, NoteWidgetData } from '@/types';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit3, Trash2, StickyNote, ChevronDown, ChevronUp } from 'lucide-react';
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

interface NoteWidgetProps {
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
}: NoteWidgetProps) {
  
  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Allow link clicks within markdown, but open edit dialog otherwise
    if (e.target instanceof HTMLElement && e.target.closest('a')) {
      return;
    }
    e.stopPropagation(); // Prevent collapse toggle if header is clicked through
    onOpenEditDialog(widget.id);
  };
  
  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target instanceof HTMLElement && e.target.closest('a') && e.key === 'Enter') {
        // Allow default 'Enter' behavior for links (e.g. if they were buttons)
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      onOpenEditDialog(widget.id);
    }
  };

  return (
    <div className="page-section__widget">
      <article className="widget note-widget">
        <div className="widget__container">
          <header className="widget__header widget-header_hovered">
            <div 
              className="flex items-center flex-grow cursor-pointer mr-2"
              onClick={() => onToggleCollapse(widget.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse(widget.id); } }}
              aria-expanded={!isCollapsed}
              aria-controls={`widget-body-${widget.id}`}
            >
              <StickyNote className="widget-header__feather-icon h-5 w-5 mr-2" />
              <span className="widget-header__text text-lg font-semibold">{widget.title}</span>
              {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" /> : <ChevronUp className="h-4 w-4 text-muted-foreground ml-2" />}
            </div>
            <div className="widget-header__controls">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">More options for {widget.title}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>Edit Note</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        onSelect={(e) => e.preventDefault()} 
                        onClick={(e) => e.stopPropagation()} 
                        className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete Note</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the note "{widget.title}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteWidget(widget.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
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
                {widget.data.content ? (
                   <div 
                     className="note-widget__content cursor-pointer" 
                     onClick={handleBodyClick}
                     role="button" 
                     tabIndex={0} 
                     onKeyDown={handleBodyKeyDown}
                   >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{widget.data.content}</ReactMarkdown>
                   </div>
                ) : (
                  <div 
                    className="note-widget__empty-prompt"
                    onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') {e.preventDefault(); e.stopPropagation(); onOpenEditDialog(widget.id);} }}
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
