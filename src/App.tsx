import { useState, useEffect } from "react";
import { Menu, ListTodo } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Task, TaskList, UserCalendar, UserEvent } from "./types";
import Sidebar from "./components/Sidebar";
import Tasks from "./components/Tasks";
import Calendar from "./components/Calendar";
import AuthPage from "./components/AuthPage";
import { loadWorkspace, saveWorkspace } from "./lib/workspace";
import { requireSupabase, supabase } from "./lib/supabase";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_LISTS: TaskList[] = [
  { id: crypto.randomUUID(), name: "Personal" },
  { id: crypto.randomUUID(), name: "Work"     },
]

const DEFAULT_CALENDARS: UserCalendar[] = [
  { id: crypto.randomUUID(), name: "Personal", color: "green" },
  { id: crypto.randomUUID(), name: "Work",     color: "blue"  },
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
  const [isDarkMode, setIsDarkMode] = useState(() => load('aura-dark-mode', false))
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [workspaceReady, setWorkspaceReady] = useState(false)
  const [workspaceLoadedFor, setWorkspaceLoadedFor] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [activeListId, setActiveListId] = useState<string>(DEFAULT_LISTS[0].id)
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[]>(DEFAULT_CALENDARS.map(c => c.id))

  // Drawer states for responsiveness (Tasks sidebar is initially closed on mobile, open on desktop)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isTasksOpen, setIsTasksOpen] = useState(true) // starts open on desktop

  // persisted state — all loaded from localStorage on first render
  const [tasks, setTasks]       = useState<Task[]>([])
  const [lists, setLists]       = useState<TaskList[]>(DEFAULT_LISTS)
  const [calendars, setCalendars] = useState<UserCalendar[]>(DEFAULT_CALENDARS)
  const [events, setEvents]     = useState<UserEvent[]>([])

  useEffect(() => {
    let mounted = true
    const client = supabase
    if (!client) {
      window.setTimeout(() => setAuthReady(true), 0)
      return () => { mounted = false }
    }
    const configuredClient = requireSupabase()

    async function restoreSession() {
      const { data, error } = await configuredClient.auth.getSession()
      if (!mounted) return
      if (error) setAuthError(error.message)
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    }

    void restoreSession()
    const { data: listener } = configuredClient.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      setAuthError(null)
      setWorkspaceReady(false)
      setWorkspaceLoadedFor(null)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user || !supabase) return
    let mounted = true
    void loadWorkspace()
      .then(workspace => {
        if (!mounted) return
        const nextLists = workspace.lists.length ? workspace.lists : DEFAULT_LISTS
        const nextCalendars = workspace.calendars.length ? workspace.calendars : DEFAULT_CALENDARS
        setTasks(workspace.tasks)
        setLists(nextLists)
        setCalendars(nextCalendars)
        setEvents(workspace.events)
        setActiveListId(nextLists[0].id)
        setVisibleCalendarIds(nextCalendars.map(calendar => calendar.id))
        setWorkspaceLoadedFor(user.id)
        setWorkspaceReady(true)
      })
      .catch(error => { if (mounted) setAuthError(error instanceof Error ? error.message : "Unable to load your workspace.") })
    return () => { mounted = false }
  }, [user])

  useEffect(() => {
    if (!user || !workspaceReady || workspaceLoadedFor !== user.id) return
    const timeout = window.setTimeout(() => {
      void saveWorkspace({ tasks, lists, calendars, events }).catch(error => {
        setAuthError(error instanceof Error ? error.message : "Unable to save your workspace.")
      })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [user, workspaceReady, workspaceLoadedFor, tasks, lists, calendars, events])

  useEffect(() => {
    document.documentElement.classList.toggle('aura-dark', isDarkMode)
    localStorage.setItem('aura-dark-mode', JSON.stringify(isDarkMode))
  }, [isDarkMode])

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
    setWorkspaceReady(false)
    setWorkspaceLoadedFor(null)
    setIsSidebarOpen(false)
  }

  async function handleAuthSubmit(credentials: { email: string; password: string; mode: "sign-in" | "sign-up" }) {
    const client = requireSupabase()
    const result = credentials.mode === "sign-up"
      ? await client.auth.signUp({ email: credentials.email, password: credentials.password })
      : await client.auth.signInWithPassword({ email: credentials.email, password: credentials.password })
    if (result.error) throw result.error
  }

  async function handleGoogleAuth() {
    const { error } = await requireSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
    if (error) throw error
  }

  function toggleCalendarVisibility(id: string) {
    setVisibleCalendarIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  function addList(name: string) {
    const newList: TaskList = { id: crypto.randomUUID(), name }
    setLists(prev => [...prev, newList])
    setActiveListId(newList.id)
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

  if (!authReady || (user && !workspaceReady)) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-semibold text-slate-400">Loading your Aura space...</div>
  }

  if (!user) {
    return <AuthPage onSubmit={handleAuthSubmit} onGoogleAuth={handleGoogleAuth} error={authError} />
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      
      {/* Mobile Responsive Header */}
      <header className="lg:hidden flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200/80 shadow-xs shrink-0 z-20">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 -ml-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          <Menu size={20} strokeWidth={2.5} />
        </button>
        <span className="font-extrabold text-slate-900 text-lg tracking-tight flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-600 shadow-xs shadow-emerald-600/30"></span>
          Aura
        </span>
        <button
          onClick={() => setIsTasksOpen(prev => !prev)}
          className={`p-2 -mr-2 rounded-xl transition-all relative ${
            isTasksOpen ? "text-blue-600 bg-blue-50" : "text-slate-600 hover:text-blue-600 hover:bg-slate-100"
          }`}
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
          calendars={calendars}
          visibleCalendarIds={visibleCalendarIds}
          onToggleCalendar={toggleCalendarVisibility}
          onAddCalendar={addCalendar}
          onDeleteCalendar={deleteCalendar}
          onUpdateCalendar={updateCalendar}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
          onLogout={handleLogout}
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

        {/* Tasks Panel Overlay and Drawer */}
        {isTasksOpen && (
          <>
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-30 lg:hidden transition-opacity"
              onClick={() => setIsTasksOpen(false)}
            />
            <div className={`
              fixed inset-y-0 right-0 z-40 w-90 max-w-[85vw] bg-white border-l border-slate-200/80 transform transition-transform duration-300 ease-in-out lg:relative lg:transform-none lg:z-auto lg:w-85 shrink-0 flex
              ${isTasksOpen ? "translate-x-0" : "translate-x-full"}
            `}>
                <Tasks
                  tasks={tasks}
                  setTasks={setTasks}
                  lists={lists}
                  activeListId={activeListId}
                  onListSelect={setActiveListId}
                  onAddList={addList}
                  onDeleteList={deleteList}
                  onRenameList={renameList}
                  onCloseTasksMobile={() => setIsTasksOpen(false)}
                />
            </div>
          </>
        )}

      </div>

    </div>
  )
}

export default App
