"use client";

import { useState } from 'react';
import type { LinkItem } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { LinkDialog } from '@/components/LinkDialog';
import { LinkGrid } from '@/components/LinkGrid';
import { PlusCircle, AppWindow } from 'lucide-react';

export default function HomePage() {
  const [links, setLinks] = useLocalStorage<LinkItem[]>('pageDockLinks', []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkItem | undefined>(undefined);

  const handleOpenDialog = (link?: LinkItem) => {
    setEditingLink(link);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLink(undefined);
  };

  const handleSubmitLink = (data: Omit<LinkItem, 'id'>, id?: string) => {
    if (id) {
      // Editing existing link
      setLinks(links.map((link) => (link.id === id ? { ...link, ...data } : link)));
    } else {
      // Adding new link
      const newLink: LinkItem = { id: crypto.randomUUID(), ...data };
      setLinks([newLink, ...links]);
    }
  };

  const handleDeleteLink = (id: string) => {
    setLinks(links.filter((link) => link.id !== id));
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <AppWindow className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold text-foreground">PageDock</h1>
        </div>
        <p className="text-muted-foreground">Your personal dashboard for quick access to your favorite web pages.</p>
      </header>

      <div className="mb-8 text-right">
        <Button onClick={() => handleOpenDialog()} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" />
          Add New Link
        </Button>
      </div>

      <LinkGrid links={links} onEdit={(id) => handleOpenDialog(links.find(l => l.id === id))} onDelete={handleDeleteLink} />

      {isDialogOpen && (
        <LinkDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onSubmit={handleSubmitLink}
          defaultValues={editingLink}
        />
      )}
      
      <footer className="mt-16 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} PageDock. Built with Next.js and Tailwind CSS.</p>
      </footer>
    </div>
  );
}
