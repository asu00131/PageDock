
"use client";

import { useState, useEffect, useRef } from 'react';
import type { AppWidget, LinkCollectionAppWidget, NoteAppWidget, TodoListAppWidget, CalendarIcsAppWidget, LinkItem, TodoItem, WidgetType } from '@/types';
import { isLinkCollectionWidget, isNoteWidget, isTodoListWidget, isCalendarIcsWidget } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { LinkDialog } from '@/components/LinkDialog';
import { LinkCollectionWidget } from '@/components/LinkCategoryWidget';
import { NoteWidget } from '@/components/NoteWidget';
import { TodoListWidget } from '@/components/TodoListWidget';
import { NoteEditDialog } from '@/components/NoteEditDialog';
import { WidgetTitleDialog } from '@/components/CategoryDialog'; 
import { CalendarIcsDialog } from '@/components/CalendarIcsDialog';
import { CalendarIcsWidget } from '@/components/CalendarIcsWidget';
import { AppWindow, FolderPlus, PlusSquare, Bookmark, StickyNote, ListChecks, CalendarDays, UploadCloud, DownloadCloud } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
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

// Helper function to validate imported widget structure (basic validation)
function isValidAppWidget(obj: any): obj is AppWidget {
  if (!obj || typeof obj !== 'object') return false;
  if (typeof obj.id !== 'string' || typeof obj.type !== 'string' || typeof obj.title !== 'string') return false;
  if (typeof obj.isCollapsed !== 'boolean' && typeof obj.isCollapsed !== 'undefined') return false;

  switch (obj.type) {
    case 'linkCollection':
      return obj.data && Array.isArray(obj.data.links) && obj.data.links.every((link: any) => 
        typeof link?.id === 'string' && typeof link?.url === 'string' && typeof link?.title === 'string'
      );
    case 'note':
      return obj.data && typeof obj.data.content === 'string';
    case 'todoList':
      return obj.data && Array.isArray(obj.data.items) && typeof obj.data.showCompleted === 'boolean' &&
        obj.data.items.every((item: any) => 
          typeof item?.id === 'string' && typeof item?.text === 'string' && typeof item?.completed === 'boolean'
        );
    case 'calendarIcs':
      return obj.data && typeof obj.data.icsUrl === 'string';
    default:
      return false;
  }
}

function isValidWidgetArray(arr: any): arr is AppWidget[] {
    return Array.isArray(arr) && arr.every(isValidAppWidget);
}


export default function HomePage() {
  const [widgets, setWidgets] = useLocalStorage<AppWidget[]>('pageDockWidgets', []);
  const [isClientHydratedAndSetup, setIsClientHydratedAndSetup] = useState(false);
  
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isWidgetTitleDialogOpen, setIsWidgetTitleDialogOpen] = useState(false);
  const [isNoteEditDialogOpen, setIsNoteEditDialogOpen] = useState(false);
  const [isCalendarIcsDialogOpen, setIsCalendarIcsDialogOpen] = useState(false);
  
  const [editingLink, setEditingLink] = useState<LinkItem | undefined>(undefined);
  const [editingWidget, setEditingWidget] = useState<AppWidget | undefined>(undefined); 
  const [currentLinkCollectionWidgetId, setCurrentLinkCollectionWidgetId] = useState<string | undefined>(undefined);
  const [currentCalendarIcsWidgetId, setCurrentCalendarIcsWidgetId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    // This effect runs only on the client.
    let currentWidgetsSnapshot = [...widgets]; // Take a snapshot of widgets from useLocalStorage
    let widgetsWereModifiedDuringSetup = false;
  
    const oldCategoriesRaw = window.localStorage.getItem('pageDockCategories');
    const oldLinksRaw = window.localStorage.getItem('pageDockLinks');
  
    // Only attempt migration if currentWidgetsSnapshot is empty (meaning useLocalStorage found nothing or initialized with empty)
    if (currentWidgetsSnapshot.length === 0) {
      let migrated = false;
      if (oldCategoriesRaw) {
        try {
          const oldCategories = JSON.parse(oldCategoriesRaw) as OldLinkCategory[];
          if (Array.isArray(oldCategories) && oldCategories.length > 0) {
            currentWidgetsSnapshot = oldCategories.map(cat => ({
              id: cat.id,
              type: 'linkCollection',
              title: cat.title,
              data: { links: cat.links },
              isCollapsed: false,
            }));
            widgetsWereModifiedDuringSetup = true;
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
            currentWidgetsSnapshot = [{
              id: crypto.randomUUID(),
              type: 'linkCollection',
              title: 'My Links',
              data: { links: oldLinks },
              isCollapsed: false,
            }];
            widgetsWereModifiedDuringSetup = true;
          }
        } catch (error) {
          console.error("Error migrating old links:", error);
        }
      }
    }
  
    // After potential migration, if still no widgets, add a default one.
    if (currentWidgetsSnapshot.length === 0) {
      currentWidgetsSnapshot = [{
        id: crypto.randomUUID(),
        type: 'linkCollection',
        title: '我的第一个合集',
        data: { links: [] },
        isCollapsed: false,
      }];
      widgetsWereModifiedDuringSetup = true;
    }
  
    // Ensure all widgets have isCollapsed property.
    const needsCollapseDefaulting = currentWidgetsSnapshot.some(w => typeof w.isCollapsed === 'undefined');
    if (needsCollapseDefaulting) {
      currentWidgetsSnapshot = currentWidgetsSnapshot.map(w => ({ ...w, isCollapsed: w.isCollapsed ?? false }));
      widgetsWereModifiedDuringSetup = true;
    }
  
    if (widgetsWereModifiedDuringSetup) {
      setWidgets(currentWidgetsSnapshot); // Update state if modifications occurred
    }
  
    setIsClientHydratedAndSetup(true); // Mark setup as complete
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount.


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

  const handleOpenCalendarIcsDialog = (widgetId: string) => {
    const widgetToEdit = widgets.find(w => w.id === widgetId);
    if (widgetToEdit && isCalendarIcsWidget(widgetToEdit)) {
      setEditingWidget(widgetToEdit);
      setCurrentCalendarIcsWidgetId(widgetId);
      setIsCalendarIcsDialogOpen(true);
    }
  };

  const handleCloseCalendarIcsDialog = () => {
    setIsCalendarIcsDialogOpen(false);
    setEditingWidget(undefined);
    setCurrentCalendarIcsWidgetId(undefined);
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
          title: '新链接合集',
          data: { links: [] },
          isCollapsed: false,
        } as LinkCollectionAppWidget;
        break;
      case 'note':
        newWidget = {
          id: baseId,
          type: 'note',
          title: '新笔记',
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
            title: '新待办列表',
            data: { items: [], showCompleted: true },
            isCollapsed: false,
        } as TodoListAppWidget;
        break;
      case 'calendarIcs':
        newWidget = {
          id: baseId,
          type: 'calendarIcs',
          title: '新日历',
          data: { icsUrl: '' },
          isCollapsed: false,
        } as CalendarIcsAppWidget;
        setWidgets(prev => [...prev, newWidget]);
        handleOpenCalendarIcsDialog(baseId);
        return;
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

  const handleSubmitCalendarIcs = (widgetId: string, title: string, icsUrl: string) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget => {
        if (isCalendarIcsWidget(widget) && widget.id === widgetId) {
          return {
            ...widget,
            title, 
            data: { ...widget.data, icsUrl },
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

  const handleExportJson = () => {
    if (!isClientHydratedAndSetup) return;
    const jsonString = JSON.stringify(widgets, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pagedock_config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "配置已导出", description: "JSON 文件已下载。" });
  };

  const handleImportJsonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isClientHydratedAndSetup) return;
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importedData = JSON.parse(content);
          if (isValidWidgetArray(importedData)) {
            setWidgets(importedData);
            toast({ title: "配置已导入", description: "小部件已成功加载。" });
          } else {
            throw new Error("无效的文件格式或内容。");
          }
        } catch (error) {
          console.error("Error importing JSON:", error);
          toast({ variant: "destructive", title: "导入错误", description: error instanceof Error ? error.message : "无法解析 JSON 文件。" });
        } finally {
          // Reset file input to allow importing the same file again if needed
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };
      reader.onerror = () => {
          toast({ variant: "destructive", title: "文件读取错误", description: "无法读取所选文件。" });
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
      };
      reader.readAsText(file);
    }
  };


  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-muted rounded-lg min-h-[200px]">
      <FolderPlus className="h-12 w-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold text-foreground">暂无工具</h2>
      <p className="text-muted-foreground mt-1">使用“添加工具”按钮添加您的第一个小部件。</p>
    </div>
  );

  if (!isClientHydratedAndSetup) {
    // Return a basic placeholder or null during server render / pre-hydration
    // This helps prevent hydration mismatches if localStorage is used to initialize state
    // which can only happen client-side.
    return (
       <div className="container mx-auto px-4 py-8 min-h-screen">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <AppWindow className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">PageDock</h1>
            </div>
            <p className="text-muted-foreground">您的个性化仪表板，可快速访问您喜爱的网页和工具。</p>
          </header>
           <div className="mb-8 flex justify-end space-x-2">
            <Button size="lg" variant="outline" onClick={handleImportJsonClick} disabled>
              <UploadCloud className="mr-2 h-5 w-5" />
              导入 JSON
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
            <Button size="lg" variant="outline" onClick={handleExportJson} disabled>
              <DownloadCloud className="mr-2 h-5 w-5" />
              导出 JSON
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="lg" disabled>
                  <PlusSquare className="mr-2 h-5 w-5" />
                  添加工具
                </Button>
              </DropdownMenuTrigger>
            </DropdownMenu>
          </div>
          {renderEmptyState()}
           <footer className="mt-16 text-center text-muted-foreground text-sm">
            <p>&copy; {new Date().getFullYear()} PageDock. 基于 Next.js 和 Tailwind CSS 构建。</p>
          </footer>
       </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AppWindow className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">PageDock</h1>
        </div>
        <p className="text-muted-foreground">您的个性化仪表板，可快速访问您喜爱的网页和工具。</p>
      </header>

      <div className="mb-8 flex justify-end space-x-2">
         <Button size="lg" variant="outline" onClick={handleImportJsonClick}>
            <UploadCloud className="mr-2 h-5 w-5" />
            导入 JSON
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
          <Button size="lg" variant="outline" onClick={handleExportJson} disabled={widgets.length === 0}>
            <DownloadCloud className="mr-2 h-5 w-5" />
            导出 JSON
          </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg">
              <PlusSquare className="mr-2 h-5 w-5" />
              添加工具
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
            <DropdownMenuItem onClick={() => handleAddWidget('calendarIcs')}>
              <CalendarDays className="mr-2 h-4 w-4" />
              <span>日历 (ics)</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {widgets.length === 0 ? (
        renderEmptyState()
      ) : (
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
            } else if (isCalendarIcsWidget(widget)) {
               return (
                <CalendarIcsWidget
                  key={widget.id}
                  widget={widget}
                  onOpenEditDialog={() => handleOpenCalendarIcsDialog(widget.id)}
                  onOpenWidgetTitleDialog={() => handleOpenWidgetTitleDialog(widget.id)}
                  onDeleteWidget={handleDeleteWidget}
                  isCollapsed={widget.isCollapsed}
                  onToggleCollapse={handleToggleWidgetCollapse}
                />
              );
            }
            return null; 
          })}
        </div>
      )}

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

      {isCalendarIcsDialogOpen && editingWidget && isCalendarIcsWidget(editingWidget) && (
        <CalendarIcsDialog
          isOpen={isCalendarIcsDialogOpen}
          onClose={handleCloseCalendarIcsDialog}
          onSubmit={handleSubmitCalendarIcs}
          defaultValues={editingWidget}
        />
      )}
      
      <footer className="mt-16 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} PageDock. 基于 Next.js 和 Tailwind CSS 构建。</p>
      </footer>
    </div>
  );
}

