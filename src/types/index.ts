
export interface LinkItem {
  id: string;
  url: string;
  title: string;
}

// Data specific to a Note widget
export interface NoteWidgetData {
  content: string;
}

// Data specific to a Todo List widget
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TodoListWidgetData {
  items: TodoItem[];
  showCompleted: boolean;
}

// Data specific to a Calendar ICS widget
export interface CalendarIcsWidgetData {
  icsUrl: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  description?: string;
}

// Display settings for Link Collection widget
export type LinkCollectionDisplayMode = 'list' | 'detailedList' | 'icons' | 'cloud';
export type LinkCollectionIconSize = 'small' | 'medium' | 'large';

export interface LinkCollectionDisplaySettings {
  displayMode: LinkCollectionDisplayMode;
  iconSize: LinkCollectionIconSize;
  visibleLinksCount: number; // 0 for all, -1 for none, positive number for specific count
  titleLines: number; // 0 for hide, -1 for full, 1 for 1 line, 2 for 2 lines
}

// Data specific to a Link Collection widget
export interface LinkCollectionWidgetData {
  links: LinkItem[];
  displaySettings: LinkCollectionDisplaySettings;
}


export type WidgetType = 'linkCollection' | 'note' | 'todoList' | 'calendarIcs';

// Base structure for all widgets
interface BaseWidget {
  id: string;
  type: WidgetType;
  title: string; 
  isCollapsed?: boolean;
}

// Specific widget types
export interface LinkCollectionAppWidget extends BaseWidget {
  type: 'linkCollection';
  data: LinkCollectionWidgetData;
}

export interface NoteAppWidget extends BaseWidget {
  type: 'note';
  data: NoteWidgetData;
}

export interface TodoListAppWidget extends BaseWidget {
  type: 'todoList';
  data: TodoListWidgetData;
}

export interface CalendarIcsAppWidget extends BaseWidget {
  type: 'calendarIcs';
  data: CalendarIcsWidgetData;
}

// Union type for all possible widgets
export type AppWidget = LinkCollectionAppWidget | NoteAppWidget | TodoListAppWidget | CalendarIcsAppWidget;

// Type guard for LinkCollectionAppWidget
export function isLinkCollectionWidget(widget: AppWidget): widget is LinkCollectionAppWidget {
  return widget.type === 'linkCollection';
}

// Type guard for NoteAppWidget
export function isNoteWidget(widget: AppWidget): widget is NoteAppWidget {
  return widget.type === 'note';
}

// Type guard for TodoListAppWidget
export function isTodoListWidget(widget: AppWidget): widget is TodoListAppWidget {
  return widget.type === 'todoList';
}

// Type guard for CalendarIcsAppWidget
export function isCalendarIcsWidget(widget: AppWidget): widget is CalendarIcsAppWidget {
  return widget.type === 'calendarIcs';
}
