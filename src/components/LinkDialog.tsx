
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
  title: z.string().min(1, { message: '标题是必填项。' }).max(100, { message: '标题长度不能超过100个字符。' }),
  url: z.string().url({ message: '请输入有效的网址。' }),
});

type LinkFormData = z.infer<typeof linkSchema>;

interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LinkFormData, id?: string) => void; 
  defaultValues?: LinkItem;
  categoryId: string; 
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
    if (isOpen) { 
      if (defaultValues) {
        form.reset({ title: defaultValues.title, url: defaultValues.url });
      } else {
        form.reset({ title: '', url: '' });
      }
    }
  }, [defaultValues, form, isOpen]);

  const handleSubmit = (data: LinkFormData) => {
    onSubmit(data, defaultValues?.id); 
    onClose();
  };

  if (!categoryId && isOpen) {
    console.error("LinkDialog opened without a categoryId!");
  }


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px] bg-background">
        <DialogHeader>
          <DialogTitle>{defaultValues ? '编辑链接' : '添加新链接'}</DialogTitle>
          <DialogDescription>
            {defaultValues ? "更新链接详情。" : "输入新链接的详情。"}
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
                    <Input placeholder="例如：我最爱的新闻" {...field} />
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
                  <FormLabel>网址</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">{defaultValues ? '保存更改' : '添加链接'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

