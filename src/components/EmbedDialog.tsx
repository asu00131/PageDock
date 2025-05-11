
"use client";

import type { EmbedAppWidget, EmbedWidgetData, EmbedType } from '@/types';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEffect } from 'react';

const embedSchema = z.object({
  title: z.string().min(1, { message: '标题是必填项。' }).max(100, { message: '标题长度不能超过100个字符。' }),
  embedUrl: z.string().url({ message: '请输入有效的网址。' }),
  embedType: z.enum(['iframe', 'image'], { required_error: "请选择嵌入类型。" }),
  iframeHeight: z.string().optional(), // e.g., "400px" or "100%"
});

type EmbedFormData = z.infer<typeof embedSchema>;

interface EmbedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (widgetId: string, title: string, data: EmbedWidgetData) => void;
  defaultValues?: EmbedAppWidget;
}

export function EmbedDialog({ isOpen, onClose, onSubmit, defaultValues }: EmbedDialogProps) {
  const form = useForm<EmbedFormData>({
    resolver: zodResolver(embedSchema),
    defaultValues: {
      title: defaultValues?.title || '嵌入内容',
      embedUrl: defaultValues?.data.embedUrl || '',
      embedType: defaultValues?.data.embedType || 'iframe',
      iframeHeight: defaultValues?.data.iframeHeight || '400px',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: defaultValues?.title || '嵌入内容',
        embedUrl: defaultValues?.data.embedUrl || '',
        embedType: defaultValues?.data.embedType || 'iframe',
        iframeHeight: defaultValues?.data.iframeHeight || '400px',
      });
    }
  }, [defaultValues, form, isOpen]);

  const handleSubmit = (data: EmbedFormData) => {
    if (defaultValues?.id) {
      const widgetData: EmbedWidgetData = {
        embedUrl: data.embedUrl,
        embedType: data.embedType as EmbedType, // Cast because z.enum gives a union of literals
        iframeHeight: data.embedType === 'iframe' ? data.iframeHeight || '400px' : undefined,
      };
      onSubmit(defaultValues.id, data.title, widgetData);
    }
    onClose();
  };

  const currentEmbedType = form.watch('embedType');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{defaultValues?.data.embedUrl ? '编辑嵌入内容' : '添加新嵌入内容'}</DialogTitle>
          <DialogDescription>
            {defaultValues?.data.embedUrl ? "更新嵌入内容的标题、类型和源。" : "为新嵌入内容输入标题、类型和源。"}
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
                    <Input placeholder="例如：我的仪表盘" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="embedUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>嵌入网址或图片链接</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com 或 https://example.com/image.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="embedType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>嵌入类型</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="iframe" /></FormControl>
                        <FormLabel className="font-normal">网页 (Iframe)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="image" /></FormControl>
                        <FormLabel className="font-normal">图片</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {currentEmbedType === 'iframe' && (
              <FormField
                control={form.control}
                name="iframeHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Iframe 高度 (可选)</FormLabel>
                    <FormControl>
                      <Input placeholder="例如：400px, 80vh, 100%" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
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
