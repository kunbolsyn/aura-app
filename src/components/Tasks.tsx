import { useState, useRef, useEffect } from "react";
import { CalendarDays, Repeat, Plus } from "lucide-react";
import type { Task, TaskList, RecurrenceType } from "../types";

type Props = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  lists: TaskList[];
  activeListId: string;
};

function getDateLabel(dateStr: string | null): string {
  if (!dateStr) return "";
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const d = new Date(dateStr);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
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

const RECURRENCE_OPTIONS = [
  "daily",
  "weekdays",
  "weekly",
  "monthly",
  "yearly",
  "custom",
];

function Tasks({ tasks, setTasks, lists, activeListId }: Props) {
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(null);
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [showRecurPopup, setShowRecurPopup] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function updateTask(id: string, changes: Partial<Task>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...changes } : t)),
    );
  }

  function setToday() {
    setDueDate(new Date().toISOString().split("T")[0]);
    setShowDatePopup(false);
  }

  function setTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setDueDate(d.toISOString().split("T")[0]);
    setShowDatePopup(false);
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes popupSlide {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .popup-animate {
          animation: popupSlide 0.12s ease-out;
        }
      `}</style>

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

      {/* Add task box */}
      <div className="relative mb-8">
        <div className="border border-stone-200 rounded-xl bg-white">
          <div className="flex items-center gap-2 px-4 py-3">
            <Plus size={14} className="text-stone-300 shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="Add a task..."
              className="flex-1 text-sm text-stone-800 placeholder:text-stone-300 bg-transparent outline-none"
            />

            {/* Date button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDatePopup((p) => !p);
                  setShowRecurPopup(false);
                }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                  dueDate || showDatePopup
                    ? "text-stone-700 bg-stone-100"
                    : "text-stone-300 hover:text-stone-500 hover:bg-stone-50"
                }`}
              >
                <CalendarDays size={13} />
                {dueDate && <span>{getDateLabel(dueDate)}</span>}
              </button>
              {showDatePopup && (
                <div className="popup-animate absolute right-0 top-full mt-1.5 z-10 bg-white border border-stone-200 rounded-xl py-1.5 min-w-44 shadow-sm">
                  <button
                    onClick={setToday}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-800 transition-colors"
                  >
                    <CalendarDays size={13} /> Today
                  </button>
                  <button
                    onClick={setTomorrow}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-800 transition-colors"
                  >
                    <CalendarDays size={13} /> Tomorrow
                  </button>
                  <div className="h-px bg-stone-100 my-1" />
                  <button
                    onClick={() => setShowCustomDate((p) => !p)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 hover:text-stone-800 transition-colors"
                  >
                    <CalendarDays size={13} /> Pick a date
                  </button>
                  {showCustomDate && (
                    <div className="px-3 pb-2">
                      <input
                        type="date"
                        value={dueDate ?? ""}
                        onChange={(e) => {
                          setDueDate(e.target.value || null);
                          setShowDatePopup(false);
                          setShowCustomDate(false);
                        }}
                        className="text-sm text-stone-700 outline-none border border-stone-200 rounded-lg px-2 py-1.5 w-full mt-1"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recurrence button */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowRecurPopup((p) => !p);
                  setShowDatePopup(false);
                }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                  recurrence || showRecurPopup
                    ? "text-stone-700 bg-stone-100"
                    : "text-stone-300 hover:text-stone-500 hover:bg-stone-50"
                }`}
              >
                <Repeat size={13} />
                {recurrence && (
                  <span>
                    {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
                  </span>
                )}
              </button>
              {showRecurPopup && (
                <div className="popup-animate absolute right-0 top-full mt-1.5 z-10 bg-white border border-stone-200 rounded-xl py-1.5 min-w-40 shadow-sm">
                  <p className="text-xs text-stone-400 px-3 pb-1 pt-0.5 uppercase tracking-wide font-medium">
                    Repeats
                  </p>
                  {RECURRENCE_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setRecurrence(
                          r === recurrence ? null : (r as RecurrenceType),
                        );
                        setShowRecurPopup(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        recurrence === r
                          ? "text-stone-800 font-medium bg-stone-50"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
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
        <p className="text-sm text-stone-300 text-center mt-16">
          No tasks yet. Add one above.
        </p>
      )}

      {/* Grouped pending tasks */}
      {groupTasks(pendingTasks).map(([header, group]) => (
        <div key={header} className="mb-6">
          <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-2">
            {header}
          </p>
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
      ))}

      {/* Completed */}
      {completedTasks.length > 0 && (
        <div className="mt-8">
          <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-2">
            Completed · {completedTasks.length}
          </p>
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
      )}
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

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
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDate, setEditDate] = useState(task.dueDate);
  const [editRecur, setEditRecur] = useState(task.recurrence);
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [showRecurPopup, setShowRecurPopup] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // sync local state when task changes externally
  useEffect(() => {
    setEditTitle(task.title);
    setEditDate(task.dueDate);
    setEditRecur(task.recurrence);
  }, [task]);

  function save() {
    if (editTitle.trim()) {
      onUpdate(task.id, {
        title: editTitle.trim(),
        dueDate: editDate,
        recurrence: editRecur,
      });
    }
    onStopEdit();
  }

  function cancel() {
    setEditTitle(task.title);
    setEditDate(task.dueDate);
    setEditRecur(task.recurrence);
    onStopEdit();
  }

  // click outside to save
  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!boxRef.current?.contains(e.relatedTarget as Node)) {
      save();
    }
  }

  function setToday() {
    setEditDate(new Date().toISOString().split("T")[0]);
    setShowDatePopup(false);
  }

  function setTomorrow() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setEditDate(d.toISOString().split("T")[0]);
    setShowDatePopup(false);
  }

  return (
    <>
      {/* Task row — hidden while editing */}
      {!isEditing && (
        <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-stone-50 group transition-colors">
          <button
            onClick={() => onToggle(task.id)}
            className={`w-4 h-4 rounded-full border shrink-0 transition-colors ${
              task.completed
                ? "bg-stone-300 border-stone-300"
                : "border-stone-300 hover:border-stone-400"
            }`}
          />
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onStartEdit}>
            <p
              className={`text-sm ${task.completed ? "line-through text-stone-300" : "text-stone-700"}`}
            >
              {task.title}
            </p>
            {(task.dueDate || task.recurrence) && (
              <div className="flex items-center gap-3 mt-0.5">
                {task.dueDate && (
                  <span className="flex items-center gap-1 text-xs text-stone-400">
                    <CalendarDays size={10} /> {getDateLabel(task.dueDate)}
                  </span>
                )}
                {task.recurrence && (
                  <span className="flex items-center gap-1 text-xs text-stone-400">
                    <Repeat size={10} />{" "}
                    {task.recurrence.charAt(0).toUpperCase() +
                      task.recurrence.slice(1)}
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => onDelete(task.id)}
            className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Edit box — slides in below */}
      {isEditing && (
        <div
          ref={boxRef}
          onBlur={handleBlur}
          className="border border-stone-300 rounded-xl bg-white my-1"
          style={{ animation: "slideDown 0.15s ease-out" }}
        >
          <div className="flex items-center gap-2 px-4 py-3">
            <button
              onClick={() => onToggle(task.id)}
              className={`w-4 h-4 rounded-full border shrink-0 ${
                task.completed
                  ? "bg-stone-300 border-stone-300"
                  : "border-stone-300"
              }`}
            />
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              className="flex-1 text-sm text-stone-800 bg-transparent outline-none"
            />

            {/* Date pill */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowDatePopup((p) => !p);
                  setShowRecurPopup(false);
                }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                  editDate || showDatePopup
                    ? "text-stone-700 bg-stone-100"
                    : "text-stone-300 hover:text-stone-500 hover:bg-stone-50"
                }`}
              >
                <CalendarDays size={13} />
                {editDate && <span>{getDateLabel(editDate)}</span>}
              </button>
              {showDatePopup && (
                <div className="popup-animate absolute right-0 top-full mt-1.5 z-20 bg-white border border-stone-200 rounded-xl py-1.5 min-w-44 shadow-sm">
                  <button
                    onClick={setToday}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    <CalendarDays size={13} /> Today
                  </button>
                  <button
                    onClick={setTomorrow}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    <CalendarDays size={13} /> Tomorrow
                  </button>
                  <div className="h-px bg-stone-100 my-1" />
                  <button
                    onClick={() => setShowCustomDate((p) => !p)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                  >
                    <CalendarDays size={13} /> Pick a date
                  </button>
                  {showCustomDate && (
                    <div className="px-3 pb-2">
                      <input
                        type="date"
                        value={editDate ?? ""}
                        onChange={(e) => {
                          setEditDate(e.target.value || null);
                          setShowDatePopup(false);
                          setShowCustomDate(false);
                        }}
                        className="text-sm text-stone-700 outline-none border border-stone-200 rounded-lg px-2 py-1.5 w-full mt-1"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Recurrence pill */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowRecurPopup((p) => !p);
                  setShowDatePopup(false);
                }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                  editRecur || showRecurPopup
                    ? "text-stone-700 bg-stone-100"
                    : "text-stone-300 hover:text-stone-500 hover:bg-stone-50"
                }`}
              >
                <Repeat size={13} />
                {editRecur && (
                  <span>
                    {editRecur.charAt(0).toUpperCase() + editRecur.slice(1)}
                  </span>
                )}
              </button>
              {showRecurPopup && (
                <div className="popup-animate absolute right-0 top-full mt-1.5 z-20 bg-white border border-stone-200 rounded-xl py-1.5 min-w-40 shadow-sm">
                  <p className="text-xs text-stone-400 px-3 pb-1 pt-0.5 uppercase tracking-wide font-medium">
                    Repeats
                  </p>
                  {RECURRENCE_OPTIONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setEditRecur(
                          r === editRecur ? null : (r as RecurrenceType),
                        );
                        setShowRecurPopup(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        editRecur === r
                          ? "text-stone-800 font-medium bg-stone-50"
                          : "text-stone-600 hover:bg-stone-50 hover:text-stone-800"
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
      )}
    </>
  );
}

export default Tasks;
