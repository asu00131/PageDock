
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
  title: z.string().min(1, { message: '小部件标题是必填项。' }).max(50, { message: '标题长度不能超过50个字符。' }),
});

type WidgetTitleFormData = z.infer<typeof widgetTitleSchema>;

interface WidgetTitleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, widgetId: string) => void;
  defaultValues?: Pick<AppWidget, 'id' | 'title'>; 
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
            form.reset({ title: '' }); 
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
          <DialogTitle>{defaultValues ? '编辑小部件标题' : '设置小部件标题'}</DialogTitle>
          <DialogDescription>
            {defaultValues ? "更新此小部件的标题。" : "输入此小部件的标题。"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>小部件标题</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：工作工具，快速笔记" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">{defaultValues ? '保存更改' : '设置标题'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

