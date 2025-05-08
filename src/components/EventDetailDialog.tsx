
"use client";

import type { CalendarEvent } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { useEffect } from 'react';
import { format } from 'date-fns';

const eventDetailSchema = z.object({
  summary: z.string().min(1, { message: 'Summary is required.' }).max(200, { message: 'Summary must be 200 characters or less.' }),
  description: z.string().optional(),
  // startDate and endDate are displayed, not edited in this version for simplicity
});

type EventDetailFormData = z.infer<typeof eventDetailSchema>;

interface EventDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updatedEventData: Partial<CalendarEvent> & { id: string }) => void;
  event: CalendarEvent;
  widgetId: string; // Though not used in submit for local state, good for context
}

export function EventDetailDialog({ isOpen, onClose, onSubmit, event, widgetId }: EventDetailDialogProps) {
  const form = useForm<EventDetailFormData>({
    resolver: zodResolver(eventDetailSchema),
    defaultValues: {
      summary: event.summary,
      description: event.description || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        summary: event.summary,
        description: event.description || '',
      });
    }
  }, [event, form, isOpen]);

  const handleSubmit = (data: EventDetailFormData) => {
    onSubmit({
      id: event.id, // Ensure ID is passed back
      summary: data.summary,
      description: data.description,
      // startDate, endDate, isAllDay remain unchanged from original event for this submission
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
          <DialogDescription>
            View or edit the event details. Changes are local to this session.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Input placeholder="Event summary" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Start Time</FormLabel>
              <Input
                readOnly
                disabled
                value={event.isAllDay ? format(event.startDate, 'PPP') + ' (All day)' : format(event.startDate, 'PPP p')}
                className="disabled:opacity-100 disabled:cursor-default"
              />
            </FormItem>

            <FormItem>
              <FormLabel>End Time</FormLabel>
              <Input
                readOnly
                disabled
                value={event.isAllDay ? format(event.endDate, 'PPP') + ' (All day)' : format(event.endDate, 'PPP p')}
                className="disabled:opacity-100 disabled:cursor-default"
              />
            </FormItem>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Event description (optional)" {...field} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
