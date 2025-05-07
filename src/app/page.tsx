
"use client";

import { useState, useEffect } from 'react';
import type { LinkItem, AppWidget, LinkCollectionAppWidget, NoteAppWidget, TodoListAppWidget, TodoItem, WidgetType } from '@/types';
import { isLinkCollectionWidget, isNoteWidget, isTodoListWidget } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { LinkDialog } from '@/components/LinkDialog';
import { LinkCollectionWidget } from '@/components/LinkCategoryWidget';
import { NoteWidget } from '@/components/NoteWidget';
import { TodoListWidget } from '@/components/TodoListWidget';
import { NoteEditDialog } from '@/components/NoteEditDialog';
import { WidgetTitleDialog } from '@/components/CategoryDialog'; 
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
  const [editingWidget, setEditingWidget] = useState<AppWidget | undefined>(undefined); 
  const [currentLinkCollectionWidgetId, setCurrentLinkCollectionWidgetId] = useState<string | undefined>(undefined);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const oldCategoriesRaw = window.localStorage.getItem('pageDockCategories');
      const oldLinksRaw = window.localStorage.getItem('pageDockLinks');

      if (widgets.length > 0 && widgets.every(w => typeof w.isCollapsed === 'boolean')) {
        return; 
      }
      
      let newWidgetsFromMigration: AppWidget[] | null = null;
      let migrated = false;

      if (oldCategoriesRaw) {
        try {
          const oldCategories = JSON.parse(oldCategoriesRaw) as OldLinkCategory[];
          if (Array.isArray(oldCategories) && oldCategories.length > 0) {
            newWidgetsFromMigration = oldCategories.map(cat => ({
              id: cat.id,
              type: 'linkCollection',
              title: cat.title,
              data: { links: cat.links },
              isCollapsed: false, 
            }));
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
              isCollapsed: false, 
            };
            newWidgetsFromMigration = [defaultLinkCollection];
            migrated = true;
          }
        } catch (error) {
          console.error("Error migrating old links:", error);
        }
      }

      if (newWidgetsFromMigration) {
        setWidgets(newWidgetsFromMigration);
      } else if (widgets.length === 0) { 
        const defaultWidget: LinkCollectionAppWidget = {
          id: crypto.randomUUID(),
          type: 'linkCollection',
          title: 'My First Collection',
          data: { links: [] },
          isCollapsed: false, 
        };
        setWidgets([defaultWidget]);
      } else if (widgets.length > 0 && widgets.some(w => typeof w.isCollapsed === 'undefined')) {
        setWidgets(prevWidgets => prevWidgets.map(w => ({ ...w, isCollapsed: w.isCollapsed ?? false })));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 


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
          if (linkId) { 
            updatedLinks = widget.data.links.map(link => 
              link.id === linkId ? { ...link, ...data } : link
            );
          } else { 
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
          isCollapsed: false,
        } as LinkCollectionAppWidget;
        break;
      case 'note':
        newWidget = {
          id: baseId,
          type: 'note',
          title: 'New Note',
          data: { content: '' },
          isCollapsed: false,
        } as NoteAppWidget;
        setWidgets(prev => [...prev, newWidget]);
        handleOpenNoteEditDialog(baseId); 
        return; 
      case 'todoList':
        newWidget = {
            id: baseId,
            type: 'todoList',
            title: 'New Todo List',
            data: { items: [], showCompleted: true },
            isCollapsed: false,
        } as TodoListAppWidget;
        break;
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

  const handleToggleWidgetCollapse = (widgetId: string) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget =>
        widget.id === widgetId ? { ...widget, isCollapsed: !widget.isCollapsed } : widget
      )
    );
  };

  // TodoList specific handlers
  const handleAddTodoItem = (widgetId: string, text: string) => {
    setWidgets(prev => prev.map(w => {
      if (isTodoListWidget(w) && w.id === widgetId) {
        const newItem: TodoItem = { id: crypto.randomUUID(), text, completed: false };
        return { ...w, data: { ...w.data, items: [...w.data.items, newItem] } };
      }
      return w;
    }));
  };

  const handleToggleTodoItem = (widgetId: string, itemId: string) => {
    setWidgets(prev => prev.map(w => {
      if (isTodoListWidget(w) && w.id === widgetId) {
        return {
          ...w,
          data: {
            ...w.data,
            items: w.data.items.map(item =>
              item.id === itemId ? { ...item, completed: !item.completed } : item
            ),
          },
        };
      }
      return w;
    }));
  };

  const handleDeleteTodoItem = (widgetId: string, itemId: string) => {
    setWidgets(prev => prev.map(w => {
      if (isTodoListWidget(w) && w.id === widgetId) {
        return {
          ...w,
          data: {
            ...w.data,
            items: w.data.items.filter(item => item.id !== itemId),
          },
        };
      }
      return w;
    }));
  };

  const handleUpdateTodoItemText = (widgetId: string, itemId: string, text: string) => {
    setWidgets(prev => prev.map(w => {
      if (isTodoListWidget(w) && w.id === widgetId) {
        return {
          ...w,
          data: {
            ...w.data,
            items: w.data.items.map(item =>
              item.id === itemId ? { ...item, text } : item
            ),
          },
        };
      }
      return w;
    }));
  };
  
  const handleReorderTodoItems = (widgetId: string, newItems: TodoItem[]) => {
    setWidgets(prev => prev.map(w => {
        if (isTodoListWidget(w) && w.id === widgetId) {
            return { ...w, data: { ...w.data, items: newItems } };
        }
        return w;
    }));
  };

  const handleToggleShowCompleted = (widgetId: string) => {
     setWidgets(prev => prev.map(w => {
        if (isTodoListWidget(w) && w.id === widgetId) {
            return { ...w, data: { ...w.data, showCompleted: !w.data.showCompleted } };
        }
        return w;
    }));
  };


  const handleAddNewsRss = () => console.log("Add News (RSS) clicked - Not implemented");
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
            <DropdownMenuItem onClick={() => handleAddWidget('todoList')}>
              <ListChecks className="mr-2 h-4 w-4" />
              <span>待办事项列表</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddNewsRss} disabled>
              <Rss className="mr-2 h-4 w-4" />
              <span>新闻(RSS)</span>
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
                isCollapsed={widget.isCollapsed}
                onToggleCollapse={handleToggleWidgetCollapse}
              />
            );
          } else if (isNoteWidget(widget)) {
            return (
              <NoteWidget
                key={widget.id}
                widget={widget}
                onOpenEditDialog={() => handleOpenNoteEditDialog(widget.id)}
                onDeleteWidget={handleDeleteWidget}
                isCollapsed={widget.isCollapsed}
                onToggleCollapse={handleToggleWidgetCollapse}
              />
            );
          } else if (isTodoListWidget(widget)) {
            return (
              <TodoListWidget
                key={widget.id}
                widget={widget}
                onOpenWidgetTitleDialog={() => handleOpenWidgetTitleDialog(widget.id)}
                onDeleteWidget={handleDeleteWidget}
                onAddItem={handleAddTodoItem}
                onToggleItem={handleToggleTodoItem}
                onDeleteItem={handleDeleteTodoItem}
                onUpdateItemText={handleUpdateTodoItemText}
                onReorderItems={handleReorderTodoItems}
                onToggleShowCompleted={handleToggleShowCompleted}
                isCollapsed={widget.isCollapsed}
                onToggleCollapse={handleToggleWidgetCollapse}
              />
            );
          }
          return null; 
        })}
      </div>

      {isLinkDialogOpen && currentLinkCollectionWidgetId && (
        <LinkDialog
          isOpen={isLinkDialogOpen}
          onClose={handleCloseLinkDialog}
          onSubmit={handleSubmitLink}
          defaultValues={editingLink}
          categoryId={currentLinkCollectionWidgetId} 
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
