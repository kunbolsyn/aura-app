import { useState, useEffect } from "react";
import { Menu, ListTodo } from "lucide-react";
import type { Task, TaskList, UserCalendar, UserEvent } from "./types";
import Sidebar from "./components/Sidebar";
import Tasks from "./components/Tasks";
import Calendar from "./components/Calendar";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_LISTS: TaskList[] = [
  { id: "personal", name: "Personal" },
  { id: "work",     name: "Work"     },
]

const DEFAULT_CALENDARS: UserCalendar[] = [
  { id: "personal", name: "Personal", color: "green" },
  { id: "work",     name: "Work",     color: "blue"  },
]

// ─── localStorage helpers ─────────────────────────────────────────────────────

function load<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as T) : fallback
  } catch {
    return fallback
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [activeListId, setActiveListId] = useState<string>('personal')
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[]>(
    DEFAULT_CALENDARS.map(c => c.id)
  )

  // Drawer states for responsiveness
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isTasksOpen, setIsTasksOpen] = useState(false)

  // persisted state — all loaded from localStorage on first render
  const [tasks, setTasks]       = useState<Task[]>      (() => load('aura-tasks',     []))
  const [lists, setLists]       = useState<TaskList[]>  (() => load('aura-lists',     DEFAULT_LISTS))
  const [calendars, setCalendars] = useState<UserCalendar[]>(() => load('aura-calendars', DEFAULT_CALENDARS))
  const [events, setEvents]     = useState<UserEvent[]> (() => load('aura-events',    []))

  // persist to localStorage whenever state changes
  useEffect(() => { localStorage.setItem('aura-tasks',     JSON.stringify(tasks))     }, [tasks])
  useEffect(() => { localStorage.setItem('aura-lists',     JSON.stringify(lists))     }, [lists])
  useEffect(() => { localStorage.setItem('aura-calendars', JSON.stringify(calendars)) }, [calendars])
  useEffect(() => { localStorage.setItem('aura-events',    JSON.stringify(events))    }, [events])

  function toggleCalendarVisibility(id: string) {
    setVisibleCalendarIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  function addList(name: string) {
    const newList: TaskList = { id: crypto.randomUUID(), name }
    setLists(prev => [...prev, newList])
  }

  function deleteList(id: string) {
    if (lists.length <= 1) {
      alert("You must keep at least one task list.")
      return
    }
    setLists(prev => prev.filter(l => l.id !== id))
    setTasks(prev => prev.filter(t => t.listId !== id))
    if (activeListId === id) {
      const remaining = lists.filter(l => l.id !== id)
      setActiveListId(remaining[0].id)
    }
  }

  function renameList(id: string, newName: string) {
    if (!newName.trim()) return
    setLists(prev => prev.map(l => l.id === id ? { ...l, name: newName.trim() } : l))
  }

  function addCalendar(name: string, color: UserCalendar['color']) {
    const newCal: UserCalendar = { id: crypto.randomUUID(), name, color }
    setCalendars(prev => [...prev, newCal])
    setVisibleCalendarIds(prev => [...prev, newCal.id])
  }

  function deleteCalendar(id: string) {
    if (calendars.length <= 1) {
      alert("You must keep at least one calendar.")
      return
    }
    setCalendars(prev => prev.filter(c => c.id !== id))
    setEvents(prev => prev.filter(e => e.calendarId !== id))
    setVisibleCalendarIds(prev => prev.filter(cId => cId !== id))
  }

  function updateCalendar(id: string, name: string, color: UserCalendar['color']) {
    if (!name.trim()) return
    setCalendars(prev => prev.map(c => c.id === id ? { ...c, name: name.trim(), color } : c))
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      
      {/* Mobile Responsive Header */}
      <header className="lg:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200/80 shadow-sm shrink-0 z-20">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -ml-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          <Menu size={20} strokeWidth={2.5} />
        </button>
        <span className="font-extrabold text-slate-900 text-lg tracking-tight flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-sm shadow-emerald-600/30"></span>
          Aura
        </span>
        <button
          onClick={() => setIsTasksOpen(true)}
          className="p-2 -mr-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all relative"
        >
          <ListTodo size={20} strokeWidth={2.5} />
          {tasks.filter(t => t.listId === activeListId && !t.completed).length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white"></span>
          )}
        </button>
      </header>

      {/* Sidebar Overlay and Drawer for Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-50 border-r border-slate-200/80 transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none lg:z-auto lg:w-60 shrink-0 flex
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <Sidebar
          lists={lists}
          calendars={calendars}
          activeListId={activeListId}
          onListSelect={(id) => {
            setActiveListId(id)
            setIsSidebarOpen(false) // auto close on mobile
          }}
          visibleCalendarIds={visibleCalendarIds}
          onToggleCalendar={toggleCalendarVisibility}
          onAddList={addList}
          onDeleteList={deleteList}
          onRenameList={renameList}
          onAddCalendar={addCalendar}
          onDeleteCalendar={deleteCalendar}
          onUpdateCalendar={updateCalendar}
        />
      </div>

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Calendar View (Fills middle/main area) */}
        <div className="flex-1 min-w-0 overflow-hidden bg-white">
          <Calendar
            events={events}
            setEvents={setEvents}
            tasks={tasks}
            setTasks={setTasks}
            calendars={calendars}
            visibleCalendarIds={visibleCalendarIds}
            onToggleTasks={() => setIsTasksOpen(prev => !prev)}
            isTasksOpen={isTasksOpen}
          />
        </div>

        {/* Tasks Panel Overlay and Drawer for Mobile */}
        {isTasksOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden transition-opacity"
            onClick={() => setIsTasksOpen(false)}
          />
        )}
        <div className={`
          fixed inset-y-0 right-0 z-40 w-90 max-w-[85vw] bg-white border-l border-slate-200/80 transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none lg:z-auto lg:w-85 shrink-0 flex
          ${isTasksOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        `}>
          <Tasks
            tasks={tasks}
            setTasks={setTasks}
            lists={lists}
            activeListId={activeListId}
            onCloseTasksMobile={() => setIsTasksOpen(false)}
          />
        </div>

      </div>

    </div>
  )
}

export default App
