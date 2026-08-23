import { useState, useRef, useEffect } from "react";
import { Repeat, Plus, Check, Trash2, X, Edit3, MoreVertical, Clock, ChevronLeft, ChevronRight } from "lucide-react";
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

// --- Custom Components ---

function CustomDatePicker({ 
  value, 
  onChange, 
  recurrence, 
  onRecurrenceChange, 
  onClose 
}: { 
  value: string | null; 
  onChange: (date: string | null) => void;
  recurrence: RecurrenceType;
  onRecurrenceChange: (r: RecurrenceType) => void;
  onClose: () => void;
}) {
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const today = new Date();
  
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  
  const cells: { day: number; month: 'prev' | 'current' | 'next' }[] = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrev - i, month: 'prev' });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, month: 'current' });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startOffset + 1, month: 'next' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      {/* Overlay Content */}
      <div className="relative bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl min-w-[320px] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-extrabold text-slate-800">
            {viewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
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
      
        <div className="grid grid-cols-7 mb-3">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-black text-slate-400 py-1">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1.5 mb-6">
        {cells.map((cell, i) => {
          const cellDate = new Date(year, cell.month === 'current' ? month : cell.month === 'prev' ? month - 1 : month + 1, cell.day);
          const isoStr = cellDate.toISOString().split('T')[0];
          const isSelected = value === isoStr;
          const isToday = cell.month === 'current' && cell.day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          
          return (
            <button
              key={i}
              onClick={() => {
                onChange(isoStr);
              }}
                className={`text-center text-xs py-2.5 font-bold rounded-xl transition-all ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                    : isToday
                    ? 'text-blue-600 bg-blue-50'
                    : cell.month === 'current'
                    ? 'text-slate-700 hover:bg-slate-50'
                    : 'text-slate-300'
                }`}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

        <div className="border-t border-slate-100 pt-5 mb-6">
          <label className="block text-[10px] text-slate-400 uppercase tracking-widest font-black mb-2 px-1">
            Recurrence
          </label>
          <div className="relative">
            <select
              value={recurrence ?? ""}
              onChange={(e) => onRecurrenceChange((e.target.value as RecurrenceType) || null)}
              className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">No Repeat</option>
              {RECURRENCE_OPTIONS.map(opt => (
                <option key={opt} value={opt} className="capitalize">
                  {opt}
                </option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3.5 bg-blue-600 text-white text-xs font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
          >
            Save Schedule
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function Tasks({ tasks, setTasks, lists, activeListId, onListSelect, onAddList, onDeleteList, onRenameList, onCloseTasksMobile }: Props) {
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
  const [activeActionsListId, setActiveActionsListId] = useState<string | null>(null);
  const listMenuRef = useRef<HTMLDivElement>(null);

  // Date Picker Ref
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Click outside handlers: close recurrence popup and list menu
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!datePickerRef.current?.contains(e.target as Node)) setShowDatePicker(false);
      if (!addListRef.current?.contains(e.target as Node)) setShowAddListPopup(false);
      if (!listMenuRef.current?.contains(e.target as Node)) {
        setListMenuOpen(false);
        setActiveActionsListId(null);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

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
      <div className="tasks-scroll flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
        {/* Header */}
        <div className="mb-6">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="font-extrabold text-slate-900 text-base mb-2">Tasks</span>

                  {/* Modern list selector with actions menu on the right */}
                  <div className="flex items-center gap-2 relative" ref={listMenuRef}>
                    <div className="relative">
                      <button
                        onClick={() => setListMenuOpen((v) => !v)}
                        aria-haspopup="true"
                        aria-expanded={listMenuOpen}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-bold text-slate-800"
                      >
                        <span className="truncate">{activeList?.name ?? 'Select list'}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-slate-400"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>

                      {listMenuOpen && (
                        <div className="absolute mt-2 left-0 z-20 w-56 bg-white border border-slate-200 rounded-2xl py-2 shadow-lg">
                          <div className="max-h-52 overflow-auto">
                            {lists.map(l => (
                              <button
                                key={l.id}
                                onClick={() => {
                                  onListSelect(l.id);
                                  setListMenuOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-50 ${
                                  l.id === activeListId ? 'bg-blue-50 text-blue-700' : 'text-slate-700'
                                }`}
                              >
                                {l.name}
                              </button>
                            ))}
                          </div>

                          <div className="border-t border-slate-100 p-3" ref={addListRef}>
                            {!showAddListPopup ? (
                              <button
                                onClick={() => {
                                  setShowAddListPopup(true);
                                  setNewListName("");
                                }}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-blue-600 hover:bg-blue-50 transition-all"
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
                      <div className="relative">
                        <button
                          onClick={() => setActiveActionsListId(activeActionsListId === activeListId ? null : activeListId)}
                          className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:bg-slate-50 transition-all text-slate-500 hover:text-slate-700 flex items-center justify-center"
                          aria-label="List options"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeActionsListId === activeListId && (
                          <div className="absolute left-0 mt-1.5 z-30 w-36 bg-white border border-slate-200 rounded-xl py-1 shadow-md">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newName = prompt("Rename List:", activeList.name);
                                if (newName && newName.trim()) {
                                  onRenameList(activeList.id, newName.trim());
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
                                if (confirm(`Are you sure you want to delete list "${activeList.name}"?`)) {
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
                className="task-add-input flex-1 min-w-0 appearance-none bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:outline-none"
              />
            </div>

            {/* Bottom Row: Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap pl-1.5">
              
              {/* Custom Date & Time Picker Trigger */}
              <div className="relative shrink-0" ref={datePickerRef}>
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    dueDate || showDatePicker
                      ? "text-blue-700 bg-blue-50 border-blue-200"
                      : "text-slate-500 bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-100/50"
                  }`}
                >
                  <Clock size={14} strokeWidth={2.5} />
                  {dueDate ? (
                    <div className="flex items-center gap-1">
                      <span>{getDateLabel(dueDate)}</span>
                      {recurrence && <Repeat size={10} className="text-emerald-600" />}
                    </div>
                  ) : (
                    <span>Set date & time</span>
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
  const [showRowDatePicker, setShowRowDatePicker] = useState(false);
  const [showTaskMenu, setShowTaskMenu] = useState(false);
  const rowDatePickerRef = useRef<HTMLDivElement>(null);
  const taskMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEditTitle(task.title);
    setEditDueDate(task.dueDate);
    setEditRecurrence(task.recurrence);
  }, [task.title, task.dueDate, task.recurrence]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!rowDatePickerRef.current?.contains(e.target as Node)) setShowRowDatePicker(false);
      if (!taskMenuRef.current?.contains(e.target as Node)) setShowTaskMenu(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

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
          
          <div className="relative flex-1 min-w-28" ref={rowDatePickerRef}>
            <button
              onClick={() => setShowRowDatePicker(!showRowDatePicker)}
              className="w-full flex items-center gap-1.5 px-2.5 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-600 hover:border-slate-300"
            >
              <Clock size={13} className="text-slate-400" />
              <span className="truncate">
                {editDueDate ? getDateLabel(editDueDate) : "No Date"}
                {editRecurrence && <Repeat size={10} className="inline ml-1 text-emerald-600" />}
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
              <span className="capitalize">{task.recurrence}</span>
            </div>
          )}
        </div>
      </div>

      {/* Task actions */}
      <div className="relative shrink-0 ml-1" ref={taskMenuRef}>
        <button
          onClick={() => setShowTaskMenu(value => !value)}
          aria-label="Task options"
          aria-expanded={showTaskMenu}
          aria-haspopup="menu"
          className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
        >
          <MoreVertical size={17} strokeWidth={2.5} />
        </button>
        {showTaskMenu && (
          <div className="absolute right-0 top-full z-30 mt-1 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg" role="menu">
            <button
              onClick={() => { setShowTaskMenu(false); onStartEdit() }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              role="menuitem"
            >
              <Edit3 size={14} className="text-slate-500" />
              Edit
            </button>
            <button
              onClick={() => { setShowTaskMenu(false); onDelete(task.id) }}
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
  );
}
