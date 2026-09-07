export type TaskList = {
  id: string;
  name: string;
};

export type RecurrenceType =
  | "daily"
  | "weekdays"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom"
  | null;

export type RecurrenceUnit = "day" | "week" | "month" | "year";
export type RecurrenceStop = "never" | "date" | "occurrences";

export type RecurrenceRule = {
  interval: number;
  unit: RecurrenceUnit;
  weekdays: number[];
  stop: RecurrenceStop;
  endDate: string | null;
  occurrences: number | null;
};

export type Priority = "low" | "medium" | "high";

export type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  endDate: string | null;
  description?: string;
  priority?: Priority;
  recurrence: RecurrenceType;
  recurrenceRule?: RecurrenceRule;
  listId: string;
  createdAt: string;
};

export type CalendarColor =
  | "blue"
  | "green"
  | "red"
  | "orange"
  | "purple"
  | "teal";

export type UserCalendar = {
  id: string;
  name: string;
  color: CalendarColor;
};

export type UserEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  description?: string;
  location?: string;
  calendarId: string;
};

export type CalendarItem =
  | { kind: "task"; task: Task }
  | { kind: "event"; event: UserEvent };
