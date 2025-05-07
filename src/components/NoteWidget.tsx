
"use client";

import type { NoteAppWidget, NoteWidgetData } from '@/types';
import { Button } from '@/components/ui/button';
import { MoreVertical, Edit3, Trash2, StickyNote } from 'lucide-react';
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
}

export function NoteWidget({
  widget,
  onOpenEditDialog,
  onDeleteWidget,
}: NoteWidgetProps) {
  return (
    <div className="page-section__widget">
      <article className="widget note-widget">
        <div className="widget__container">
          <header className="widget__header widget-header_hovered">
            <h2 className="widget-header__title">
              <StickyNote className="widget-header__feather-icon h-5 w-5 mr-2" />
              <span className="widget-header__text">{widget.title}</span>
            </h2>
            <div className="widget-header__controls">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7">
                    <MoreVertical className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">More options for {widget.title}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpenEditDialog(widget.id)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>Edit Note</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete Note</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
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
          <div className="widget__box">
            <div className="widget__body">
              {widget.data.content ? (
                 <div className="note-widget__content" onClick={() => onOpenEditDialog(widget.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && onOpenEditDialog(widget.id)} >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{widget.data.content}</ReactMarkdown>
                 </div>
              ) : (
                <div 
                  className="note-widget__empty-prompt"
                  onClick={() => onOpenEditDialog(widget.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onOpenEditDialog(widget.id)}
                >
                  <p>开始写...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
