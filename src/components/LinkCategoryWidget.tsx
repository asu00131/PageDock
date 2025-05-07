
"use client";

import type { LinkCollectionAppWidget, LinkItem, LinkCollectionWidgetData } from '@/types';
import { LinkGrid } from './LinkGrid';
import { Button } from '@/components/ui/button';
import { Edit3, MoreVertical, PlusCircle, Trash2, Bookmark, ChevronDown, ChevronUp } from 'lucide-react'; 
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

interface LinkCollectionWidgetProps {
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
    <div className="page-section__widget">
      <article className="widget bookmark-widget">
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
              <Bookmark className="widget-header__feather-icon h-5 w-5 mr-2 text-[hsl(var(--link-card-foreground))]" />
              <span className="widget-header__text text-lg font-semibold text-[hsl(var(--link-card-foreground))]">{widget.title}</span>
              {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" /> : <ChevronUp className="h-4 w-4 text-muted-foreground ml-2" />}
            </div>
            <div className="widget-header__controls">
              <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => { e.stopPropagation(); onOpenLinkDialog(widget.id); }}>
                <PlusCircle className="widget-header__feather-icon h-4 w-4" />
                <span className="sr-only">Add link to {widget.title}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">More options for {widget.title}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenWidgetTitleDialog(widget.id); }}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>Edit Collection Title</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <DropdownMenuItem 
                         onSelect={(e) => e.preventDefault()} 
                         onClick={(e) => e.stopPropagation()} 
                         className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10"
                       >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete Collection</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the collection "{widget.title}" and all its links.
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
                <LinkGrid
                  links={widget.data.links}
                  onEdit={handleEditLink}
                  onDelete={handleDeleteLink}
                  onLinksReordered={handleLinksReordered}
                />
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
