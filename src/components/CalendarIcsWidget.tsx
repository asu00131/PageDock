
"use client";

import type { CalendarIcsAppWidget, CalendarEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Edit3, MoreVertical, Trash2, ChevronDown, ChevronUp, AlertTriangle, Link2, FilePenLine, RotateCcw } from 'lucide-react';
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
import { format, isSameDay, startOfDay } from 'date-fns';
import { EventDetailDialog } from './EventDetailDialog'; 

interface CalendarIcsWidgetProps {
  widget: CalendarIcsAppWidget;
  onOpenEditDialog: (widgetId: string) => void; // For editing ICS URL
  onOpenWidgetTitleDialog: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

// Helper to safely parse date from ICAL.Time
const parseIcalTime = (icalTime: ICAL.Time, event: ICAL.Event): Date => {
  try {
    if (icalTime.isDate) { // For all-day events, startDate might not have time components
      return startOfDay(icalTime.toJSDate());
    }
    return icalTime.toJSDate();
  } catch (e) {
    console.warn("Failed to parse date directly, attempting fallback for event:", event.summary, icalTime.toString(), e);
    // Fallback for potentially problematic dates, e.g. only date without time but not marked as .isDate
    // This is a common issue with some ICS generators.
    const dateString = icalTime.toString().split('T')[0]; // Get YYYY-MM-DD part
    return startOfDay(new Date(dateString)); // Assume start of day UTC, will be localized by browser later
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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

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
            const endDate = parseIcalTime(event.endDate, event);
            
            return {
              id: event.uid || crypto.randomUUID(),
              summary: event.summary || 'No Title',
              startDate: startDate,
              endDate: endDate,
              isAllDay: event.startDate.isDate, // Rely on ICAL.Time's isDate property
              description: event.description || undefined,
            };
          });
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widget.data.icsUrl]); 
  
  useEffect(() => {
    if (!isCollapsed) {
      fetchAndParseIcs();
    }
  }, [widget.data.icsUrl, isCollapsed, fetchAndParseIcs]);

  const eventDays = useMemo(() => events.map(event => event.startDate), [events]);

  const eventsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => {
      const selectedDayStart = startOfDay(selectedDate);
      const eventStartDay = startOfDay(event.startDate);
      const eventEndDay = startOfDay(event.endDate);

      if (event.isAllDay) {
        // For all-day events, check if selectedDate is within event's date range (inclusive start, exclusive end for typical ICAL)
        // However, for display, if it spans multiple days, we consider it active on its end day too IF it's not just a time on that day.
        // Simplified: if start day is on or before selected, and end day is on or after selected.
        // For an all-day event ending on date D, it's usually exclusive of D for time, but inclusive for the date itself.
        // Example: All day event from May 8 to May 8 means it's active on May 8.
        // All day event from May 8 to May 9 means it's active on May 8, not May 9 typically.
        // Let's adjust for display: if end date is also considered.
        // If event.endDate is the very start of the next day for an all-day event, then it means it occurs on event.startDate
        // A common pattern for all-day events is startDate=YYYY-MM-DD, endDate=YYYY-MM-D(D+1)
        // Let's consider an event active if selectedDate is between event.startDate (inclusive) and event.endDate (exclusive for timed, inclusive for all-day)
        if (isSameDay(eventStartDay, selectedDayStart)) return true; // Starts today
        if (eventStartDay < selectedDayStart && eventEndDay >= selectedDayStart ) { // Spans across today
             // If event.endDate is exactly at midnight, it means the event concluded before this day started.
             // But for all-day events, if endDate is YYYY-MM-DD, it includes that day.
             // If endDate is YYYY-MM-(DD+1)T00:00:00, it means it lasts through DD.
            if(event.endDate.getHours() === 0 && event.endDate.getMinutes() === 0 && event.endDate.getSeconds() === 0 && !isSameDay(eventEndDay,selectedDayStart) ){
                return false; // Ends exactly at midnight of selected day, so not "on" selected day.
            }
            return true;
        }
        return false;

      } else { // For timed events
        return isSameDay(eventStartDay, selectedDayStart);
      }
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events, selectedDate]);

  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && (e.target.closest('button, a') || e.target.closest('.rdp-nav_button'))) {
      return; 
    }
    e.stopPropagation();
    if (!widget.data.icsUrl) {
        onOpenEditDialog(widget.id);
    }
  };
  
  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
       if (e.target instanceof HTMLElement && (e.target.closest('button, a') || e.target.closest('.rdp-nav_button'))) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (!widget.data.icsUrl) {
        onOpenEditDialog(widget.id);
      }
    }
  };

  const handleOpenEventDetailDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEventDetailDialogOpen(true);
  };

  const handleCloseEventDetailDialog = () => {
    setIsEventDetailDialogOpen(false);
    setEditingEvent(undefined); 
  };

  const handleSubmitEventDetail = (updatedEventData: Partial<CalendarEvent> & { id: string }) => {
    // For now, event editing is local and doesn't persist to an ICS file.
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === updatedEventData.id ? { ...event, ...updatedEventData } : event
      )
    );
    handleCloseEventDetailDialog();
  };

  const handleDeleteEvent = (eventId: string) => {
    // Local deletion
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  };
  
  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    setCurrentMonth(today);
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
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenWidgetTitleDialog(widget.id); }}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    <span>Edit Title</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }}>
                    <Link2 className="mr-2 h-4 w-4" />
                    <span>Edit Calendar URL</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={(e) => e.stopPropagation()}
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
                    <div className="calendar-widget__toolbar">
                      <Button onClick={goToToday} variant="outline" size="sm">Today</Button>
                    </div>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      month={currentMonth}
                      onMonthChange={setCurrentMonth}
                      className="rounded-md calendar-widget" 
                      modifiers={{ eventDay: eventDays }}
                      modifiersClassNames={{ eventDay: 'bg-primary/20 rounded-full !text-primary-foreground' }} 
                    />
                    {selectedDate && eventsForSelectedDay.length > 0 && (
                      <div className="calendar-widget__event-list">
                        <h3 className="calendar-widget__event-list-title">Events for {format(selectedDate, 'PPP')}:</h3>
                        <ul>
                          {eventsForSelectedDay.map(event => (
                            <li key={event.id} className="calendar-widget__event-item group/event-item">
                              <div className="flex-grow">
                                <strong>{event.summary}</strong>
                                {!event.isAllDay && (
                                  <span className="ml-2 text-xs">
                                    ({format(event.startDate, 'p')} - {format(event.endDate, 'p')})
                                  </span>
                                )}
                                {event.isAllDay && <span className="ml-2 text-xs italic">(All day)</span>}
                              </div>
                              <div className="calendar-widget__event-actions">
                                <Button variant="ghost" size="icon" className="h-7 w-7 p-1" onClick={(e) => {e.stopPropagation(); handleOpenEventDetailDialog(event);}}>
                                  <FilePenLine className="h-4 w-4" />
                                  <span className="sr-only">View/Edit Event</span>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 p-1 hover:bg-destructive/10 hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                                      <Trash2 className="h-4 w-4" />
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
                          ))}
                        </ul>
                      </div>
                    )}
                     {selectedDate && eventsForSelectedDay.length === 0 && (
                       <div className="calendar-widget__event-list">
                         <p className="calendar-widget__no-events">No events for {format(selectedDate, 'PPP')}.</p>
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
        />
      )}
    </div>
  );
}
