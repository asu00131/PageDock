
"use client";

import type { CalendarIcsAppWidget } from '@/types';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Edit3, MoreVertical, Trash2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
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
import { Calendar } from "@/components/ui/calendar"; // Using ShadCN Calendar
import { useEffect, useState } from 'react';
// We would need a library to parse ICS data. For simplicity, this is a placeholder.
// In a real app, you'd use something like 'ical.js' or 'node-ical'.
// For now, we'll just show the calendar component without actual events.

interface CalendarIcsWidgetProps {
  widget: CalendarIcsAppWidget;
  onOpenEditDialog: (widgetId: string) => void;
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
  // Placeholder for events - in a real app, this would be populated from the ICS URL
  const [events, setEvents] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (widget.data.icsUrl && !isCollapsed) {
      // Placeholder: Fetch and parse ICS data
      // This is where you would integrate an ICS parsing library
      // For example:
      // setIsLoading(true);
      // fetch(widget.data.icsUrl)
      //   .then(response => response.text())
      //   .then(icsData => {
      //     const jcalData = ICAL.parse(icsData);
      //     const comp = new ICAL.Component(jcalData);
      //     const vevents = comp.getAllSubcomponents('vevent');
      //     // Process vevents into a usable format
      //     setEvents(processedEvents);
      //     setError(null);
      //   })
      //   .catch(err => {
      //     console.error("Error fetching or parsing ICS:", err);
      //     setError("Failed to load calendar data.");
      //     setEvents([]);
      //   })
      //   .finally(() => setIsLoading(false));
      console.log(`Would fetch and parse ICS from: ${widget.data.icsUrl}`);
    }
  }, [widget.data.icsUrl, isCollapsed]);


  const handleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && e.target.closest('button, a')) {
      return; // Allow interactions within the calendar
    }
    e.stopPropagation();
    if (!widget.data.icsUrl) {
        onOpenEditDialog(widget.id);
    }
  };
  
  const handleBodyKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
       if (e.target instanceof HTMLElement && e.target.closest('button, a') && e.key === 'Enter') {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (!widget.data.icsUrl) {
        onOpenEditDialog(widget.id);
      }
    }
  };


  return (
    <div className="page-section__widget">
      <article className="widget"> {/* Using default widget styling */}
        <div className="widget__container">
          <header className="widget__header widget-header_hovered">
            <div
              className="flex items-center flex-grow cursor-pointer mr-2"
              onClick={() => onToggleCollapse(widget.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleCollapse(widget.id); } }}
              aria-expanded={!isCollapsed}
              aria-controls={`widget-body-${widget.id}`}
            >
              <CalendarIcon className="widget-header__feather-icon h-5 w-5 mr-2" />
              <span className="widget-header__text text-lg font-semibold">{widget.title}</span>
              {isCollapsed ? <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" /> : <ChevronUp className="h-4 w-4 text-muted-foreground ml-2" />}
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
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>Edit Calendar URL</span>
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={(e) => e.stopPropagation()}
                        className="text-destructive hover:!bg-destructive/10 focus:!bg-destructive/10"
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
                className="widget__body p-0 md:p-1" // Less padding for calendar
                onClick={handleBodyClick}
                onKeyDown={handleBodyKeyDown}
                role={!widget.data.icsUrl ? "button" : undefined}
                tabIndex={!widget.data.icsUrl ? 0 : undefined}
              >
                {isLoading && <p className="p-4 text-center">Loading calendar...</p>}
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
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md" // Adjust styling as needed
                    // Modifiers can be used to highlight days with events
                    // modifiers={{ events: events.map(event => event.date) }}
                    // modifiersClassNames={{ events: 'bg-primary/20 rounded-full' }}
                  />
                  // Potentially list events for the selected day here
                )}
                {!widget.data.icsUrl && !isLoading && !error && (
                   <div 
                    className="note-widget__empty-prompt min-h-[150px] flex flex-col justify-center items-center" // Reuse note styles
                    onClick={(e) => { e.stopPropagation(); onOpenEditDialog(widget.id); }}
                  >
                    <CalendarIcon className="w-10 h-10 text-muted-foreground mb-2"/>
                    <p>设置ICS日历链接</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
