
"use client";

import type { EmbedAppWidget, EmbedWidgetData, EmbedType, IframeEmbedData, ImageEmbedData, CodeEmbedData } from '@/types';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEffect } from 'react';
import { Code2 } from 'lucide-react';

const embedDialogSchema = z.object({
  title: z.string().min(1, { message: '标题是必填项。' }).max(100, { message: '标题长度不能超过100个字符。' }),
  embedType: z.enum(['iframe', 'image', 'code'], { required_error: "请选择嵌入类型。" }),
  embedUrl: z.string().optional(),
  codeContent: z.string().optional(),
  iframeHeight: z.string().optional(), 
}).superRefine((data, ctx) => {
  if (data.embedType === 'iframe') {
    if (!data.embedUrl || !z.string().url().safeParse(data.embedUrl).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请输入有效的网页链接。',
        path: ['embedUrl'],
      });
    }
  } else if (data.embedType === 'image') {
    if (!data.embedUrl || !z.string().url().safeParse(data.embedUrl).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请输入有效的图片链接。',
        path: ['embedUrl'],
      });
    }
  } else if (data.embedType === 'code') {
    if (!data.codeContent || data.codeContent.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'HTML代码内容不能为空。',
        path: ['codeContent'],
      });
    }
  }
});

type EmbedDialogFormData = z.infer<typeof embedDialogSchema>;

interface EmbedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (widgetId: string, title: string, data: EmbedWidgetData) => void;
  defaultValues?: EmbedAppWidget;
}

export function EmbedDialog({ isOpen, onClose, onSubmit, defaultValues }: EmbedDialogProps) {
  const form = useForm<EmbedDialogFormData>({
    resolver: zodResolver(embedDialogSchema),
    defaultValues: {
      title: defaultValues?.title || '嵌入内容',
      embedType: defaultValues?.data.embedType || 'iframe',
      embedUrl: (defaultValues?.data.embedType === 'iframe' || defaultValues?.data.embedType === 'image') ? defaultValues.data.embedUrl : '',
      codeContent: defaultValues?.data.embedType === 'code' ? defaultValues.data.codeContent : '',
      iframeHeight: defaultValues?.data.iframeHeight || '400px',
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        title: defaultValues?.title || '嵌入内容',
        embedType: defaultValues?.data.embedType || 'iframe',
        embedUrl: (defaultValues?.data.embedType === 'iframe' || defaultValues?.data.embedType === 'image') ? defaultValues.data.embedUrl : '',
        codeContent: defaultValues?.data.embedType === 'code' ? defaultValues.data.codeContent : '',
        iframeHeight: defaultValues?.data.iframeHeight || '400px',
      });
    }
  }, [defaultValues, form, isOpen]);

  const handleSubmit = (data: EmbedDialogFormData) => {
    if (defaultValues?.id) {
      let specificData: EmbedWidgetData;
      if (data.embedType === 'iframe') {
        specificData = {
          embedType: 'iframe',
          embedUrl: data.embedUrl!,
          iframeHeight: data.iframeHeight,
        } as IframeEmbedData;
      } else if (data.embedType === 'image') {
        specificData = {
          embedType: 'image',
          embedUrl: data.embedUrl!,
          iframeHeight: data.iframeHeight,
        } as ImageEmbedData;
      } else { // 'code'
        specificData = {
          embedType: 'code',
          codeContent: data.codeContent!,
          iframeHeight: data.iframeHeight,
        } as CodeEmbedData;
      }
      onSubmit(defaultValues.id, data.title, specificData);
    }
    onClose();
  };

  const currentEmbedType = form.watch('embedType');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{defaultValues?.data ? '编辑嵌入内容' : '添加新嵌入内容'}</DialogTitle>
          <DialogDescription>
            {defaultValues?.data ? "更新嵌入内容的标题、类型和源。" : "为新嵌入内容输入标题、类型和源。"}
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
              name="embedType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>嵌入类型</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value as EmbedType);
                        // Reset other fields when type changes
                        if (value === 'code') {
                          form.setValue('embedUrl', '');
                        } else {
                          form.setValue('codeContent', '');
                        }
                      }}
                      value={field.value}
                      className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="iframe" /></FormControl>
                        <FormLabel className="font-normal">网页 (Iframe)</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="image" /></FormControl>
                        <FormLabel className="font-normal">图片</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="code" /></FormControl>
                        <FormLabel className="font-normal">代码 (HTML)</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(currentEmbedType === 'iframe' || currentEmbedType === 'image') && (
              <FormField
                control={form.control}
                name="embedUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{currentEmbedType === 'iframe' ? '网页链接' : '图片链接'}</FormLabel>
                    <FormControl>
                      <Input placeholder={currentEmbedType === 'iframe' ? 'https://example.com' : 'https://example.com/image.png'} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {currentEmbedType === 'code' && (
              <FormField
                control={form.control}
                name="codeContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HTML 代码</FormLabel>
                    <FormControl>
                      <Textarea placeholder="输入你的 HTML 代码片段..." {...field} rows={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="iframeHeight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>容器高度 (可选)</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：400px, 80vh, 100%" {...field} />
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
