import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ListTodo,
  Plus,
  CalendarDays,
  MapPin,
  AlignLeft,
  Clock,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import type { UserEvent, UserCalendar, Task } from "../types";
import { CalendarDateTimePicker, OptionMenu } from "./PickerControls";

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 56;
const START_HOUR = 7;
const END_HOUR = 22;
const HOURS = Array.from(
  { length: END_HOUR - START_HOUR },
  (_, i) => START_HOUR + i,
);

// ─── Types ────────────────────────────────────────────────────────────────────

type View = "day" | "week" | "month" | "year" | "agenda";

type Props = {
  events: UserEvent[];
  setEvents: React.Dispatch<React.SetStateAction<UserEvent[]>>;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  calendars: UserCalendar[];
  visibleCalendarIds: string[];
  createEventRequest?: number;
  onToggleTasks?: () => void;
  isTasksOpen?: boolean;
  selectedDate?: Date;
  onOpenIcsImport: (files?: File[]) => void;
};

type PopupData = {
  startDate: string;
  endDate: string;
  x?: number;
  y?: number;
};

type CreateButtonProps = {
  onCreateEvent: () => void;
  mobile?: boolean;
};

function CreateButton({ onCreateEvent, mobile = false }: CreateButtonProps) {
  return (
    <button
      type="button"
      aria-label={mobile ? "Create event" : undefined}
      onClick={onCreateEvent}
      className={
        mobile
          ? "fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-2xl active:scale-95 md:hidden"
          : "hidden h-9 items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 text-xs font-extrabold text-slate-700 transition-all hover:bg-slate-200 hover:text-slate-900 md:flex"
      }
    >
      <Plus size={mobile ? 25 : 15} strokeWidth={2.75} />
      {!mobile && "Create"}
    </button>
  );
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const COLOR_EVENT: Record<string, string> = {
  blue: "bg-blue-50 border-blue-500 text-blue-800 hover:bg-blue-100/70",
  green:
    "bg-emerald-50 border-emerald-500 text-emerald-800 hover:bg-emerald-100/70",
  red: "bg-rose-50 border-rose-500 text-rose-800 hover:bg-rose-100/70",
  orange: "bg-amber-50 border-amber-500 text-amber-800 hover:bg-amber-100/70",
  purple:
    "bg-violet-50 border-violet-500 text-violet-800 hover:bg-violet-100/70",
  teal: "bg-cyan-50 border-cyan-500 text-cyan-800 hover:bg-cyan-100/70",
};

const COLOR_SURFACE: Record<string, string> = {
  blue: "bg-blue-600",
  green: "bg-emerald-600",
  red: "bg-rose-600",
  orange: "bg-orange-600",
  purple: "bg-violet-600",
  teal: "bg-cyan-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(date: Date): Date[] {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    return dd;
  });
}

function getThreeDays(date: Date): Date[] {
  return Array.from({ length: 3 }, (_, index) => {
    const day = new Date(date);
    day.setDate(day.getDate() + index);
    return day;
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHour(h: number) {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function toDateTimeLocal(date: Date, hour: number): string {
  const d = new Date(date);
  d.setHours(Math.floor(hour), hour % 1 >= 0.5 ? 30 : 0, 0, 0);
  // format as "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getMonthDays(year: number, month: number): Date[] {
  const date = new Date(year, month, 1);
  const days: Date[] = [];
  // Get days from previous month to fill the first week
  const firstDayOfWeek = (date.getDay() + 6) % 7;
  const prevMonth = new Date(year, month, 0);
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month - 1, prevMonth.getDate() - i));
  }
  // Current month days
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  // Next month days to fill the last week
  const lastDay = days[days.length - 1];
  const lastDayOfWeek = (lastDay.getDay() + 6) % 7;
  for (let i = 1; i < 7 - lastDayOfWeek; i++) {
    days.push(new Date(year, month + 1, i));
  }
  return days;
}

// ─── Event Popup ──────────────────────────────────────────────────────────────

type EventPopupProps = {
  data: PopupData;
  calendars: UserCalendar[];
  event?: UserEvent;
  onSave: (event: UserEvent) => void;
  onClose: () => void;
};

function getSafePopupPosition(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  return {
    top: Math.max(16, Math.min(y, window.innerHeight - height - 16)),
    left: Math.max(16, Math.min(x, window.innerWidth - width - 16)),
  };
}

function EventPopup({
  data,
  calendars,
  event,
  onSave,
  onClose,
}: EventPopupProps) {
  const [title, setTitle] = useState(event?.title ?? "");
  const [calendarId, setCalendarId] = useState(
    event?.calendarId ?? calendars[0]?.id ?? "",
  );
  const [startDate, setStartDate] = useState(
    event?.startDate ?? data.startDate,
  );
  const [endDate, setEndDate] = useState(event?.endDate ?? data.endDate);
  const [location, setLocation] = useState(event?.location ?? "");
  const [description, setDescription] = useState(event?.description ?? "");

  function handleSave() {
    if (!title.trim()) return;
    onSave({
      id: event?.id ?? crypto.randomUUID(),
      title: title.trim(),
      startDate,
      endDate,
      allDay: false,
      calendarId,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
    });
  }

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-xs"
        onClick={onClose}
      />

      <div
        className="fixed z-50 bg-white border border-slate-200 rounded-3xl shadow-xl p-5 w-[min(20rem,calc(100vw-2rem))] animate-in fade-in zoom-in-95 duration-100"
        style={getSafePopupPosition(data.x ?? 120, data.y ?? 96, 320, 430)}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Plus size={12} strokeWidth={3} className="text-blue-600" />{" "}
            {event ? "Event details" : "New event"}
          </span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all"
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        <input
          autoFocus
          placeholder="Event title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onClose();
          }}
          className="w-full text-base text-slate-900 border border-slate-200 rounded-xl px-3 py-2 mb-4 outline-none placeholder:text-slate-400 font-bold transition-[border-color,box-shadow] duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
        />

        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <Clock
              size={14}
              className="text-slate-400 shrink-0"
              strokeWidth={2.5}
            />
            <div className="flex-1 flex flex-col gap-1.5">
              <CalendarDateTimePicker
                label="Start date and time"
                value={startDate}
                onChange={setStartDate}
              />
              <CalendarDateTimePicker
                label="End date and time"
                value={endDate}
                onChange={setEndDate}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <CalendarDays
              size={14}
              className="text-slate-400 shrink-0"
              strokeWidth={2.5}
            />
            <OptionMenu
              value={calendarId}
              onChange={setCalendarId}
              className="flex-1"
              options={calendars.map((calendar) => ({
                value: calendar.id,
                label: calendar.name,
                color: calendar.color,
              }))}
            />
          </div>

          <div className="flex items-center gap-2.5">
            <MapPin
              size={14}
              className="text-slate-400 shrink-0"
              strokeWidth={2.5}
            />
            <input
              placeholder="Add location (Optional)"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none transition-[border-color,box-shadow] duration-200 focus:border-blue-500 flex-1 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-start gap-2.5">
            <AlignLeft
              size={14}
              className="text-slate-400 shrink-0 pt-1"
              strokeWidth={2.5}
            />
            <textarea
              placeholder="Add description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none transition-[border-color,box-shadow] duration-200 focus:border-blue-500 flex-1 placeholder:text-slate-400 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:bg-slate-50 px-3 py-2 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl shadow-xs transition-all"
          >
            {event ? "Save changes" : "Save event"}
          </button>
        </div>
      </div>
    </>
  );
}

function EventDetailsPopup({
  event,
  calendar,
  anchor,
  onEdit,
  onDelete,
  onClose,
}: {
  event: UserEvent;
  calendar?: UserCalendar;
  anchor: PopupAnchor;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  const surface = COLOR_SURFACE[calendar?.color ?? "blue"];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={getSafePopupPosition(anchor.x, anchor.y, 352, 360)}
      >
        <div className={`relative h-16 ${surface} p-4 text-white`}>
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/75">
              {calendar?.name ?? "Calendar event"}
            </span>
            <button
              onClick={onClose}
              aria-label="Close event details"
              className="rounded-lg p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
        <div className="p-5">
          <h2 className="text-lg font-extrabold leading-tight text-slate-900">
            {event.title}
          </h2>
          <div className="mt-4 flex flex-col gap-3 text-xs font-semibold text-slate-600">
            <div className="flex items-start gap-2.5">
              <Clock size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <span>
                {start.toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                <br />
                {start.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                –{" "}
                {end.toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {event.location && (
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />
                <span>{event.location}</span>
              </div>
            )}
            {event.description && (
              <div className="flex items-start gap-2.5">
                <AlignLeft
                  size={15}
                  className="mt-0.5 shrink-0 text-slate-400"
                />
                <span className="whitespace-pre-wrap">{event.description}</span>
              </div>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
            >
              <Pencil size={14} />
              Edit event
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

type PopupAnchor = { x: number; y: number };

type WeekViewProps = {
  weekDays: Date[];
  mobileWeekDays?: Date[];
  onSelectDate?: (date: Date) => void;
  events: UserEvent[];
  tasks: Task[];
  calendars: UserCalendar[];
  visibleCalendarIds: string[];
  onCreateEvent: (popup: PopupData) => void;
  onSelectEvent: (event: UserEvent, anchor: PopupAnchor) => void;
  onMoveEvent: (eventId: string, date: Date, hour: number) => void;
  onDropTask: (taskId: string, date: Date, hour: number) => void;
  onToggleTasks?: () => void;
};

function WeekView({
  weekDays,
  mobileWeekDays,
  onSelectDate,
  events,
  tasks,
  calendars,
  visibleCalendarIds,
  onCreateEvent,
  onSelectEvent,
  onMoveEvent,
  onDropTask,
  onToggleTasks,
}: WeekViewProps & { onToggleTasks?: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ day: Date; hour: number } | null>(null);
  const [dragRange, setDragRange] = useState<{
    day: Date;
    startHour: number;
    endHour: number;
  } | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  const today = new Date();

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;
    const measureScrollbar = () =>
      setScrollbarWidth(scrollElement.offsetWidth - scrollElement.clientWidth);
    measureScrollbar();
    const observer = new ResizeObserver(measureScrollbar);
    observer.observe(scrollElement);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= START_HOUR && currentHour < END_HOUR) {
        scrollRef.current.scrollTop =
          (currentHour - START_HOUR) * HOUR_HEIGHT - 100;
      }
    }
  }, []);

  function getHourFromY(el: HTMLElement, clientY: number): number {
    const rect = el.getBoundingClientRect();
    const y = clientY - rect.top;
    const raw = START_HOUR + y / HOUR_HEIGHT;
    return Math.max(START_HOUR, Math.min(END_HOUR - 0.5, raw));
  }
  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    if (e.button !== 0) return;
    const hour = getHourFromY(e.currentTarget, e.clientY);
    dragStart.current = { day, hour };
    setDragRange({ day, startHour: hour, endHour: hour + 1 });
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    if (!dragStart.current) return;
    if (!isSameDay(dragStart.current.day, day)) return;
    const hour = getHourFromY(e.currentTarget, e.clientY);
    setDragRange((prev) =>
      prev ? { ...prev, endHour: Math.max(prev.startHour + 0.5, hour) } : null,
    );
  }

  function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragStart.current || !dragRange) {
      dragStart.current = null;
      setDragRange(null);
      return;
    }
    const popupX = Math.min(e.clientX + 12, window.innerWidth - 340);
    // Keep the editor above the drag target so it does not cover the selected time slot.
    const popupY = Math.max(
      16,
      Math.min(e.clientY - 260, window.innerHeight - 440),
    );
    onCreateEvent({
      startDate: toDateTimeLocal(dragRange.day, dragRange.startHour),
      endDate: toDateTimeLocal(dragRange.day, dragRange.endHour),
      x: popupX,
      y: popupY,
    });
    dragStart.current = null;
    setDragRange(null);
  }

  function getEventsForDay(day: Date) {
    return events.filter(
      (ev) =>
        visibleCalendarIds.includes(ev.calendarId) &&
        isSameDay(new Date(ev.startDate), day),
    );
  }

  function getTasksForDay(day: Date) {
    return tasks.filter(
      (t) => t.dueDate && isSameDay(new Date(t.dueDate), day),
    );
  }

  function getCalendarColor(calendarId: string) {
    return calendars.find((c) => c.id === calendarId)?.color ?? "blue";
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, day: Date) {
    e.preventDefault();
    setDragOverCol(toISODate(day));
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, day: Date) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const hour = getHourFromY(e.currentTarget, e.clientY);
    const eventId = e.dataTransfer.getData("eventId");
    if (eventId) onMoveEvent(eventId, day, hour);
    else if (taskId) onDropTask(taskId, day, Math.floor(hour));
    setDragOverCol(null);
  }

  return (
    <div
      className="calendar-week flex flex-col flex-1 overflow-hidden bg-slate-50"
      style={
        {
          "--calendar-scrollbar-width": `${scrollbarWidth}px`,
        } as React.CSSProperties
      }
    >
      {mobileWeekDays && onSelectDate && (
        <div className="grid grid-cols-7 gap-1 border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {mobileWeekDays.map((day) => (
            <button
              key={toISODate(day)}
              type="button"
              onClick={() => onSelectDate(day)}
              className={`flex min-w-0 flex-col items-center rounded-xl px-1 py-1.5 transition-colors ${
                isSameDay(day, weekDays[0])
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
              aria-label={`Show ${day.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}`}
            >
              <span className="text-[9px] font-extrabold uppercase tracking-wider">
                {day.toLocaleDateString("en-GB", { weekday: "short" })}
              </span>
              <span
                className={`mt-1 flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                  isSameDay(day, today)
                    ? "bg-blue-600 text-white shadow-xs shadow-blue-600/25"
                    : ""
                }`}
              >
                {day.getDate()}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="calendar-week-content min-h-0 flex-1 overflow-x-hidden overflow-y-hidden">
        <div className="calendar-week-inner flex h-full min-w-0 flex-col">
          {/* Day headers */}
          <div
            className={`calendar-week-columns grid border-b border-slate-200 shrink-0 bg-white ${mobileWeekDays ? "hidden md:grid" : ""}`}
            style={{
              gridTemplateColumns: `60px repeat(${weekDays.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="border-r border-slate-100/30" />
            {weekDays.map((day, i) => (
              <div
                key={i}
                className="text-center py-2.5 border-r border-slate-100/30 last:border-r-0"
              >
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  {day.toLocaleDateString("en-GB", { weekday: "short" })}
                </p>
                <div
                  className={`text-base font-bold mt-1 mx-auto w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
                    isSameDay(day, today)
                      ? "bg-blue-600 text-white shadow-xs shadow-blue-600/25"
                      : "text-slate-800"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          {/* All-day tasks row */}
          <div
            className="calendar-week-columns grid border-b border-slate-200 shrink-0 bg-slate-50"
            style={{
              gridTemplateColumns: `60px repeat(${weekDays.length}, minmax(0, 1fr))`,
            }}
          >
            <div className="border-r border-slate-100/30 flex items-center justify-end pr-2.5 py-1.5">
              {onToggleTasks ? (
                <button
                  onClick={onToggleTasks}
                  className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hover:text-blue-700 hover:bg-slate-50 px-2 py-1 rounded transition-all"
                >
                  Tasks
                </button>
              ) : (
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Tasks
                </span>
              )}
            </div>
            {weekDays.map((day, i) => (
              <div
                key={i}
                className="min-w-0 border-r border-slate-100/30 last:border-r-0 p-1.5 min-h-8 flex flex-col gap-1 bg-slate-100/30"
              >
                {getTasksForDay(day).map((task) => (
                  <div
                    key={task.id}
                    title={task.title}
                    className="block min-w-0 w-full overflow-hidden text-ellipsis whitespace-nowrap text-[11px] font-bold text-slate-700 bg-white border border-slate-200 border-l-4 border-l-slate-500 rounded-lg px-2 py-1 shadow-2xs"
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div
            className="calendar-week-scroll min-h-0 flex-1 overflow-y-scroll"
            ref={scrollRef}
          >
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: `60px repeat(${weekDays.length}, minmax(0, 1fr))`,
              }}
            >
              {/* Time labels */}
              <div className="border-r border-slate-100/30 bg-white">
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="flex items-start justify-end pr-3 pt-2"
                  >
                    <span className="text-xs font-bold text-slate-400 leading-none">
                      {formatHour(h)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDays.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                const isDraggingHere =
                  dragRange && isSameDay(dragRange.day, day);
                const isDragOver = dragOverCol === toISODate(day);

                return (
                  <div
                    key={i}
                    className={`border-r border-slate-100/30 last:border-r-0 relative select-none cursor-crosshair transition-colors ${
                      isSameDay(day, today) ? "bg-blue-50/15" : "bg-white"
                    } ${isDragOver ? "bg-blue-50/60" : ""}`}
                    style={{ height: HOUR_HEIGHT * HOURS.length }}
                    onMouseDown={(e) => handleMouseDown(e, day)}
                    onMouseMove={(e) => handleMouseMove(e, day)}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={() => {
                      if (dragStart.current) {
                        dragStart.current = null;
                        setDragRange(null);
                      }
                    }}
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDrop={(e) => handleDrop(e, day)}
                    onDragLeave={() => setDragOverCol(null)}
                  >
                    {/* Hour lines */}
                    {HOURS.map((h) => (
                      <div
                        key={h}
                        className="calendar-hour-line absolute w-full border-t border-slate-100 pointer-events-none"
                        style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                      />
                    ))}

                    {/* Half-hour lines */}
                    {HOURS.map((h) => (
                      <div
                        key={`half-${h}`}
                        className="calendar-half-hour-line absolute w-full border-t border-slate-50/50 border-dashed pointer-events-none"
                        style={{
                          top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                        }}
                      />
                    ))}

                    {/* Drag preview */}
                    {isDraggingHere && dragRange && (
                      <div
                        className="absolute left-1 right-1 bg-blue-100/80 border-2 border-blue-400 rounded-xl pointer-events-none z-10"
                        style={{
                          top: (dragRange.startHour - START_HOUR) * HOUR_HEIGHT,
                          height: Math.max(
                            (dragRange.endHour - dragRange.startHour) *
                              HOUR_HEIGHT,
                            22,
                          ),
                        }}
                      />
                    )}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const start = new Date(event.startDate);
                      const end = new Date(event.endDate);
                      const top =
                        (start.getHours() +
                          start.getMinutes() / 60 -
                          START_HOUR) *
                        HOUR_HEIGHT;
                      const height = Math.max(
                        ((end.getTime() - start.getTime()) / 3600000) *
                          HOUR_HEIGHT,
                        24,
                      );
                      const color = getCalendarColor(event.calendarId);

                      return (
                        <div
                          key={event.id}
                          draggable
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            onSelectEvent(event, {
                              x: rect.left,
                              y: rect.bottom + 8,
                            });
                          }}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggedEventId(event.id);
                            e.dataTransfer.setData("eventId", event.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragEnd={() => setDraggedEventId(null)}
                          className={`absolute left-1 right-1 rounded-xl border-l-4 px-2 py-1 text-xs font-bold overflow-hidden cursor-grab shadow-2xs z-10 transition-all ${draggedEventId === event.id ? "bg-slate-200 border-slate-400 text-slate-500 opacity-80" : COLOR_EVENT[color]}`}
                          style={{ top, height }}
                        >
                          <p className="truncate leading-tight font-extrabold">
                            {event.title}
                          </p>
                          <p className="text-[10px] opacity-75 font-semibold mt-0.5 leading-tight">
                            {start.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" – "}
                            {end.toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────

type DayViewProps = {
  date: Date;
  onSelectDate: (date: Date) => void;
  events: UserEvent[];
  tasks: Task[];
  calendars: UserCalendar[];
  visibleCalendarIds: string[];
  onCreateEvent: (popup: PopupData) => void;
  onSelectEvent: (event: UserEvent, anchor: PopupAnchor) => void;
  onMoveEvent: (eventId: string, date: Date, hour: number) => void;
  onDropTask: (taskId: string, date: Date, hour: number) => void;
};

function DayView({
  date,
  onSelectDate,
  events,
  tasks,
  calendars,
  visibleCalendarIds,
  onCreateEvent,
  onSelectEvent,
  onMoveEvent,
  onDropTask,
}: DayViewProps) {
  return (
    <WeekView
      weekDays={[date]}
      mobileWeekDays={getWeekDays(date)}
      onSelectDate={onSelectDate}
      events={events}
      tasks={tasks}
      calendars={calendars}
      visibleCalendarIds={visibleCalendarIds}
      onCreateEvent={onCreateEvent}
      onSelectEvent={onSelectEvent}
      onMoveEvent={onMoveEvent}
      onDropTask={onDropTask}
    />
  );
}

// ─── Month View ───────────────────────────────────────────────────────────────

type MonthViewProps = {
  currentDate: Date;
  events: UserEvent[];
  tasks: Task[];
  calendars: UserCalendar[];
  visibleCalendarIds: string[];
  onSelectDate: (date: Date) => void;
  onSelectEvent: (event: UserEvent, anchor: PopupAnchor) => void;
};

function MonthView({
  currentDate,
  events,
  tasks,
  calendars,
  visibleCalendarIds,
  onSelectDate,
  onSelectEvent,
}: MonthViewProps) {
  const days = getMonthDays(currentDate.getFullYear(), currentDate.getMonth());
  const today = new Date();

  function getEventsForDay(day: Date) {
    return events.filter(
      (ev) =>
        visibleCalendarIds.includes(ev.calendarId) &&
        isSameDay(new Date(ev.startDate), day),
    );
  }

  function getTasksForDay(day: Date) {
    return tasks.filter(
      (t) => t.dueDate && isSameDay(new Date(t.dueDate), day),
    );
  }

  function getCalendarColor(calendarId: string) {
    return calendars.find((c) => c.id === calendarId)?.color ?? "blue";
  }

  return (
    <div className="flex flex-col flex-1 bg-white overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/50">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-widest"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const dayEvents = getEventsForDay(day);
          const dayTasks = getTasksForDay(day);
          const isToday = isSameDay(day, today);

          return (
            <div
              key={i}
              onClick={() => onSelectDate(day)}
              className={`border-r border-b border-slate-100 p-1.5 flex flex-col gap-1 min-h-0 cursor-pointer hover:bg-slate-50 transition-colors ${
                !isCurrentMonth ? "month-outside-day bg-slate-50/30" : ""
              }`}
            >
              <div
                className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg mb-1 ${
                  isToday
                    ? "bg-blue-600 text-white shadow-xs"
                    : isCurrentMonth
                      ? "text-slate-700"
                      : "month-outside-day-number text-slate-300"
                }`}
              >
                {day.getDate()}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      onSelectEvent(event, {
                        x: rect.left,
                        y: rect.bottom + 8,
                      });
                    }}
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate border-l-2 ${COLOR_EVENT[getCalendarColor(event.calendarId)]}`}
                  >
                    {event.title}
                  </div>
                ))}
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate bg-slate-100 text-slate-600 border-l-2 border-slate-400"
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Agenda View ─────────────────────────────────────────────────────────────

type AgendaViewProps = {
  currentDate: Date;
  events: UserEvent[];
  calendars: UserCalendar[];
  visibleCalendarIds: string[];
  onSelectEvent: (event: UserEvent, anchor: PopupAnchor) => void;
};

function AgendaView({
  currentDate,
  events,
  calendars,
  visibleCalendarIds,
  onSelectEvent,
}: AgendaViewProps) {
  const agendaStart = new Date(currentDate);
  agendaStart.setHours(0, 0, 0, 0);
  const visibleEvents = events
    .filter(
      (event) =>
        visibleCalendarIds.includes(event.calendarId) &&
        new Date(event.startDate) >= agendaStart,
    )
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );
  const groupedEvents = visibleEvents.reduce<[string, UserEvent[]][]>(
    (groups, event) => {
      const dateKey = toISODate(new Date(event.startDate));
      const group = groups.find(([key]) => key === dateKey);
      if (group) group[1].push(event);
      else groups.push([dateKey, [event]]);
      return groups;
    },
    [],
  );

  function getCalendarColor(calendarId: string) {
    return (
      calendars.find((calendar) => calendar.id === calendarId)?.color ?? "blue"
    );
  }

  function formatEventTime(event: UserEvent) {
    if (event.allDay) return "All day";
    return new Date(event.startDate).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-4 custom-scrollbar md:px-6">
      {groupedEvents.length === 0 ? (
        <div className="flex h-full min-h-48 flex-col items-center justify-center text-center">
          <CalendarDays size={24} className="mb-3 text-slate-300" />
          <p className="text-sm font-extrabold text-slate-500">
            No upcoming events
          </p>
          <p className="mt-1 text-xs font-medium text-slate-400">
            Your agenda is clear.
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          {groupedEvents.map(([dateKey, dayEvents]) => {
            const date = new Date(`${dateKey}T12:00:00`);
            const isToday = isSameDay(date, new Date());
            return (
              <section key={dateKey}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span
                    className={`text-xs font-black uppercase tracking-widest ${isToday ? "text-blue-600" : "text-slate-400"}`}
                  >
                    {isToday
                      ? "Today"
                      : date.toLocaleDateString("en-GB", { weekday: "short" })}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {date.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const calendarColor = getCalendarColor(event.calendarId);
                    return (
                      <button
                        key={event.id}
                        type="button"
                        onClick={(clickEvent) => {
                          const rect =
                            clickEvent.currentTarget.getBoundingClientRect();
                          onSelectEvent(event, {
                            x: rect.left,
                            y: rect.bottom + 8,
                          });
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-3.5 py-3 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                      >
                        <span
                          className={`h-10 w-1 shrink-0 rounded-full ${COLOR_SURFACE[calendarColor]}`}
                        />
                        <span className="w-14 shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">
                          {formatEventTime(event)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-extrabold text-slate-800">
                            {event.title}
                          </span>
                          {(event.location || event.description) && (
                            <span className="mt-0.5 block truncate text-xs font-medium text-slate-400">
                              {event.location || event.description}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Year View ────────────────────────────────────────────────────────────────

type YearViewProps = {
  currentDate: Date;
  onSelectMonth: (date: Date) => void;
};

function YearView({ currentDate, onSelectMonth }: YearViewProps) {
  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
        {months.map((monthDate, i) => {
          const days = getMonthDays(year, i);
          return (
            <div
              key={i}
              onClick={() => onSelectMonth(monthDate)}
              className="p-2 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-100"
            >
              <h3 className="text-base font-extrabold text-slate-800 mb-2 px-1">
                {monthDate.toLocaleDateString("en-GB", { month: "long" })}
              </h3>
              <div className="grid grid-cols-7 gap-y-1">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, idx) => (
                  <div
                    key={idx}
                    className="text-[10px] font-bold text-slate-300 text-center"
                  >
                    {d}
                  </div>
                ))}
                {days.map((day, idx) => (
                  <div
                    key={idx}
                    className={`text-[11px] font-bold text-center py-1 ${
                      day.getMonth() === i ? "text-slate-600" : "text-slate-200"
                    } ${isSameDay(day, new Date()) ? "text-blue-600 font-black" : ""}`}
                  >
                    {day.getDate()}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function Calendar({
  events,
  setEvents,
  tasks,
  setTasks,
  calendars,
  visibleCalendarIds,
  createEventRequest,
  onToggleTasks,
  isTasksOpen,
  onOpenIcsImport,
}: Props) {
  const [ready, setReady] = useState(false);
  const [isIcsDragOver, setIsIcsDragOver] = useState(false);

  // Defer rendering of the full calendar grid to improve initial paint and perceived performance.
  useEffect(() => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (idleWindow.requestIdleCallback) {
      const id = idleWindow.requestIdleCallback(() => setReady(true));
      return () => idleWindow.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  const [view, setView] = useState<View>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<UserEvent | null>(null);

  const weekDays = getWeekDays(currentDate);
  const threeDays = getThreeDays(currentDate);

  let titleLabel = "";
  if (view === "day") {
    titleLabel = currentDate.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } else if (view === "week") {
    titleLabel = `${weekDays[0].toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${weekDays[6].toLocaleDateString(
      "en-GB",
      { day: "numeric", month: "short", year: "numeric" },
    )}`;
  } else if (view === "month") {
    titleLabel = currentDate.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
  } else if (view === "year") {
    titleLabel = currentDate.getFullYear().toString();
  } else if (view === "agenda") {
    titleLabel = "Agenda";
  }

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate);
    if (view === "day") d.setDate(d.getDate() + dir);
    if (view === "week") d.setDate(d.getDate() + dir * 7);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    if (view === "year") d.setFullYear(d.getFullYear() + dir);
    if (view === "agenda") d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function saveEvent(event: UserEvent) {
    setEvents((prev) =>
      selectedEvent
        ? prev.map((current) => (current.id === event.id ? event : current))
        : [...prev, event],
    );
    setPopup(null);
    setSelectedEvent(null);
  }

  const [eventAnchor, setEventAnchor] = useState<PopupAnchor>({
    x: 120,
    y: 96,
  });

  function selectEvent(event: UserEvent, anchor: PopupAnchor) {
    setSelectedEvent(event);
    setEventAnchor(anchor);
    setPopup(null);
  }

  function openCreatePopup(nextPopup: PopupData) {
    setSelectedEvent(null);
    setPopup(nextPopup);
  }

  function openToolbarEvent() {
    const start = new Date(currentDate);
    start.setHours(9, 0, 0, 0);
    const end = new Date(start);
    end.setHours(10, 0, 0, 0);
    openCreatePopup({
      startDate: toDateTimeLocal(start, 9),
      endDate: toDateTimeLocal(end, 10),
      x: window.innerWidth / 2 - 160,
      y: 96,
    });
  }

  useEffect(() => {
    if (!createEventRequest) return;
    const request = window.setTimeout(() => {
      const start = new Date(currentDate);
      start.setHours(9, 0, 0, 0);
      const end = new Date(start);
      end.setHours(10, 0, 0, 0);
      setSelectedEvent(null);
      setPopup({
        startDate: toDateTimeLocal(start, 9),
        endDate: toDateTimeLocal(end, 10),
        x: window.innerWidth / 2 - 160,
        y: 96,
      });
    }, 0);
    return () => window.clearTimeout(request);
  }, [createEventRequest, currentDate]);

  function deleteEvent(eventId: string) {
    setEvents((prev) => prev.filter((event) => event.id !== eventId));
    setPopup(null);
    setSelectedEvent(null);
  }

  function moveEvent(eventId: string, date: Date, hour: number) {
    setEvents((prev) =>
      prev.map((event) => {
        if (event.id !== eventId) return event;
        const start = new Date(event.startDate);
        const end = new Date(event.endDate);
        const duration = end.getTime() - start.getTime();
        const nextStart = new Date(date);
        nextStart.setHours(Math.floor(hour), hour % 1 >= 0.5 ? 30 : 0, 0, 0);
        const nextEnd = new Date(nextStart.getTime() + duration);
        return {
          ...event,
          startDate: toDateTimeLocal(
            nextStart,
            nextStart.getHours() + nextStart.getMinutes() / 60,
          ),
          endDate: toDateTimeLocal(
            nextEnd,
            nextEnd.getHours() + nextEnd.getMinutes() / 60,
          ),
        };
      }),
    );
  }

  function handleDropTask(taskId: string, date: Date) {
    const isoDate = toISODate(date);

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, dueDate: isoDate } : t)),
    );
  }

  return (
    <div
      className="relative flex flex-col h-full bg-white overflow-hidden"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setIsIcsDragOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setIsIcsDragOver(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setIsIcsDragOver(false);
        const files = Array.from(event.dataTransfer.files);
        onOpenIcsImport(files);
      }}
    >
      {isIcsDragOver && (
        <div className="pointer-events-none absolute inset-3 z-[80] flex items-center justify-center rounded-3xl border-2 border-dashed border-blue-500 bg-blue-600/10 backdrop-blur-[2px]">
          <div className="rounded-2xl bg-white px-6 py-4 text-center shadow-xl">
            <p className="text-sm font-extrabold text-slate-800">
              Drop .ics calendar files
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Release to choose a destination calendar
            </p>
          </div>
        </div>
      )}
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-200/80 bg-white shrink-0">
        {/* Navigation Button Block */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => navigate(-1)}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
          >
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white px-2.5 py-1 rounded-lg transition-all"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
          >
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Date Title */}
        <span className="text-sm font-extrabold text-slate-900 flex-1 ml-2 md:text-base leading-none">
          {titleLabel}
        </span>

        {/* View switcher */}
        <div className="hidden md:flex h-8 bg-slate-100 p-1 rounded-xl shrink-0">
          {(["day", "week", "month", "year"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`h-6 px-3 py-0 text-xs font-bold rounded-lg transition-all capitalize ${
                view === v
                  ? "bg-white text-blue-600 shadow-2xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>

        <OptionMenu
          value={view}
          onChange={(value) => setView(value as View)}
          className="w-32 shrink-0 md:hidden"
          options={(["day", "week", "month", "year", "agenda"] as View[]).map(
            (option) => ({
              value: option,
              label: option.charAt(0).toUpperCase() + option.slice(1),
            }),
          )}
        />

        {/* Desktop Task Toggle (Hidden on mobile as header handles it) */}
        {onToggleTasks && (
          <button
            onClick={onToggleTasks}
            className={`hidden lg:flex h-8 items-center gap-1.5 px-3 text-xs font-bold rounded-xl transition-all ${
              isTasksOpen
                ? "bg-blue-50 text-blue-700"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ListTodo size={14} strokeWidth={2.5} />
            <span>Tasks</span>
          </button>
        )}
      </div>

      <CreateButton mobile onCreateEvent={openToolbarEvent} />

      {!ready ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/30">
          <div className="animate-pulse w-full max-w-4xl">
            <div className="h-8 bg-slate-200/50 rounded-xl mb-6 w-1/3" />
            <div className="grid grid-cols-7 gap-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-24 bg-slate-200/50 rounded-2xl" />
                  <div className="h-4 bg-slate-200/30 rounded-lg w-3/4" />
                  <div className="h-4 bg-slate-200/30 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs font-bold text-slate-400 mt-8 uppercase tracking-widest animate-pulse">
            Initializing Views...
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {view === "day" && (
            <DayView
              date={currentDate}
              onSelectDate={setCurrentDate}
              events={events}
              tasks={tasks}
              calendars={calendars}
              visibleCalendarIds={visibleCalendarIds}
              onCreateEvent={openCreatePopup}
              onSelectEvent={selectEvent}
              onMoveEvent={moveEvent}
              onDropTask={handleDropTask}
            />
          )}
          {view === "week" && (
            <>
              <div className="hidden min-h-0 flex-1 md:flex">
                <WeekView
                  weekDays={weekDays}
                  events={events}
                  tasks={tasks}
                  calendars={calendars}
                  visibleCalendarIds={visibleCalendarIds}
                  onCreateEvent={openCreatePopup}
                  onSelectEvent={selectEvent}
                  onMoveEvent={moveEvent}
                  onDropTask={handleDropTask}
                  onToggleTasks={onToggleTasks}
                />
              </div>
              <div className="flex min-h-0 flex-1 md:hidden">
                <WeekView
                  weekDays={threeDays}
                  events={events}
                  tasks={tasks}
                  calendars={calendars}
                  visibleCalendarIds={visibleCalendarIds}
                  onCreateEvent={openCreatePopup}
                  onSelectEvent={selectEvent}
                  onMoveEvent={moveEvent}
                  onDropTask={handleDropTask}
                  onToggleTasks={onToggleTasks}
                />
              </div>
            </>
          )}
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              events={events}
              tasks={tasks}
              calendars={calendars}
              visibleCalendarIds={visibleCalendarIds}
              onSelectDate={(d) => {
                setCurrentDate(d);
                setView("day");
              }}
              onSelectEvent={selectEvent}
            />
          )}
          {view === "year" && (
            <YearView
              currentDate={currentDate}
              onSelectMonth={(d) => {
                setCurrentDate(d);
                setView("month");
              }}
            />
          )}
          {view === "agenda" && (
            <AgendaView
              currentDate={currentDate}
              events={events}
              calendars={calendars}
              visibleCalendarIds={visibleCalendarIds}
              onSelectEvent={selectEvent}
            />
          )}
        </div>
      )}

      {/* Event creation and editing popup */}
      {popup && (
        <EventPopup
          data={popup}
          calendars={calendars}
          event={selectedEvent ?? undefined}
          key={selectedEvent?.id ?? "new-event"}
          onSave={saveEvent}
          onClose={() => {
            setPopup(null);
            setSelectedEvent(null);
          }}
        />
      )}
      {selectedEvent && !popup && (
        <EventDetailsPopup
          event={selectedEvent}
          calendar={calendars.find(
            (calendar) => calendar.id === selectedEvent.calendarId,
          )}
          anchor={eventAnchor}
          onEdit={() =>
            setPopup({
              startDate: selectedEvent.startDate,
              endDate: selectedEvent.endDate,
              x: eventAnchor.x,
              y: eventAnchor.y,
            })
          }
          onDelete={() => deleteEvent(selectedEvent.id)}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

export default Calendar;
