
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
      <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-muted rounded-lg min-h-[100px]"> {/* Reduced min-h */}
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid mb-3 text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>
        <h2 className="text-lg font-semibold text-foreground">No Links Yet</h2>
        <p className="text-muted-foreground mt-1 text-sm">Add a link to this category.</p>
      </div>
    );
  }

  return (
    <ul className="bookmark-widget__list">
      {links.map((link) => (
        <li key={link.id} className="bookmark-widget__item-wrapper">
          <LinkCard link={link} onEdit={onEdit} onDelete={onDelete} />
        </li>
      ))}
    </ul>
  );
}
