
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
  title: z.string().min(1, { message: '标题是必填项。' }).max(100, { message: '标题长度不能超过100个字符。' }),
  icsUrl: z.string().url({ message: '请输入有效的 ICS 链接。' }).refine(
    (url) => url.endsWith('.ics'),
    { message: '链接必须以 .ics 结尾。' }
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
      title: defaultValues?.title || '日历',
      icsUrl: defaultValues?.data.icsUrl || '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: defaultValues?.title || '日历',
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
          <DialogTitle>{defaultValues?.data.icsUrl ? '编辑日历' : '添加新日历'}</DialogTitle>
          <DialogDescription>
            {defaultValues?.data.icsUrl ? "更新日历的标题和 ICS 链接。" : "为新日历输入标题和 ICS 链接。"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：我的工作日历" {...field} />
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
                  <FormLabel>ICS 链接</FormLabel>
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

