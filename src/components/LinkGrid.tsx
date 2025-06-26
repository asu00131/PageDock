
"use client";

import type { LinkItem, LinkCollectionDisplaySettings } from '@/types';
import { LinkCard } from './LinkCard';
import { useState } from 'react';
import type React from 'react';
import { cn } from '@/lib/utils';

interface LinkGridProps {
  widgetId: string;
  links: LinkItem[];
  displaySettings: LinkCollectionDisplaySettings;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveLink: (source: { widgetId: string; linkId: string }, target: { widgetId: string; linkId: string | null }) => void;
  isLayoutEditing?: boolean;
}

export function LinkGrid({ widgetId, links, displaySettings, onEdit, onDelete, onMoveLink, isLayoutEditing }: LinkGridProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  
  const { displayMode, visibleLinksCount } = displaySettings;

  const DATA_TRANSFER_KEY = 'application/pagedock-link';

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (!isLayoutEditing) { 
      e.preventDefault(); 
      return; 
    } 
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData(DATA_TRANSFER_KEY, JSON.stringify({ widgetId: widgetId, linkId: id }));
    setDraggedItemId(id);
    setDragOverItemId(null); 
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    try {
        const isLinkData = e.dataTransfer.types.includes(DATA_TRANSFER_KEY.toLowerCase());
        if (!isLinkData) return;
        
        e.preventDefault(); 
        e.stopPropagation(); 
        if (id !== draggedItemId) {
            setDragOverItemId(id);
        }
    } catch (err) {
        // This can happen if dragging from another window. Ignore.
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const sourceDataString = e.dataTransfer.getData(DATA_TRANSFER_KEY);
      if (!sourceDataString) return; 
      const sourceData = JSON.parse(sourceDataString);

      if (sourceData.linkId !== targetId) { 
        onMoveLink(
          { widgetId: sourceData.widgetId, linkId: sourceData.linkId },
          { widgetId: widgetId, linkId: targetId }
        );
      }
    } catch (err) {
      console.error("Error handling drop:", err);
    } finally {
      setDraggedItemId(null);
      setDragOverItemId(null);
    }
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLUListElement>) => {
    try {
        const isLinkData = e.dataTransfer.types.includes(DATA_TRANSFER_KEY.toLowerCase());
        if (!isLinkData) return;

        e.preventDefault();
        e.stopPropagation();
        setDragOverItemId(null); 
    } catch (err) {
        // Ignore errors from external drags
    }
  };

  const handleContainerDrop = (e: React.DragEvent<HTMLUListElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const sourceDataString = e.dataTransfer.getData(DATA_TRANSFER_KEY);
      if (!sourceDataString) return;
      const sourceData = JSON.parse(sourceDataString);
      
      const targetElement = e.target as HTMLElement;
      if (targetElement.closest('.bookmark-item')) { 
        return; 
      }
    
      onMoveLink(
        { widgetId: sourceData.widgetId, linkId: sourceData.linkId },
        { widgetId: widgetId, linkId: null } 
      );
    } catch (err) {
      console.error("Error handling container drop:", err);
    } finally {
      setDraggedItemId(null);
      setDragOverItemId(null);
    }
  };

  const getVisibleLinks = () => {
    if (visibleLinksCount === 0) return links;
    if (visibleLinksCount === -1) return [];
    return links.slice(0, visibleLinksCount);
  };

  const visibleLinks = getVisibleLinks();

  if (visibleLinks.length === 0 && visibleLinksCount !== -1) {
     return (
      <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-muted rounded-lg min-h-[100px]">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid mb-3 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>
        <h2 className="text-lg font-semibold text-foreground">暂无链接</h2>
        <p className="text-muted-foreground mt-1 text-sm">为此合集添加一个链接。</p>
      </div>
    );
  }
  if (visibleLinksCount === -1) {
     return (
      <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-muted rounded-lg min-h-[100px]">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye-off mb-3 text-muted-foreground"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
        <h2 className="text-lg font-semibold text-foreground">链接已隐藏</h2>
        <p className="text-muted-foreground mt-1 text-sm">通过显示设置更改。</p>
      </div>
    );
  }


  const listClassName = cn("bookmark-widget__list", {
    "flex flex-wrap": displayMode === 'cloud' || displayMode === 'icons',
    "flex flex-col space-y-1": displayMode === 'list' || displayMode === 'detailedList',
    "bookmark-widget__list_mode_cloud": displayMode === 'cloud',
    "bookmark-widget__list_mode_icons": displayMode === 'icons',
    "bookmark-widget__list_mode_list": displayMode === 'list',
    "bookmark-widget__list_mode_detailed-list": displayMode === 'detailedList',
  });

  return (
    <ul 
        className={listClassName}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
    >
      {visibleLinks.map((link) => (
        <li key={link.id} className="bookmark-widget__item-wrapper">
          <LinkCard 
            link={link} 
            displaySettings={displaySettings}
            onEdit={onEdit} 
            onDelete={onDelete}
            onDragStartHandler={handleDragStart}
            onDragOverHandler={handleDragOver}
            onDropHandler={handleDrop}
            onDragLeaveHandler={handleDragLeave}
            onDragEndHandler={handleDragEnd}
            isDragging={draggedItemId === link.id}
            isDragOver={dragOverItemId === link.id && draggedItemId !== link.id}
            isLayoutEditing={isLayoutEditing}
          />
        </li>
      ))}
    </ul>
  );
}
