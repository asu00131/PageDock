
"use client";

import type { LinkCategory } from '@/types';
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

const categorySchema = z.object({
  title: z.string().min(1, { message: 'Collection title is required.' }).max(50, { message: 'Title must be 50 characters or less.' }),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, id?: string) => void;
  defaultValues?: LinkCategory;
}

export function CategoryDialog({ isOpen, onClose, onSubmit, defaultValues }: CategoryDialogProps) {
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      title: defaultValues?.title || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (defaultValues) {
            form.reset({ title: defaultValues.title });
        } else {
            form.reset({ title: '' });
        }
    }
  }, [defaultValues, form, isOpen]);

  const handleSubmit = (data: CategoryFormData) => {
    onSubmit(data.title, defaultValues?.id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] bg-background">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Edit Collection' : 'Add New Collection'}</DialogTitle>
          <DialogDescription>
            {defaultValues ? "Update the title for your collection." : "Enter the title for your new collection."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Collection Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Work Tools" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">{defaultValues ? 'Save Changes' : 'Add Collection'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
