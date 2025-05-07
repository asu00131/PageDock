
"use client";

import type { LinkItem } from '@/types';
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
import { useEffect } from 'react';

const linkSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }).max(100, { message: 'Title must be 100 characters or less.' }),
  url: z.string().url({ message: 'Please enter a valid URL.' }),
});

type LinkFormData = z.infer<typeof linkSchema>;

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LinkFormData, id?: string) => void; // categoryId is handled by parent through currentCategoryId state
  defaultValues?: LinkItem;
  categoryId: string; // To ensure context, though not directly used in form submission data
}

export function LinkDialog({ isOpen, onClose, onSubmit, defaultValues, categoryId }: LinkDialogProps) {
  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      title: '',
      url: '',
    },
  });

  useEffect(() => {
    if (isOpen) { // Reset form only when dialog opens
      if (defaultValues) {
        form.reset({ title: defaultValues.title, url: defaultValues.url });
      } else {
        form.reset({ title: '', url: '' });
      }
    }
  }, [defaultValues, form, isOpen]);

  const handleSubmit = (data: LinkFormData) => {
    onSubmit(data, defaultValues?.id); // Pass linkId if editing
    onClose();
  };

  // Ensure categoryId is present, though not part of form data schema
  if (!categoryId && isOpen) {
    console.error("LinkDialog opened without a categoryId!");
    // Optionally, close dialog or show error
    // onClose(); 
    // return null;
  }


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] bg-background">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Edit Link' : 'Add New Link'}</DialogTitle>
          <DialogDescription>
            {defaultValues ? "Update the details for your link." : "Enter the details for your new link."}
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
                    <Input placeholder="e.g. My Favorite News" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">{defaultValues ? 'Save Changes' : 'Add Link'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
