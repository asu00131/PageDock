
"use client";

import type { CalendarIcsAppWidget, CalendarEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Edit3, MoreVertical, Trash2, ChevronDown, ChevronUp, AlertTriangle, Link2, FilePenLine, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { format, isSameDay, startOfDay, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isWithinInterval, compareAsc } from 'date-fns';
import { EventDetailDialog } from './EventDetailDialog'; 

interface CalendarIcsWidgetProps {
  widget: CalendarIcsAppWidget;
  onOpenEditDialog: (widgetId: string) => void; // For editing ICS URL
  onOpenWidgetTitleDialog: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

// Helper to safely parse date from ICAL.Time
const parseIcalTime = (icalTime: ICAL.Time, event: ICAL.Event): Date => {
  try {
    if (icalTime.isDate) { // For all-day events, startDate might not have time components
      return startOfDay(icalTime.toJSDate());
    }
    return icalTime.toJSDate();
  } catch (e) {
    console.warn("Failed to parse date directly, attempting fallback for event:", event.summary, icalTime.toString(), e);
    const dateString = icalTime.toString().split('T')[0]; 
    return startOfDay(new Date(dateString)); 
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
  const [currentMonth, setCurrentMonth] = useState(startOfDay(new Date())); // For month view navigation

  const [currentView, setCurrentView] = useState<CalendarViewMode>('month');
  const [displayDate, setDisplayDate] = useState<Date>(startOfDay(new Date())); // Anchor for week/day view navigation

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
              isAllDay: event.startDate.isDate, 
              description: event.description || undefined,
            };
          }).sort((a,b) => compareAsc(a.startDate, b.startDate)); // Sort events by start date
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
  }, [widget.data.icsUrl, isCollapsed, fetchAndParseIcs]);

  const eventDays = useMemo(() => events.map(event => event.startDate), [events]);
  
  const getEventsForDay = useCallback((day: Date | undefined): CalendarEvent[] => {
    if (!day) return [];
    return events.filter(event => {
        const targetDayStart = startOfDay(day);
        const eventStartDay = startOfDay(event.startDate);

        if (event.isAllDay) {
            // For all-day events, check if 'day' is within the event's date range.
            // ICAL all-day events usually have endDate as the start of the next day.
            // So, event is on 'day' if event.startDate <= day < event.endDate
            return compareAsc(eventStartDay, targetDayStart) <= 0 && compareAsc(targetDayStart, event.endDate) < 0;
        } else {
            // For timed events, it's simpler: just check if it starts on that day.
            return isSameDay(eventStartDay, targetDayStart);
        }
    }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events]);


  const eventsForSelectedDay = useMemo(() => {
    return getEventsForDay(selectedDate);
  }, [selectedDate, getEventsForDay]);

  const weekRange = useMemo(() => {
    const start = startOfWeek(displayDate, { weekStartsOn: 1 }); // Monday as start of week
    const end = endOfWeek(displayDate, { weekStartsOn: 1 });
    return { start, end };
  }, [displayDate]);

  const eventsForCurrentWeek = useMemo(() => {
    return events.filter(event => {
      const eventStart = event.startDate;
      // Check if event occurs at any point within the weekRange
      return isWithinInterval(eventStart, weekRange) || 
             (event.endDate && isWithinInterval(event.endDate, weekRange)) ||
             (eventStart < weekRange.start && event.endDate > weekRange.end); // Event spans the whole week
    }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events, weekRange]);

  const eventsForListView = useMemo(() => {
    const today = startOfDay(new Date());
    const thirtyDaysLater = endOfWeek(addDays(today, 30)); // Show events for roughly the next month
    return events.filter(event => 
      isWithinInterval(event.startDate, { start: today, end: thirtyDaysLater }) ||
      (event.endDate && isWithinInterval(event.endDate, { start: today, end: thirtyDaysLater })) ||
      (event.startDate < today && event.endDate > thirtyDaysLater)
    ).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  }, [events]);


  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && (e.target.closest('button, a') || e.target.closest('.rdp-nav_button') || e.target.closest('.view-switcher'))) {
      return; 
    }
    e.stopPropagation();
    if (!widget.data.icsUrl) {
        onOpenEditDialog(widget.id);
    }
  };
  
  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
       if (e.target instanceof HTMLElement && (e.target.closest('button, a') || e.target.closest('.rdp-nav_button') || e.target.closest('.view-switcher'))) {
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
    setEvents(prevEvents =>
      prevEvents.map(event =>
        event.id === updatedEventData.id ? { ...event, ...updatedEventData } : event
      )
    );
    handleCloseEventDetailDialog();
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  };
  
  const goToToday = () => {
    const today = startOfDay(new Date());
    setSelectedDate(today);
    setCurrentMonth(today);
    setDisplayDate(today); // Also reset displayDate for week/day views
  };

  const renderEventItem = (event: CalendarEvent, context?: 'week' | 'list') => (
    <li key={event.id} className="calendar-widget__event-item group/event-item">
      <div className="flex-grow overflow-hidden">
        <strong className="truncate block" title={event.summary}>{event.summary}</strong>
        {context === 'week' && (
            <span className="text-xs block">
                {format(event.startDate, 'EEE, MMM d')}
                {!event.isAllDay && ` ${format(event.startDate, 'p')}`}
            </span>
        )}
        {context === 'list' && (
            <span className="text-xs block">
                {format(event.startDate, 'PPP')}
                {!event.isAllDay && ` ${format(event.startDate, 'p')} - ${format(event.endDate, 'p')}`}
            </span>
        )}
        {context !== 'week' && context !== 'list' && !event.isAllDay && (
          <span className="ml-1 text-xs">
            ({format(event.startDate, 'p')} - {format(event.endDate, 'p')})
          </span>
        )}
        {context !== 'week' && context !== 'list' && event.isAllDay && <span className="ml-1 text-xs italic">(All day)</span>}
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
  );

  const renderEventsList = (eventsToRender: CalendarEvent[], title?: string, noEventsMessage?: string, context?: 'week' | 'list') => (
    <div className="calendar-widget__event-list">
      {title && <h3 className="calendar-widget__event-list-title">{title}</h3>}
      {eventsToRender.length > 0 ? (
        <ul>{eventsToRender.map(event => renderEventItem(event, context))}</ul>
      ) : (
        <p className="calendar-widget__no-events">{noEventsMessage || "No events."}</p>
      )}
    </div>
  );


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
                        <div className="flex space-x-1">
                            {(['month', 'week', 'day', 'list'] as CalendarViewMode[]).map(view => (
                                <Button
                                key={view}
                                variant={currentView === view ? 'default' : 'outline'}
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); setCurrentView(view); }}
                                >
                                {view.charAt(0).toUpperCase() + view.slice(1)}
                                </Button>
                            ))}
                        </div>
                        <Button onClick={(e)=>{e.stopPropagation(); goToToday()}} variant="outline" size="sm">Today</Button>
                    </div>

                    {currentView === 'month' && (
                      <>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(day) => { setSelectedDate(day); if (day) setDisplayDate(day);}}
                          month={currentMonth}
                          onMonthChange={setCurrentMonth}
                          className="rounded-md calendar-widget" 
                          modifiers={{ eventDay: eventDays }}
                          modifiersClassNames={{ eventDay: 'bg-primary/20 rounded-full !text-primary-foreground' }} 
                        />
                        {selectedDate && renderEventsList(eventsForSelectedDay, `Events for ${format(selectedDate, 'PPP')}`, `No events for ${format(selectedDate, 'PPP')}.`)}
                      </>
                    )}

                    {currentView === 'week' && (
                      <div className="p-2">
                        <div className="flex justify-between items-center mb-2">
                          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); setDisplayDate(subWeeks(displayDate, 1))}}><ChevronLeft className="h-5 w-5" /></Button>
                          <h3 className="text-base font-semibold">{format(weekRange.start, 'MMM d')} - {format(weekRange.end, 'MMM d, yyyy')}</h3>
                          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); setDisplayDate(addWeeks(displayDate, 1))}}><ChevronRight className="h-5 w-5" /></Button>
                        </div>
                        {renderEventsList(eventsForCurrentWeek, undefined, "No events this week.", 'week')}
                      </div>
                    )}

                    {currentView === 'day' && (
                       <div className="p-2">
                        <div className="flex justify-between items-center mb-2">
                          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); const newDay = subDays(displayDate,1); setDisplayDate(newDay); setSelectedDate(newDay);}}><ChevronLeft className="h-5 w-5" /></Button>
                          <Button variant="outline" size="sm" onClick={() => {const newMonth = startOfDay(displayDate); setCurrentMonth(newMonth)}}>
                            {format(displayDate, 'PPP')}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e)=>{e.stopPropagation(); const newDay = addDays(displayDate,1); setDisplayDate(newDay); setSelectedDate(newDay);}}><ChevronRight className="h-5 w-5" /></Button>
                        </div>
                         <Calendar
                            mode="single"
                            selected={displayDate}
                            onSelect={(day) => { if(day) {setDisplayDate(day); setSelectedDate(day); setCurrentMonth(startOfDay(day))}}}
                            month={currentMonth} // Use currentMonth which can be controlled for day view too
                            onMonthChange={setCurrentMonth} // Allow month navigation within day view's calendar
                            className="rounded-md calendar-widget my-2"
                            modifiers={{ eventDay: eventDays }}
                            modifiersClassNames={{ eventDay: 'bg-primary/20 rounded-full !text-primary-foreground' }}
                        />
                        {renderEventsList(getEventsForDay(displayDate), undefined, `No events for ${format(displayDate, 'PPP')}.`)}
                      </div>
                    )}
                    
                    {currentView === 'list' && (
                        <div className="p-2">
                         {renderEventsList(eventsForListView, "Upcoming Events (Next 30 days)", "No upcoming events in the next 30 days.", 'list')}
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

