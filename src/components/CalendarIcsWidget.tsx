
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'; // For scrollable timeline

interface CalendarIcsWidgetProps {
  widget: CalendarIcsAppWidget;
  onOpenEditDialog: (widgetId: string) => void; // For editing ICS URL
  onOpenWidgetTitleDialog: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

const parseIcalTime = (icalTime: ICAL.Time, event: ICAL.Event): Date => {
  try {
    let jsDate = icalTime.toJSDate();
    if (icalTime.isDate) {
      // For all-day events, ICAL.js might return a date at UTC midnight.
      // We want it to be at local midnight for consistent startOfDay comparisons.
      // Create a new Date object using the year, month, and day from jsDate,
      // but in the local timezone.
      jsDate = new Date(jsDate.getUTCFullYear(), jsDate.getUTCMonth(), jsDate.getUTCDate());
      return startOfDay(jsDate);
    }
    // For timed events, ensure it's correctly interpreted in local time if it was UTC.
    // Most ICS files with time explicitly state timezone or assume UTC.
    // If it's already local (e.g. "TZID=America/New_York:20231026T100000"), toJSDate() handles it.
    // If it's UTC (e.g. "20231026T100000Z"), toJSDate() converts to local.
    // If it's floating (e.g. "20231026T100000"), it's more ambiguous.
    // We'll assume toJSDate() gives a reasonable local interpretation.
    return jsDate;
  } catch (e) {
    console.warn("Failed to parse date directly, attempting fallback for event:", event.summary, icalTime.toString(), e);
    const dateStringOnly = icalTime.toString().split('T')[0];
    const year = parseInt(dateStringOnly.substring(0, 4), 10);
    const month = parseInt(dateStringOnly.substring(4, 6), 10) - 1;
    const day = parseInt(dateStringOnly.substring(6, 8), 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return startOfDay(new Date(year, month, day));
    }
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
  const [displayDate, setDisplayDate] = useState<Date>(startOfDay(new Date()));

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
    fetch(`/api/ics-proxy?url=${encodeURIComponent(widget.data.icsUrl)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch ICS data (status: ${response.status})`);
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
            
            // For all-day events, endDate might be the start of the next day or same day if single all-day event.
            // ICAL.Event.endDate is exclusive for all-day events.
            // If it's an all-day event and start date equals end date from source,
            // it means it's a single all-day event. We should represent endDate as end of that day.
            // However, parseIcalTime already gives startOfDay.
            // So, for an all-day event "DTSTART;VALUE=DATE:20231026", "DTEND;VALUE=DATE:20231027",
            // it lasts the whole of 2023-10-26.
            // startDate will be 2023-10-26 00:00:00.
            // endDate from parseIcalTime(event.endDate) will be 2023-10-27 00:00:00.
            let endDate = parseIcalTime(event.endDate, event);

            if (event.startDate.isDate) { // All-day event
                 // If duration is 0 or negative (e.g. DTEND is same as DTSTART for an all-day event),
                 // make it last for the full day.
                 if (compareAsc(endDate, startDate) <= 0) {
                    endDate = startOfDay(addDays(startDate,1)); // Make it end at start of next day
                 }
            }
            
            return {
              id: event.uid || crypto.randomUUID(),
              summary: event.summary || 'No Title',
              startDate: startDate,
              endDate: endDate,
              isAllDay: event.startDate.isDate,
              description: event.description || undefined,
            };
          }).sort((a,b) => compareAsc(a.startDate, b.startDate));
          setEvents(parsedEvents);
        } catch (parseErr) {
          console.error("Error parsing ICS data:", parseErr);
          setError("Failed to parse calendar data. Ensure the ICS format is correct.");
          setEvents([]);
        }
      })
      .catch(err => {
        console.error("Error fetching or parsing ICS:", err);
        setError(err.message || "Failed to load calendar data. Check the URL and network.");
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
    const targetDayEnd = addDays(targetDayStart, 1); // Exclusive end for range check

    return events.filter(event => {
      const eventStart = event.startDate;
      const eventEnd = event.endDate; // This is exclusive end for all-day events

      if (event.isAllDay) {
        // All-day event "starts" on eventStart (e.g., YYYY-MM-DD 00:00:00)
        // and "ends" at eventEnd (e.g., YYYY-MM-DD+1 00:00:00 for a single day event)
        // So, it occurs on targetDayStart if targetDayStart is >= eventStart and < eventEnd
        return compareAsc(targetDayStart, eventStart) >= 0 && compareAsc(targetDayStart, eventEnd) < 0;
      } else {
        // Timed event, check if it overlaps with the target day.
        // An event overlaps if its start is before day's end AND its end is after day's start.
        return compareAsc(eventStart, targetDayEnd) < 0 && compareAsc(eventEnd, targetDayStart) > 0;
      }
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
    const start = startOfWeek(displayDate, { weekStartsOn: 1 }); // Assuming week starts on Monday
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
    if (e.target instanceof HTMLElement && (e.target.closest('button, a') || e.target.closest('.rdp-nav_button') || e.target.closest('.view-switcher') || e.target.closest('[role="button"]'))) {
      return;
    }
    e.stopPropagation();
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

  const handleOpenEventDetailDialog = (event: CalendarEvent | Omit<CalendarEvent, 'id'>) => {
    setEditingEvent(event as CalendarEvent);
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
            return [...prevEvents, updatedEventData].sort((a,b) => compareAsc(a.startDate, b.startDate));
        }
    });
    handleCloseEventDetailDialog();
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    if (editingEvent?.id === eventId) {
      handleCloseEventDetailDialog();
    }
  };

  const goToToday = () => {
    const todayAnchor = startOfDay(new Date());
    setSelectedDate(todayAnchor);
    setCurrentMonth(todayAnchor);
    setDisplayDate(todayAnchor);
    setCurrentView('day'); // Switch to day view to list today's events
  };

  const renderEventItem = (event: CalendarEvent, context?: 'week-column' | 'list' | 'day-detail' | 'day-timeline') => {
    let baseItemClasses = "calendar-widget__event-item group/event-item";
    let titleClasses = "truncate block";
    let timeClasses = "text-xs block";
    let actionButtonSizeClasses = "h-7 w-7 p-1";
    let actionIconSizeClasses = "h-4 w-4";

    if (context === 'week-column') {
        baseItemClasses = "calendar-widget__event-item group/event-item !p-1 !mb-0.5 text-xs";
        titleClasses = "truncate block font-semibold";
        timeClasses = "text-xs block";
        actionButtonSizeClasses = "h-6 w-6 p-0.5";
        actionIconSizeClasses = "h-3 w-3";
    } else if (context === 'day-timeline') {
        baseItemClasses = "calendar-widget__event-item group/event-item !p-1.5 text-xs"; 
        titleClasses = "truncate block font-semibold";
        timeClasses = "text-xs block";
        actionButtonSizeClasses = "h-5 w-5 p-0.5";
        actionIconSizeClasses = "h-3 w-3";
    }

    return (
    <li key={event.id} className={baseItemClasses}
        style={context === 'day-timeline' ? getTimelineEventStyle(event) : {}}
        onClick={(e) => { e.stopPropagation(); handleOpenEventDetailDialog(event); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpenEventDetailDialog(event); }}}
    >
      <div className="flex-grow overflow-hidden mr-1">
        <strong className={titleClasses} title={event.summary}>{event.summary}</strong>

        {context === 'list' && (
            <span className={timeClasses}>
                {format(event.startDate, 'PPP')}
                {!event.isAllDay && ` ${format(event.startDate, 'p')} - ${format(event.endDate, 'p')}`}
                {event.isAllDay && ` (All day)`}
            </span>
        )}
        {(context === 'day-detail' || context === 'day-timeline') && (
          <span className={timeClasses}>
            {!event.isAllDay ? `${format(event.startDate, 'HH:mm')} - ${format(event.endDate, 'HH:mm')}` : "(All day)"}
          </span>
        )}
         {context === 'week-column' && (
          <span className={timeClasses}>
            {!event.isAllDay ? `${format(event.startDate, 'p')}` : "(All day)"}
          </span>
        )}
      </div>
      <div className="calendar-widget__event-actions">
        <Button variant="ghost" size="icon" className={actionButtonSizeClasses} onClick={(e) => {e.stopPropagation(); handleOpenEventDetailDialog(event);}}>
          <FilePenLine className={actionIconSizeClasses} />
          <span className="sr-only">View/Edit Event</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className={`${actionButtonSizeClasses} hover:bg-destructive/10 hover:text-destructive`} onClick={(e) => e.stopPropagation()}>
              <Trash2 className={actionIconSizeClasses}/>
              <span className="sr-only">Delete Event</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the event "{event.summary}"? This action is local and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleDeleteEvent(event.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )};

  const renderEventsList = (eventsToRender: CalendarEvent[], title?: string, noEventsMessage?: string, context?: 'list' | 'day-detail') => (
    <div className="calendar-widget__event-list">
      {title && <h3 className="calendar-widget__event-list-title">{title}</h3>}
      {eventsToRender.length > 0 ? (
        <ul className="space-y-1">{eventsToRender.map(event => renderEventItem(event, context))}</ul>
      ) : (
        <p className="calendar-widget__no-events">{noEventsMessage || "No events."}</p>
      )}
    </div>
  );

  const hourSlotHeight = 60; // pixels per hour for timeline
  const getTimelineEventStyle = (event: CalendarEvent): React.CSSProperties => {
    if (event.isAllDay) return { position: 'relative' }; // All-day events handled separately or given basic style

    const startHour = getHours(event.startDate);
    const startMinute = getMinutes(event.startDate);

    let durationMinutes = differenceInMinutes(event.endDate, event.startDate);
    if (durationMinutes <=0) durationMinutes = 30; // Minimum 30 min height for very short events

    const top = (startHour + startMinute / 60) * hourSlotHeight;
    const height = (durationMinutes / 60) * hourSlotHeight;

    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${Math.max(height, 20)}px`, // Ensure a minimum visible height
      left: '0.25rem', // Small offset from time axis
      right: '0.25rem', // Small offset from edge
      zIndex: 10,
    };
  };

  const renderDayTimelineView = () => {
    const dayEvents = getEventsForDay(displayDate);
    const allDayEvents = dayEvents.filter(e => e.isAllDay);
    const timedEvents = dayEvents.filter(e => !e.isAllDay);
    const hours = Array.from({ length: 24 }, (_, i) => i); // 0 to 23

    return (
      <div className="p-2">
        <div className="flex justify-between items-center mb-2">
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); const newDay = subDays(displayDate,1); setDisplayDate(newDay); setSelectedDate(newDay);}}><ChevronLeft className="h-5 w-5" /></Button>
          <h3
            className="text-lg font-semibold text-center cursor-pointer hover:text-primary"
            onClick={() => {const newMonth = startOfDay(displayDate); setCurrentMonth(newMonth); setCurrentView('month'); setSelectedDate(displayDate);}}
            title={`Switch to month view for ${format(displayDate, 'MMMM yyyy')}`}
          >
            {format(displayDate, 'EEEE, MMM d, yyyy')}
          </h3>
          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); const newDay = addDays(displayDate,1); setDisplayDate(newDay); setSelectedDate(newDay);}}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {allDayEvents.length > 0 && (
          <div className="mb-3 border-b pb-2">
            <h4 className="text-sm font-semibold mb-1 text-foreground">All-day Events</h4>
            <ul className="space-y-1">
              {allDayEvents.map(event => renderEventItem(event, 'day-detail'))}
            </ul>
          </div>
        )}

        <ScrollArea className="h-[500px] w-full">
          <div className="calendar-widget__day-timeline-container"> {/* Relative container for timeline slots and events */}
            {/* Time Axis and Slots Background */}
            <div className="relative"> {/* This will contain both time axis and event column effectively */}
              {hours.map(hour => (
                <div key={`timeslot-${hour}`} className="calendar-widget__time-slot" style={{ height: `${hourSlotHeight}px` }}>
                  <div className="calendar-widget__time-axis">
                    {format(setHours(new Date(), hour), 'HH:mm')}
                  </div>
                  <div className="flex-grow"> {/* This part is the "slot" for events */}
                  </div>
                </div>
              ))}
               {/* Events Overlay positioned absolutely within this relative container */}
              <div className="calendar-widget__event-column">
                <ul className="relative h-full"> {/* Ensure this ul can contain positioned items */}
                  {timedEvents.map(event => renderEventItem(event, 'day-timeline'))}
                </ul>
              </div>
            </div>
          </div>
          <ScrollBar orientation="vertical" />
        </ScrollArea>

        {allDayEvents.length === 0 && timedEvents.length === 0 && (
            <p className="text-muted-foreground text-center py-10">No events for {format(displayDate, 'PPP')}.</p>
        )}
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
              {!isCollapsed && widget.data.icsUrl && (
                <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => {e.stopPropagation(); fetchAndParseIcs();}} title="Refresh Calendar Data">
                    <RotateCcw className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">Refresh Calendar</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="widget-header__control h-7 w-7" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="widget-header__feather-icon h-4 w-4" />
                    <span className="sr-only">More options for {widget.title}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onClick={() => onOpenWidgetTitleDialog(widget.id)}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>Edit Title</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onOpenEditDialog(widget.id)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    <span>Edit Calendar URL</span>
                  </DropdownMenuItem>
                   <DropdownMenuItem onClick={() => {
                     const newEventStart = selectedDate || startOfDay(new Date());
                     const newEvent: Omit<CalendarEvent, 'id'> = {
                       summary: "New Event",
                       startDate: setMinutes(setHours(newEventStart, 9),0), // Default to 9:00 AM
                       endDate: setMinutes(setHours(newEventStart, 10),0), // Default to 10:00 AM
                       isAllDay: false,
                       description: ""
                     };
                     handleOpenEventDetailDialog(newEvent);
                   }}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Add Event Manually</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        className="text-destructive focus:text-destructive-foreground hover:!text-destructive-foreground hover:!bg-destructive/90 focus:!bg-destructive/90"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete Calendar</span>
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the calendar "{widget.title}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteWidget(widget.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
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
                role={!widget.data.icsUrl ? "button" : undefined}
                tabIndex={!widget.data.icsUrl ? 0 : undefined}
              >
                {isLoading && <p className="p-4 text-center text-muted-foreground">Loading calendar...</p>}
                {error &&
                  <div className="p-4 text-center text-destructive flex flex-col items-center">
                    <AlertTriangle className="w-8 h-8 mb-2"/>
                    <p>{error}</p>
                    <Button variant="link" onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }} className="mt-2">
                      Edit Calendar URL
                    </Button>
                  </div>
                }
                {!isLoading && !error && widget.data.icsUrl && (
                  <>
                    <div className="calendar-widget__toolbar view-switcher">
                        <div className="flex items-center space-x-1">
                             <Button onClick={(e)=>{e.stopPropagation(); goToToday()}} variant="outline" size="sm">Today</Button>
                            {(['month', 'week', 'day', 'list'] as CalendarViewMode[]).map(view => (
                                <Button
                                key={view}
                                variant={currentView === view ? 'default' : 'outline'}
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentView(view);
                                    // If switching to day or week, ensure displayDate is sensible (e.g., selectedDate or today)
                                    if ((view === 'day' || view === 'week')) {
                                      setDisplayDate(selectedDate || startOfDay(new Date()));
                                    }
                                 }}
                                >
                                {view.charAt(0).toUpperCase() + view.slice(1)}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                const newEventStart = selectedDate || startOfDay(new Date());
                                const newEvent: Omit<CalendarEvent, 'id'> = {
                                    summary: "New Event",
                                    startDate: setMinutes(setHours(newEventStart, 9),0),
                                    endDate: setMinutes(setHours(newEventStart, 10),0),
                                    isAllDay: false,
                                    description: "",
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
                                setDisplayDate(startOfDay(day)); // Keep displayDate in sync for potential view switch
                            }
                          }}
                          month={currentMonth}
                          onMonthChange={setCurrentMonth}
                          className="rounded-md calendar-widget"
                          modifiers={{ eventDay: eventDays.map(d => startOfDay(d)) }} // Ensure unique days
                          modifiersClassNames={{ eventDay: 'bg-primary/20 rounded-full !text-primary-foreground' }}
                        />
                        {selectedDate && renderEventsList(eventsForSelectedDay, `Events for ${format(selectedDate, 'PPP')}`, `No events for ${format(selectedDate, 'PPP')}.`, 'day-detail')}
                      </>
                    )}

                    {currentView === 'week' && (
                        <div className="p-2">
                            <div className="flex justify-between items-center mb-2">
                            <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); setDisplayDate(subWeeks(displayDate, 1))}}><ChevronLeft className="h-5 w-5" /></Button>
                            <h3
                                className="text-base font-semibold cursor-pointer hover:text-primary"
                                onClick={() => {setCurrentView('month'); if(selectedDate) setCurrentMonth(startOfDay(selectedDate))}}
                                title="Switch to Month View"
                            >
                                {format(weekRange.start, 'MMM d')} - {format(weekRange.end, 'MMM d, yyyy')}
                            </h3>
                            <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); setDisplayDate(addWeeks(displayDate, 1))}}><ChevronRight className="h-5 w-5" /></Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-7 gap-px bg-border border-t border-l">
                            {eachDayOfInterval(weekRange).map(day => {
                                const dailyEvents = getEventsForDay(day);
                                const isCurrentDisplayDay = isSameDay(day, displayDate);
                                const isTodayDate = isSameDay(day, startOfDay(new Date()));
                                return (
                                <div key={day.toISOString()}
                                     className={`calendar-widget__day-column ${isCurrentDisplayDay ? 'bg-accent/10': ''} ${isTodayDate ? 'border-primary border-2' : ''}`}
                                     onClick={() => { setSelectedDate(day); setDisplayDate(day); setCurrentView('day');}}
                                     role="button"
                                     tabIndex={0}
                                     onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDate(day); setDisplayDate(day); setCurrentView('day');}}}
                                >
                                    <h4 className={`text-xs font-semibold mb-1 text-center ${isTodayDate ? 'text-primary font-bold' : 'text-foreground'}`}>
                                    {format(day, 'EEE d')}
                                    </h4>
                                    {dailyEvents.length > 0 ? (
                                      <ScrollArea className="h-[80px]">
                                        <ul className="space-y-0.5 pr-1">
                                            {dailyEvents.map(event => renderEventItem(event, 'week-column'))}
                                        </ul>
                                      </ScrollArea>
                                    ) : (
                                    <p className="text-xs text-muted-foreground italic h-full flex items-center justify-center opacity-50">No events</p>
                                    )}
                                </div>
                                );
                            })}
                            </div>
                        </div>
                    )}

                    {currentView === 'day' && renderDayTimelineView()}

                    {currentView === 'list' && (
                        <div className="p-2">
                         {renderEventsList(eventsForListView, "Upcoming Events", "No upcoming events.", 'list')}
                        </div>
                    )}
                  </>
                )}
                {!widget.data.icsUrl && !isLoading && !error && (
                   <div
                    className="calendar-widget__empty-prompt"
                  >
                    <CalendarIcon className="w-10 h-10 text-muted-foreground mb-3"/>
                    <p className="text-lg font-medium text-foreground mb-2">Calendar is Empty</p>
                    <p className="text-sm text-muted-foreground mb-4">To display events, please link an ICS Calendar URL.</p>
                    <Button onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }}>
                      <Link2 className="mr-2 h-4 w-4" /> Set ICS Calendar Link
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

