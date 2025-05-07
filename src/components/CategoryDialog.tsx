
"use client";

import type { AppWidget } from '@/types';
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

const widgetTitleSchema = z.object({
  title: z.string().min(1, { message: 'Widget title is required.' }).max(50, { message: 'Title must be 50 characters or less.' }),
});

type WidgetTitleFormData = z.infer<typeof widgetTitleSchema>;

interface WidgetTitleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, widgetId: string) => void;
  defaultValues?: Pick<AppWidget, 'id' | 'title'>; // Only need id and title
}

export function WidgetTitleDialog({ isOpen, onClose, onSubmit, defaultValues }: WidgetTitleDialogProps) {
  const form = useForm<WidgetTitleFormData>({
    resolver: zodResolver(widgetTitleSchema),
    defaultValues: {
      title: defaultValues?.title || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
        if (defaultValues) {
            form.reset({ title: defaultValues.title });
        } else {
            form.reset({ title: '' }); // Should not happen if always editing
        }
    }
  }, [defaultValues, form, isOpen]);

  const handleSubmit = (data: WidgetTitleFormData) => {
    if (defaultValues?.id) {
      onSubmit(data.title, defaultValues.id);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] bg-background">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Edit Widget Title' : 'Set Widget Title'}</DialogTitle>
          <DialogDescription>
            {defaultValues ? "Update the title for this widget." : "Enter the title for this widget."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Widget Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Work Tools, Quick Notes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">{defaultValues ? 'Save Changes' : 'Set Title'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
