
"use client";

import { useState, useEffect } from 'react';
import type { LinkItem, LinkCategory } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Button } from '@/components/ui/button';
import { LinkDialog } from '@/components/LinkDialog';
import { LinkCategoryWidget } from '@/components/LinkCategoryWidget';
import { PlusCircle, AppWindow, FolderPlus } from 'lucide-react';
import { CategoryDialog } from '@/components/CategoryDialog'; // To be created

export default function HomePage() {
  const [categories, setCategories] = useLocalStorage<LinkCategory[]>('pageDockCategories', []);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  
  const [editingLink, setEditingLink] = useState<LinkItem | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState<LinkCategory | undefined>(undefined);
  const [currentCategoryId, setCurrentCategoryId] = useState<string | undefined>(undefined);

  // Data migration from old 'pageDockLinks' to new 'pageDockCategories'
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const oldLinksRaw = window.localStorage.getItem('pageDockLinks');
      if (oldLinksRaw) {
        try {
          const oldLinks = JSON.parse(oldLinksRaw) as LinkItem[];
          if (Array.isArray(oldLinks) && oldLinks.length > 0 && categories.length === 0) {
            const defaultCategory: LinkCategory = {
              id: crypto.randomUUID(),
              title: 'My Links',
              links: oldLinks,
            };
            setCategories([defaultCategory]);
            // Optionally remove the old key, but be careful
            // window.localStorage.removeItem('pageDockLinks'); 
            // console.log("Migrated old links to new category structure.");
          } else if (categories.length === 0 && oldLinks.length === 0) {
             // If both are empty, create a default empty category
            const defaultCategory: LinkCategory = {
              id: crypto.randomUUID(),
              title: 'My First Collection',
              links: [],
            };
            setCategories([defaultCategory]);
          }
        } catch (error) {
          console.error("Error migrating old links:", error);
        }
      } else if (categories.length === 0) {
        // If no old links and no categories, create a default one
        const defaultCategory: LinkCategory = {
          id: crypto.randomUUID(),
          title: 'My First Collection',
          links: [],
        };
        setCategories([defaultCategory]);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const handleOpenLinkDialog = (categoryId: string, link?: LinkItem) => {
    setCurrentCategoryId(categoryId);
    setEditingLink(link);
    setIsLinkDialogOpen(true);
  };

  const handleCloseLinkDialog = () => {
    setIsLinkDialogOpen(false);
    setEditingLink(undefined);
    setCurrentCategoryId(undefined);
  };

  const handleOpenCategoryDialog = (category?: LinkCategory) => {
    setEditingCategory(category);
    setIsCategoryDialogOpen(true);
  };

  const handleCloseCategoryDialog = () => {
    setIsCategoryDialogOpen(false);
    setEditingCategory(undefined);
  };

  const handleSubmitLink = (data: Omit<LinkItem, 'id'>, linkId?: string) => {
    if (!currentCategoryId) return;

    setCategories(prevCategories => 
      prevCategories.map(category => {
        if (category.id === currentCategoryId) {
          let updatedLinks;
          if (linkId) { // Editing existing link
            updatedLinks = category.links.map(link => 
              link.id === linkId ? { ...link, ...data } : link
            );
          } else { // Adding new link
            const newLink: LinkItem = { id: crypto.randomUUID(), ...data };
            updatedLinks = [newLink, ...category.links];
          }
          return { ...category, links: updatedLinks };
        }
        return category;
      })
    );
  };

  const handleDeleteLink = (categoryId: string, linkId: string) => {
    setCategories(prevCategories =>
      prevCategories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            links: category.links.filter(link => link.id !== linkId),
          };
        }
        return category;
      })
    );
  };
  
  const handleSubmitCategory = (title: string, categoryId?: string) => {
    if (categoryId) { // Editing category
      setCategories(prev => prev.map(cat => cat.id === categoryId ? { ...cat, title } : cat));
    } else { // Adding new category
      const newCategory: LinkCategory = { id: crypto.randomUUID(), title, links: [] };
      setCategories(prev => [...prev, newCategory]);
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
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
        <Button onClick={() => handleOpenCategoryDialog()} size="lg">
          <FolderPlus className="mr-2 h-5 w-5" />
          Add New Collection
        </Button>
      </div>
      
      {categories.length === 0 && (
         <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-muted rounded-lg min-h-[200px]">
            <FolderPlus className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground">No Collections Yet</h2>
            <p className="text-muted-foreground mt-1">Click "Add New Collection" to get started.</p>
        </div>
      )}

      <div className="space-y-8">
        {categories.map(category => (
          <LinkCategoryWidget
            key={category.id}
            category={category}
            onOpenLinkDialog={handleOpenLinkDialog}
            onOpenCategoryDialog={handleOpenCategoryDialog}
            onDeleteCategory={handleDeleteCategory}
            onEditLink={(catId, linkId) => {
                const cat = categories.find(c => c.id === catId);
                const linkToEdit = cat?.links.find(l => l.id === linkId);
                if (cat && linkToEdit) {
                    handleOpenLinkDialog(cat.id, linkToEdit);
                }
            }}
            onDeleteLink={handleDeleteLink}
          />
        ))}
      </div>

      {isLinkDialogOpen && currentCategoryId && (
        <LinkDialog
          isOpen={isLinkDialogOpen}
          onClose={handleCloseLinkDialog}
          onSubmit={handleSubmitLink}
          defaultValues={editingLink}
          categoryId={currentCategoryId} 
        />
      )}

      {isCategoryDialogOpen && (
        <CategoryDialog
            isOpen={isCategoryDialogOpen}
            onClose={handleCloseCategoryDialog}
            onSubmit={handleSubmitCategory}
            defaultValues={editingCategory}
        />
      )}
      
      <footer className="mt-16 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} PageDock. Built with Next.js and Tailwind CSS.</p>
      </footer>
    </div>
  );
}
