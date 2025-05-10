
"use client";

import type { CalendarIcsAppWidget, CalendarEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Edit3, MoreVertical, Trash2, ChevronDown, ChevronUp, AlertTriangle, Link2, FilePenLine, RotateCcw, ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
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

interface CalendarIcsWidgetProps {
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
    // For all-day events, ical.js might return a date at UTC midnight.
    // We want to interpret this as the start of the day in the local timezone.
    if (icalTime.isDate) {
      // Create a new Date object using UTC components but interpret them as local time parts
      jsDate = new Date(jsDate.getUTCFullYear(), jsDate.getUTCMonth(), jsDate.getUTCDate());
      return startOfDay(jsDate); // Ensure it's the start of the local day
    }
    return jsDate; // For specific times, use as is (it should be in local time or UTC as specified)
  } catch (e) {
    console.warn("Failed to parse date directly, attempting fallback for event:", event.summary, icalTime.toString(), e);
    // Fallback for potentially problematic date strings, focusing on date part for all-day events
    const dateStringOnly = icalTime.toString().split('T')[0];
    const year = parseInt(dateStringOnly.substring(0, 4), 10);
    const month = parseInt(dateStringOnly.substring(4, 6), 10) - 1; // Month is 0-indexed
    const day = parseInt(dateStringOnly.substring(6, 8), 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return startOfDay(new Date(year, month, day));
    }
    // If all else fails, return start of current day to prevent crashes
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
}: CalendarIcsWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(startOfDay(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(startOfDay(new Date()));

  const [currentView, setCurrentView] = useState<CalendarViewMode>('month');
  const [displayDate, setDisplayDate] = useState<Date>(startOfDay(new Date())); // For day/week view navigation

  const [isEventDetailDialogOpen, setIsEventDetailDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>(undefined);

  const fetchAndParseIcs = useCallback(() => {
    if (!widget.data.icsUrl) {
      setEvents([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    // Use a proxy to fetch ICS data to avoid CORS issues
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
            
            // End date for all-day events is exclusive. If it's the same as start, make it next day.
            let endDate = parseIcalTime(event.endDate, event);

            // If it's an all-day event (isDate is true) and endDate is not after startDate,
            // it means it's a single all-day event. Standard ICS practice is that DTEND
            // for an all-day event is the start of the *next* day.
            // Or, if it's a multi-day all-day event, DTEND is the start of the day *after* the last day.
             if (event.startDate.isDate) { // This is an all-day event
                 // If endDate is on or before startDate, it's likely a single all-day event or data issue.
                 // Correctly, endDate should be at least one day after startDate for all-day events.
                 // For an event like "All day on May 5th", startDate is May 5th 00:00, endDate should be May 6th 00:00.
                 if (compareAsc(endDate, startDate) <= 0) {
                    endDate = startOfDay(addDays(startDate,1)); // Make it end at the start of the next day
                 }
            }
            
            return {
              id: event.uid || crypto.randomUUID(), // Use UID or generate one
              summary: event.summary || '无标题',
              startDate: startDate,
              endDate: endDate,
              isAllDay: event.startDate.isDate, // isDate indicates an all-day event
              description: event.description || undefined,
            };
          }).sort((a,b) => compareAsc(a.startDate, b.startDate));
          setEvents(parsedEvents);
        } catch (parseErr) {
          console.error("Error parsing ICS data:", parseErr);
          setError("解析日历数据失败。请确保 ICS 格式正确。");
          setEvents([]); // Clear events on parse error
        }
      })
      .catch(err => {
        console.error("Error fetching or parsing ICS:", err);
        setError(err.message || "加载日历数据失败。请检查链接和网络。");
        setEvents([]); // Clear events on fetch error
      })
      .finally(() => setIsLoading(false));
  }, [widget.data.icsUrl]);

  useEffect(() => {
    // Fetch data when the widget is expanded or the URL changes
    if (!isCollapsed) {
      fetchAndParseIcs();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.data.icsUrl, isCollapsed]); // Rerun if URL or collapsed state changes

  // Memoize event days for highlighting in the calendar
  const eventDays = useMemo(() => events.map(event => startOfDay(event.startDate)), [events]);

  const getEventsForDay = useCallback((day: Date | undefined): CalendarEvent[] => {
    if (!day) return [];
    const targetDayStart = startOfDay(day);
    const targetDayEnd = addDays(targetDayStart, 1); // End of the target day (exclusive)

    return events.filter(event => {
      const eventStart = event.startDate;
      const eventEnd = event.endDate; // endDate for all-day events is exclusive

      // Check if the event overlaps with the target day
      // For all-day events: eventStart <= targetDayStart < eventEnd
      // For timed events: eventStart < targetDayEnd AND eventEnd > targetDayStart
      if (event.isAllDay) {
        // All-day event spans from eventStart (inclusive) to eventEnd (exclusive)
        return compareAsc(targetDayStart, eventStart) >= 0 && compareAsc(targetDayStart, eventEnd) < 0;
      } else {
        // Timed event, check for overlap
        return compareAsc(eventStart, targetDayEnd) < 0 && compareAsc(eventEnd, targetDayStart) > 0;
      }
    }).sort((a, b) => { // Sort events: all-day first, then by start time
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      return compareAsc(a.startDate, b.startDate);
    });
  }, [events]);


  const eventsForSelectedDay = useMemo(() => {
    return getEventsForDay(selectedDate);
  }, [selectedDate, getEventsForDay]);

  // Calculate the week range for the week view
  const weekRange = useMemo(() => {
    const start = startOfWeek(displayDate, { weekStartsOn: 1 }); // Monday as start of week
    const end = endOfWeek(displayDate, { weekStartsOn: 1 });
    return { start, end };
  }, [displayDate]);

  // Filter events for the list view (e.g., next 30 days)
  const eventsForListView = useMemo(() => {
    const today = startOfDay(new Date());
    // const oneMonthLater = addMonths(today, 1);
    const thirtyDaysLater = endOfWeek(addDays(today, 30)); // Show events for roughly the next month, aligned to week end for consistency
    return events.filter(event => {
      // Event starts today or later AND is within the next 30 days range
      // Or event started before today but ends today or later (multi-day event spanning today)
      const eventStartsTodayOrLater = compareAsc(event.startDate, today) >= 0;
      const eventEndsTodayOrLater = event.endDate && compareAsc(event.endDate, today) >=0;
      // const isWithinRange = isWithinInterval(event.startDate, { start: today, end: oneMonthLater });
      const eventIsWithinFutureRange = isWithinInterval(event.startDate, { start: today, end: thirtyDaysLater });

      // Include events that span across today into the future range
      const eventSpansAcrossToday = compareAsc(event.startDate, today) < 0 && event.endDate && compareAsc(event.endDate, today) > 0;

      return eventIsWithinFutureRange || (eventStartsTodayOrLater && eventEndsTodayOrLater) || eventSpansAcrossToday;

    }).sort((a, b) => compareAsc(a.startDate, b.startDate));
  }, [events]);


  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent dialog from opening if a button or interactive element within the body is clicked
    if (e.target instanceof HTMLElement && (e.target.closest('button, a') || e.target.closest('.rdp-nav_button') || e.target.closest('.view-switcher') || e.target.closest('[role="button"]'))) {
      return;
    }
    e.stopPropagation(); // Important to prevent event bubbling that might close other things
    // If no ICS URL is set, open the dialog to set it
    if (!widget.data.icsUrl) {
        onOpenEditDialog(widget.id);
    }
  };

  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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

  // Event Detail Dialog Handlers
  const handleOpenEventDetailDialog = (event: CalendarEvent | Omit<CalendarEvent, 'id'>) => {
    setEditingEvent(event as CalendarEvent); // Cast needed if it's Omit<...>
    setIsEventDetailDialogOpen(true);
  };

  const handleCloseEventDetailDialog = () => {
    setIsEventDetailDialogOpen(false);
    setEditingEvent(undefined);
  };

  const handleSubmitEventDetail = (updatedEventData: CalendarEvent) => {
     // This is a local-only update. Changes are not persisted to the ICS source.
     setEvents(prevEvents => {
        const eventExists = prevEvents.some(e => e.id === updatedEventData.id);
        if (eventExists) {
            // Update existing event
            return prevEvents.map(event =>
                event.id === updatedEventData.id ? { ...event, ...updatedEventData } : event
            ).sort((a,b) => compareAsc(a.startDate, b.startDate));
        } else {
            // Add new event
            return [...prevEvents, updatedEventData].sort((a,b) => compareAsc(a.startDate, b.startDate));
        }
    });
    handleCloseEventDetailDialog();
  };

  const handleDeleteEvent = (eventId: string) => {
    // Local-only delete
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    if (editingEvent?.id === eventId) { // If the deleted event was being edited, close dialog
      handleCloseEventDetailDialog();
    }
  };


  // Navigation helpers
  const goToToday = () => {
    const todayAnchor = startOfDay(new Date());
    setSelectedDate(todayAnchor); // Update selectedDate for Month view
    setDisplayDate(todayAnchor);  // Update displayDate for Day/Week view
    setCurrentMonth(todayAnchor); // Update currentMonth for Month view navigation
    setCurrentView('day');        // Switch to Day view showing today
  };

  const renderEventItem = (event: CalendarEvent, context?: 'week-column' | 'list' | 'day-detail' | 'day-timeline') => {
    let baseItemClasses = "calendar-widget__event-item group/event-item";
    let titleClasses = "truncate block text-accent dark:text-[hsl(var(--accent-foreground))] group-hover/event-item:text-accent-foreground dark:group-hover/event-item:text-accent";
    let timeClasses = "text-xs block text-accent dark:text-[hsl(var(--accent-foreground))/90] group-hover/event-item:text-accent-foreground dark:group-hover/event-item:text-accent";
    let actionButtonSizeClasses = "h-7 w-7 p-1"; // Default for list/day-detail
    let actionIconSizeClasses = "h-4 w-4";

    if (context === 'week-column') {
        baseItemClasses = "calendar-widget__event-item group/event-item !p-1 !mb-0.5 text-xs"; // More compact
        titleClasses = "truncate block font-semibold text-accent dark:text-[hsl(var(--accent-foreground))]"; // Ensure title is always readable
        timeClasses = "text-xs block text-accent dark:text-[hsl(var(--accent-foreground))/90]";
        actionButtonSizeClasses = "h-6 w-6 p-0.5";
        actionIconSizeClasses = "h-3 w-3";
    } else if (context === 'day-timeline') {
        baseItemClasses = "calendar-widget__event-item group/event-item !p-1.5 text-xs"; // Compact for timeline
        titleClasses = "truncate block font-semibold text-accent dark:text-[hsl(var(--accent-foreground))]";
        timeClasses = "text-xs block text-accent dark:text-[hsl(var(--accent-foreground))/90]";
        actionButtonSizeClasses = "h-5 w-5 p-0.5"; // Smaller icons for dense timeline
        actionIconSizeClasses = "h-3 w-3";
    }
    // For 'list' and 'day-detail', the default classes are generally fine but hover effects might be too much for day-detail, adjust if needed.


    return (
    <li key={event.id} className={baseItemClasses}
        style={context === 'day-timeline' ? getTimelineEventStyle(event) : {}}
        onClick={(e) => { e.stopPropagation(); handleOpenEventDetailDialog(event); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenEventDetailDialog(event); }}}
        aria-label={`事件: ${event.summary}, 时间: ${event.isAllDay ? '全天' : format(event.startDate, 'p') + ' - ' + format(event.endDate, 'p')}. 点击查看详情.`}
    >
      <div className="flex-grow overflow-hidden mr-1">
        <strong className={titleClasses} title={event.summary}>{event.summary}</strong>

        {/* Time display based on context */}
        {context === 'list' && ( // For list view, show full date and time
            <span className={timeClasses}>
                {format(event.startDate, 'PPP')}
                {!event.isAllDay && ` ${format(event.startDate, 'p')} - ${format(event.endDate, 'p')}`}
                {event.isAllDay && ` (全天)`}
            </span>
        )}
        {(context === 'day-detail' || context === 'day-timeline') && ( // For day details/timeline, show only time
          <span className={timeClasses}>
            {!event.isAllDay ? `${format(event.startDate, 'HH:mm')} - ${format(event.endDate, 'HH:mm')}` : "(全天)"}
          </span>
        )}
         {context === 'week-column' && ( // For week columns, show start time or "All day"
          <span className={timeClasses}>
            {!event.isAllDay ? `${format(event.startDate, 'p')}` : "(全天)"}
          </span>
        )}
      </div>
      {/* Actions: View/Edit and Delete */}
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
          <AlertDialogContent onClick={(e) => e.stopPropagation()}> {/* Prevent dialog close on content click */}
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

  // Helper to render a list of events (used in month footer, list view)
  const renderEventsList = (eventsToRender: CalendarEvent[], title?: string, noEventsMessage?: string, context?: 'list' | 'day-detail') => (
    <div className="calendar-widget__event-list">
      {title && <h3 className="calendar-widget__event-list-title">{title}</h3>}
      {eventsToRender.length > 0 ? (
        <ul className="space-y-1">{eventsToRender.map(event => renderEventItem(event, context))}</ul>
      ) : (
        <p className="calendar-widget__no-events">{noEventsMessage || "无事件。"}</p>
      )}
    </div>
  );


  // Day Timeline View Specifics
  const hourSlotHeight = 60; // pixels per hour, adjust for desired scale
  const getTimelineEventStyle = (event: CalendarEvent): React.CSSProperties => {
    if (event.isAllDay) return { position: 'relative' }; // All-day events handled separately or styled differently

    const startHour = getHours(event.startDate);
    const startMinute = getMinutes(event.startDate);

    // Calculate duration, ensure minimum duration for visibility
    let durationMinutes = differenceInMinutes(event.endDate, event.startDate);
    if (durationMinutes <=0) durationMinutes = 30; // Minimum 30-minute display for very short/instant events

    const top = (startHour + startMinute / 60) * hourSlotHeight;
    const height = (durationMinutes / 60) * hourSlotHeight;

    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`, // Minimum height of 20px
      left: '0.25rem', // Small indent from the time axis line
      right: '0.25rem', // Padding from the edge
      zIndex: 10, // Ensure events are above timeslots
      // backgroundColor, borderColor, etc., can be set via CSS classes for theming
    };
  };

  const renderDayTimelineView = () => {
    const dayEvents = getEventsForDay(displayDate);
    const allDayEvents = dayEvents.filter(e => e.isAllDay);
    const timedEvents = dayEvents.filter(e => !e.isAllDay);
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 hours

    return (
      <div className="p-2">
        {/* Day Navigation and Title */}
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

        {/* All-day events section */}
        {allDayEvents.length > 0 && (
          <div className="mb-3 border-b pb-2">
            <h4 className="text-sm font-semibold mb-1 text-foreground">全天事件</h4>
            <ul className="space-y-1">
              {allDayEvents.map(event => renderEventItem(event, 'day-detail'))}
            </ul>
          </div>
        )}

        {/* Timeline area */}
        <ScrollArea className="h-[500px] w-full"> {/* Adjust height as needed */}
          <div className="calendar-widget__day-timeline-container"> {/* Relative for positioning events */}
            {/* Time Axis and Slots */}
            <div className="relative"> {/* This inner relative helps with absolute positioning of events */}
              {hours.map(hour => (
                <div key={`timeslot-${hour}`} className="calendar-widget__time-slot" style={{ height: `${hourSlotHeight}px` }}>
                  <div className="calendar-widget__time-axis">
                    {format(setHours(setMinutes(new Date(),0), hour), 'HH:mm')}
                  </div>
                  <div className="flex-grow"> {/* This is the main area for events for this slot if needed, or just for bg lines */}
                  </div>
                </div>
              ))}
              {/* Event Column - overlaying the time slots */}
              <div className="calendar-widget__event-column">
                <ul className="relative h-full"> {/* Ensure ul takes full height for positioning */}
                  {timedEvents.map(event => renderEventItem(event, 'day-timeline'))}
                </ul>
              </div>
            </div>
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {/* No events message */}
        {allDayEvents.length === 0 && timedEvents.length === 0 && (
            <p className="text-muted-foreground text-center py-10">{`${format(displayDate, 'PPP')} 无事件。`}</p>
        )}
      </div>
    );
  };


  // Week View
  const renderWeekView = () => {
    const daysOfWeek = eachDayOfInterval(weekRange);
    return (
      <div className="p-2">
        <div className="flex justify-between items-center mb-2">
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); setDisplayDate(subWeeks(displayDate, 1))}}><ChevronLeft className="h-5 w-5" /></Button>
          <h3
            className="text-base font-semibold cursor-pointer text-foreground hover:text-primary"
            onClick={() => {setCurrentView('month'); if(selectedDate) setCurrentMonth(startOfDay(selectedDate))}} // Go to month view of the currently displayed week's start
            title="切换到月视图"
          >
            {format(weekRange.start, 'M月d日')} - {format(weekRange.end, 'M月d日, yyyy年')}
          </h3>
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); setDisplayDate(addWeeks(displayDate, 1))}}><ChevronRight className="h-5 w-5" /></Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-7 gap-px bg-border border-t border-l"> {/* Grid for days */}
          {daysOfWeek.map(day => {
            const dailyEvents = getEventsForDay(day);
            const isCurrentDisplayDay = isSameDay(day, displayDate); // If this day was the one clicked to get to day view
            const isTodayDate = isSameDay(day, startOfDay(new Date()));
            return (
              <div key={day.toISOString()}
                   className={`calendar-widget__day-column ${isCurrentDisplayDay ? 'bg-accent/10': ''} ${isTodayDate ? 'border-primary border-2' : ''}`}
                   onClick={() => { setSelectedDate(day); setDisplayDate(day); setCurrentView('day');}} // Click day in week view to go to day view
                   role="button"
                   tabIndex={0}
                   onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDate(day); setDisplayDate(day); setCurrentView('day');}}}
                   aria-label={`查看 ${format(day, 'MMMM d, yyyy')} 的日程`}
              >
                <h4 className={`text-xs font-semibold mb-1 text-center ${isTodayDate ? 'text-primary font-bold' : 'text-foreground'}`}>
                  {format(day, 'EEE d')}
                </h4>
                {dailyEvents.length > 0 ? (
                  <ScrollArea className="h-[80px]"> {/* Fixed height for event snippets */}
                    <ul className="space-y-0.5 pr-1"> {/* Compact list for week view */}
                        {dailyEvents.map(event => renderEventItem(event, 'week-column'))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-muted-foreground italic h-full flex items-center justify-center opacity-50">无事件</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };


  return (
    <div className="page-section__widget">
      <article className="widget calendar-widget">
        <div className="widget__container">
          <header className="widget__header widget-header_hovered">
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
              {!isCollapsed && widget.data.icsUrl && ( // Show refresh only if not collapsed and URL exists
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
                     // Default new event to selectedDate or today, at a sensible time e.g., 9 AM
                     const newEventStart = selectedDate || startOfDay(new Date());
                     const newEvent: Omit<CalendarEvent, 'id'> = { // Omit 'id' as it will be generated
                       summary: "新事件",
                       startDate: setMinutes(setHours(newEventStart, 9),0), // Default to 9:00 AM
                       endDate: setMinutes(setHours(newEventStart, 10),0),   // Default to 10:00 AM
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
                        onSelect={(e) => e.preventDefault()} // Prevents DropdownMenu from closing
                        className="text-destructive focus:text-destructive-foreground hover:!text-destructive-foreground hover:!bg-destructive/90 focus:!bg-destructive/90"
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
                onClick={handleBodyClick} // Handles click on empty area to edit settings
                onKeyDown={handleBodyKeyDown} // Accessibility for the above
                role={!widget.data.icsUrl ? "button" : undefined} // Make it focusable if no URL
                tabIndex={!widget.data.icsUrl ? 0 : undefined}
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
                    {/* Toolbar for view switching and actions */}
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
                                        setDisplayDate(targetDay); // Set display date for day view
                                        if(!selectedDate) setSelectedDate(targetDay); // Ensure a date is selected
                                    } else if (view === 'week') {
                                        setDisplayDate(targetDay); // Set display date for week view (start of week)
                                    } else if (view === 'month') {
                                        setCurrentMonth(targetDay); // Set current month for month view
                                        if(!selectedDate) setSelectedDate(targetDay);
                                    }
                                    // List view doesn't need displayDate/currentMonth changes beyond selection
                                 }}
                                >
                                {view === 'day' ? '日' : view === 'week' ? '周' : view === 'month' ? '月' : '列表'}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                // Default new event to selectedDate or today, at a sensible time e.g., 9 AM
                                const newEventStart = selectedDate || startOfDay(new Date());
                                const newEvent: Omit<CalendarEvent, 'id'> = { // Omit 'id' as it will be generated
                                  summary: "新事件",
                                  startDate: setMinutes(setHours(newEventStart, 9),0), // Default to 9:00 AM
                                  endDate: setMinutes(setHours(newEventStart, 10),0),   // Default to 10:00 AM
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

                    {/* Render current view */}
                    {currentView === 'month' && (
                      <>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(day) => {
                            setSelectedDate(day);
                            if (day) {
                                setDisplayDate(startOfDay(day)); // Keep displayDate in sync for potential switch to day/week
                                setCurrentMonth(startOfDay(day)); // Update month if navigation occurs via day click
                            }
                          }}
                          month={currentMonth}
                          onMonthChange={(month) => {
                            // When month changes via arrows, update currentMonth and selectedDate to first of new month if desired
                            setCurrentMonth(month);
                            // Optionally, clear selectedDate or set to first of month:
                            // setSelectedDate(startOfMonth(month)); 
                          }}
                          className="rounded-md calendar-widget"
                          modifiers={{ eventDay: eventDays.map(d => startOfDay(d)) }} // Highlight days with events
                          modifiersClassNames={{ eventDay: 'bg-primary/20 rounded-full !text-primary-foreground dark:!text-primary' }}
                          footer={selectedDate && eventsForSelectedDay.length > 0 ? 
                            renderEventsList(eventsForSelectedDay, `${format(selectedDate, 'PPP')} 的事件`, `${format(selectedDate, 'PPP')} 无事件。`, 'day-detail') 
                            : selectedDate ? <p className="calendar-widget__no-events p-3 border-t">{`${format(selectedDate, 'PPP')} 无事件。`}</p> : null
                          }
                        />
                      </>
                    )}

                    {currentView === 'week' && renderWeekView()}
                    {currentView === 'day' && renderDayTimelineView()}

                    {currentView === 'list' && (
                        <div className="p-2"> {/* Padding for list view */}
                         {renderEventsList(eventsForListView, "未来30天事件", "暂无近期事件。", 'list')}
                        </div>
                    )}
                  </>
                )}
                {/* Prompt to set ICS URL if not already set */}
                {!widget.data.icsUrl && !isLoading && !error && (
                   <div
                    className="calendar-widget__empty-prompt"
                    // onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }} // Moved to handleBodyClick
                    // role="button" tabIndex={0} // Moved to widget__body
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
      {/* Event Detail Dialog - Rendered when editingEvent is set */}
      {editingEvent && (
        <EventDetailDialog
          isOpen={isEventDetailDialogOpen}
          onClose={handleCloseEventDetailDialog}
          event={editingEvent}
          onSubmit={handleSubmitEventDetail}
          widgetId={widget.id} // Pass widgetId if needed by dialog, though likely not for event details
          onDeleteEvent={handleDeleteEvent}
        />
      )}
    </div>
  );
}

