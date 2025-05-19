
"use client";

import type { CalendarIcsAppWidget, CalendarEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIconLucide, Edit3, MoreVertical, Trash2, ChevronDown, ChevronUp, AlertTriangle, Link2, FilePenLine, RotateCcw, ChevronLeft, ChevronRight, PlusCircle, GripVertical } from 'lucide-react';
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
import { format, isSameDay, startOfDay, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isWithinInterval, compareAsc, getHours, getMinutes, differenceInMinutes, setHours, setMinutes, setSeconds, setMilliseconds, isValid } from 'date-fns';
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
  onUpdateLocalizedEvents: (widgetId: string, events: CalendarEvent[]) => void;
}

type CalendarViewMode = 'day' | 'week' | 'month' | 'list';

const parseIcalTime = (icalTime: ICAL.Time, event: ICAL.Event): Date => {
  try {
    let jsDate = icalTime.toJSDate();
    if (icalTime.isDate) {
      // For all-day events, ical.js might parse them as UTC midnight.
      // We want to treat them as local date at midnight.
      jsDate = new Date(jsDate.getUTCFullYear(), jsDate.getUTCMonth(), jsDate.getUTCDate());
      return startOfDay(jsDate); // Ensure it's the start of the local day
    }
    // For specific time events, ical.js usually handles timezones correctly if present in ICS.
    // If not, it might interpret as local or UTC based on ICS. We trust its output for timed events.
    return jsDate;
  } catch (e) {
    console.warn("Failed to parse date directly, attempting fallback for event:", event.summary, icalTime.toString(), e);
    // Fallback for dates that might not be fully spec-compliant, e.g., just YYYYMMDD
    const dateStringOnly = icalTime.toString().split('T')[0];
    const year = parseInt(dateStringOnly.substring(0, 4), 10);
    const month = parseInt(dateStringOnly.substring(4, 6), 10) - 1; // JS months are 0-indexed
    const day = parseInt(dateStringOnly.substring(6, 8), 10);

    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return startOfDay(new Date(year, month, day));
    }
    // If all else fails, return start of current day to prevent crashing, though data will be wrong.
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
  onUpdateLocalizedEvents,
  onWidgetDragStart,
  onWidgetDragOver,
  onWidgetDragLeave,
  onWidgetDrop,
  onWidgetDragEnd,
  draggedWidgetId,
  dragOverWidgetId,
  isLayoutEditing,
}: CalendarIcsWidgetProps) {
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date | undefined>(undefined);

  const [currentView, setCurrentView] = useState<CalendarViewMode>('month');
  const [displayDate, setDisplayDate] = useState<Date | undefined>(undefined);

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | Omit<CalendarEvent, 'id'> | undefined>(undefined);

  useEffect(() => {
    setIsClientMounted(true);
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setCurrentMonth(today);
    setDisplayDate(today);
  }, []);


  const fetchAndParseIcs = useCallback((forceFetchAndStore = false) => {
    if (widget.data.isLocalized && widget.data.localizedEvents && widget.data.localizedEvents.length > 0 && !forceFetchAndStore) {
      setEvents(widget.data.localizedEvents.map(e => ({...e, startDate: new Date(e.startDate), endDate: new Date(e.endDate) })));
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!widget.data.icsUrl) {
      setEvents([]);
      setError(null);
      setIsLoading(false);
      if (widget.data.isLocalized) { 
        onUpdateLocalizedEvents(widget.id, []);
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    fetch(widget.data.icsUrl) // Removed proxy path
      .then(response => {
        if (!response.ok) {
          throw new Error(`获取 ICS 数据失败 (状态: ${response.status}). 请检查链接和网络连接，并确保 ICS 服务器允许跨域请求。`);
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

             if (event.startDate.isDate) { // All-day event
                 // For all-day events, if endDate is same as startDate or earlier, it means it's a single all-day event.
                 // Standard practice is for endDate to be the start of the *next* day for rendering purposes if it's an exclusive end.
                 // If ical.js parsed it as start of the same day, adjust to span one full day.
                 if (compareAsc(endDate, startDate) <= 0) {
                    endDate = startOfDay(addDays(startDate,1)); // Make it span the full day
                 }
            }

            return {
              id: event.uid || crypto.randomUUID(),
              summary: event.summary || '无标题',
              startDate: startDate,
              endDate: endDate,
              isAllDay: event.startDate.isDate, // isDate property correctly indicates all-day
              description: event.description || undefined,
            };
          }).sort((a,b) => compareAsc(a.startDate, b.startDate));

          setEvents(parsedEvents);
          if (widget.data.isLocalized) {
            onUpdateLocalizedEvents(widget.id, parsedEvents);
          }

        } catch (parseErr) {
          console.error("Error parsing ICS data:", parseErr);
          setError("解析日历数据失败。请确保 ICS 格式正确。");
          setEvents([]);
           if (widget.data.isLocalized) {
            onUpdateLocalizedEvents(widget.id, []);
          }
        }
      })
      .catch(err => {
        console.error("Error fetching or parsing ICS:", err);
        setError(err.message || "加载日历数据失败。请检查链接和网络，并确认服务器支持跨域请求(CORS)。");
        setEvents([]);
        if (widget.data.isLocalized) {
          onUpdateLocalizedEvents(widget.id, []);
        }
      })
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.id, widget.data.icsUrl, widget.data.isLocalized, widget.data.localizedEvents, onUpdateLocalizedEvents]);

  useEffect(() => {
    if (isClientMounted && !isCollapsed) { // Ensure client is mounted before fetching
      fetchAndParseIcs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.data.icsUrl, widget.data.isLocalized, isCollapsed, isClientMounted, fetchAndParseIcs]);


  const eventDays = useMemo(() => events.map(event => startOfDay(event.startDate)), [events]);

  const getEventsForDay = useCallback((day: Date | undefined): CalendarEvent[] => {
    if (!day || !isValid(day)) return [];
    const targetDayStart = startOfDay(day);
    const targetDayEnd = addDays(targetDayStart, 1);

    return events.filter(event => {
      const eventStart = event.startDate;
      const eventEnd = event.endDate;
      // Check if the event interval overlaps with the target day
      // For all-day events, endDate is exclusive (start of next day)
      // For timed events, endDate can be on the same day or later
      return compareAsc(eventStart, targetDayEnd) < 0 && compareAsc(eventEnd, targetDayStart) > 0;
    }).sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1; // All-day events first
      if (!a.isAllDay && b.isAllDay) return 1;
      return compareAsc(a.startDate, b.startDate); // Then sort by start time
    });
  }, [events]);


  const eventsForSelectedDay = useMemo(() => {
    return getEventsForDay(selectedDate);
  }, [selectedDate, getEventsForDay]);

  const weekRange = useMemo(() => {
    if (!displayDate || !isValid(displayDate)) return { start: new Date(), end: new Date()}; // Should be guarded by !isClientMounted check
    const start = startOfWeek(displayDate, { weekStartsOn: 1 }); // Monday as start of week
    const end = endOfWeek(displayDate, { weekStartsOn: 1 });
    return { start, end };
  }, [displayDate]);

  const eventsForListView = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysLater = endOfWeek(addDays(today, 30)); // Show events in the upcoming ~month
    return events.filter(event => {
      // Event starts today or later AND ends today or later (for ongoing/future events)
      const eventStartsTodayOrLater = compareAsc(event.startDate, today) >= 0;
      const eventEndsTodayOrLater = event.endDate && compareAsc(event.endDate, today) >=0;
      
      // Event is within the future 30-day range
      const eventIsWithinFutureRange = isWithinInterval(event.startDate, { start: today, end: thirtyDaysLater });

      // Event spans across today (started in past, ends today or in future)
      const eventSpansAcrossToday = compareAsc(event.startDate, today) < 0 && event.endDate && compareAsc(event.endDate, today) > 0;

      return eventIsWithinFutureRange || (eventStartsTodayOrLater && eventEndsTodayOrLater) || eventSpansAcrossToday;

    }).sort((a, b) => compareAsc(a.startDate, b.startDate));
  }, [events]);


  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLayoutEditing) {
       e.stopPropagation();
       return;
    }
    // Allow clicks on buttons, links, and interactive calendar parts
    if (e.target instanceof HTMLElement && (e.target.closest('button, a') || e.target.closest('.rdp-nav_button') || e.target.closest('.view-switcher') || e.target.closest('[role="button"]'))) {
      return;
    }
    e.stopPropagation(); // Stop propagation for general body clicks to prevent unwanted actions
    if (!widget.data.icsUrl && !(widget.data.isLocalized && widget.data.localizedEvents && widget.data.localizedEvents.length > 0)) {
        onOpenEditDialog(widget.id); // Open dialog if no URL and no localized data
    }
  };

  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isLayoutEditing) {
      e.stopPropagation();
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
       // Allow keydown on buttons, links, and interactive calendar parts
       if (e.target instanceof HTMLElement && (e.target.closest('button, a') || e.target.closest('.rdp-nav_button') || e.target.closest('.view-switcher') || e.target.closest('[role="button"]'))) {
        return;
      }
      e.preventDefault();
      e.stopPropagation(); // Stop propagation for general body keydowns
      if (!widget.data.icsUrl && !(widget.data.isLocalized && widget.data.localizedEvents && widget.data.localizedEvents.length > 0)) {
        onOpenEditDialog(widget.id); // Open dialog if no URL and no localized data
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
        let newEventsArray;
        if (eventExists) {
            newEventsArray = prevEvents.map(event =>
                event.id === updatedEventData.id ? { ...event, ...updatedEventData } : event
            );
        } else {
            // For new events, ensure a unique ID if not already provided (though crypto.randomUUID should be in Omit type)
            const newEventWithId = { ...updatedEventData, id: updatedEventData.id || crypto.randomUUID()};
            newEventsArray = [...prevEvents, newEventWithId];
        }
        newEventsArray.sort((a,b) => compareAsc(a.startDate, b.startDate)); // Re-sort
        if (widget.data.isLocalized) {
          onUpdateLocalizedEvents(widget.id, newEventsArray);
        }
        return newEventsArray;
    });
    handleCloseEventDetailDialog();
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prevEvents => {
      const newEventsArray = prevEvents.filter(event => event.id !== eventId);
      if (widget.data.isLocalized) {
        onUpdateLocalizedEvents(widget.id, newEventsArray);
      }
      return newEventsArray;
    });
    // If the deleted event was being edited, close the dialog
    if (editingEvent && 'id' in editingEvent && editingEvent.id === eventId) {
      handleCloseEventDetailDialog();
    }
  };

   const goToToday = () => {
    const todayAnchor = startOfDay(new Date());
    setSelectedDate(todayAnchor);
    setDisplayDate(todayAnchor);
    setCurrentMonth(todayAnchor); // Also reset month view to current month
  };

  const handleRefresh = () => {
    fetchAndParseIcs(true); // forceFetchAndStore = true
  };


  const renderEventItem = (event: CalendarEvent, context?: 'week-column' | 'list' | 'day-detail' | 'day-timeline') => {
    let baseItemClasses = "calendar-widget__event-item group/event-item";
    // Default text color, overridden by specific contexts or dark mode adjustments in CSS
    let titleClasses = "truncate block";
    let timeClasses = "text-xs block";


    if (context === 'list' || context === 'day-detail' ) {
       // Specific styling for list and day-detail might be slightly different if needed
    } else if (context === 'week-column' || context === 'day-timeline') {
      titleClasses = cn(titleClasses, "font-semibold");
    }


    let actionButtonSizeClasses = "h-7 w-7 p-1";
    let actionIconSizeClasses = "h-4 w-4";

    if (context === 'week-column') {
        baseItemClasses = "calendar-widget__event-item group/event-item !p-1 !mb-0.5 text-xs";
        actionButtonSizeClasses = "h-6 w-6 p-0.5";
        actionIconSizeClasses = "h-3 w-3";
    } else if (context === 'day-timeline') {
        baseItemClasses = cn(
          "calendar-widget__event-item group/event-item !p-1.5 text-xs",
          event.isAllDay ? "relative" : "absolute" // Absolute for timed, relative for all-day in timeline
        );
        actionButtonSizeClasses = "h-5 w-5 p-0.5"; // Smaller buttons for timeline
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

        {/* Time display logic based on context */}
        {context === 'list' && ( // List view: Full date and time
            <span className={timeClasses}>
                {format(event.startDate, 'PPP')}
                {!event.isAllDay && ` ${format(event.startDate, 'p')} - ${format(event.endDate, 'p')}`}
                {event.isAllDay && ` (全天)`}
            </span>
        )}
        {(context === 'day-detail' || context === 'day-timeline') && ( // Day detail / timeline: Time only or "All day"
          <span className={timeClasses}>
            {!event.isAllDay ? `${format(event.startDate, 'HH:mm')} - ${format(event.endDate, 'HH:mm')}` : "(全天)"}
          </span>
        )}
         {context === 'week-column' && ( // Week column: Start time only or "All day" (concise)
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
  );
  };

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


  // Timeline specific calculations
  const hourSlotHeight = 60; // pixels per hour
  const getTimelineEventStyle = (event: CalendarEvent): React.CSSProperties => {
    if (event.isAllDay) return { position: 'relative' }; // All-day events rendered differently, not absolutely positioned in timeline

    const startHour = getHours(event.startDate);
    const startMinute = getMinutes(event.startDate);

    // Ensure endDate is after startDate for duration calculation
    let durationMinutes = differenceInMinutes(event.endDate, event.startDate);
    if (durationMinutes <=0) durationMinutes = 30; // Default to 30 min if duration is zero or negative

    const top = (startHour + startMinute / 60) * hourSlotHeight;
    const height = (durationMinutes / 60) * hourSlotHeight;

    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`, // Minimum height for very short events
      left: '0.25rem', // Small offset from the time axis
      right: '0.25rem',
      zIndex: 10, // Ensure events are above hour lines
    };
  };

  const renderDayTimelineView = () => {
    if (!displayDate || !isValid(displayDate)) return <p className="p-4 text-center text-muted-foreground">选择一个日期以查看日程。</p>;
    
    const dayEvents = getEventsForDay(displayDate);
    const allDayEvents = dayEvents.filter(e => e.isAllDay);
    const timedEvents = dayEvents.filter(e => !e.isAllDay);
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 for 24-hour format

    return (
      <div className="p-2">
        {/* Day Navigation and Title */}
        <div className="flex justify-between items-center mb-2">
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); const newDay = subDays(displayDate,1); setDisplayDate(newDay); setSelectedDate(newDay);}}><ChevronLeft className="h-5 w-5" /></Button>
          <h3
            className="text-lg font-semibold text-center cursor-pointer text-foreground hover:text-primary"
            onClick={() => {const newMonth = startOfDay(displayDate); setCurrentMonth(newMonth); setCurrentView('month'); setSelectedDate(displayDate);}}
            title={`切换到 ${isValid(displayDate) ? format(displayDate, 'yyyy年MM月') : ''} 的月视图`}
          >
            {isValid(displayDate) ? format(displayDate, 'yyyy年M月d日, EEEE') : 'Loading...'}
          </h3>
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); const newDay = addDays(displayDate,1); setDisplayDate(newDay); setSelectedDate(newDay);}}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {/* All-day events section */}
        {allDayEvents.length > 0 && (
          <div className="mb-3 border-b pb-2">
            <h4 className="text-sm font-semibold mb-1 text-foreground">全天事件</h4>
            <ul className="space-y-1">
              {allDayEvents.map(event => renderEventItem(event, 'day-timeline'))}
            </ul>
          </div>
        )}

        {/* Timeline for timed events */}
        <ScrollArea className="h-[500px] w-full"> {/* Adjust height as needed */}
          <div className="calendar-widget__day-timeline-container flex">
            {/* Time Axis */}
            <div className="calendar-widget__time-axis pt-1"> {/* pt-1 to align with potential padding in event column slots */}
              {hours.map(hour => (
                <div key={`time-label-${hour}`} className="flex items-center justify-end" style={{ height: `${hourSlotHeight}px` }}>
                  {format(setHours(setMinutes(new Date(),0), hour), 'HH:mm')}
                </div>
              ))}
            </div>

            {/* Event Grid */}
            <div className="relative flex-grow"> {/* This will contain hour slots and events */}
              {/* Background hour slots */}
              {hours.map(hour => (
                <div key={`timeslot-bg-${hour}`} className="calendar-widget__time-slot" style={{ height: `${hourSlotHeight}px` }}>
                  {/* This div is just for the horizontal line */}
                </div>
              ))}
              {/* Events container absolutely positioned over the slots */}
              <div className="calendar-widget__event-column">
                <ul className="relative h-full"> {/* Ensure ul takes full height for positioning */}
                  {timedEvents.map(event => renderEventItem(event, 'day-timeline'))}
                </ul>
              </div>
            </div>
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {/* Empty state for the day */}
        {allDayEvents.length === 0 && timedEvents.length === 0 && (
            <p className="text-muted-foreground text-center py-10">{`${isValid(displayDate) ? format(displayDate, 'PPP') : ''} 无事件。`}</p>
        )}
      </div>
    );
  };


  const renderWeekView = () => {
    if (!displayDate || !isValid(displayDate)) return <p className="p-4 text-center text-muted-foreground">选择一个日期以查看日程。</p>;

    const daysOfWeek = eachDayOfInterval(weekRange);
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 for 24-hour format
    const allDayEventsByDay: Record<string, CalendarEvent[]> = {};
    const timedEventsByDay: Record<string, CalendarEvent[]> = {};

    daysOfWeek.forEach(day => {
        const dailyEvents = getEventsForDay(day);
        allDayEventsByDay[format(day, 'yyyy-MM-dd')] = dailyEvents.filter(e => e.isAllDay);
        timedEventsByDay[format(day, 'yyyy-MM-dd')] = dailyEvents.filter(e => !e.isAllDay);
    });


    return (
      <div className="p-2">
        {/* Week Navigation and Title */}
        <div className="flex justify-between items-center mb-2">
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); setDisplayDate(prev => prev ? subWeeks(prev, 1) : new Date())}}><ChevronLeft className="h-5 w-5" /></Button>
          <h3
            className="text-base font-semibold cursor-pointer text-foreground hover:text-primary"
            onClick={() => {setCurrentView('month'); if(selectedDate && isValid(selectedDate)) setCurrentMonth(startOfDay(selectedDate))}}
            title="切换到月视图"
          >
            {`${isValid(weekRange.start) ? format(weekRange.start, 'M月d日') : ''} - ${isValid(weekRange.end) ? format(weekRange.end, 'M月d日, yyyy年') : ''}`}
          </h3>
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); setDisplayDate(prev => prev ? addWeeks(prev, 1) : new Date())}}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {/* All-day events row */}
        <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-px bg-border border-t border-l">
            {/* Header for "all-day" slot */}
            <div className="calendar-widget__time-axis p-1 border-b border-r text-xs font-semibold text-muted-foreground flex items-center justify-center">全天</div>
            {/* Day headers for all-day events */}
            {daysOfWeek.map(day => (
                <div key={`allday-header-${day.toISOString()}`}
                     className={`calendar-widget__day-column !min-h-[auto] p-1 border-b ${isSameDay(day, startOfDay(new Date())) ? 'border-primary border-2' : ''} ${isSameDay(day, displayDate || new Date()) && currentView === 'day' ? 'bg-accent/20' : ''}`}
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
                    ) : (<div className="h-4"></div>) /* Placeholder for empty all-day slots */}
                </div>
            ))}
        </div>

        {/* Timed events grid */}
        <ScrollArea className="h-[500px] w-full"> {/* Adjust height as needed */}
            <div className="relative grid grid-cols-[auto_repeat(7,1fr)] gap-px bg-border border-l"> {/* Main grid for time axis + 7 days */}
                {/* Time Axis - sticky for scrolling would be ideal but complex with pure Tailwind grid */}
                <div className="sticky left-0 z-10 bg-card calendar-widget__time-axis pt-1"> {/* pt-1 to align with event column padding */}
                    {hours.map(hour => (
                        <div key={`week-timeslot-label-${hour}`} className="flex items-center justify-end border-r" style={{ height: `${hourSlotHeight}px` }}>
                            {format(setHours(setMinutes(new Date(),0), hour), 'HH:mm')}
                        </div>
                    ))}
                </div>

                {/* Day Columns for Timed Events */}
                {daysOfWeek.map(day => (
                    <div key={`week-daycol-${day.toISOString()}`}
                         className={`relative calendar-widget__day-column !min-h-[${hours.length * hourSlotHeight}px] !p-0 !border-b-0 ${isSameDay(day, startOfDay(new Date())) ? 'border-primary border-l-0 border-t-0 border-b-0 !border-r-2' : ''}`} // Highlight today
                         onClick={(e) => {
                            // If clicking on the background grid of a day column (not an event itself)
                            if (e.target === e.currentTarget) {
                                setSelectedDate(day); setDisplayDate(day); setCurrentView('day');
                            }
                         }}
                         role="button" tabIndex={0}
                         onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); setSelectedDate(day); setDisplayDate(day); setCurrentView('day');}}}
                         aria-label={`查看 ${format(day, 'MMMM d, yyyy')} 的日程`}
                    >
                        {/* Background hour slots for this day */}
                        {hours.map(hour => (
                            <div key={`week-day-${format(day, 'yyyy-MM-dd')}-timeslot-line-${hour}`}
                                className="calendar-widget__time-slot" style={{ height: `${hourSlotHeight}px` }}>
                            </div>
                        ))}
                        {/* Events for this day, absolutely positioned */}
                        <ul className="absolute inset-0"> {/* Takes full space of the day column for event positioning */}
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

  if (!isClientMounted || !displayDate || !currentMonth) {
    return (
      <div data-testid="calendar-ics-widget-main" className={cn("page-section__widget", isLayoutEditing && "is-layout-editing")}>
        <article className="widget calendar-widget group/widget">
          <div className="widget__container">
            <header className="widget__header">
              <div className="widget-header__drag-handle">
                  <GripVertical className="h-5 w-5" />
              </div>
              <div
                className="widget-header__title-clickable-area"
                onClick={(e) => { if (!isLayoutEditing) onToggleCollapse(widget.id); else e.preventDefault();}}
                role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isLayoutEditing) onToggleCollapse(widget.id);} }}
                aria-expanded={!isCollapsed} aria-controls={`widget-body-${widget.id}`}
              >
                <CalendarIconLucide className="widget-header__feather-icon h-5 w-5 mr-2" />
                <span className="widget-header__text text-lg font-semibold">{widget.title}</span>
                {isCollapsed ? <ChevronDown className="widget-header__chevron" /> : <ChevronUp className="widget-header__chevron" />}
              </div>
               {/* Placeholder for controls to maintain layout consistency */}
              <div className="widget-header__controls h-7"></div>
            </header>
            {!isCollapsed && (
              <div className="widget__box" id={`widget-body-${widget.id}`}>
                <div className="widget__body p-4 text-center text-muted-foreground">
                  正在加载日历...
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    );
  }


  const isWidgetItselfDraggable = isLayoutEditing;

  return (
    <div
        data-testid="calendar-ics-widget-main"
        className={cn(
            "page-section__widget",
            isLayoutEditing && "is-layout-editing", // Added conditional class
            draggedWidgetId === widget.id && "opacity-50 cursor-grabbing",
            dragOverWidgetId === widget.id && draggedWidgetId !== widget.id && "ring-2 ring-primary ring-offset-2 rounded-lg"
        )}
        draggable={isWidgetItselfDraggable}
        onDragStart={(e) => {
            if (isWidgetItselfDraggable) {
              onWidgetDragStart(e, widget.id);
            } else {
              e.preventDefault();
            }
          }}
        onDragOver={(e) => { if (isLayoutEditing) onWidgetDragOver(e, widget.id);}}
        onDrop={(e) => { if (isLayoutEditing) onWidgetDrop(e, widget.id);}}
        onDragLeave={(e) => { if (isLayoutEditing) onWidgetDragLeave(e);}}
        onDragEnd={(e) => { if (isLayoutEditing) onWidgetDragEnd(e);}}
    >
      <article className="widget calendar-widget group/widget">
        <div className="widget__container">
          <header className="widget__header">
            <div className="widget-header__drag-handle">
                <GripVertical className="h-5 w-5" />
            </div>
            <div
              className="widget-header__title-clickable-area"
              onClick={(e) => { if (!isLayoutEditing) onToggleCollapse(widget.id); else e.preventDefault();}}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!isLayoutEditing) onToggleCollapse(widget.id);} }}
              aria-expanded={!isCollapsed}
              aria-controls={`widget-body-${widget.id}`}
            >
              <CalendarIconLucide className="widget-header__feather-icon h-5 w-5 mr-2" />
              <span className="widget-header__text text-lg font-semibold">{widget.title}</span>
              {isCollapsed ? <ChevronDown className="widget-header__chevron" /> : <ChevronUp className="widget-header__chevron" />}
            </div>
            <div className="widget-header__controls">
              {(!isCollapsed && (widget.data.icsUrl || (widget.data.isLocalized && widget.data.localizedEvents && widget.data.localizedEvents.length > 0))) && (
                <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => {e.stopPropagation(); handleRefresh();}} title="刷新日历数据">
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
                     const newEventStart = selectedDate && isValid(selectedDate) ? selectedDate : startOfDay(new Date());
                     const newEvent: Omit<CalendarEvent, 'id'> = {
                       summary: "新事件",
                       startDate: setMinutes(setHours(newEventStart, getHours(new Date())),0), // Default to current hour, 0 minutes
                       endDate: setMinutes(setHours(newEventStart, getHours(new Date()) + 1),0), // Default to one hour later
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
                role={!widget.data.icsUrl && !(widget.data.isLocalized && widget.data.localizedEvents && widget.data.localizedEvents.length > 0) && !isLayoutEditing ? "button" : undefined}
                tabIndex={!widget.data.icsUrl && !(widget.data.isLocalized && widget.data.localizedEvents && widget.data.localizedEvents.length > 0) && !isLayoutEditing ? 0 : undefined}
                aria-label={(!widget.data.icsUrl && !(widget.data.isLocalized && widget.data.localizedEvents && widget.data.localizedEvents.length > 0)) ? "设置日历链接" : `${widget.title} 日历区域`}
              >
                {isLoading && <p className="p-4 text-center text-muted-foreground">正在加载日历...</p>}
                {error &&
                  <div className="p-4 text-center text-destructive flex flex-col items-center">
                    <AlertTriangle className="w-8 h-8 mb-2"/>
                    <p>{error}</p>
                  </div>
                }
                {!isLoading && !error && (widget.data.icsUrl || (widget.data.isLocalized && widget.data.localizedEvents && widget.data.localizedEvents.length > 0)) && (
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
                                    const targetDay = (selectedDate && isValid(selectedDate)) ? selectedDate : startOfDay(new Date());
                                    if (view === 'day') {
                                        setDisplayDate(targetDay);
                                        if(!selectedDate || !isValid(selectedDate)) setSelectedDate(targetDay);
                                    } else if (view === 'week') {
                                        setDisplayDate(targetDay);
                                    } else if (view === 'month') {
                                        setCurrentMonth(targetDay);
                                        if(!selectedDate || !isValid(selectedDate)) setSelectedDate(targetDay);
                                    }
                                 }}
                                >
                                {view === 'day' ? '日' : view === 'week' ? '周' : view === 'month' ? '月' : '列表'}
                                </Button>
                            ))}
                        </div>
                         <div className="flex items-center space-x-1">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newEventStart = (selectedDate && isValid(selectedDate)) ? selectedDate : startOfDay(new Date());
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
                    </div>

                    {currentView === 'month' && currentMonth && isValid(currentMonth) && (
                      <>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(day) => {
                            setSelectedDate(day);
                            if (day && isValid(day)) {
                                setDisplayDate(startOfDay(day));
                                setCurrentMonth(startOfDay(day)); // Keep month in sync with selected day
                            }
                          }}
                          month={currentMonth}
                          onMonthChange={(month) => {
                            if (isValid(month)) setCurrentMonth(month);
                            // Optionally adjust selectedDate if it's outside the new month
                            if (selectedDate && isValid(selectedDate) && (selectedDate.getMonth() !== month.getMonth() || selectedDate.getFullYear() !== month.getFullYear())) {
                                const dayInNewMonth = new Date(month.getFullYear(), month.getMonth(), selectedDate.getDate());
                                // Check if the day is valid in the new month (e.g. Feb 30th is not)
                                if (isValid(dayInNewMonth) && dayInNewMonth.getMonth() === month.getMonth()) {
                                     setSelectedDate(startOfDay(dayInNewMonth));
                                     setDisplayDate(startOfDay(dayInNewMonth));
                                } else { // Select first day of new month if original day doesn't exist
                                     const firstOfNewMonth = startOfDay(new Date(month.getFullYear(), month.getMonth(), 1));
                                     setSelectedDate(firstOfNewMonth);
                                     setDisplayDate(firstOfNewMonth);
                                }
                            } else if (!selectedDate || !isValid(selectedDate)) { // If no date selected, select first of new month
                                const firstOfNewMonth = startOfDay(new Date(month.getFullYear(), month.getMonth(), 1));
                                setSelectedDate(firstOfNewMonth);
                                setDisplayDate(firstOfNewMonth);
                            }

                          }}
                          className="rounded-md calendar-widget"
                          modifiers={{ eventDay: eventDays.map(d => startOfDay(d)) }}
                          modifiersClassNames={{ eventDay: 'bg-primary/20 rounded-full !text-primary-foreground dark:!text-primary' }} // Ensure proper styling for event days
                          footer={selectedDate && isValid(selectedDate) && eventsForSelectedDay.length > 0 ?
                            renderEventsList(eventsForSelectedDay, `${format(selectedDate, 'PPP')} 的事件`, `${format(selectedDate, 'PPP')} 无事件。`, 'day-detail')
                            : selectedDate && isValid(selectedDate) ? <p className="calendar-widget__no-events p-3 border-t text-muted-foreground">{`${format(selectedDate, 'PPP')} 无事件。`}</p> : null
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
                {!isLoading && !error && !widget.data.icsUrl && !(widget.data.isLocalized && widget.data.localizedEvents && widget.data.localizedEvents.length > 0) && (
                   <div
                    className="calendar-widget__empty-prompt"
                  >
                    <CalendarIconLucide className="w-10 h-10 text-muted-foreground mb-3"/>
                    <p className="text-lg font-medium text-foreground mb-2">日历为空</p>
                    <p className="text-sm text-muted-foreground mb-4">要显示事件，请链接一个 ICS 日历 URL 或本地化数据。 您可以从菜单中“编辑日历链接”进行设置。</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </article>
      {isEventDetailDialogOpen && editingEvent && (
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
