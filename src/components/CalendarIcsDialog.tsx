
"use client";

import type { CalendarIcsAppWidget } from '@/types';
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

const calendarIcsSchema = z.object({
  title: z.string().min(1, { message: 'Title is required.' }).max(100, { message: 'Title must be 100 characters or less.' }),
  icsUrl: z.string().url({ message: 'Please enter a valid ICS URL.' }).refine(
    (url) => url.endsWith('.ics'),
    { message: 'URL must end with .ics' }
  ),
});

type CalendarIcsFormData = z.infer<typeof calendarIcsSchema>;

interface CalendarIcsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (widgetId: string, title: string, icsUrl: string) => void;
  defaultValues?: CalendarIcsAppWidget;
}

export function CalendarIcsDialog({ isOpen, onClose, onSubmit, defaultValues }: CalendarIcsDialogProps) {
  const form = useForm<CalendarIcsFormData>({
    resolver: zodResolver(calendarIcsSchema),
    defaultValues: {
      title: defaultValues?.title || 'Calendar',
      icsUrl: defaultValues?.data.icsUrl || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: defaultValues?.title || 'Calendar',
        icsUrl: defaultValues?.data.icsUrl || '',
      });
    }
  }, [defaultValues, form, isOpen]);

  const handleSubmit = (data: CalendarIcsFormData) => {
    if (defaultValues?.id) {
      onSubmit(defaultValues.id, data.title, data.icsUrl);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{defaultValues?.data.icsUrl ? 'Edit Calendar' : 'Add New Calendar'}</DialogTitle>
          <DialogDescription>
            {defaultValues?.data.icsUrl ? "Update your calendar's title and ICS URL." : "Enter a title and ICS URL for your new calendar."}
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
                    <Input placeholder="e.g. My Work Calendar" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icsUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ICS URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/calendar.ics" {...field} />
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
