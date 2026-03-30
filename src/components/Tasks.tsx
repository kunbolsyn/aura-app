import React, { useState } from "react";
import { CalendarDays, Repeat, Plus } from "lucide-react";
import type { Task, TaskList, RecurrenceType } from "../types";

type TasksProps = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  lists: TaskList[];
  activeListId: string;
};

function getVisibleTasks(tasks: Task[], activeListId: string): Task[] {
  return tasks.filter((task) => task.listId === activeListId);
}

function Tasks({ tasks, setTasks, lists, activeListId }: TasksProps) {
  const [input, setInput] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRecurPicker, setShowRecurPicker] = useState(false);

  const activeList = lists.find((l) => l.id === activeListId);
  const visibleTasks = getVisibleTasks(tasks, activeListId);
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
  } //i odnt udnerstand

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <h2 className="text-xl font-medium text-stone-800 mb-4">
        {activeList?.name ?? "Tasks"}
      </h2>
      <p className="text-sm text-stone-400 mb-8">
        {new Date().toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </p>

      <div className="relative">
        <div className="flex items-center gap-3 border-b border-stone-200 pb-3 mb-8">
          <Plus size={14} className="text-stone-300 shrink-0" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTask()}
            placeholder="Add a task..."
            className="flex-1 text-sm text-stone-800 placeholder:text-stone-300 bg-transparent outline-none"
          />

          <button
            onClick={() => {
              setShowDatePicker((p) => !p);
              setShowRecurPicker(false);
            }}
            className={`p-1.5 rounded-md transition-colors ${
              dueDate || showDatePicker
                ? "text-stone-700 bg-stone-100"
                : "text-stone-300 hover:text-stone-500"
            }`}
          >
            <CalendarDays size={14} />
          </button>

          <button
            onClick={() => {
              setShowRecurPicker((p) => !p);
              setShowDatePicker(false);
            }}
            className={`p-1.5 rounded-md transition-colors ${
              recurrence || showRecurPicker
                ? "text-stone-700 bg-stone-100"
                : "text-stone-300 hover:text-stone-500"
            }`}
          >
            <Repeat size={14} />
          </button>
        </div>

        {showDatePicker && (
          <div className="absolute right-0 top-12 z-10 bg-white border border-stone-200 rounded-xl p-3 shadow-sm">
            <input
              type="date"
              value={dueDate ?? ""}
              onChange={(e) => {
                setDueDate(e.target.value || null);
                setShowDatePicker(false);
              }}
              className="text-sm text-stone-700 outline-none"
            />
          </div>
        )}

        {showRecurPicker && (
          <div className="absolute right-0 top-12 z-10 bg-white border border-stone-200 rounded-xl py-2 min-w-36 shadow-sm">
            <p className="text-xs text-stone-400 px-3 pb-2 uppercase tracking-wide font-medium">
              Repeats
            </p>
            {["daily", "weekdays", "weekly", "monthly", "yearly", "custom"].map(
              (r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRecurrence(
                      r === recurrence ? null : (r as RecurrenceType),
                    );
                    setShowRecurPicker(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                    recurrence === r
                      ? "text-stone-800 font-medium"
                      : "text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ),
            )}
          </div>
        )}
      </div>

      {pendingTasks.length === 0 && completedTasks.length === 0 && (
        <p className="text-sm text-stone-300 text-center mt-16">
          No tasks yet. Add one above.
        </p>
      )}

      <div className="flex flex-col">
        {pendingTasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        ))}
      </div>

      {completedTasks.length > 0 && (
        <div className="mt-8">
          <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-3">
            Completed · {completedTasks.length}
          </p>
          <div className="flex flex-col">
            {completedTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onDelete={deleteTask}
              />
            ))}
          </div>
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
};

function TaskRow({ task, onToggle, onDelete }: TaskRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-stone-100 group">
      <button
        onClick={() => onToggle(task.id)}
        className={`w-4 h-4 rounded-full border shrink-0 transition-colors ${
          task.completed
            ? "bg-stone-300 border-stone-300"
            : "border-stone-300 hover:border-stone-400"
        }`}
      />
      <span
        className={`flex-1 text-sm ${
          task.completed ? "line-through text-stone-300" : "text-stone-700"
        }`}
      >
        {task.title}
      </span>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.recurrence && (
          <span className="text-xs text-stone-400 border border-stone-200 rounded-full px-2 py-0.5">
            {task.recurrence}
          </span>
        )}
        {task.dueDate && (
          <span className="text-xs text-stone-400">
            {new Date(task.dueDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="text-stone-300 hover:text-red-400 transition-colors text-xs px-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default Tasks;
