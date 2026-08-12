import { useState, useRef, useEffect } from "react";
import { CalendarDays, Repeat, Plus, Check, Trash2  } from "lucide-react";
import type { Task, TaskList, RecurrenceType } from "../types";

type Props = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  lists: TaskList[];
  activeListId: string;
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

export default function Tasks({ tasks, setTasks, lists, activeListId }: Props) {
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(null);
  const [showRecurPopup, setShowRecurPopup] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const recurPopupRef = useRef<HTMLDivElement>(null);

  // Click outside to close recurrence popup
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!recurPopupRef.current?.contains(e.target as Node)) setShowRecurPopup(false);
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
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Header */}
      <h2 className="text-2xl font-medium text-stone-800 mb-1">
        {activeList?.name ?? "Tasks"}
      </h2>
      <p className="text-sm text-stone-400 mb-8">
        {new Date().toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>

      {/* Add Task Box - GOOGLE CALENDAR STYLE */}
      <div className="relative mb-8">
        <div className="border border-stone-200 rounded-xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-stone-100 transition-all flex flex-col p-3 gap-3">
          
          {/* Top Row: Input Field */}
          <div className="flex items-center gap-3 px-1">
            <Plus size={16} className="text-stone-400 shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Add a task..."
              className="flex-1 min-w-0 text-sm text-stone-800 placeholder:text-stone-300 bg-transparent outline-none"
            />
          </div>

          {/* Bottom Row: Action Buttons */}
          <div className="flex items-center gap-2 pl-7 shrink-0 flex-wrap">
            
            {/* Native Date Picker */}
            <div className="relative flex items-center justify-center group shrink-0">
              <input
                type="date"
                value={dueDate ?? ""}
                onChange={(e) => setDueDate(e.target.value || null)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />
              <button
                type="button"
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                  dueDate
                    ? "text-stone-700 bg-stone-100"
                    : "text-stone-400 group-hover:text-stone-600 group-hover:bg-stone-50 border border-transparent group-hover:border-stone-100"
                }`}
              >
                <CalendarDays size={14} />
                {dueDate ? <span>{getDateLabel(dueDate)}</span> : <span>Date</span>}
              </button>
            </div>

            {/* Recurrence Button */}
            <div className="relative shrink-0" ref={recurPopupRef}>
              <button
                onClick={() => setShowRecurPopup((p) => !p)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                  recurrence || showRecurPopup
                    ? "text-stone-700 bg-stone-100"
                    : "text-stone-400 hover:text-stone-600 hover:bg-stone-50 border border-transparent hover:border-stone-100"
                }`}
              >
                <Repeat size={14} />
                {recurrence ? (
                  <span>
                    {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
                  </span>
                ) : (
                  <span>Repeat</span>
                )}
              </button>
              
              {/* Recurrence Dropdown */}
              {showRecurPopup && (
                <div className="absolute left-0 top-full mt-2 z-20 bg-white border border-stone-200 rounded-xl py-2 min-w-40 shadow-lg">
                  <p className="text-[10px] text-stone-400 px-3 pb-1 uppercase tracking-wider font-semibold">
                    Repeat Pattern
                  </p>
                  <button
                    onClick={() => {
                      setRecurrence(null);
                      setShowRecurPopup(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
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
                      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                        recurrence === r
                          ? "text-stone-900 font-medium bg-stone-50"
                          : "text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {pendingTasks.length === 0 && completedTasks.length === 0 && (
        <p className="text-sm text-stone-400 text-center mt-16">
          No tasks yet. Add one above.
        </p>
      )}

      {/* Grouped Pending Tasks */}
      {groupTasks(pendingTasks).map(([header, group]) => (
        <div key={header} className="mb-6">
          <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-3 pl-1">
            {header}
          </p>
          <div className="space-y-1">
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
        <div className="mt-10">
          <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-3 pl-1">
            Completed · {completedTasks.length}
          </p>
          <div className="space-y-1 opacity-70">
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
  const [editTitle, setEditTitle] = useState(task.title);

  useEffect(() => {
    setEditTitle(task.title);
  }, [task.title]);

  function handleSave() {
    if (editTitle.trim() && editTitle !== task.title) {
      onUpdate(task.id, { title: editTitle.trim() });
    }
    onStopEdit();
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 px-2 py-2 bg-stone-50 rounded-lg border border-stone-200">
        <input
          autoFocus
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onStopEdit();
          }}
          onBlur={handleSave}
          className="flex-1 bg-transparent text-sm text-stone-800 outline-none"
        />
      </div>
    );
  }

  return (
    <div 
      draggable
      onDragStart={(e) => {
        // Sets the task ID to be read by the drop zone
        e.dataTransfer.setData("taskId", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="group flex items-start gap-3 py-2 px-2 rounded-lg hover:bg-stone-50 transition-colors cursor-grab active:cursor-grabbing"
    >
      <button
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
          task.completed
            ? "bg-stone-800 border-stone-800 text-white"
            : "border-stone-300 hover:border-stone-400"
        }`}
      >
        {task.completed && <Check size={10} strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0" onDoubleClick={onStartEdit}>
        <p className={`text-sm truncate ${task.completed ? "text-stone-400 line-through" : "text-stone-700"}`}>
          {task.title}
        </p>
        
        {/* Indicators beneath the title (Recurrence) */}
        {!task.completed && task.recurrence && (
          <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-400">
            <div className="flex items-center gap-1">
              <Repeat size={10} />
              <span>Repeats {task.recurrence}</span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}