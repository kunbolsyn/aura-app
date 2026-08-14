import { useState, useRef, useEffect } from "react";
import { CalendarDays, Repeat, Plus, Check, Trash2, X, Edit3, MoreVertical } from "lucide-react";
import type { Task, TaskList, RecurrenceType } from "../types";

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
  const d = new Date(dateStr);
  
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  
  // Format to dd.mm.yyyy
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function calculateNextDate(currentDateStr: string, recurrence: NonNullable<RecurrenceType>): string | null {
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

// --- Main Component ---

export default function Tasks({ tasks, setTasks, lists, activeListId, onListSelect, onAddList, onDeleteList, onRenameList, onCloseTasksMobile }: Props) {
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(null);
  const [showRecurPopup, setShowRecurPopup] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New: modern list dropdown state + refs
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [activeActionsListId, setActiveActionsListId] = useState<string | null>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);

  // Ref for date input to control picker behavior
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const recurPopupRef = useRef<HTMLDivElement>(null);

  // Click outside handlers: close recurrence popup and list menu
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!recurPopupRef.current?.contains(e.target as Node)) setShowRecurPopup(false);
      if (!listMenuRef.current?.contains(e.target as Node)) {
        setListMenuOpen(false);
        setActiveActionsListId(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

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
            completed: false
          };
          
          return [
            ...prev.map((t) => (t.id === id ? { ...t, completed: true } : t)),
            nextTask
          ];
        }
      }

      return prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
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

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
        {/* Header */}
        <div className="mb-6">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-extrabold text-slate-900 text-base mb-2">Tasks</span>

                  {/* Modern list selector (custom dropdown) */}
                  <div className="relative" ref={listMenuRef}>
                    <button
                      onClick={() => setListMenuOpen((v) => !v)}
                      aria-haspopup="true"
                      aria-expanded={listMenuOpen}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-bold text-slate-800"
                    >
                      <span className="truncate">{lists.find(l => l.id === activeListId)?.name ?? 'Select list'}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-400"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>

                    {listMenuOpen && (
                      <div className="absolute mt-2 left-0 z-20 w-56 bg-white border border-slate-200 rounded-2xl py-2 shadow-lg">
                        <div className="max-h-52 overflow-auto">
                          {lists.map(l => (
                            <div
                              key={l.id}
                              className={`group/listitem relative flex items-center justify-between px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-slate-50 ${
                                l.id === activeListId ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                              }`}
                            >
                              <button
                                onClick={() => {
                                  onListSelect(l.id);
                                  setListMenuOpen(false);
                                }}
                                className="text-left flex-1 min-w-0 py-1 truncate"
                              >
                                {l.name}
                              </button>

                              <div className="relative shrink-0 flex items-center ml-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionsListId(activeActionsListId === l.id ? null : l.id);
                                  }}
                                  className="p-1 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-700 transition-all opacity-0 group-hover/listitem:opacity-100"
                                >
                                  <MoreVertical size={13} />
                                </button>

                                {activeActionsListId === l.id && (
                                  <div className="absolute right-0 top-full mt-1 z-30 w-36 bg-white border border-slate-200 rounded-xl py-1 shadow-md">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newName = prompt("Rename List:", l.name);
                                        if (newName && newName.trim()) {
                                          onRenameList(l.id, newName.trim());
                                        }
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
                                        if (confirm(`Are you sure you want to delete list "${l.name}"?`)) {
                                          onDeleteList(l.id);
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
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-slate-100 p-3">
                          <button
                            onClick={() => {
                              const name = prompt('New list name')?.trim()
                              if (name) { onAddList(name); setListMenuOpen(false); }
                            }}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            <Plus size={14} />
                            Add list
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Close button (always visible) */}
                <div className="flex items-center gap-2">
                  {onCloseTasksMobile && (
                    <button
                      onClick={onCloseTasksMobile}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-all"
                      aria-label="Close tasks"
                    >
                      <X size={18} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-wide">
                {new Date().toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>

        {/* Add Task Box - GOOGLE CALENDAR STYLE */}
        <div className="mb-6">
          <div className="border border-slate-200/80 rounded-2xl bg-slate-50/50 hover:bg-white shadow-xs focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-500 focus-within:bg-white transition-all flex flex-col p-3.5 gap-3">
            
            {/* Top Row: Input Field */}
            <div className="flex items-center gap-2.5">
              <Plus size={18} className="text-slate-400 shrink-0" strokeWidth={2.5} />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Add a task..."
                className="flex-1 min-w-0 text-sm font-semibold text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
              />
            </div>

            {/* Bottom Row: Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap pl-1.5">
              
              {/* Native Date Picker */}
              <div className="relative flex items-center justify-center shrink-0">
                <input
                  ref={dateInputRef}
                  type="date"
                  value={dueDate ?? ""}
                  onChange={(e) => setDueDate(e.target.value || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    dueDate
                      ? "text-blue-700 bg-blue-50 border border-blue-200"
                      : "text-slate-500 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100/50"
                  }`}
                >
                  <CalendarDays size={14} strokeWidth={2.5} />
                  {dueDate ? <span>{getDateLabel(dueDate)}</span> : <span>Set Date</span>}
                  
                  {/* Clear date option */}
                  {dueDate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDueDate(null);
                      }}
                      className="ml-1 z-20 p-0.5 hover:bg-blue-200/50 rounded text-blue-800"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  )}
                </div>
              </div>

              {/* Recurrence Button */}
              <div className="relative shrink-0" ref={recurPopupRef}>
                <div
                  onClick={() => setShowRecurPopup((p) => !p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                    recurrence || showRecurPopup
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                      : "text-slate-500 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-100/50"
                  }`}
                >
                  <Repeat size={14} strokeWidth={2.5} />
                  {recurrence ? (
                    <span>
                      {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
                    </span>
                  ) : (
                    <span>Repeat</span>
                  )}

                  {/* Clear recurrence option */}
                  {recurrence && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecurrence(null);
                        setShowRecurPopup(false);
                      }}
                      className="ml-1 p-0.5 hover:bg-emerald-200/50 rounded text-emerald-800"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  )}
                </div>
                
                {/* Recurrence Dropdown */}
                {showRecurPopup && (
                  <div className="absolute left-0 top-full mt-2 z-20 bg-white border border-slate-200 rounded-2xl py-2.5 min-w-44 shadow-lg shadow-slate-200/50">
                    <p className="text-[10px] text-slate-400 px-3.5 pb-1.5 uppercase tracking-wider font-extrabold">
                      Repeat Pattern
                    </p>
                    <button
                      onClick={() => {
                        setRecurrence(null);
                        setShowRecurPopup(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      None
                    </button>
                    {RECURRENCE_OPTIONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setRecurrence(r);
                          setShowRecurPopup(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-semibold transition-colors ${
                          recurrence === r
                            ? "text-emerald-700 font-bold bg-emerald-50"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
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
          <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-slate-100">
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
                  key={task.id}
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
                  key={task.id}
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

function TaskRow({ task, onToggle, onDelete, onUpdate, isEditing, onStartEdit, onStopEdit }: TaskRowProps) {
  // Detailed edit states (Title, Date, Recurrence)
  const [editTitle, setEditTitle]           = useState(task.title);
  const [editDueDate, setEditDueDate]       = useState<string | null>(task.dueDate);
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceType>(task.recurrence);

  useEffect(() => {
    setEditTitle(task.title);
    setEditDueDate(task.dueDate);
    setEditRecurrence(task.recurrence);
  }, [task.title, task.dueDate, task.recurrence]);

  function handleSave() {
    if (editTitle.trim()) {
      onUpdate(task.id, {
        title: editTitle.trim(),
        dueDate: editDueDate,
        recurrence: editRecurrence
      });
    }
    onStopEdit();
  }

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
          
          {/* Due date picker */}
          <div className="flex-1 min-w-28 relative">
            <input
              type="date"
              value={editDueDate ?? ""}
              onChange={(e) => setEditDueDate(e.target.value || null)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
            />
            <div className="flex items-center gap-1.5 px-2.5 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:border-slate-300">
              <CalendarDays size={13} className="text-slate-400" />
              <span className="truncate">
                {editDueDate ? getDateLabel(editDueDate) : "No Date"}
              </span>
              {editDueDate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditDueDate(null);
                  }}
                  className="ml-auto z-20 p-0.5 hover:bg-slate-100 rounded"
                >
                  <X size={10} strokeWidth={3} />
                </button>
              )}
            </div>
          </div>

          {/* Recurrence Dropdown */}
          <select
            value={editRecurrence ?? ""}
            onChange={(e) => setEditRecurrence((e.target.value as RecurrenceType) || null)}
            className="flex-1 min-w-28 px-2.5 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:border-slate-300 outline-none"
          >
            <option value="">No Repeat</option>
            {RECURRENCE_OPTIONS.map(opt => (
              <option key={opt} value={opt}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>

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
    <div 
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group flex items-start gap-3 py-2.5 px-3 rounded-xl border border-transparent hover:border-slate-100 hover:bg-slate-50/50 transition-all cursor-grab active:cursor-grabbing"
    >
      {/* Complete Task checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 flex-shrink-0 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
          task.completed
            ? "bg-emerald-600 border-emerald-600 text-white"
            : "border-slate-300 hover:border-slate-400 bg-white"
        }`}
      >
        {task.completed && <Check size={11} strokeWidth={3.5} />}
      </button>

      {/* Task Details */}
      <div className="flex-1 min-w-0" onDoubleClick={onStartEdit}>
        <p className={`text-sm font-semibold truncate ${task.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>
          {task.title}
        </p>
        
        {/* Indicators beneath the title (Due Date & Recurrence) */}
        <div className="flex items-center gap-2 mt-1">
          {task.dueDate && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              task.completed 
                ? "bg-slate-100 text-slate-400" 
                : "bg-blue-50 text-blue-600"
            }`}>
              {getDateLabel(task.dueDate)}
            </span>
          )}
          {!task.completed && task.recurrence && (
            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              <Repeat size={10} strokeWidth={2.5} />
              <span>Repeats {task.recurrence}</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Action overlay */}
      <div className="opacity-0 group-hover:opacity-100 transition-all duration-100 flex items-center gap-0.5 shrink-0 ml-1">
        <button
          onClick={onStartEdit}
          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all"
        >
          <Edit3 size={13} strokeWidth={2.5} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
        >
          <Trash2 size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
