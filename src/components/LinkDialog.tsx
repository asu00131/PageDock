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
  title: z.string().min(1, { message: 'Title is required.' }).max(50, { message: 'Title must be 50 characters or less.' }),
  url: z.string().url({ message: 'Please enter a valid URL.' }),
});

type LinkFormData = z.infer<typeof linkSchema>;

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LinkFormData, id?: string) => void;
  defaultValues?: LinkItem;
}

export function LinkDialog({ isOpen, onClose, onSubmit, defaultValues }: LinkDialogProps) {
  const form = useForm<LinkFormData>({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      url: defaultValues?.url || '',
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset({ title: defaultValues.title, url: defaultValues.url });
    } else {
      form.reset({ title: '', url: '' });
    }
  }, [defaultValues, form, isOpen]);

  const handleSubmit = (data: LinkFormData) => {
    onSubmit(data, defaultValues?.id);
    onClose();
  };

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
