
"use client";

import type { CalendarEvent } from '@/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useEffect } from 'react';
import { format, parse } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent as EventAlertDialogContent, // Renamed to avoid conflict
  AlertDialogDescription as EventAlertDialogDescription, // Renamed
  AlertDialogFooter as EventAlertDialogFooter, // Renamed
  AlertDialogHeader as EventAlertDialogHeader, // Renamed
  AlertDialogTitle as EventAlertDialogTitle, // Renamed
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


const eventDetailSchema = z.object({
  summary: z.string().min(1, { message: '摘要是必填项。' }).max(200, { message: '摘要长度不能超过200个字符。' }),
  description: z.string().optional(),
  startDate: z.date({ required_error: "开始日期是必填项。" }),
  endDate: z.date({ required_error: "结束日期是必填项。" }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "无效的时间格式 (HH:mm)"}).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "无效的时间格式 (HH:mm)"}).optional(),
  isAllDay: z.boolean(),
}).refine(data => {
  if (!data.isAllDay && (!data.startTime || !data.endTime)) {
    return false;
  }
  return true;
}, {
  message: "非全天事件需要开始和结束时间。",
  path: ["startTime"], 
}).refine(data => {
    if (data.endDate < data.startDate) {
        return false;
    }
    if (data.endDate.getTime() === data.startDate.getTime() && data.startTime && data.endTime && data.endTime <= data.startTime && !data.isAllDay) {
        return false;
    }
    return true;
}, {
    message: "结束日期/时间必须在开始日期/时间之后。",
    path: ["endDate"],
});


type EventDetailFormData = z.infer<typeof eventDetailSchema>;

interface EventDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updatedEventData: CalendarEvent) => void;
  event: CalendarEvent | Omit<CalendarEvent, 'id'>; 
  widgetId: string;
  onDeleteEvent: (eventId: string) => void;
}

export function EventDetailDialog({ isOpen, onClose, onSubmit, event, widgetId, onDeleteEvent }: EventDetailDialogProps) {
  const isNewEvent = !('id' in event) || !event.id; 

  const form = useForm<EventDetailFormData>({
    resolver: zodResolver(eventDetailSchema),
    defaultValues: {
      summary: event.summary || '',
      description: event.description || '',
      startDate: event.startDate ? new Date(event.startDate) : new Date(),
      endDate: event.endDate ? new Date(event.endDate) : new Date(),
      startTime: event.startDate && !event.isAllDay ? format(new Date(event.startDate), 'HH:mm') : "09:00",
      endTime: event.endDate && !event.isAllDay ? format(new Date(event.endDate), 'HH:mm') : "10:00",
      isAllDay: event.isAllDay || false,
    },
  });
  

  useEffect(() => {
    if (isOpen) {
      form.reset({
        summary: event.summary || '',
        description: event.description || '',
        startDate: event.startDate ? new Date(event.startDate) : new Date(),
        endDate: event.endDate ? new Date(event.endDate) : new Date(),
        startTime: event.startDate && !event.isAllDay ? format(new Date(event.startDate), 'HH:mm') : "09:00",
        endTime: event.endDate && !event.isAllDay ? format(new Date(event.endDate), 'HH:mm') : "10:00",
        isAllDay: event.isAllDay || false,
      });
    }
  }, [event, form, isOpen]);

  const handleSubmitData = (data: EventDetailFormData) => {
    const combinedStartDate = data.isAllDay ? data.startDate : parse(`${format(data.startDate, 'yyyy-MM-dd')} ${data.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
    const combinedEndDate = data.isAllDay ? data.endDate : parse(`${format(data.endDate, 'yyyy-MM-dd')} ${data.endTime}`, 'yyyy-MM-dd HH:mm', new Date());

    const finalEventData: CalendarEvent = {
      ...event, 
      id: 'id' in event && event.id ? event.id : crypto.randomUUID(), 
      summary: data.summary,
      description: data.description,
      startDate: combinedStartDate,
      endDate: combinedEndDate,
      isAllDay: data.isAllDay,
    };
    onSubmit(finalEventData);
  };
  
  const handleDelete = () => {
    if ('id' in event && event.id) {
      onDeleteEvent(event.id);
    }
    // onClose(); 
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg bg-background">
        <DialogHeader>
          <DialogTitle>{isNewEvent ? '添加新事件' : '事件详情'}</DialogTitle>
          {!isNewEvent && 
            <DialogDescription>
              查看或编辑事件详情。更改仅保存在当前会话中。
            </DialogDescription>
          }
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmitData)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>摘要</FormLabel>
                  <FormControl>
                    <Input placeholder="事件摘要" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>开始日期</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>选择日期</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date("1900-01-01")}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                 />
                <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>结束日期</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP")
                                ) : (
                                    <span>选择日期</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < (form.getValues("startDate") || new Date("1900-01-01"))}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            {!form.watch("isAllDay") && (
                 <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="startTime"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>开始时间</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="endTime"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>结束时间</FormLabel>
                            <FormControl>
                                <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}

            <FormField
                control={form.control}
                name="isAllDay"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                        <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    <FormLabel className="font-normal">
                        全天事件
                    </FormLabel>
                    </FormItem>
                )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>描述</FormLabel>
                  <FormControl>
                    <Textarea placeholder="事件描述 (可选)" {...field} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-between">
              <div>
                {!isNewEvent && 'id' in event && event.id && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" className="mr-auto" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="mr-2 h-4 w-4" /> 删除
                      </Button>
                    </AlertDialogTrigger>
                    <EventAlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <EventAlertDialogHeader>
                        <EventAlertDialogTitle>确认删除</EventAlertDialogTitle>
                        <EventAlertDialogDescription>
                          您确定要删除事件 “{event.summary}” 吗？此操作无法撤销。
                        </EventAlertDialogDescription>
                      </EventAlertDialogHeader>
                      <EventAlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button type="button" variant="outline" onClick={(e) => e.stopPropagation()}>取消</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button type="button" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDelete(); }}>删除</Button>
                        </AlertDialogAction>
                      </EventAlertDialogFooter>
                    </EventAlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  取消
                </Button>
                <Button type="submit">{isNewEvent ? '添加事件' : '保存更改'}</Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    
