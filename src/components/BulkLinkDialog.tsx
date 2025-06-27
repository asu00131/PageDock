
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

const bulkLinkSchema = z.object({
  urls: z.string().min(1, { message: '请输入至少一个网址。' }),
});

type BulkLinkFormData = z.infer<typeof bulkLinkSchema>;

interface BulkLinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (urls: string) => void;
}

export function BulkLinkDialog({ isOpen, onClose, onSubmit }: BulkLinkDialogProps) {
  const form = useForm<BulkLinkFormData>({
    resolver: zodResolver(bulkLinkSchema),
    defaultValues: {
      urls: '',
    },
  });
  const { toast } = useToast();

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const currentUrls = form.getValues('urls');
        form.setValue('urls', currentUrls ? `${currentUrls}\\n${text}` : text);
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

  const handleSubmit = (data: BulkLinkFormData) => {
    onSubmit(data.urls);
    onClose();
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-background">
        <DialogHeader>
          <DialogTitle>批量添加书签</DialogTitle>
          <DialogDescription>
            在此处粘贴网址列表，每行一个。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="urls"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>网址列表</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={handlePasteFromClipboard}>
                      <ClipboardPaste className="mr-2 h-4 w-4" />
                      从剪贴板粘贴
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea 
                      placeholder="https://google.com\nhttps://github.com" 
                      {...field}
                      rows={8}
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
              <Button type="submit">添加书签</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
