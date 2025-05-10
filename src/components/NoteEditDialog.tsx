
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
import { Textarea } from '@/components/ui/textarea'; 
import { useEffect } from 'react';

const noteSchema = z.object({
  title: z.string().min(1, { message: '标题是必填项。' }).max(100, { message: '标题长度不能超过100个字符。' }),
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
          <DialogTitle>{defaultValues ? '编辑笔记' : '添加新笔记'}</DialogTitle>
          <DialogDescription>
            {defaultValues ? "更新笔记的标题和内容。" : "为新笔记输入标题和内容。"}
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
                    <Input placeholder="例如：我的随想" {...field} />
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
                  <FormLabel>内容 (支持 Markdown)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="在此处开始撰写笔记..." {...field} rows={10} className="min-h-[200px]"/>
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

