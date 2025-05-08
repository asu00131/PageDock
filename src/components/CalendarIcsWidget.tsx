
"use client";

import type { CalendarIcsAppWidget, CalendarEvent } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Edit3, MoreVertical, Trash2, ChevronDown, ChevronUp, AlertTriangle, Link2, FilePenLine } from 'lucide-react';
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
import { useEffect, useState, useMemo } from 'react';
import ICAL from 'ical.js';
import { format, isSameDay } from 'date-fns';
import { EventDetailDialog } from './EventDetailDialog'; // Import the new dialog

interface CalendarIcsWidgetProps {
  widget: CalendarIcsAppWidget;
  onOpenEditDialog: (widgetId: string) => void; // For editing ICS URL
  onOpenWidgetTitleDialog: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse: (widgetId: string) => void;
}

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

  useEffect(() => {
    if (widget.data.icsUrl && !isCollapsed) {
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
              return {
                id: event.uid || crypto.randomUUID(),
                summary: event.summary || 'No Title',
                startDate: event.startDate.toJSDate(),
                endDate: event.endDate.toJSDate(),
                isAllDay: event.startDate.isDate,
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
    } else if (!widget.data.icsUrl) {
      setEvents([]);
      setError(null);
      setIsLoading(false);
    }
  }, [widget.data.icsUrl, isCollapsed]);

  const eventDays = useMemo(() => events.map(event => event.startDate), [events]);

  const eventsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return events.filter(event => isSameDay(event.startDate, selectedDate) || (event.startDate < selectedDate && event.endDate > selectedDate))
                 .sort((a,b) => a.startDate.getTime() - b.startDate.getTime());
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
    setEditingEvent(undefined); // Clear editing event
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
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      month={currentMonth}
                      onMonthChange={setCurrentMonth}
                      className="rounded-md calendar-widget" 
                      modifiers={{ eventDay: eventDays }}
                      modifiersClassNames={{ eventDay: 'bg-primary/20 rounded-full !text-primary-foreground' }} // Ensure text is visible on event days
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
          widgetId={widget.id} // Pass widgetId if needed by dialog logic, though not strictly for local event state
        />
      )}
    </div>
  );
}
