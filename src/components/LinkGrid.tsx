"use client";

import type { LinkItem } from '@/types';
import { LinkCard } from './LinkCard';

interface LinkGridProps {
  links: LinkItem[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function LinkGrid({ links, onEdit, onDelete }: LinkGridProps) {
  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-muted rounded-lg min-h-[200px]">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid mb-4 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>
        <h2 className="text-xl font-semibold text-foreground">No Links Yet</h2>
        <p className="text-muted-foreground mt-1">Click the "Add New Link" button to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {links.map((link) => (
        <LinkCard key={link.id} link={link} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
