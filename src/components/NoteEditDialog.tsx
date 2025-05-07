
"use client";

import type { NoteWidgetData } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Assuming you have a Textarea component
import { useEffect } from 'react';

const noteSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }).max(100, { message: 'Title must be 100 characters or less.' }),
  content: z.string().optional(),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface NoteEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (widgetId: string, title: string, content: string) => void;
  defaultValues?: { id: string; title: string; data: NoteWidgetData };
}

export function NoteEditDialog({ isOpen, onClose, onSubmit, defaultValues }: NoteEditDialogProps) {
  const form = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: defaultValues?.title || '附注',
      content: defaultValues?.data.content || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: defaultValues?.title || '附注',
        content: defaultValues?.data.content || '',
      });
    }
  }, [defaultValues, form, isOpen]);

  const handleSubmit = (data: NoteFormData) => {
    if (defaultValues?.id) {
      onSubmit(defaultValues.id, data.title, data.content || '');
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Edit Note' : 'Add New Note'}</DialogTitle>
          <DialogDescription>
            {defaultValues ? "Update your note's title and content." : "Enter a title and content for your new note."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. My Quick Thoughts" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (Markdown supported)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Start writing your note here..." {...field} rows={10} className="min-h-[200px]"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
