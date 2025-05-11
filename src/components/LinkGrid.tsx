
"use client";

import type { LinkItem } from '@/types';
import { LinkCard } from './LinkCard';
import { useState } from 'react';
import type React from 'react';

interface LinkGridProps {
  links: LinkItem[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onLinksReordered: (newLinks: LinkItem[]) => void;
  isLayoutEditing?: boolean; // Added to control dragability of items
}

export function LinkGrid({ links, onEdit, onDelete, onLinksReordered, isLayoutEditing }: LinkGridProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (!isLayoutEditing) { e.preventDefault(); return; }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    setDraggedItemId(id);
    setDragOverItemId(null); 
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, id: string) => {
    if (!isLayoutEditing || !draggedItemId) return;
    e.preventDefault(); 
    if (id !== draggedItemId) {
        setDragOverItemId(id);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isLayoutEditing) return;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) {
      return;
    }
    setDragOverItemId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
    if (!isLayoutEditing || !draggedItemId) return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedItemId;
    
    setDragOverItemId(null);
    setDraggedItemId(null);

    if (!sourceId || sourceId === targetId) {
      return;
    }

    const sourceIndex = links.findIndex(link => link.id === sourceId);
    const targetIndex = links.findIndex(link => link.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      return;
    }

    const reorderedLinks = Array.from(links);
    const [draggedItem] = reorderedLinks.splice(sourceIndex, 1);
    reorderedLinks.splice(targetIndex, 0, draggedItem);

    onLinksReordered(reorderedLinks);
  };
  
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isLayoutEditing) return;
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLUListElement>) => {
    if (!isLayoutEditing || !draggedItemId) return;
    e.preventDefault();
  };

  const handleContainerDrop = (e: React.DragEvent<HTMLUListElement>) => {
    if (!isLayoutEditing || !draggedItemId) return;
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedItemId;
    
    setDraggedItemId(null);
    setDragOverItemId(null);

    if (!sourceId) return;

    const targetElement = e.target as HTMLElement;
    if (targetElement.closest('.bookmark-item')) {
      return;
    }
    
    const sourceIndex = links.findIndex(link => link.id === sourceId);
    if (sourceIndex === -1) return;

    const reorderedLinks = Array.from(links);
    const [draggedItem] = reorderedLinks.splice(sourceIndex, 1);
    reorderedLinks.push(draggedItem);
    onLinksReordered(reorderedLinks);
  };


  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-muted rounded-lg min-h-[100px]">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid mb-3 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>
        <h2 className="text-lg font-semibold text-foreground">暂无链接</h2>
        <p className="text-muted-foreground mt-1 text-sm">为此合集添加一个链接。</p>
      </div>
    );
  }

  return (
    <ul 
        className="bookmark-widget__list"
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
    >
      {links.map((link) => (
        <li key={link.id} className="bookmark-widget__item-wrapper">
          <LinkCard 
            link={link} 
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
