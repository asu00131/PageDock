
"use client";

import type { CalendarIcsAppWidget, CalendarEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Edit3, MoreVertical, Trash2, ChevronDown, ChevronUp, AlertTriangle, Link2, FilePenLine, RotateCcw, ChevronLeft, ChevronRight, PlusCircle, GripVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { useEffect, useState, useMemo, useCallback } from 'react';
import ICAL from 'ical.js';
import { format, isSameDay, startOfDay, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isWithinInterval, compareAsc, getHours, getMinutes, differenceInMinutes, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';
import { EventDetailDialog } from './EventDetailDialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type React from 'react';

interface WidgetDragProps {
  onWidgetDragStart: (e: React.DragEvent<HTMLDivElement>, widgetId: string) => void;
  onWidgetDragOver: (e: React.DragEvent<HTMLDivElement>, widgetId: string) => void;
  onWidgetDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onWidgetDrop: (e: React.DragEvent<HTMLDivElement>, widgetId: string) => void;
  onWidgetDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
  draggedWidgetId: string | null;
  dragOverWidgetId: string | null;
  isLayoutEditing?: boolean;
}

interface CalendarIcsWidgetProps extends WidgetDragProps {
  widget: CalendarIcsAppWidget;
  onOpenEditDialog: (widgetId: string) => void;
  onOpenWidgetTitleDialog: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

type CalendarViewMode = 'day' | 'week' | 'month' | 'list';

const parseIcalTime = (icalTime: ICAL.Time, event: ICAL.Event): Date => {
  try {
    let jsDate = icalTime.toJSDate();
    if (icalTime.isDate) {
      // For all-day events, ical.js might return a date at UTC midnight.
      // We want to interpret this as local midnight for the start of the day.
      jsDate = new Date(jsDate.getUTCFullYear(), jsDate.getUTCMonth(), jsDate.getUTCDate());
      return startOfDay(jsDate); // Ensure it's consistently start of day in local time
    }
    return jsDate; // For timed events, use the date as is (should include timezone info)
  } catch (e) {
    console.warn("Failed to parse date directly, attempting fallback for event:", event.summary, icalTime.toString(), e);
    // Fallback for dates that might not have time components but are not marked as 'isDate'
    // or other parsing issues. This is a guess.
    const dateStringOnly = icalTime.toString().split('T')[0];
    const year = parseInt(dateStringOnly.substring(0, 4), 10);
    const month = parseInt(dateStringOnly.substring(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(dateStringOnly.substring(6, 8), 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return startOfDay(new Date(year, month, day));
    }
    // Ultimate fallback, should ideally not be reached
    return startOfDay(new Date());
  }
};


export function CalendarIcsWidget({
  widget,
  onOpenEditDialog,
  onOpenWidgetTitleDialog,
  onDeleteWidget,
  isCollapsed,
  onToggleCollapse,
  onWidgetDragStart,
  onWidgetDragOver,
  onWidgetDragLeave,
  onWidgetDrop,
  onWidgetDragEnd,
  draggedWidgetId,
  dragOverWidgetId,
  isLayoutEditing,
}: CalendarIcsWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(startOfDay(new Date()));

  const [currentView, setCurrentView] = useState<CalendarViewMode>('month');
  const [displayDate, setDisplayDate] = useState<Date>(startOfDay(new Date()));

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | Omit<CalendarEvent, 'id'> | undefined>(undefined);


  const fetchAndParseIcs = useCallback(() => {
    if (!widget.data.icsUrl) {
      setEvents([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    fetch(`/api/ics-proxy?url=${encodeURIComponent(widget.data.icsUrl)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`获取 ICS 数据失败 (状态: ${response.status})`);
        }
        return response.text();
      })
      .then(icsData => {
        try {
          const jcalData = ICAL.parse(icsData);
          const component = new ICAL.Component(jcalData);
          const vevents = component.getAllSubcomponents('vevent');
          const parsedEvents: CalendarEvent[] = vevents.map((veventComponent: any) => {
            const event = new ICAL.Event(veventComponent);
            const startDate = parseIcalTime(event.startDate, event);

            let endDate = parseIcalTime(event.endDate, event);

             if (event.startDate.isDate) { 
                 if (compareAsc(endDate, startDate) <= 0) {
                    endDate = startOfDay(addDays(startDate,1)); 
                 }
            }

            return {
              id: event.uid || crypto.randomUUID(),
              summary: event.summary || '无标题',
              startDate: startDate,
              endDate: endDate,
              isAllDay: event.startDate.isDate,
              description: event.description || undefined,
            };
          }).sort((a,b) => compareAsc(a.startDate, b.startDate));
          setEvents(parsedEvents);
        } catch (parseErr) {
          console.error("Error parsing ICS data:", parseErr);
          setError("解析日历数据失败。请确保 ICS 格式正确。");
          setEvents([]);
        }
      })
      .catch(err => {
        console.error("Error fetching or parsing ICS:", err);
        setError(err.message || "加载日历数据失败。请检查链接和网络。");
        setEvents([]);
      })
      .finally(() => setIsLoading(false));
  }, [widget.data.icsUrl]);

  useEffect(() => {
    if (!isCollapsed) {
      fetchAndParseIcs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.data.icsUrl, isCollapsed]);

  const eventDays = useMemo(() => events.map(event => startOfDay(event.startDate)), [events]);

  const getEventsForDay = useCallback((day: Date | undefined): CalendarEvent[] => {
    if (!day) return [];
    const targetDayStart = startOfDay(day);
    const targetDayEnd = addDays(targetDayStart, 1); 

    return events.filter(event => {
      const eventStart = event.startDate;
      const eventEnd = event.endDate;
      return compareAsc(eventStart, targetDayEnd) < 0 && compareAsc(eventEnd, targetDayStart) > 0;
    }).sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return compareAsc(a.startDate, b.startDate);
    });
  }, [events]);


  const eventsForSelectedDay = useMemo(() => {
    return getEventsForDay(selectedDate);
  }, [selectedDate, getEventsForDay]);

  const weekRange = useMemo(() => {
    const start = startOfWeek(displayDate, { weekStartsOn: 1 }); 
    const end = endOfWeek(displayDate, { weekStartsOn: 1 });
    return { start, end };
  }, [displayDate]);

  const eventsForListView = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysLater = endOfWeek(addDays(today, 30));
    return events.filter(event => {
      const eventStartsTodayOrLater = compareAsc(event.startDate, today) >= 0;
      const eventEndsTodayOrLater = event.endDate && compareAsc(event.endDate, today) >=0;
      const eventIsWithinFutureRange = isWithinInterval(event.startDate, { start: today, end: thirtyDaysLater });
      const eventSpansAcrossToday = compareAsc(event.startDate, today) < 0 && event.endDate && compareAsc(event.endDate, today) > 0;

      return eventIsWithinFutureRange || (eventStartsTodayOrLater && eventEndsTodayOrLater) || eventSpansAcrossToday;

    }).sort((a, b) => compareAsc(a.startDate, b.startDate));
  }, [events]);


  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLayoutEditing) return;
    if (e.target instanceof HTMLElement && (e.target.closest('button, a') || e.target.closest('.rdp-nav_button') || e.target.closest('.view-switcher') || e.target.closest('[role="button"]'))) {
      return;
    }
    e.stopPropagation();
    if (!widget.data.icsUrl) {
        onOpenEditDialog(widget.id);
    }
  };

  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isLayoutEditing) return;
    if (e.key === 'Enter' || e.key === ' ') {
       if (e.target instanceof HTMLElement && (e.target.closest('button, a') || e.target.closest('.rdp-nav_button') || e.target.closest('.view-switcher') || e.target.closest('[role="button"]'))) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (!widget.data.icsUrl) {
        onOpenEditDialog(widget.id);
      }
    }
  };

  const handleOpenEventDetailDialog = (event: CalendarEvent | Omit<CalendarEvent, 'id'>) => {
    setEditingEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const handleCloseEventDetailDialog = () => {
    setIsEventDetailDialogOpen(false);
    setEditingEvent(undefined);
  };

  const handleSubmitEventDetail = (updatedEventData: CalendarEvent) => {
     setEvents(prevEvents => {
        const eventExists = prevEvents.some(e => e.id === updatedEventData.id);
        if (eventExists) {
            return prevEvents.map(event =>
                event.id === updatedEventData.id ? { ...event, ...updatedEventData } : event
            ).sort((a,b) => compareAsc(a.startDate, b.startDate));
        } else {
            const newEventWithId = { ...updatedEventData, id: updatedEventData.id || crypto.randomUUID()};
            return [...prevEvents, newEventWithId].sort((a,b) => compareAsc(a.startDate, b.startDate));
        }
    });
    handleCloseEventDetailDialog();
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    if (editingEvent && 'id' in editingEvent && editingEvent.id === eventId) {
      handleCloseEventDetailDialog();
    }
  };

   const goToToday = () => {
    const todayAnchor = startOfDay(new Date());
    setSelectedDate(todayAnchor);
    setDisplayDate(todayAnchor);
    setCurrentMonth(todayAnchor);
    setCurrentView('day'); 
  };

  const renderEventItem = (event: CalendarEvent, context?: 'week-column' | 'list' | 'day-detail' | 'day-timeline') => {
    let baseItemClasses = "calendar-widget__event-item group/event-item";
    let titleClasses = "truncate block text-accent dark:text-[hsl(var(--accent-foreground))] group-hover/event-item:text-accent-foreground dark:group-hover/event-item:text-accent";
    let timeClasses = "text-xs block text-accent dark:text-[hsl(var(--accent-foreground))/90] group-hover/event-item:text-accent-foreground dark:group-hover/event-item:text-accent";
    let actionButtonSizeClasses = "h-7 w-7 p-1";
    let actionIconSizeClasses = "h-4 w-4";

    if (context === 'week-column') {
        baseItemClasses = "calendar-widget__event-item group/event-item !p-1 !mb-0.5 text-xs";
        titleClasses = "truncate block font-semibold text-accent dark:text-[hsl(var(--accent-foreground))]";
        timeClasses = "text-xs block text-accent dark:text-[hsl(var(--accent-foreground))/90]";
        actionButtonSizeClasses = "h-6 w-6 p-0.5";
        actionIconSizeClasses = "h-3 w-3";
    } else if (context === 'day-timeline') {
        baseItemClasses = cn(
          "calendar-widget__event-item group/event-item !p-1.5 text-xs",
          event.isAllDay ? "relative" : "absolute" // All-day events flow, timed events are positioned
        );
        titleClasses = "truncate block font-semibold text-accent dark:text-[hsl(var(--accent-foreground))]";
        timeClasses = "text-xs block text-accent dark:text-[hsl(var(--accent-foreground))/90]";
        actionButtonSizeClasses = "h-5 w-5 p-0.5";
        actionIconSizeClasses = "h-3 w-3";
    }
    
    const eventStyle = context === 'day-timeline' && !event.isAllDay ? getTimelineEventStyle(event) : {};

    return (
    <li key={event.id} className={baseItemClasses}
        style={eventStyle}
        onClick={(e) => { e.stopPropagation(); handleOpenEventDetailDialog(event); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenEventDetailDialog(event); }}}
        aria-label={`事件: ${event.summary}, 时间: ${event.isAllDay ? '全天' : format(event.startDate, 'p') + ' - ' + format(event.endDate, 'p')}. 点击查看详情.`}
    >
      <div className="flex-grow overflow-hidden mr-1">
        <strong className={titleClasses} title={event.summary}>{event.summary}</strong>

        {context === 'list' && (
            <span className={timeClasses}>
                {format(event.startDate, 'PPP')}
                {!event.isAllDay && ` ${format(event.startDate, 'p')} - ${format(event.endDate, 'p')}`}
                {event.isAllDay && ` (全天)`}
            </span>
        )}
        {(context === 'day-detail' || context === 'day-timeline') && (
          <span className={timeClasses}>
            {!event.isAllDay ? `${format(event.startDate, 'HH:mm')} - ${format(event.endDate, 'HH:mm')}` : "(全天)"}
          </span>
        )}
         {context === 'week-column' && (
          <span className={timeClasses}>
            {!event.isAllDay ? `${format(event.startDate, 'p')}` : "(全天)"}
          </span>
        )}
      </div>
      <div className="calendar-widget__event-actions">
        <Button variant="ghost" size="icon" className={actionButtonSizeClasses} onClick={(e) => {e.stopPropagation(); handleOpenEventDetailDialog(event);}}>
          <FilePenLine className={actionIconSizeClasses} />
          <span className="sr-only">查看/编辑事件</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className={`${actionButtonSizeClasses} hover:bg-destructive/10 hover:text-destructive`} onClick={(e) => e.stopPropagation()}>
              <Trash2 className={actionIconSizeClasses}/>
              <span className="sr-only">删除事件</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除</AlertDialogTitle>
              <AlertDialogDescription>
                {`您确定要删除事件 “${event.summary}” 吗？此操作为本地操作，无法撤销。`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteEvent(event.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )};

  const renderEventsList = (eventsToRender: CalendarEvent[], title?: string, noEventsMessage?: string, context?: 'list' | 'day-detail') => (
    <div className="calendar-widget__event-list">
      {title && <h3 className="calendar-widget__event-list-title text-foreground">{title}</h3>}
      {eventsToRender.length > 0 ? (
        <ul className="space-y-1">{eventsToRender.map(event => renderEventItem(event, context))}</ul>
      ) : (
        <p className="calendar-widget__no-events">{noEventsMessage || "无事件。"}</p>
      )}
    </div>
  );


  const hourSlotHeight = 60; 
  const getTimelineEventStyle = (event: CalendarEvent): React.CSSProperties => {
    if (event.isAllDay) return { position: 'relative' }; 

    const startHour = getHours(event.startDate);
    const startMinute = getMinutes(event.startDate);

    let durationMinutes = differenceInMinutes(event.endDate, event.startDate);
    if (durationMinutes <=0) durationMinutes = 30; 

    const top = (startHour + startMinute / 60) * hourSlotHeight;
    const height = (durationMinutes / 60) * hourSlotHeight;

    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`, 
      left: '0.25rem', 
      right: '0.25rem', 
      zIndex: 10, 
    };
  };

  const renderDayTimelineView = () => {
    const dayEvents = getEventsForDay(displayDate);
    const allDayEvents = dayEvents.filter(e => e.isAllDay);
    const timedEvents = dayEvents.filter(e => !e.isAllDay);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="p-2">
        <div className="flex justify-between items-center mb-2">
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); const newDay = subDays(displayDate,1); setDisplayDate(newDay); setSelectedDate(newDay);}}><ChevronLeft className="h-5 w-5" /></Button>
          <h3
            className="text-lg font-semibold text-center cursor-pointer text-foreground hover:text-primary"
            onClick={() => {const newMonth = startOfDay(displayDate); setCurrentMonth(newMonth); setCurrentView('month'); setSelectedDate(displayDate);}}
            title={`切换到 ${format(displayDate, 'yyyy年MM月')} 的月视图`}
          >
            {format(displayDate, 'yyyy年M月d日, EEEE')}
          </h3>
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); const newDay = addDays(displayDate,1); setDisplayDate(newDay); setSelectedDate(newDay);}}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {allDayEvents.length > 0 && (
          <div className="mb-3 border-b pb-2">
            <h4 className="text-sm font-semibold mb-1 text-foreground">全天事件</h4>
            <ul className="space-y-1">
              {allDayEvents.map(event => renderEventItem(event, 'day-timeline'))}
            </ul>
          </div>
        )}

        <ScrollArea className="h-[500px] w-full">
          <div className="calendar-widget__day-timeline-container flex"> 
            <div className="calendar-widget__time-axis pt-1"> 
              {hours.map(hour => (
                <div key={`time-label-${hour}`} className="flex items-center justify-end" style={{ height: `${hourSlotHeight}px` }}>
                  {format(setHours(setMinutes(new Date(),0), hour), 'HH:mm')}
                </div>
              ))}
            </div>

            <div className="relative flex-grow">
              {hours.map(hour => (
                <div key={`timeslot-bg-${hour}`} className="calendar-widget__time-slot" style={{ height: `${hourSlotHeight}px` }}>
                </div>
              ))}
              <div className="calendar-widget__event-column">
                <ul className="relative h-full">
                  {timedEvents.map(event => renderEventItem(event, 'day-timeline'))}
                </ul>
              </div>
            </div>
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {allDayEvents.length === 0 && timedEvents.length === 0 && (
            <p className="text-muted-foreground text-center py-10">{`${format(displayDate, 'PPP')} 无事件。`}</p>
        )}
      </div>
    );
  };


  const renderWeekView = () => {
    const daysOfWeek = eachDayOfInterval(weekRange);
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const allDayEventsByDay: Record<string, CalendarEvent[]> = {};
    const timedEventsByDay: Record<string, CalendarEvent[]> = {};

    daysOfWeek.forEach(day => {
        const dailyEvents = getEventsForDay(day);
        allDayEventsByDay[format(day, 'yyyy-MM-dd')] = dailyEvents.filter(e => e.isAllDay);
        timedEventsByDay[format(day, 'yyyy-MM-dd')] = dailyEvents.filter(e => !e.isAllDay);
    });


    return (
      <div className="p-2">
        <div className="flex justify-between items-center mb-2">
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); setDisplayDate(subWeeks(displayDate, 1))}}><ChevronLeft className="h-5 w-5" /></Button>
          <h3
            className="text-base font-semibold cursor-pointer text-foreground hover:text-primary"
            onClick={() => {setCurrentView('month'); if(selectedDate) setCurrentMonth(startOfDay(selectedDate))}}
            title="切换到月视图"
          >
            {format(weekRange.start, 'M月d日')} - {format(weekRange.end, 'M月d日, yyyy年')}
          </h3>
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); setDisplayDate(addWeeks(displayDate, 1))}}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-px bg-border border-t border-l">
            <div className="calendar-widget__time-axis p-1 border-b border-r text-xs font-semibold text-muted-foreground flex items-center justify-center">全天</div>
            {daysOfWeek.map(day => (
                <div key={`allday-header-${day.toISOString()}`}
                     className={`calendar-widget__day-column !min-h-[auto] p-1 border-b ${isSameDay(day, startOfDay(new Date())) ? 'border-primary border-2' : ''} ${isSameDay(day, displayDate) && currentView === 'day' ? 'bg-accent/20' : ''}`}
                     onClick={() => { setSelectedDate(day); setDisplayDate(day); setCurrentView('day');}}
                     role="button" tabIndex={0}
                     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDate(day); setDisplayDate(day); setCurrentView('day');}}}
                     aria-label={`查看 ${format(day, 'MMMM d, yyyy')} 的日程`}
                >
                    <h4 className={`text-xs font-semibold text-center ${isSameDay(day, startOfDay(new Date())) ? 'text-primary font-bold' : 'text-foreground'}`}>{format(day, 'EEE d')}</h4>
                    {allDayEventsByDay[format(day, 'yyyy-MM-dd')].length > 0 ? (
                        <ul className="space-y-0.5 mt-1">
                            {allDayEventsByDay[format(day, 'yyyy-MM-dd')].map(event => renderEventItem(event, 'week-column'))}
                        </ul>
                    ) : (<div className="h-4"></div>) }
                </div>
            ))}
        </div>

        <ScrollArea className="h-[500px] w-full">
            <div className="relative grid grid-cols-[auto_repeat(7,1fr)] gap-px bg-border border-l">
                <div className="sticky left-0 z-10 bg-card calendar-widget__time-axis pt-1"> 
                    {hours.map(hour => (
                        <div key={`week-timeslot-label-${hour}`} className="flex items-center justify-end border-r" style={{ height: `${hourSlotHeight}px` }}>
                            {format(setHours(setMinutes(new Date(),0), hour), 'HH:mm')}
                        </div>
                    ))}
                </div>

                {daysOfWeek.map(day => (
                    <div key={`week-daycol-${day.toISOString()}`}
                         className={`relative calendar-widget__day-column !min-h-[${hours.length * hourSlotHeight}px] !p-0 !border-b-0 ${isSameDay(day, startOfDay(new Date())) ? 'border-primary border-l-0 border-t-0 border-b-0 !border-r-2' : ''}`}
                         onClick={(e) => {
                            if (e.target === e.currentTarget) { 
                                setSelectedDate(day); setDisplayDate(day); setCurrentView('day');
                            }
                         }}
                         role="button" tabIndex={0}
                         onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); setSelectedDate(day); setDisplayDate(day); setCurrentView('day');}}}
                         aria-label={`查看 ${format(day, 'MMMM d, yyyy')} 的日程`}
                    >
                        {hours.map(hour => (
                            <div key={`week-day-${format(day, 'yyyy-MM-dd')}-timeslot-line-${hour}`}
                                className="calendar-widget__time-slot" style={{ height: `${hourSlotHeight}px` }}>
                            </div>
                        ))}
                        <ul className="absolute inset-0">
                            {timedEventsByDay[format(day, 'yyyy-MM-dd')].map(event => renderEventItem(event, 'day-timeline'))}
                        </ul>
                    </div>
                ))}
            </div>
             <ScrollBar orientation="vertical" />
        </ScrollArea>
      </div>
    );
  };
  

  return (
    <div
        data-testid="calendar-ics-widget-main"
        className={cn(
            "page-section__widget",
            isLayoutEditing && "is-layout-editing",
            draggedWidgetId === widget.id && "opacity-50 cursor-grabbing",
            dragOverWidgetId === widget.id && draggedWidgetId !== widget.id && "ring-2 ring-primary ring-offset-2 rounded-lg"
        )}
        draggable={isLayoutEditing}
        onDragStart={(e) => onWidgetDragStart(e, widget.id)}
        onDragOver={(e) => onWidgetDragOver(e, widget.id)}
        onDrop={(e) => onWidgetDrop(e, widget.id)}
        onDragLeave={onWidgetDragLeave}
        onDragEnd={onWidgetDragEnd}
    >
      <article className="widget calendar-widget group/widget">
        <div className="widget__container">
          <header className="widget__header">
            <div className="widget-header__drag-handle">
                <GripVertical className="h-5 w-5" />
            </div>
            <div
              className="widget-header__title-clickable-area"
              onClick={() => onToggleCollapse(widget.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse(widget.id); } }}
              aria-expanded={!isCollapsed}
              aria-controls={`widget-body-${widget.id}`}
            >
              <CalendarIcon className="widget-header__feather-icon h-5 w-5 mr-2" />
              <span className="widget-header__text text-lg font-semibold">{widget.title}</span>
              {isCollapsed ? <ChevronDown className="widget-header__chevron" /> : <ChevronUp className="widget-header__chevron" />}
            </div>
            <div className="widget-header__controls">
              {!isCollapsed && widget.data.icsUrl && (
                <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => {e.stopPropagation(); fetchAndParseIcs();}} title="刷新日历数据">
                    <RotateCcw className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">刷新日历</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">{`${widget.title} 的更多选项`}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onOpenWidgetTitleDialog(widget.id)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>编辑标题</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenEditDialog(widget.id)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    <span>编辑日历链接</span>
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => {
                     const newEventStart = selectedDate || startOfDay(new Date());
                     const newEvent: Omit<CalendarEvent, 'id'> = {
                       summary: "新事件",
                       startDate: setMinutes(setHours(newEventStart, getHours(new Date())),0), 
                       endDate: setMinutes(setHours(newEventStart, getHours(new Date()) + 1),0), 
                       isAllDay: false,
                       description: ""
                     };
                     handleOpenEventDetailDialog(newEvent);
                   }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>手动添加事件</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                         className="text-destructive focus:text-destructive-foreground hover:!text-destructive-foreground hover:!bg-destructive/90 focus:!bg-destructive focus:!text-destructive-foreground"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>删除日历</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>您确定吗？</AlertDialogTitle>
                        <AlertDialogDescription>
                          {`此操作无法撤销。这将永久删除日历 “${widget.title}”。`}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteWidget(widget.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          {!isCollapsed && (
            <div className="widget__box" id={`widget-body-${widget.id}`}>
              <div
                className="widget__body"
                onClick={handleBodyClick}
                onKeyDown={handleBodyKeyDown}
                role={!widget.data.icsUrl && !isLayoutEditing ? "button" : undefined}
                tabIndex={!widget.data.icsUrl && !isLayoutEditing ? 0 : undefined}
                aria-label={!widget.data.icsUrl ? "设置日历链接" : `${widget.title} 日历区域`}
              >
                {isLoading && <p className="p-4 text-center text-muted-foreground">正在加载日历...</p>}
                {error &&
                  <div className="p-4 text-center text-destructive flex flex-col items-center">
                    <AlertTriangle className="w-8 h-8 mb-2"/>
                    <p>{error}</p>
                    <Button variant="link" onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }} className="mt-2">
                      编辑日历链接
                    </Button>
                  </div>
                }
                {!isLoading && !error && widget.data.icsUrl && (
                  <>
                    <div className="calendar-widget__toolbar view-switcher">
                        <div className="flex items-center space-x-1">
                            {(['day', 'week', 'month', 'list'] as CalendarViewMode[]).map(view => (
                                <Button
                                key={view}
                                variant={currentView === view ? 'default' : 'outline'}
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentView(view);
                                    const targetDay = selectedDate || startOfDay(new Date());
                                    if (view === 'day') {
                                        setDisplayDate(targetDay);
                                        if(!selectedDate) setSelectedDate(targetDay);
                                    } else if (view === 'week') {
                                        setDisplayDate(targetDay);
                                    } else if (view === 'month') {
                                        setCurrentMonth(targetDay);
                                        if(!selectedDate) setSelectedDate(targetDay);
                                    }
                                 }}
                                >
                                {view === 'day' ? '日' : view === 'week' ? '周' : view === 'month' ? '月' : '列表'}
                                </Button>
                            ))}
                             <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); goToToday(); }}
                                className="text-foreground hover:text-primary"
                            >
                                今天
                            </Button>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                const newEventStart = selectedDate || startOfDay(new Date());
                                const newEvent: Omit<CalendarEvent, 'id'> = {
                                  summary: "新事件",
                                  startDate: setMinutes(setHours(newEventStart, getHours(new Date())),0),
                                  endDate: setMinutes(setHours(newEventStart, getHours(new Date()) + 1),0),
                                  isAllDay: false,
                                  description: ""
                                };
                                handleOpenEventDetailDialog(newEvent);
                            }}
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            新增时间安排
                        </Button>
                    </div>

                    {currentView === 'month' && (
                      <>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(day) => {
                            setSelectedDate(day);
                            if (day) {
                                setDisplayDate(startOfDay(day));
                                setCurrentMonth(startOfDay(day));
                            }
                          }}
                          month={currentMonth}
                          onMonthChange={(month) => {
                            setCurrentMonth(month);
                            if (selectedDate && (selectedDate.getMonth() !== month.getMonth() || selectedDate.getFullYear() !== month.getFullYear())) {
                                const dayInNewMonth = new Date(month.getFullYear(), month.getMonth(), selectedDate.getDate());
                                if (dayInNewMonth.getMonth() === month.getMonth()) {
                                     setSelectedDate(startOfDay(dayInNewMonth));
                                     setDisplayDate(startOfDay(dayInNewMonth));
                                } else { 
                                     const firstOfNewMonth = startOfDay(new Date(month.getFullYear(), month.getMonth(), 1));
                                     setSelectedDate(firstOfNewMonth);
                                     setDisplayDate(firstOfNewMonth);
                                }
                            } else if (!selectedDate) { 
                                const firstOfNewMonth = startOfDay(new Date(month.getFullYear(), month.getMonth(), 1));
                                setSelectedDate(firstOfNewMonth);
                                setDisplayDate(firstOfNewMonth);
                            }

                          }}
                          className="rounded-md calendar-widget"
                          modifiers={{ eventDay: eventDays.map(d => startOfDay(d)) }}
                          modifiersClassNames={{ eventDay: 'bg-primary/20 rounded-full !text-primary-foreground dark:!text-primary' }}
                          footer={selectedDate && eventsForSelectedDay.length > 0 ?
                            renderEventsList(eventsForSelectedDay, `${format(selectedDate, 'PPP')} 的事件`, `${format(selectedDate, 'PPP')} 无事件。`, 'day-detail')
                            : selectedDate ? <p className="calendar-widget__no-events p-3 border-t text-muted-foreground">{`${format(selectedDate, 'PPP')} 无事件。`}</p> : null
                          }
                        />
                      </>
                    )}

                    {currentView === 'week' && renderWeekView()}
                    {currentView === 'day' && renderDayTimelineView()}

                    {currentView === 'list' && (
                        <div className="p-2">
                         {renderEventsList(eventsForListView, "未来30天事件", "暂无近期事件。", 'list')}
                        </div>
                    )}
                  </>
                )}
                {!widget.data.icsUrl && !isLoading && !error && (
                   <div
                    className="calendar-widget__empty-prompt"
                  >
                    <CalendarIcon className="w-10 h-10 text-muted-foreground mb-3"/>
                    <p className="text-lg font-medium text-foreground mb-2">日历为空</p>
                    <p className="text-sm text-muted-foreground mb-4">要显示事件，请链接一个 ICS 日历 URL。</p>
                    <Button onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }}>
                      <Link2 className="mr-2 h-4 w-4" /> 设置 ICS 日历链接
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </article>
      {editingEvent && (
        <EventDetailDialog
          isOpen={isEventDetailDialogOpen}
          onClose={handleCloseEventDetailDialog}
          event={editingEvent}
          onSubmit={handleSubmitEventDetail}
          widgetId={widget.id}
          onDeleteEvent={handleDeleteEvent}
        />
      )}
    </div>
  );
}
