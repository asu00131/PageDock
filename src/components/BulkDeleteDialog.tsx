
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { ClipboardPaste, ClipboardList } from 'lucide-react';

const bulkDeleteSchema = z.object({
  urls: z.string().min(1, { message: '请输入至少一个网址。' }),
});

type BulkDeleteFormData = z.infer<typeof bulkDeleteSchema>;

interface BulkDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (urls: string) => void;
  links: LinkItem[];
}

export function BulkDeleteDialog({ isOpen, onClose, onSubmit, links }: BulkDeleteDialogProps) {
  const form = useForm<BulkDeleteFormData>({
    resolver: zodResolver(bulkDeleteSchema),
    defaultValues: {
      urls: '',
    },
  });
  const { toast } = useToast();

  const handleCopyAllLinks = async () => {
    if (!links || links.length === 0) {
      toast({
        variant: "destructive",
        title: "无链接可复制",
        description: "此合集中没有链接。",
      });
      return;
    }
    const allUrls = links.map(link => link.url).join('\n');
    try {
      await navigator.clipboard.writeText(allUrls);
      toast({
        title: "已复制",
        description: `${links.length} 个链接已复制到剪贴板。`,
      });
    } catch (err) {
      console.error('Failed to copy links: ', err);
      toast({
        variant: "destructive",
        title: "复制失败",
        description: "浏览器权限可能阻止了访问。请手动复制。",
      });
    }
  };

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

  const handleSubmit = (data: BulkDeleteFormData) => {
    onSubmit(data.urls);
    onClose();
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md bg-background">
        <DialogHeader>
          <DialogTitle>批量删除书签</DialogTitle>
          <DialogDescription>
            粘贴要删除的网址列表（每行一个），或先复制所有链接到剪贴板以便在外部检查。
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
                    <FormLabel>要删除的网址列表</FormLabel>
                    <div className="flex space-x-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleCopyAllLinks}>
                          <ClipboardList className="mr-2 h-4 w-4" />
                          复制所有
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handlePasteFromClipboard}>
                          <ClipboardPaste className="mr-2 h-4 w-4" />
                          粘贴
                        </Button>
                    </div>
                  </div>
                  <FormControl>
                    <Textarea 
                      placeholder="https://example.com/broken-link\nhttps://another.com/invalid" 
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
              <Button type="submit" variant="destructive">删除书签</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
