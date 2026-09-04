import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Repeat,
  Plus,
  Check,
  Trash2,
  X,
  Edit3,
  MoreVertical,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Task, TaskList, RecurrenceType } from "../types";
import { OptionMenu } from "./PickerControls";

type Props = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  lists: TaskList[];
  activeListId: string;
  onListSelect: (id: string) => void;
  onAddList: (name: string) => void;
  onDeleteList: (id: string) => void;
  onRenameList: (id: string, name: string) => void;
  onCloseTasksMobile?: () => void;
};

// --- Helper Functions ---

function getDateLabel(dateStr: string | null): string {
  if (!dateStr) return "";
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, (month ?? 1) - 1, day ?? 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";

  const sameMonth =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth();
  const monthLabel = d.toLocaleDateString("en-GB", { month: "short" });
  const yearLabel =
    sameMonth || d.getFullYear() === today.getFullYear()
      ? ""
      : `, ${d.getFullYear()}`;
  return `${d.toLocaleDateString("en-GB", { weekday: "short" })}, ${monthLabel} ${d.getDate()}${yearLabel}`;
}

function toLocalISODate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromLocalISODate(value: string | null): Date {
  if (!value) return new Date();
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, 12);
}

function getRelativeDateISO(daysFromToday: number): string {
  const today = new Date();
  const date = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + daysFromToday,
    12,
  );
  return toLocalISODate(date);
}

function calculateNextDate(
  currentDateStr: string,
  recurrence: NonNullable<RecurrenceType>,
): string | null {
  const d = new Date(currentDateStr);
  if (isNaN(d.getTime())) return null;

  switch (recurrence) {
    case "daily":
      d.setDate(d.getDate() + 1);
      break;
    case "weekdays":
      do {
        d.setDate(d.getDate() + 1);
      } while (d.getDay() === 0 || d.getDay() === 6);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return d.toISOString().split("T")[0];
}

function groupTasks(tasks: Task[]): [string, Task[]][] {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const grouped: Record<string, Task[]> = {};

  tasks.forEach((task) => {
    const label = getDateLabel(task.dueDate) || "No date";
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(task);
  });

  const order: Record<string, number> = { Today: 0, Tomorrow: 1 };
  return Object.entries(grouped).sort(([a], [b]) => {
    if (a === "No date") return 1;
    if (b === "No date") return -1;
    return (order[a] ?? 2) - (order[b] ?? 2);
  });
}

const RECURRENCE_OPTIONS: NonNullable<RecurrenceType>[] = [
  "daily",
  "weekdays",
  "weekly",
  "monthly",
  "yearly",
];

// --- Custom Components ---

function CustomDatePicker({
  value,
  onChange,
  recurrence,
  onRecurrenceChange,
  onClose,
}: {
  value: string | null;
  onChange: (date: string | null) => void;
  recurrence: RecurrenceType;
  onRecurrenceChange: (r: RecurrenceType) => void;
  onClose: () => void;
}) {
  const [viewDate, setViewDate] = useState(() => fromLocalISODate(value));
  const today = new Date();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { day: number; month: "prev" | "current" | "next" }[] = [];
  for (let i = startOffset - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, month: "prev" });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, month: "current" });
  while (cells.length % 7 !== 0)
    cells.push({
      day: cells.length - daysInMonth - startOffset + 1,
      month: "next",
    });

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Overlay Content */}
      <div
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onClose();
          }
        }}
        className="relative z-[100] w-[min(18rem,calc(100vw-2rem))] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Clock size={13} className="text-blue-600" /> Schedule task
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div
              key={i}
              className="text-center text-[10px] font-black text-slate-400 py-1"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="mb-3 grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            const cellDate = new Date(
              year,
              cell.month === "current"
                ? month
                : cell.month === "prev"
                  ? month - 1
                  : month + 1,
              cell.day,
            );
            const isoStr = toLocalISODate(cellDate);
            const isSelected = value === isoStr;
            const isToday =
              cell.month === "current" &&
              cell.day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();

            return (
              <button
                key={i}
                onClick={() => {
                  onChange(isoStr);
                }}
                className={`rounded-xl py-1.5 text-center text-xs font-bold transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-200"
                    : isToday
                      ? "text-blue-600 bg-blue-50"
                      : cell.month === "current"
                        ? "text-slate-700 hover:bg-slate-50"
                        : "text-slate-300"
                }`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        <div className="mb-3 border-t border-slate-100 pt-3">
          <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-black mb-2 px-1">
            Recurrence
          </label>
          <div className="relative">
            <OptionMenu
              value={recurrence ?? ""}
              onChange={(next) =>
                onRecurrenceChange((next as RecurrenceType) || null)
              }
              className="w-full"
              options={[
                { value: "", label: "No Repeat" },
                ...RECURRENCE_OPTIONS.map((option) => ({
                  value: option,
                  label: option[0].toUpperCase() + option.slice(1),
                })),
              ]}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white shadow-xl shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95"
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// --- Main Component ---

export default function Tasks({
  tasks,
  setTasks,
  lists,
  activeListId,
  onListSelect,
  onAddList,
  onDeleteList,
  onRenameList,
  onCloseTasksMobile,
}: Props) {
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Custom Add List State
  const [showAddListPopup, setShowAddListPopup] = useState(false);
  const [newListName, setNewListName] = useState("");
  const addListRef = useRef<HTMLDivElement>(null);

  // New: modern list dropdown state + refs
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [activeActionsListId, setActiveActionsListId] = useState<string | null>(
    null,
  );
  const [renameListId, setRenameListId] = useState<string | null>(null);
  const [renameListName, setRenameListName] = useState("");
  const listMenuRef = useRef<HTMLDivElement>(null);

  // Date Picker Ref
  const datePickerRef = useRef<HTMLDivElement>(null);
  const tasksPanelRef = useRef<HTMLDivElement>(null);
  const addTaskInputRef = useRef<HTMLInputElement>(null);

  // Click outside handlers: close recurrence popup and list menu
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!datePickerRef.current?.contains(e.target as Node))
        setShowDatePicker(false);
      if (!addListRef.current?.contains(e.target as Node))
        setShowAddListPopup(false);
      if (!listMenuRef.current?.contains(e.target as Node)) {
        setListMenuOpen(false);
        setActiveActionsListId(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && renameListId) {
        setRenameListId(null);
        setRenameListName("");
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [renameListId]);

  const activeList = lists.find((l) => l.id === activeListId);
  const visibleTasks = tasks.filter((t) => t.listId === activeListId);
  const pendingTasks = visibleTasks.filter((t) => !t.completed);
  const completedTasks = visibleTasks.filter((t) => t.completed);

  function addTask() {
    if (!input.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: input.trim(),
      completed: false,
      dueDate: dueDate,
      endDate: null,
      recurrence: recurrence,
      listId: activeListId,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);
    setInput("");
    setDueDate(null);
    setRecurrence(null);
  }

  function toggleTask(id: string) {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task) return prev;

      if (!task.completed && task.recurrence && task.dueDate) {
        const nextDate = calculateNextDate(task.dueDate, task.recurrence);
        if (nextDate) {
          const nextTask: Task = {
            ...task,
            id: crypto.randomUUID(),
            dueDate: nextDate,
            createdAt: new Date().toISOString(),
            completed: false,
          };

          return [
            ...prev.map((t) => (t.id === id ? { ...t, completed: true } : t)),
            nextTask,
          ];
        }
      }

      return prev.map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      );
    });
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function updateTask(id: string, changes: Partial<Task>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...changes } : t)),
    );
  }

  function closeRenameDialog() {
    setRenameListId(null);
    setRenameListName("");
  }

  function submitRenameList() {
    const name = renameListName.trim();
    if (!name || !renameListId) return;
    onRenameList(renameListId, name);
    closeRenameDialog();
  }

  return (
    <div
      ref={tasksPanelRef}
      className="relative w-full h-full flex flex-col bg-white"
    >
      <div className="tasks-scroll flex-1 overflow-y-auto px-6 py-4 scrollbar-thin">
        {/* List selector and actions */}
        <div className="mb-3">
          <div
            className="relative flex items-center justify-center"
            ref={listMenuRef}
          >
            {onCloseTasksMobile && (
              <button
                onClick={onCloseTasksMobile}
                className="absolute left-0 rounded-xl p-2 text-slate-500 transition-all hover:bg-slate-100 lg:hidden"
                aria-label="Back to calendar"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => {
                  setListMenuOpen((value) => !value);
                  setActiveActionsListId(null);
                }}
                aria-haspopup="true"
                aria-expanded={listMenuOpen}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 transition-all hover:bg-slate-100"
              >
                <span className="truncate">
                  {activeList?.name ?? "Select list"}
                </span>
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-slate-400"
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {listMenuOpen && (
                <div className="absolute left-1/2 z-20 mt-2 w-48 max-w-[calc(100vw-2rem)] -translate-x-1/2 origin-top rounded-2xl border border-slate-200 bg-white py-2 shadow-lg animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150">
                  <div className="max-h-52 overflow-auto">
                    {lists.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => {
                          onListSelect(l.id);
                          setListMenuOpen(false);
                        }}
                        aria-selected={l.id === activeListId}
                        className={`task-list-option w-full flex items-center gap-2 text-left px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-50 ${
                          l.id === activeListId
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-700"
                        }`}
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                          {l.id === activeListId && (
                            <Check size={14} strokeWidth={2.5} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {l.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div
                    className="border-t border-slate-100 pt-1.5"
                    ref={addListRef}
                  >
                    {!showAddListPopup ? (
                      <button
                        onClick={() => {
                          setShowAddListPopup(true);
                          setNewListName("");
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        <Plus size={14} />
                        Add list
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <input
                          autoFocus
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newListName.trim()) {
                              onAddList(newListName.trim());
                              setShowAddListPopup(false);
                              setListMenuOpen(false);
                            }
                            if (e.key === "Escape") setShowAddListPopup(false);
                          }}
                          placeholder="List name..."
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500"
                        />
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setShowAddListPopup(false)}
                            className="px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-lg"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              if (newListName.trim()) {
                                onAddList(newListName.trim());
                                setShowAddListPopup(false);
                                setListMenuOpen(false);
                              }
                            }}
                            className="px-2 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Three dots actions menu for active list, outside of the selector dropdown */}
            {activeList && (
              <div className="absolute right-0">
                <button
                  onClick={() => {
                    setActiveActionsListId(
                      activeActionsListId === activeListId
                        ? null
                        : activeListId,
                    );
                    setListMenuOpen(false);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
                  aria-label="List options"
                >
                  <MoreVertical size={20} strokeWidth={2.25} />
                </button>

                {activeActionsListId === activeListId && (
                  <div className="absolute right-0 top-full z-30 mt-1.5 w-36 origin-top-right rounded-xl border border-slate-200 bg-white py-1 shadow-md animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameListId(activeList.id);
                        setRenameListName(activeList.name);
                        setActiveActionsListId(null);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Edit3 size={13} className="text-slate-500" />
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          confirm(
                            `Are you sure you want to delete list "${activeList.name}"?`,
                          )
                        ) {
                          onDeleteList(activeList.id);
                        }
                        setActiveActionsListId(null);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <Trash2 size={13} className="text-rose-500" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Add Task Box - GOOGLE CALENDAR STYLE */}
        <div className="mb-3">
          <div
            onMouseDown={(event) => {
              if (!(event.target as HTMLElement).closest("button")) {
                addTaskInputRef.current?.focus();
              }
            }}
            className="cursor-text rounded-2xl bg-slate-50/50 hover:bg-white shadow-xs focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white transition-all flex flex-col p-3 gap-3"
          >
            {/* Top Row: Input Field */}
            <div className="flex items-center gap-2.5">
              <Plus
                size={18}
                className="text-slate-400 shrink-0"
                strokeWidth={2.5}
              />
              <input
                ref={addTaskInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Add a task..."
                className="task-add-input flex-1 min-w-0 appearance-none bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:outline-none"
              />
            </div>

            {/* Bottom Row: Action Buttons */}
            <div className="flex items-center gap-2 pl-1.5">
              {!dueDate && (
                <>
                  <button
                    type="button"
                    onClick={() => setDueDate(getRelativeDateISO(0))}
                    className="task-quick-date shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 transition-all duration-150 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueDate(getRelativeDateISO(1))}
                    className="task-quick-date shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 transition-all duration-150 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Tomorrow
                  </button>
                </>
              )}

              {/* Custom Date & Time Picker Trigger */}
              <div
                className="relative min-w-0 max-w-full flex-none"
                ref={datePickerRef}
              >
                <button
                  type="button"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  title={dueDate ? "Change due date" : "Set due date"}
                  aria-label={dueDate ? "Change due date" : "Set due date"}
                  className={`task-date-picker-trigger flex w-auto max-w-full min-w-0 items-center gap-1.5 overflow-hidden px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    dueDate || showDatePicker
                      ? "text-blue-700 bg-blue-50 border-blue-200"
                      : "text-slate-500 bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  <Clock size={14} className="shrink-0" strokeWidth={2.5} />
                  {dueDate ? (
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="truncate">{getDateLabel(dueDate)}</span>
                      {recurrence && (
                        <Repeat
                          size={10}
                          className="shrink-0 text-emerald-600"
                        />
                      )}
                    </div>
                  ) : (
                    <span className="sr-only">Set due date</span>
                  )}

                  {dueDate && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setDueDate(null);
                        setRecurrence(null);
                      }}
                      className="ml-1 p-0.5 hover:bg-blue-200/50 rounded text-blue-800 cursor-pointer"
                    >
                      <X size={12} strokeWidth={3} />
                    </div>
                  )}
                </button>

                {showDatePicker && (
                  <CustomDatePicker
                    value={dueDate}
                    onChange={setDueDate}
                    recurrence={recurrence}
                    onRecurrenceChange={setRecurrence}
                    onClose={() => setShowDatePicker(false)}
                  />
                )}
              </div>

              {/* Add task CTA */}
              {input.trim() && (
                <button
                  onClick={addTask}
                  className="ml-auto flex items-center justify-center p-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all shadow-xs"
                >
                  <Check size={14} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Empty state */}
        {pendingTasks.length === 0 && completedTasks.length === 0 && (
          <div className="text-center py-12 px-4">
            <p className="text-sm font-bold text-slate-400">
              No tasks in this list
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Add one using the input field above.
            </p>
          </div>
        )}

        {/* Grouped Pending Tasks */}
        {groupTasks(pendingTasks).map(([header, group]) => (
          <div key={header} className="mb-6">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-extrabold mb-2 pl-2">
              {header}
            </p>
            <div className="space-y-1.5">
              {group.map((task) => (
                <TaskRow
                  key={`${task.id}-${task.title}-${task.dueDate ?? ""}-${task.recurrence ?? ""}`}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                  isEditing={editingId === task.id}
                  onStartEdit={() => setEditingId(task.id)}
                  onStopEdit={() => setEditingId(null)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="mt-8 border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-extrabold mb-2.5 pl-2">
              Completed · {completedTasks.length}
            </p>
            <div className="space-y-1 opacity-75">
              {completedTasks.map((task) => (
                <TaskRow
                  key={`${task.id}-${task.title}-${task.dueDate ?? ""}-${task.recurrence ?? ""}`}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onUpdate={updateTask}
                  isEditing={editingId === task.id}
                  onStartEdit={() => setEditingId(task.id)}
                  onStopEdit={() => setEditingId(null)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {renameListId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-[2px] animate-in fade-in duration-150"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeRenameDialog();
          }}
        >
          <form
            role="dialog"
            aria-modal="true"
            aria-labelledby="rename-list-title"
            onSubmit={(event) => {
              event.preventDefault();
              submitRenameList();
            }}
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/15 animate-in zoom-in-95 slide-in-from-bottom-2 duration-150"
          >
            <div className="mb-5">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <Edit3 size={19} strokeWidth={2.25} />
              </div>
              <h2
                id="rename-list-title"
                className="text-base font-extrabold text-slate-900"
              >
                Rename list
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Give this list a name you will recognize.
              </p>
            </div>

            <label
              htmlFor="rename-list-input"
              className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400"
            >
              List name
            </label>
            <input
              id="rename-list-input"
              autoFocus
              value={renameListName}
              onChange={(event) => setRenameListName(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeRenameDialog}
                className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!renameListName.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                Save name
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// --- Task Row Component ---

type TaskRowProps = {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
};

function TaskRow({
  task,
  onToggle,
  onDelete,
  onUpdate,
  isEditing,
  onStartEdit,
  onStopEdit,
}: TaskRowProps) {
  // Detailed edit states (Title, Date, Recurrence)
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDueDate, setEditDueDate] = useState<string | null>(task.dueDate);
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceType>(
    task.recurrence,
  );
  const [showRowDatePicker, setShowRowDatePicker] = useState(false);
  const [showTaskSchedule, setShowTaskSchedule] = useState(false);
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const rowDatePickerRef = useRef<HTMLDivElement>(null);
  const taskMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!rowDatePickerRef.current?.contains(e.target as Node))
        setShowRowDatePicker(false);
      if (!taskMenuRef.current?.contains(e.target as Node))
        setShowTaskMenu(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleSave() {
    if (editTitle.trim()) {
      onUpdate(task.id, {
        title: editTitle.trim(),
        dueDate: editDueDate,
        recurrence: editRecurrence,
      });
    }
    onStopEdit();
  }

  const hasTaskMeta = Boolean(
    task.dueDate || (!task.completed && task.recurrence),
  );

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl shadow-xs transition-all animate-in fade-in zoom-in-95 duration-100">
        {/* Title Input */}
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Task title..."
          className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
        />

        {/* Row for Date Picker & Recurrence Selection */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-28" ref={rowDatePickerRef}>
            <button
              onClick={() => setShowRowDatePicker(!showRowDatePicker)}
              className="w-full flex items-center gap-1.5 px-2.5 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:border-slate-300"
            >
              <Clock size={13} className="text-slate-400" />
              <span className="truncate">
                {editDueDate ? getDateLabel(editDueDate) : "No Date"}
                {editRecurrence && (
                  <Repeat size={10} className="inline ml-1 text-emerald-600" />
                )}
              </span>
              {editDueDate && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditDueDate(null);
                    setEditRecurrence(null);
                  }}
                  className="ml-auto p-0.5 hover:bg-slate-100 rounded cursor-pointer"
                >
                  <X size={10} strokeWidth={3} />
                </div>
              )}
            </button>

            {showRowDatePicker && (
              <CustomDatePicker
                value={editDueDate}
                onChange={setEditDueDate}
                recurrence={editRecurrence}
                onRecurrenceChange={setEditRecurrence}
                onClose={() => setShowRowDatePicker(false)}
              />
            )}
          </div>
        </div>

        {/* Editor controls */}
        <div className="flex gap-2 justify-end mt-1">
          <button
            onClick={onStopEdit}
            className="px-3 py-1.5 border border-slate-200 hover:bg-white text-slate-500 font-semibold text-xs rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1"
          >
            <Check size={12} strokeWidth={3} />
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("taskId", task.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        className={`task-row group flex gap-3 py-2.5 px-3 rounded-xl border border-transparent transition-all cursor-grab active:cursor-grabbing ${hasTaskMeta ? "items-start" : "items-center"}`}
      >
        {/* Complete Task checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={`${hasTaskMeta ? "mt-0.5" : ""} h-5 w-5 flex-shrink-0 rounded-full border flex items-center justify-center transition-all ${
            task.completed
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "border-slate-300 hover:border-slate-400 bg-white"
          }`}
        >
          {task.completed && <Check size={11} strokeWidth={3.5} />}
        </button>

        {/* Task Details */}
        <div
          className={`min-w-0 flex-1 ${hasTaskMeta ? "" : "flex h-5 items-center"}`}
          onDoubleClick={onStartEdit}
        >
          <p
            className={`${hasTaskMeta ? "" : "leading-5"} truncate text-sm font-semibold ${task.completed ? "text-slate-400 line-through" : "text-slate-800"}`}
          >
            {task.title}
          </p>

          {/* Indicators beneath the title (Due Date & Recurrence) */}
          <div className="flex items-center gap-2 mt-1">
            {task.dueDate && (
              <button
                type="button"
                title="Edit due date"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditDueDate(task.dueDate);
                  setEditRecurrence(task.recurrence);
                  setShowTaskSchedule(true);
                }}
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors hover:opacity-80 ${
                  task.completed
                    ? "bg-slate-100 text-slate-400"
                    : "task-date-pill"
                }`}
              >
                {getDateLabel(task.dueDate)}
              </button>
            )}
            {!task.completed && task.recurrence && (
              <div className="task-date-pill-bg flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 rounded-md">
                <Repeat size={10} strokeWidth={2.5} />
                <span className="capitalize">{task.recurrence}</span>
              </div>
            )}
          </div>
        </div>

        {/* Task actions */}
        <div
          className={`relative ml-1 shrink-0 ${hasTaskMeta ? "" : "h-5"}`}
          ref={taskMenuRef}
        >
          <button
            onClick={() => setShowTaskMenu((value) => !value)}
            aria-label="Task options"
            aria-expanded={showTaskMenu}
            aria-haspopup="menu"
            className={`${hasTaskMeta ? "p-2" : "h-5 w-5 p-0"} rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-800`}
          >
            <MoreVertical size={17} strokeWidth={2.5} />
          </button>
          {showTaskMenu && (
            <div
              className="absolute right-0 top-full z-30 mt-1 w-36 origin-top-right rounded-xl border border-slate-200 bg-white py-1 shadow-lg animate-in fade-in zoom-in-95 slide-in-from-top-1 duration-150"
              role="menu"
            >
              <button
                onClick={() => {
                  setShowTaskMenu(false);
                  onStartEdit();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                role="menuitem"
              >
                <Edit3 size={14} className="text-slate-500" />
                Edit
              </button>
              <button
                onClick={() => {
                  setShowTaskMenu(false);
                  onDelete(task.id);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                role="menuitem"
              >
                <Trash2 size={14} className="text-rose-500" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {showTaskSchedule && (
        <CustomDatePicker
          value={editDueDate}
          onChange={setEditDueDate}
          recurrence={editRecurrence}
          onRecurrenceChange={setEditRecurrence}
          onClose={() => {
            onUpdate(task.id, {
              dueDate: editDueDate,
              recurrence: editRecurrence,
            });
            setShowTaskSchedule(false);
          }}
        />
      )}
    </>
  );
}
