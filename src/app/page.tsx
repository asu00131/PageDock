
"use client";

import { useState, useEffect, useRef } from 'react';
import type { AppWidget, LinkCollectionAppWidget, NoteAppWidget, TodoListAppWidget, CalendarIcsAppWidget, EmbedAppWidget, LinkItem, TodoItem, WidgetType, LinkCollectionDisplaySettings, EmbedWidgetData, IframeEmbedData, ImageEmbedData, CodeEmbedData, CalendarEvent } from '@/types';
import { isLinkCollectionWidget, isNoteWidget, isTodoListWidget, isCalendarIcsWidget, isEmbedWidget } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { LinkDialog } from '@/components/LinkDialog';
import { LinkCollectionWidget } from '@/components/LinkCollectionWidget';
import { NoteWidget } from '@/components/NoteWidget';
import { TodoListWidget } from '@/components/TodoListWidget';
import { NoteEditDialog } from '@/components/NoteEditDialog';
import { WidgetTitleDialog } from '@/components/CategoryDialog'; 
import { CalendarIcsDialog } from '@/components/CalendarIcsDialog';
import { CalendarIcsWidget } from '@/components/CalendarIcsWidget';
import { LinkDisplaySettingsDialog } from '@/components/LinkDisplaySettingsDialog'; 
import { EmbedWidget } from '@/components/EmbedWidget';
import { EmbedDialog } from '@/components/EmbedDialog';
import { AppWindow, FolderPlus, PlusSquare, Bookmark, StickyNote, ListChecks, CalendarDays, UploadCloud, DownloadCloud, LayoutDashboard, Edit, GripVertical, Check, Code2, ClipboardPaste } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { BulkLinkDialog } from '@/components/BulkLinkDialog';
import { JsonImportDialog } from '@/components/JsonImportDialog';


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
      ) && obj.data.displaySettings && 
        typeof obj.data.displaySettings.displayMode === 'string' &&
        typeof obj.data.displaySettings.iconSize === 'string' &&
        typeof obj.data.displaySettings.visibleLinksCount === 'number' &&
        typeof obj.data.displaySettings.titleLines === 'number';
    case 'note':
      return obj.data && typeof obj.data.content === 'string';
    case 'todoList':
      return obj.data && Array.isArray(obj.data.items) && typeof obj.data.showCompleted === 'boolean' &&
        obj.data.items.every((item: any) => 
          typeof item?.id === 'string' && typeof item?.text === 'string' && typeof item?.completed === 'boolean'
        );
    case 'calendarIcs':
      const calData = obj.data as Partial<CalendarIcsAppWidget['data']>;
      return calData && typeof calData.icsUrl === 'string' &&
             (typeof calData.isLocalized === 'boolean' || typeof calData.isLocalized === 'undefined') &&
             (Array.isArray(calData.localizedEvents) || typeof calData.localizedEvents === 'undefined');
    case 'embed':
      if (!obj.data || typeof obj.data.embedType !== 'string') return false;
      const embedData = obj.data as EmbedWidgetData;
      switch (embedData.embedType) {
        case 'iframe':
          return typeof embedData.embedUrl === 'string' && (typeof embedData.iframeHeight === 'string' || typeof embedData.iframeHeight === 'undefined');
        case 'image':
          return typeof embedData.embedUrl === 'string' && (typeof embedData.iframeHeight === 'string' || typeof embedData.iframeHeight === 'undefined');
        case 'code':
          return typeof embedData.codeContent === 'string' && (typeof embedData.iframeHeight === 'string' || typeof embedData.iframeHeight === 'undefined');
        default:
          return false;
      }
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
  const [isBulkLinkDialogOpen, setIsBulkLinkDialogOpen] = useState(false);
  const [isWidgetTitleDialogOpen, setIsWidgetTitleDialogOpen] = useState(false);
  const [isNoteEditDialogOpen, setIsNoteEditDialogOpen] = useState(false);
  const [isCalendarIcsDialogOpen, setIsCalendarIcsDialogOpen] = useState(false);
  const [isLinkDisplaySettingsDialogOpen, setIsLinkDisplaySettingsDialogOpen] = useState(false); 
  const [isEmbedDialogOpen, setIsEmbedDialogOpen] = useState(false);
  const [isJsonImportDialogOpen, setIsJsonImportDialogOpen] = useState(false);
  
  const [editingLink, setEditingLink] = useState<LinkItem | undefined>(undefined);
  const [editingWidget, setEditingWidget] = useState<AppWidget | undefined>(undefined); 
  const [currentLinkCollectionWidgetId, setCurrentLinkCollectionWidgetId] = useState<string | undefined>(undefined);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [preDragCollapseStates, setPreDragCollapseStates] = useState<Record<string, boolean> | null>(null);
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);


  useEffect(() => {
    let currentWidgetsSnapshot = [...widgets];
    let widgetsWereModifiedDuringSetup = false;
  
    const oldCategoriesRaw = window.localStorage.getItem('pageDockCategories');
    const oldLinksRaw = window.localStorage.getItem('pageDockLinks');
  
    if (currentWidgetsSnapshot.length === 0) {
      let migrated = false;
      const defaultDisplaySettings: LinkCollectionDisplaySettings = {
        displayMode: 'cloud',
        iconSize: 'small',
        visibleLinksCount: 0, 
        titleLines: -1, 
      };

      if (oldCategoriesRaw) {
        try {
          const oldCategories = JSON.parse(oldCategoriesRaw) as OldLinkCategory[];
          if (Array.isArray(oldCategories) && oldCategories.length > 0) {
            currentWidgetsSnapshot = oldCategories.map(cat => ({
              id: cat.id,
              type: 'linkCollection',
              title: cat.title,
              data: { links: cat.links, displaySettings: { ...defaultDisplaySettings } },
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
              title: '我的链接',
              data: { links: oldLinks, displaySettings: { ...defaultDisplaySettings } },
              isCollapsed: false,
            }];
            widgetsWereModifiedDuringSetup = true;
          }
        } catch (error) {
          console.error("Error migrating old links:", error);
        }
      }
    }
  
    if (currentWidgetsSnapshot.length === 0) {
      currentWidgetsSnapshot = [{
        id: crypto.randomUUID(),
        type: 'linkCollection',
        title: '我的第一个合集',
        data: { 
          links: [],
          displaySettings: {
            displayMode: 'cloud',
            iconSize: 'small',
            visibleLinksCount: 0,
            titleLines: -1,
          }
        },
        isCollapsed: false,
      }];
      widgetsWereModifiedDuringSetup = true;
    }
  
    const needsDefaults = currentWidgetsSnapshot.map(w => {
      let modified = false;
      if (typeof w.isCollapsed === 'undefined') {
        w.isCollapsed = false;
        modified = true;
      }
      if (isLinkCollectionWidget(w) && typeof w.data.displaySettings === 'undefined') {
        w.data.displaySettings = {
          displayMode: 'cloud',
          iconSize: 'small',
          visibleLinksCount: 0,
          titleLines: -1,
        };
        modified = true;
      }
      if (isCalendarIcsWidget(w)) {
          if (typeof w.data.isLocalized === 'undefined') {
              w.data.isLocalized = false;
              modified = true;
          }
          if (typeof w.data.localizedEvents === 'undefined') {
              w.data.localizedEvents = [];
              modified = true;
          }
      }
      if (isEmbedWidget(w)) {
        const embedData = w.data as EmbedWidgetData; // Temporary cast for logic
        if (embedData.embedType === 'iframe' && typeof embedData.iframeHeight === 'undefined') {
             (w.data as IframeEmbedData).iframeHeight = '400px';
             modified = true;
        } else if (embedData.embedType === 'image' && typeof embedData.iframeHeight === 'undefined') {
            (w.data as ImageEmbedData).iframeHeight = '400px'; // Or 'auto' or another default
            modified = true;
        } else if (embedData.embedType === 'code' && typeof embedData.iframeHeight === 'undefined') {
            (w.data as CodeEmbedData).iframeHeight = '300px'; // Default height for code embeds
            modified = true;
        }
      }
      return modified ? w : null;
    }).filter(Boolean);

    if (needsDefaults.length > 0) {
      currentWidgetsSnapshot = currentWidgetsSnapshot.map(w => {
        const defaultToApply = needsDefaults.find(def => def!.id === w.id);
        return defaultToApply ? {...w, ...defaultToApply} : w;
      });
      widgetsWereModifiedDuringSetup = true;
    }
  
    if (widgetsWereModifiedDuringSetup) {
      setWidgets(currentWidgetsSnapshot);
    }
  
    setIsClientHydratedAndSetup(true);
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

  const handleOpenBulkLinkDialog = (widgetId: string) => {
    setCurrentLinkCollectionWidgetId(widgetId);
    setIsBulkLinkDialogOpen(true);
  };

  const handleCloseBulkLinkDialog = () => {
    setIsBulkLinkDialogOpen(false);
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
      setIsCalendarIcsDialogOpen(true);
    }
  };

  const handleCloseCalendarIcsDialog = () => {
    setIsCalendarIcsDialogOpen(false);
    setEditingWidget(undefined);
  };

  const handleOpenLinkDisplaySettingsDialog = (widgetId: string) => {
    const widgetToEdit = widgets.find(w => w.id === widgetId);
    if (widgetToEdit && isLinkCollectionWidget(widgetToEdit)) {
      setEditingWidget(widgetToEdit);
      setIsLinkDisplaySettingsDialogOpen(true);
    }
  };

  const handleCloseLinkDisplaySettingsDialog = () => {
    setIsLinkDisplaySettingsDialogOpen(false);
    setEditingWidget(undefined);
  };

  const handleOpenEmbedDialog = (widgetId: string) => {
    const widgetToEdit = widgets.find(w => w.id === widgetId);
    if (widgetToEdit && isEmbedWidget(widgetToEdit)) {
      setEditingWidget(widgetToEdit);
      setIsEmbedDialogOpen(true);
    }
  };

  const handleCloseEmbedDialog = () => {
    setIsEmbedDialogOpen(false);
    setEditingWidget(undefined);
  };
  
  const handleOpenJsonImportDialog = () => setIsJsonImportDialogOpen(true);
  const handleCloseJsonImportDialog = () => setIsJsonImportDialogOpen(false);

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

  const handleSubmitBulkLinks = (urlsString: string) => {
    if (!currentLinkCollectionWidgetId) return;

    const urls = urlsString.split('\n').map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) {
      toast({ variant: "destructive", title: "无有效链接", description: "请输入至少一个有效的网址。" });
      return;
    }

    const newLinks: LinkItem[] = [];
    const invalidUrls: string[] = [];

    for (const url of urls) {
      try {
        const urlObject = new URL(url.startsWith('http') ? url : `https://${url}`);
        const title = urlObject.hostname.replace(/^www\./, '');
        newLinks.push({ id: crypto.randomUUID(), url: urlObject.href, title });
      } catch (error) {
        invalidUrls.push(url);
      }
    }

    if (newLinks.length > 0) {
      setWidgets(prevWidgets =>
        prevWidgets.map(widget => {
          if (isLinkCollectionWidget(widget) && widget.id === currentLinkCollectionWidgetId) {
            return {
              ...widget,
              data: {
                ...widget.data,
                links: [...newLinks, ...widget.data.links],
              }
            };
          }
          return widget;
        })
      );
      toast({ title: "书签已添加", description: `成功添加了 ${newLinks.length} 个书签。` });
    }

    if (invalidUrls.length > 0) {
      toast({ variant: "destructive", title: "部分链接无效", description: `无法添加以下链接: ${invalidUrls.join(', ')}` });
    }

    handleCloseBulkLinkDialog();
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
  
  const handleMoveLink = (
    source: { widgetId: string; linkId: string },
    target: { widgetId: string; linkId: string | null }
  ) => {
    setWidgets(prevWidgets => {
      const newWidgets = [...prevWidgets];
      const sourceWidgetIndex = newWidgets.findIndex(w => w.id === source.widgetId);
      const targetWidgetIndex = newWidgets.findIndex(w => w.id === target.widgetId);

      if (sourceWidgetIndex === -1 || targetWidgetIndex === -1) {
        return prevWidgets; 
      }
      
      const sourceWidget = newWidgets[sourceWidgetIndex];
      if (!isLinkCollectionWidget(sourceWidget)) return prevWidgets;
      
      const sourceLink = sourceWidget.data.links.find(link => link.id === source.linkId);
      if (!sourceLink) return prevWidgets;

      const sourceLinks = sourceWidget.data.links.filter(link => link.id !== source.linkId);
      newWidgets[sourceWidgetIndex] = { ...sourceWidget, data: { ...sourceWidget.data, links: sourceLinks }};
      
      const targetWidget = newWidgets[targetWidgetIndex];
      if (!isLinkCollectionWidget(targetWidget)) return prevWidgets;
      
      const targetLinks = [...targetWidget.data.links];
      const dropIndex = target.linkId ? targetLinks.findIndex(link => link.id === target.linkId) : -1;
      
      if (dropIndex !== -1) {
        targetLinks.splice(dropIndex, 0, sourceLink);
      } else {
        targetLinks.push(sourceLink);
      }
      
      newWidgets[targetWidgetIndex] = { ...targetWidget, data: { ...targetWidget.data, links: targetLinks }};
      
      return newWidgets;
    });
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
          data: { 
            links: [],
            displaySettings: {
              displayMode: 'cloud',
              iconSize: 'small',
              visibleLinksCount: 0,
              titleLines: -1,
            }
          },
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
          data: { icsUrl: '', isLocalized: false, localizedEvents: [] },
          isCollapsed: false,
        } as CalendarIcsAppWidget;
        setWidgets(prev => [...prev, newWidget]);
        handleOpenCalendarIcsDialog(baseId);
        return;
      case 'embed':
        newWidget = {
          id: baseId,
          type: 'embed',
          title: '新嵌入内容',
          data: { embedType: 'iframe', embedUrl: '', iframeHeight: '400px' }, // Default to iframe
          isCollapsed: false,
        } as EmbedAppWidget;
        setWidgets(prev => [...prev, newWidget]);
        handleOpenEmbedDialog(baseId);
        return;
      default:
        console.error("Unsupported widget type:", type);
        return;
    }
    setWidgets(prev => [newWidget, ...prev]);
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

  const handleUpdateNoteContent = (widgetId: string, newContent: string) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget => {
        if (isNoteWidget(widget) && widget.id === widgetId) {
          return {
            ...widget,
            data: { ...widget.data, content: newContent },
          };
        }
        return widget;
      })
    );
  };

  const handleSubmitCalendarIcs = (widgetId: string, title: string, icsUrl: string, localizeData?: boolean) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget => {
        if (isCalendarIcsWidget(widget) && widget.id === widgetId) {
          const wasLocalized = widget.data.isLocalized;
          const newIsLocalized = localizeData ?? false;
          return {
            ...widget,
            title, 
            data: { 
              ...widget.data, 
              icsUrl,
              isLocalized: newIsLocalized,
              // If changing localization status, clear existing localized events to trigger re-fetch/clear
              localizedEvents: wasLocalized !== newIsLocalized ? [] : widget.data.localizedEvents, 
            },
          };
        }
        return widget;
      })
    );
  };

  const handleUpdateCalendarLocalizedEvents = (widgetId: string, events: CalendarEvent[]) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget => {
        if (isCalendarIcsWidget(widget) && widget.id === widgetId) {
          return {
            ...widget,
            data: {
              ...widget.data,
              localizedEvents: events,
            }
          };
        }
        return widget;
      })
    );
  };


  const handleSubmitEmbedDialog = (widgetId: string, title: string, data: EmbedWidgetData) => {
     setWidgets(prevWidgets =>
      prevWidgets.map(widget => {
        if (isEmbedWidget(widget) && widget.id === widgetId) {
          return {
            ...widget,
            title,
            data,
          };
        }
        return widget;
      })
    );
  };

  const handleSubmitLinkDisplaySettings = (widgetId: string, settings: LinkCollectionDisplaySettings) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget => {
        if (isLinkCollectionWidget(widget) && widget.id === widgetId) {
          return {
            ...widget,
            data: { ...widget.data, displaySettings: settings },
          };
        }
        return widget;
      })
    );
  };

  const handleToggleWidgetCollapse = (widgetId: string) => {
    if (draggedWidgetId || isLayoutEditing) return;

    setWidgets(prevWidgets =>
      prevWidgets.map(widget =>
        widget.id === widgetId ? { ...widget, isCollapsed: !widget.isCollapsed } : widget
      )
    );
  };

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

  const handleSubmitJsonImport = (jsonString: string) => {
    if (!isClientHydratedAndSetup) return;
    try {
      const importedData = JSON.parse(jsonString);

      // Attempt to parse as PageDock native format first
      if (isValidWidgetArray(importedData)) {
        setWidgets(importedData);
        toast({ title: "配置已导入", description: "小部件已成功加载。" });
        handleCloseJsonImportDialog();
        return;
      }
      
      // Attempt to parse as start.me format
      if (importedData.page && Array.isArray(importedData.page.columns)) {
        const startMeWidgets = importedData.page.columns.flatMap((col: any) => col.widgets || []);
        
        const newWidgets: AppWidget[] = startMeWidgets
            .filter((widget: any) => widget.widget_type === 'urllist' && widget.items?.links?.length > 0)
            .map((widget: any): LinkCollectionAppWidget => {
                const links: LinkItem[] = widget.items.links.map((link: any) => ({
                    id: String(link.item_id) || crypto.randomUUID(),
                    title: link.title || '无标题',
                    url: link.url,
                }));
        
                return {
                    id: String(widget.public_id) || crypto.randomUUID(),
                    type: 'linkCollection',
                    title: widget.title || '导入的合集',
                    data: {
                        links: links,
                        displaySettings: {
                            displayMode: 'cloud',
                            iconSize: 'small',
                            visibleLinksCount: 0,
                            titleLines: -1,
                        },
                    },
                    isCollapsed: false,
                };
            });

        if (newWidgets.length > 0) {
            setWidgets(prev => [...prev, ...newWidgets]);
            toast({
                title: "导入成功",
                description: `已从 Start.me 成功导入 ${newWidgets.length} 个书签合集。`,
            });
            handleCloseJsonImportDialog();
        } else {
             toast({
                variant: "destructive",
                title: "未找到书签",
                description: "在提供的 Start.me 数据中未找到可导入的书签小部件。",
            });
        }
        return; // Exit after handling
      }

      // If neither format is recognized
      throw new Error("无效的文件格式或内容。");

    } catch (error) {
      console.error("Error importing JSON from text:", error);
      toast({ variant: "destructive", title: "导入错误", description: error instanceof Error ? error.message : "无法解析 JSON 文本。" });
    }
  };


  const handleToggleLayoutEditing = () => {
    setIsLayoutEditing(prev => {
        const newIsLayoutEditing = !prev;
        if (newIsLayoutEditing) {
            // Entering layout editing mode
            const currentCollapseStates: Record<string, boolean> = {};
            widgets.forEach(w => {
                currentCollapseStates[w.id] = w.isCollapsed ?? false;
            });
            setPreDragCollapseStates(currentCollapseStates);
            // Collapse all widgets
            setWidgets(prevWidgets =>
                prevWidgets.map(w => ({ ...w, isCollapsed: true }))
            );
        } else {
            // Exiting layout editing mode
            restoreWidgetCollapseStates();
        }
        return newIsLayoutEditing;
    });
};

  const restoreWidgetCollapseStates = () => {
    if (preDragCollapseStates) {
      setWidgets(prevWidgets =>
        prevWidgets.map(w => ({
          ...w,
          isCollapsed: preDragCollapseStates[w.id] ?? w.isCollapsed ?? false,
        }))
      );
      setPreDragCollapseStates(null);
    }
  };

  const handleWidgetDragStart = (e: React.DragEvent<HTMLDivElement>, widgetId: string) => {
    if (!isLayoutEditing) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', widgetId);
    setDraggedWidgetId(widgetId);
    setDragOverWidgetId(null);

    // Ensure widgets are collapsed if not already (e.g., if layout editing was enabled programmatically)
    if (!preDragCollapseStates) { 
        const currentCollapseStates: Record<string, boolean> = {};
        widgets.forEach(w => {
            currentCollapseStates[w.id] = w.isCollapsed ?? false;
        });
        setPreDragCollapseStates(currentCollapseStates);
        setWidgets(prevWidgets =>
            prevWidgets.map(w => ({ ...w, isCollapsed: true }))
        );
    } else {
         // If preDragCollapseStates exists, means we are already in edit mode and widgets should be collapsed.
         // This re-collapses them in case any were expanded by other means during edit mode.
        setWidgets(prevWidgets =>
            prevWidgets.map(w => ({ ...w, isCollapsed: true }))
        );
    }
  };

  const handleWidgetDragOver = (e: React.DragEvent<HTMLDivElement>, widgetId: string) => {
    if (!isLayoutEditing || !draggedWidgetId) return;
    e.preventDefault();
    if (widgetId !== draggedWidgetId) {
      setDragOverWidgetId(widgetId);
    }
  };

  const handleWidgetDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isLayoutEditing) return;
    // Check if the mouse is leaving the currentTarget and not entering a child element
    const relatedTarget = e.relatedTarget as Node;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
        // The mouse is still inside the widget or one of its children
        return; 
    }
    setDragOverWidgetId(null);
  };

  const handleWidgetDrop = (e: React.DragEvent<HTMLDivElement>, targetWidgetId: string) => {
    if (!isLayoutEditing || !draggedWidgetId) return;
    e.preventDefault();
    e.stopPropagation(); // Prevent drop from bubbling to container if over a widget

    const sourceWidgetId = e.dataTransfer.getData('text/plain') || draggedWidgetId;
    
    setDragOverWidgetId(null); // Clear visual cue

    if (!sourceWidgetId || sourceWidgetId === targetWidgetId) {
      // If dropped on itself or no source, ensure widgets remain collapsed if in edit mode
      if (isLayoutEditing && preDragCollapseStates) { 
          setWidgets(prevWidgets => prevWidgets.map(w => ({ ...w, isCollapsed: true })));
      }
      setDraggedWidgetId(null);
      return;
    }

    setWidgets(currentWidgets => {
      const sourceIndex = currentWidgets.findIndex(w => w.id === sourceWidgetId);
      const targetIndex = currentWidgets.findIndex(w => w.id === targetWidgetId);

      if (sourceIndex === -1 || targetIndex === -1) {
        return currentWidgets; // Should not happen if IDs are correct
      }

      const reorderedWidgets = Array.from(currentWidgets);
      const [draggedItem] = reorderedWidgets.splice(sourceIndex, 1);
      reorderedWidgets.splice(targetIndex, 0, draggedItem);
      
      // Ensure all widgets remain collapsed during layout editing
      return reorderedWidgets.map(w => ({...w, isCollapsed: true}));
    });
    setDraggedWidgetId(null); // Clear dragged widget ID after drop
  };


  const handleWidgetDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Only manage collapse state related to layout editing mode.
    // If not in layout editing mode, individual widget collapse is handled by onToggleCollapse
    if (isLayoutEditing) {
        // Keep widgets collapsed during layout editing session, until "Done Editing" is clicked.
        setWidgets(prevWidgets => prevWidgets.map(w => ({ ...w, isCollapsed: true })));
    }
    // Do not restore collapse states here; only when exiting layout editing mode.
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };
  
  // Handler for drag over the main container (space between widgets)
  const handleWidgetContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isLayoutEditing || !draggedWidgetId) return;
    e.preventDefault(); // Necessary to allow drop
    // If dragging over the container itself (not over another widget), clear dragOverWidgetId
    // This ensures no specific widget is highlighted as a drop target
    const targetElement = e.target as HTMLElement;
    if (!targetElement.closest('.page-section__widget')) {
        setDragOverWidgetId(null); 
    }
  };
  
  // Handler for drop on the main container (space between widgets)
  const handleWidgetContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isLayoutEditing || !draggedWidgetId) return;
    e.preventDefault();
    const sourceWidgetId = e.dataTransfer.getData('text/plain') || draggedWidgetId;
    
    // Check if the drop target is actually another widget; if so, its drop handler will take over.
    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('.page-section__widget')) { 
        // If dropping onto another widget, that widget's drop handler will manage it.
        // We only handle drops onto the general container space here (if it's not over another widget).
        if (dragOverWidgetId) { // dragOverWidgetId would be set if over another widget
             // Keep widgets collapsed
             if (isLayoutEditing) { 
                setWidgets(prevWidgets => prevWidgets.map(w => ({ ...w, isCollapsed: true })));
             }
             return;
        }
    }
  
    if (!sourceWidgetId) {
      setDraggedWidgetId(null);
      setDragOverWidgetId(null);
      return;
    }
  
    // Logic to move the widget to the end of the list if dropped on the container itself
    setWidgets(currentWidgets => {
      const sourceIndex = currentWidgets.findIndex(w => w.id === sourceWidgetId);
      if (sourceIndex === -1) return currentWidgets; // Should not happen
  
      const reorderedWidgets = Array.from(currentWidgets);
      const [draggedItem] = reorderedWidgets.splice(sourceIndex, 1);
      reorderedWidgets.push(draggedItem); // Add to the end
      // Ensure all widgets remain collapsed
      return reorderedWidgets.map(w => ({...w, isCollapsed: true}));
    });
    setDraggedWidgetId(null);
    setDragOverWidgetId(null);
  };

  const handleCheckLinks = async (widgetId: string) => {
    const widgetToCheck = widgets.find(w => isLinkCollectionWidget(w) && w.id === widgetId) as LinkCollectionAppWidget | undefined;
    if (!widgetToCheck) return;

    toast({ title: '正在检查链接...', description: `正在验证“${widgetToCheck.title}”中的链接。` });

    const links = widgetToCheck.data.links;
    const validationPromises = links.map(link => {
        // Using a CORS proxy to check URL status client-side
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(link.url)}`;
        return fetch(proxyUrl, { method: 'HEAD', cache: 'no-cache' })
            .then(response => ({
                linkId: link.id,
                url: link.url,
                status: response.status,
                ok: response.ok,
            }))
            .catch(error => ({
                linkId: link.id,
                url: link.url,
                status: 0, // Network error or other failure
                ok: false,
                error: error,
            }));
    });

    const results = await Promise.allSettled(validationPromises);

    const validLinks: LinkItem[] = [];
    const invalidLinkIds = new Set<string>();

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.ok) {
            validLinks.push(links[index]);
        } else {
            invalidLinkIds.add(links[index].id);
        }
    });
    
    const invalidCount = links.length - validLinks.length;

    if (invalidCount > 0) {
        setWidgets(prevWidgets =>
            prevWidgets.map(widget => {
                if (isLinkCollectionWidget(widget) && widget.id === widgetId) {
                    return {
                        ...widget,
                        data: {
                            ...widget.data,
                            links: widget.data.links.filter(link => !invalidLinkIds.has(link.id)),
                        },
                    };
                }
                return widget;
            })
        );
        toast({
            variant: 'destructive',
            title: '链接检查完成',
            description: `移除了 ${invalidCount} 个无效或无法访问的链接。`,
        });
    } else {
        toast({
            title: '链接检查完成',
            description: '所有链接均有效。',
        });
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
            <Button size="lg" variant="outline" disabled>
                <LayoutDashboard className="mr-2 h-5 w-5" />
                编辑布局
            </Button>
            <Button size="lg" variant="outline" onClick={handleImportJsonClick} disabled>
              <UploadCloud className="mr-2 h-5 w-5" />
              导入 JSON
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
            <Button size="lg" variant="outline" disabled>
                <ClipboardPaste className="mr-2 h-5 w-5" />
                从剪贴板导入
            </Button>
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
    <div className={cn("container mx-auto px-4 py-8 min-h-screen", isLayoutEditing ? "is-layout-editing" : "")}>
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AppWindow className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">PageDock</h1>
        </div>
        <p className="text-muted-foreground">您的个性化仪表板，可快速访问您喜爱的网页和工具。</p>
      </header>

      <div className="mb-8 flex justify-end space-x-2">
         <Button 
            size="lg" 
            variant={isLayoutEditing ? "default" : "outline"} 
            onClick={handleToggleLayoutEditing}
          >
            {isLayoutEditing ? <Check className="mr-2 h-5 w-5" /> : <Edit className="mr-2 h-5 w-5" />}
            {isLayoutEditing ? "完成编辑" : "编辑布局"}
          </Button>
         <Button size="lg" variant="outline" onClick={handleImportJsonClick}>
            <UploadCloud className="mr-2 h-5 w-5" />
            导入 JSON
          </Button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" style={{ display: 'none' }} />
          <Button size="lg" variant="outline" onClick={handleOpenJsonImportDialog}>
            <ClipboardPaste className="mr-2 h-5 w-5" />
            从剪贴板导入
          </Button>
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
            <DropdownMenuItem onClick={() => handleAddWidget('embed')}>
              <Code2 className="mr-2 h-4 w-4" />
              <span>嵌入</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {widgets.length === 0 ? (
        renderEmptyState()
      ) : (
        <div 
          className="space-y-8" 
          onDragOver={isLayoutEditing ? handleWidgetContainerDragOver : undefined}
          onDrop={isLayoutEditing ? handleWidgetContainerDrop : undefined}
        >
          {widgets.map(widget => {
            const widgetDragProps = {
                onWidgetDragStart: handleWidgetDragStart,
                onWidgetDragOver: handleWidgetDragOver,
                onWidgetDragLeave: handleWidgetDragLeave,
                onWidgetDrop: handleWidgetDrop,
                onWidgetDragEnd: handleWidgetDragEnd,
                draggedWidgetId: draggedWidgetId,
                dragOverWidgetId: dragOverWidgetId,
                isLayoutEditing: isLayoutEditing, 
            };

            if (isLinkCollectionWidget(widget)) {
              return (
                <LinkCollectionWidget
                  key={widget.id}
                  widget={widget}
                  onOpenLinkDialog={handleOpenLinkDialog}
                  onOpenBulkLinkDialog={handleOpenBulkLinkDialog}
                  onOpenWidgetTitleDialog={() => handleOpenWidgetTitleDialog(widget.id)}
                  onOpenLinkDisplaySettingsDialog={() => handleOpenLinkDisplaySettingsDialog(widget.id)}
                  onDeleteWidget={handleDeleteWidget}
                  onMoveLink={handleMoveLink}
                  onCheckLinks={handleCheckLinks}
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
                  {...widgetDragProps}
                />
              );
            } else if (isNoteWidget(widget)) {
              return (
                <NoteWidget
                  key={widget.id}
                  widget={widget}
                  onOpenEditDialog={() => handleOpenNoteEditDialog(widget.id)}
                  onUpdateContent={handleUpdateNoteContent}
                  onDeleteWidget={handleDeleteWidget}
                  isCollapsed={widget.isCollapsed}
                  onToggleCollapse={handleToggleWidgetCollapse}
                  {...widgetDragProps}
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
                  {...widgetDragProps}
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
                  onUpdateLocalizedEvents={handleUpdateCalendarLocalizedEvents}
                  {...widgetDragProps}
                />
              );
            } else if (isEmbedWidget(widget)) {
              return (
                <EmbedWidget
                  key={widget.id}
                  widget={widget}
                  onOpenEditDialog={() => handleOpenEmbedDialog(widget.id)}
                  onOpenWidgetTitleDialog={() => handleOpenWidgetTitleDialog(widget.id)}
                  onDeleteWidget={handleDeleteWidget}
                  isCollapsed={widget.isCollapsed}
                  onToggleCollapse={handleToggleWidgetCollapse}
                  {...widgetDragProps}
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

      {isBulkLinkDialogOpen && currentLinkCollectionWidgetId && (
        <BulkLinkDialog
          isOpen={isBulkLinkDialogOpen}
          onClose={handleCloseBulkLinkDialog}
          onSubmit={handleSubmitBulkLinks}
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

      {isLinkDisplaySettingsDialogOpen && editingWidget && isLinkCollectionWidget(editingWidget) && (
        <LinkDisplaySettingsDialog
          isOpen={isLinkDisplaySettingsDialogOpen}
          onClose={handleCloseLinkDisplaySettingsDialog}
          onSubmit={handleSubmitLinkDisplaySettings}
          defaultValues={editingWidget.data.displaySettings}
          widgetId={editingWidget.id}
        />
      )}
      
      {isEmbedDialogOpen && editingWidget && isEmbedWidget(editingWidget) && (
        <EmbedDialog
          isOpen={isEmbedDialogOpen}
          onClose={handleCloseEmbedDialog}
          onSubmit={handleSubmitEmbedDialog}
          defaultValues={editingWidget}
        />
      )}

      {isJsonImportDialogOpen && (
        <JsonImportDialog
            isOpen={isJsonImportDialogOpen}
            onClose={handleCloseJsonImportDialog}
            onSubmit={handleSubmitJsonImport}
        />
      )}
      
      <footer className="mt-16 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} PageDock. 基于 Next.js 和 Tailwind CSS 构建。</p>
      </footer>
    </div>
  );
}


    

    
