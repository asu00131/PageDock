"use client";

import type { LinkItem } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LinkIcon, Pencil, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog"

interface LinkCardProps {
  link: LinkItem;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function LinkCard({ link, onEdit, onDelete }: LinkCardProps) {
  return (
    <Card className="group relative transition-all duration-200 ease-in-out hover:shadow-xl">
      <a href={link.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-0" aria-label={`Open ${link.title}`}></a>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg font-semibold truncate" title={link.title}>
                {link.title}
            </CardTitle>
           </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <p className="text-sm text-muted-foreground truncate" title={link.url}>
          {link.url}
        </p>
        <div className="mt-4 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(link.id); }}
            aria-label={`Edit ${link.title}`}
            className="h-8 w-8"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                aria-label={`Delete ${link.title}`}
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the link "{link.title}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(link.id); }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
