
"use client";

import type { LinkCategory, LinkItem } from '@/types';
import { LinkGrid } from './LinkGrid';
import { Button } from '@/components/ui/button';
import { ChevronDown, Edit3, MoreVertical, PlusCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


interface LinkCategoryWidgetProps {
  category: LinkCategory;
  onOpenLinkDialog: (categoryId: string, link?: LinkItem) => void;
  onOpenCategoryDialog: (category?: LinkCategory) => void;
  onDeleteCategory: (categoryId: string) => void;
  onEditLink: (categoryId: string, linkId: string) => void;
  onDeleteLink: (categoryId: string, linkId: string) => void;
}

export function LinkCategoryWidget({
  category,
  onOpenLinkDialog,
  onOpenCategoryDialog,
  onDeleteCategory,
  onEditLink,
  onDeleteLink,
}: LinkCategoryWidgetProps) {
  
  const handleEdit = (linkId: string) => {
    onEditLink(category.id, linkId);
  };

  const handleDelete = (linkId: string) => {
    onDeleteLink(category.id, linkId);
  };

  return (
    <div className="page-section__widget">
      <article className="widget bookmark-widget">
        <div className="widget__container">
          <header className="widget__header widget-header_hovered">
            <h2 className="widget-header__title">
              <span className="widget-header__text">{category.title}</span>
              {/* Placeholder for chevron if widget is collapsible */}
              {/* <ChevronDown className="widget-header__chevron" /> */}
            </h2>
            <div className="widget-header__controls">
              <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={() => onOpenLinkDialog(category.id)}>
                <PlusCircle className="widget-header__feather-icon h-4 w-4" />
                <span className="sr-only">Add link to {category.title}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7">
                    <MoreVertical className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">More options for {category.title}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpenCategoryDialog(category)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>Edit Category Title</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                       <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                        <span className="text-destructive">Delete Category</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the category "{category.title}" and all its links.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteCategory(category.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <div className="widget__box">
            <div className="widget__body">
              <LinkGrid
                links={category.links}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
