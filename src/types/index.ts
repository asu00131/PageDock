
export interface LinkItem {
  id: string;
  url: string;
  title: string;
}

// Data specific to a Link Collection widget
export interface LinkCollectionWidgetData {
  links: LinkItem[];
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

export type WidgetType = 'linkCollection' | 'note' | 'todoList'; // Future: | 'rss' | 'embed';

// Base structure for all widgets
interface BaseWidget {
  id: string;
  type: WidgetType;
  title: string; // Title displayed in the widget header
  isCollapsed?: boolean; // Added for collapse/expand functionality
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

// Union type for all possible widgets
export type AppWidget = LinkCollectionAppWidget | NoteAppWidget | TodoListAppWidget;

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
