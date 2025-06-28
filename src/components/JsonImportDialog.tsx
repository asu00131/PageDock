
"use client";

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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { ClipboardPaste } from 'lucide-react';

const jsonImportSchema = z.object({
  jsonContent: z.string().min(1, { message: '请输入JSON内容。' }).refine((val) => {
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: '无效的JSON格式。' }),
});

type JsonImportFormData = z.infer<typeof jsonImportSchema>;

interface JsonImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (jsonString: string) => void;
}

export function JsonImportDialog({ isOpen, onClose, onSubmit }: JsonImportDialogProps) {
  const form = useForm<JsonImportFormData>({
    resolver: zodResolver(jsonImportSchema),
    defaultValues: {
      jsonContent: '',
    },
  });
  const { toast } = useToast();

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        form.setValue('jsonContent', text, { shouldValidate: true });
      } else {
        toast({
          variant: "destructive",
          title: "剪贴板为空",
          description: "剪贴板中没有内容可供粘贴。",
        });
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      toast({
        variant: "destructive",
        title: "无法访问剪贴板",
        description: "浏览器权限可能阻止了访问。请手动粘贴。",
      });
    }
  };

  const handleSubmit = (data: JsonImportFormData) => {
    onSubmit(data.jsonContent);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>从文本导入配置</DialogTitle>
          <DialogDescription>
            在此处粘贴您的 PageDock JSON 配置。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="jsonContent"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>JSON 内容</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={handlePasteFromClipboard}>
                      <ClipboardPaste className="mr-2 h-4 w-4" />
                      从剪贴板粘贴
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder='[{"id":"...","type":"...",...}]'
                      {...field}
                      rows={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                取消
              </Button>
              <Button type="submit">导入配置</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
