
"use client";

import { useState, useEffect } from 'react';
import type { LinkItem, AppWidget, LinkCollectionAppWidget, NoteAppWidget, LinkCollectionWidgetData, NoteWidgetData, WidgetType } from '@/types';
import { isLinkCollectionWidget, isNoteWidget } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { LinkDialog } from '@/components/LinkDialog';
import { LinkCollectionWidget } from '@/components/LinkCategoryWidget'; // Renamed component file
import { NoteWidget } from '@/components/NoteWidget';
import { NoteEditDialog } from '@/components/NoteEditDialog';
import { WidgetTitleDialog } from '@/components/CategoryDialog'; // Renamed component file
import { AppWindow, FolderPlus, PlusSquare, Bookmark, Rss, StickyNote, ListChecks, Code, GalleryVerticalEnd } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// For migrating old data structures
interface OldLinkCategory {
  id: string;
  title: string;
  links: LinkItem[];
}

export default function HomePage() {
  const [widgets, setWidgets] = useLocalStorage<AppWidget[]>('pageDockWidgets', []);
  
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isWidgetTitleDialogOpen, setIsWidgetTitleDialogOpen] = useState(false);
  const [isNoteEditDialogOpen, setIsNoteEditDialogOpen] = useState(false);
  
  const [editingLink, setEditingLink] = useState<LinkItem | undefined>(undefined);
  const [editingWidget, setEditingWidget] = useState<AppWidget | undefined>(undefined); // For title editing or note editing
  const [currentLinkCollectionWidgetId, setCurrentLinkCollectionWidgetId] = useState<string | undefined>(undefined);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const oldCategoriesRaw = window.localStorage.getItem('pageDockCategories');
      const oldLinksRaw = window.localStorage.getItem('pageDockLinks');

      if (widgets.length > 0) return; // Already has new widget structure or is intentionally empty

      let migrated = false;

      if (oldCategoriesRaw) {
        try {
          const oldCategories = JSON.parse(oldCategoriesRaw) as OldLinkCategory[];
          if (Array.isArray(oldCategories) && oldCategories.length > 0) {
            const newWidgets: AppWidget[] = oldCategories.map(cat => ({
              id: cat.id,
              type: 'linkCollection',
              title: cat.title,
              data: { links: cat.links },
            }));
            setWidgets(newWidgets);
            // window.localStorage.removeItem('pageDockCategories'); // Consider removing old key
            // console.log("Migrated old categories to new widget structure.");
            migrated = true;
          }
        } catch (error) {
          console.error("Error migrating old categories:", error);
        }
      }
      
      if (!migrated && oldLinksRaw) {
        try {
          const oldLinks = JSON.parse(oldLinksRaw) as LinkItem[];
          if (Array.isArray(oldLinks) && oldLinks.length > 0) {
            const defaultLinkCollection: LinkCollectionAppWidget = {
              id: crypto.randomUUID(),
              type: 'linkCollection',
              title: 'My Links',
              data: { links: oldLinks },
            };
            setWidgets([defaultLinkCollection]);
            // window.localStorage.removeItem('pageDockLinks'); // Consider removing old key
            // console.log("Migrated old links to new widget structure.");
            migrated = true;
          }
        } catch (error) {
          console.error("Error migrating old links:", error);
        }
      }

      if (!migrated && widgets.length === 0) {
        // If no data was migrated and widgets is still empty, create default
        const defaultWidget: LinkCollectionAppWidget = {
          id: crypto.randomUUID(),
          type: 'linkCollection',
          title: 'My First Collection',
          data: { links: [] },
        };
        setWidgets([defaultWidget]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount


  const handleOpenLinkDialog = (widgetId: string, link?: LinkItem) => {
    setCurrentLinkCollectionWidgetId(widgetId);
    setEditingLink(link);
    setIsLinkDialogOpen(true);
  };

  const handleCloseLinkDialog = () => {
    setIsLinkDialogOpen(false);
    setEditingLink(undefined);
    setCurrentLinkCollectionWidgetId(undefined);
  };

  const handleOpenWidgetTitleDialog = (widgetId: string) => {
    const widgetToEdit = widgets.find(w => w.id === widgetId);
    if (widgetToEdit) {
      setEditingWidget(widgetToEdit);
      setIsWidgetTitleDialogOpen(true);
    }
  };

  const handleCloseWidgetTitleDialog = () => {
    setIsWidgetTitleDialogOpen(false);
    setEditingWidget(undefined);
  };
  
  const handleOpenNoteEditDialog = (widgetId: string) => {
    const widgetToEdit = widgets.find(w => w.id === widgetId);
    if (widgetToEdit && isNoteWidget(widgetToEdit)) {
      setEditingWidget(widgetToEdit);
      setIsNoteEditDialogOpen(true);
    }
  };

  const handleCloseNoteEditDialog = () => {
    setIsNoteEditDialogOpen(false);
    setEditingWidget(undefined);
  };

  const handleSubmitLink = (data: Omit<LinkItem, 'id'>, linkId?: string) => {
    if (!currentLinkCollectionWidgetId) return;

    setWidgets(prevWidgets => 
      prevWidgets.map(widget => {
        if (isLinkCollectionWidget(widget) && widget.id === currentLinkCollectionWidgetId) {
          let updatedLinks;
          if (linkId) { // Editing existing link
            updatedLinks = widget.data.links.map(link => 
              link.id === linkId ? { ...link, ...data } : link
            );
          } else { // Adding new link
            const newLink: LinkItem = { id: crypto.randomUUID(), ...data };
            updatedLinks = [newLink, ...widget.data.links];
          }
          return { ...widget, data: { ...widget.data, links: updatedLinks } };
        }
        return widget;
      })
    );
  };

  const handleDeleteLink = (widgetId: string, linkId: string) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget => {
        if (isLinkCollectionWidget(widget) && widget.id === widgetId) {
          return {
            ...widget,
            data: {
              ...widget.data,
              links: widget.data.links.filter(link => link.id !== linkId),
            }
          };
        }
        return widget;
      })
    );
  };
  
  const handleSubmitWidgetTitle = (title: string, widgetId: string) => {
    setWidgets(prev => prev.map(w => w.id === widgetId ? { ...w, title } : w));
  };

  const handleDeleteWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
  };

  const handleLinksReordered = (widgetId: string, newLinks: LinkItem[]) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget =>
        isLinkCollectionWidget(widget) && widget.id === widgetId ? { ...widget, data: { ...widget.data, links: newLinks } } : widget
      )
    );
  };
  
  const handleAddWidget = (type: WidgetType) => {
    let newWidget: AppWidget;
    const baseId = crypto.randomUUID();

    switch (type) {
      case 'linkCollection':
        newWidget = {
          id: baseId,
          type: 'linkCollection',
          title: 'New Link Collection',
          data: { links: [] },
        } as LinkCollectionAppWidget;
        break;
      case 'note':
        newWidget = {
          id: baseId,
          type: 'note',
          title: 'New Note',
          data: { content: '' },
        } as NoteAppWidget;
        setWidgets(prev => [...prev, newWidget]);
        handleOpenNoteEditDialog(baseId); // Open edit dialog for new note
        return; // Return early as dialog is opened
      // Add cases for other widget types here
      default:
        console.error("Unsupported widget type:", type);
        return;
    }
    setWidgets(prev => [...prev, newWidget]);
  };

  const handleSubmitNote = (widgetId: string, title: string, content: string) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget => {
        if (isNoteWidget(widget) && widget.id === widgetId) {
          return {
            ...widget,
            title,
            data: { ...widget.data, content },
          };
        }
        return widget;
      })
    );
  };


  // Placeholder handlers for other widget types
  const handleAddNewsRss = () => console.log("Add News (RSS) clicked - Not implemented");
  const handleAddTodoList = () => console.log("Add Todo List clicked - Not implemented");
  const handleAddEmbed = () => console.log("Add Embed clicked - Not implemented");
  const handleBrowseAllWidgets = () => console.log("Browse all widgets clicked - Not implemented");


  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AppWindow className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">PageDock</h1>
        </div>
        <p className="text-muted-foreground">Your personal dashboard for quick access to your favorite web pages and tools.</p>
      </header>

      <div className="mb-8 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg">
              <PlusSquare className="mr-2 h-5 w-5" />
              Add Tool
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleAddWidget('linkCollection')}>
              <Bookmark className="mr-2 h-4 w-4" />
              <span>书签</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddWidget('note')}>
              <StickyNote className="mr-2 h-4 w-4" />
              <span>笔记</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddNewsRss} disabled>
              <Rss className="mr-2 h-4 w-4" />
              <span>新闻(RSS)</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddTodoList} disabled>
              <ListChecks className="mr-2 h-4 w-4" />
              <span>待办事项列表</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddEmbed} disabled>
              <Code className="mr-2 h-4 w-4" />
              <span>嵌入</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleBrowseAllWidgets} disabled>
               <GalleryVerticalEnd className="mr-2 h-4 w-4" />
              <span>浏览所有微件</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {widgets.length === 0 && (
         <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-muted rounded-lg min-h-[200px]">
            <FolderPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground">No Tools Yet</h2>
            <p className="text-muted-foreground mt-1">Use the "Add Tool" button to add your first widget.</p>
        </div>
      )}

      <div className="space-y-8">
        {widgets.map(widget => {
          if (isLinkCollectionWidget(widget)) {
            return (
              <LinkCollectionWidget
                key={widget.id}
                widget={widget}
                onOpenLinkDialog={handleOpenLinkDialog}
                onOpenWidgetTitleDialog={() => handleOpenWidgetTitleDialog(widget.id)}
                onDeleteWidget={handleDeleteWidget}
                onLinksReordered={handleLinksReordered}
                onEditLink={(widgetId, linkId) => {
                    const collWidget = widgets.find(w => w.id === widgetId) as LinkCollectionAppWidget | undefined;
                    const linkToEdit = collWidget?.data.links.find(l => l.id === linkId);
                    if (collWidget && linkToEdit) {
                        handleOpenLinkDialog(collWidget.id, linkToEdit);
                    }
                }}
                onDeleteLink={handleDeleteLink}
              />
            );
          } else if (isNoteWidget(widget)) {
            return (
              <NoteWidget
                key={widget.id}
                widget={widget}
                onOpenEditDialog={() => handleOpenNoteEditDialog(widget.id)}
                onDeleteWidget={handleDeleteWidget}
              />
            );
          }
          return null; // Or a placeholder for unknown widget types
        })}
      </div>

      {isLinkDialogOpen && currentLinkCollectionWidgetId && (
        <LinkDialog
          isOpen={isLinkDialogOpen}
          onClose={handleCloseLinkDialog}
          onSubmit={handleSubmitLink}
          defaultValues={editingLink}
          categoryId={currentLinkCollectionWidgetId} // This context is important for LinkDialog
        />
      )}

      {isWidgetTitleDialogOpen && editingWidget && (
        <WidgetTitleDialog
            isOpen={isWidgetTitleDialogOpen}
            onClose={handleCloseWidgetTitleDialog}
            onSubmit={handleSubmitWidgetTitle}
            defaultValues={{id: editingWidget.id, title: editingWidget.title }}
        />
      )}

      {isNoteEditDialogOpen && editingWidget && isNoteWidget(editingWidget) && (
        <NoteEditDialog
          isOpen={isNoteEditDialogOpen}
          onClose={handleCloseNoteEditDialog}
          onSubmit={handleSubmitNote}
          defaultValues={editingWidget}
        />
      )}
      
      <footer className="mt-16 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} PageDock. Built with Next.js and Tailwind CSS.</p>
      </footer>
    </div>
  );
}
