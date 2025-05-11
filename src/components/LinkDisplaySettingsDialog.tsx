
"use client";

import type { LinkCollectionDisplaySettings } from '@/types';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect } from 'react';

const displaySettingsSchema = z.object({
  displayMode: z.enum(['list', 'detailedList', 'icons', 'cloud']),
  iconSize: z.enum(['small', 'medium', 'large']),
  visibleLinksCount: z.coerce.number().int().min(-1, { message: "不能少于-1（无）。" }), // -1 for none, 0 for all
  titleLines: z.coerce.number().int().min(-1, { message: "不能少于-1（完整）。" }), // -1 for full, 0 for hide
});

type DisplaySettingsFormData = z.infer<typeof displaySettingsSchema>;

interface LinkDisplaySettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (widgetId: string, settings: LinkCollectionDisplaySettings) => void;
  defaultValues?: LinkCollectionDisplaySettings;
  widgetId: string;
}

export function LinkDisplaySettingsDialog({ isOpen, onClose, onSubmit, defaultValues, widgetId }: LinkDisplaySettingsDialogProps) {
  const form = useForm<DisplaySettingsFormData>({
    resolver: zodResolver(displaySettingsSchema),
    defaultValues: {
      displayMode: defaultValues?.displayMode || 'cloud',
      iconSize: defaultValues?.iconSize || 'small',
      visibleLinksCount: defaultValues?.visibleLinksCount ?? 0,
      titleLines: defaultValues?.titleLines ?? -1,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        displayMode: defaultValues?.displayMode || 'cloud',
        iconSize: defaultValues?.iconSize || 'small',
        visibleLinksCount: defaultValues?.visibleLinksCount ?? 0,
        titleLines: defaultValues?.titleLines ?? -1,
      });
    }
  }, [defaultValues, form, isOpen]);

  const handleSubmit = (data: DisplaySettingsFormData) => {
    onSubmit(widgetId, data);
    onClose();
  };

  const visibleLinksOptions = [
    { label: '全部', value: 0 },
    { label: '无', value: -1 },
    ...Array.from({ length: 20 }, (_, i) => ({ label: `前 ${i + 1} 个`, value: i + 1 }))
  ];

  const titleLinesOptions = [
    { label: '完整标题', value: -1 },
    { label: '隐藏标题', value: 0 },
    { label: '显示 1 行', value: 1 },
    { label: '显示 2 行', value: 2 },
    { label: '显示 3 行', value: 3 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-background">
        <DialogHeader>
          <DialogTitle>链接显示设置</DialogTitle>
          <DialogDescription>
            自定义此链接合集的显示方式。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="displayMode"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>显示模式</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="cloud" /></FormControl>
                        <FormLabel className="font-normal">云</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="icons" /></FormControl>
                        <FormLabel className="font-normal">图标</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="list" /></FormControl>
                        <FormLabel className="font-normal">列表</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value="detailedList" /></FormControl>
                        <FormLabel className="font-normal">详细列表</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(form.watch('displayMode') === 'icons' || form.watch('displayMode') === 'cloud' || form.watch('displayMode') === 'list' || form.watch('displayMode') === 'detailedList') && (
              <FormField
                control={form.control}
                name="iconSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>图标大小</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="选择图标大小" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="small">小</SelectItem>
                        <SelectItem value="medium">中</SelectItem>
                        <SelectItem value="large">大</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="visibleLinksCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>可见链接数量</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="选择数量" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {visibleLinksOptions.map(option => (
                        <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="titleLines"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>标题行数</FormLabel>
                  <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={String(field.value)}>
                    <FormControl><SelectTrigger><SelectValue placeholder="选择行数" /></SelectTrigger></FormControl>
                    <SelectContent>
                       {titleLinesOptions.map(option => (
                        <SelectItem key={option.value} value={String(option.value)}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">保存设置</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
