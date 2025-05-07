
export interface LinkItem {
  id: string;
  url: string;
  title: string;
}

// Data specific to a Link Collection widget
export interface LinkCollectionWidgetData {
  links: LinkItem[];
  // The 'id' and 'title' for the collection are now part of BaseWidget
}

// Data specific to a Note widget
export interface NoteWidgetData {
  content: string;
}

export type WidgetType = 'linkCollection' | 'note'; // Future: | 'rss' | 'todo' | 'embed';

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

// Union type for all possible widgets
export type AppWidget = LinkCollectionAppWidget | NoteAppWidget;

// Type guard for LinkCollectionAppWidget
export function isLinkCollectionWidget(widget: AppWidget): widget is LinkCollectionAppWidget {
  return widget.type === 'linkCollection';
}

// Type guard for NoteAppWidget
export function isNoteWidget(widget: AppWidget): widget is NoteAppWidget {
  return widget.type === 'note';
}
