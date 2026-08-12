import { useState, useEffect } from "react";
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

  function addCalendar(name: string, color: UserCalendar['color']) {
    const newCal: UserCalendar = { id: crypto.randomUUID(), name, color }
    setCalendars(prev => [...prev, newCal])
    setVisibleCalendarIds(prev => [...prev, newCal.id])
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* Sidebar — navigation + lists + calendar toggles */}
      <Sidebar
        lists={lists}
        calendars={calendars}
        activeListId={activeListId}
        onListSelect={setActiveListId}
        visibleCalendarIds={visibleCalendarIds}
        onToggleCalendar={toggleCalendarVisibility}
        onAddList={addList}
        onAddCalendar={addCalendar}
      />

      {/* Tasks panel — fixed width */}
      <div className="w-80 shrink-0 border-r border-stone-200 overflow-y-auto">
        <Tasks
          tasks={tasks}
          setTasks={setTasks}
          lists={lists}
          activeListId={activeListId}
        />
      </div>

      {/* Calendar — fills remaining space */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <Calendar
          events={events}
          setEvents={setEvents}
          tasks={tasks}
          setTasks={setTasks}
          calendars={calendars}
          visibleCalendarIds={visibleCalendarIds}
        />
      </div>

    </div>
  )
}

export default App