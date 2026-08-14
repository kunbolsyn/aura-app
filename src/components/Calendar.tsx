import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight, ListTodo, Plus, CalendarDays, MapPin, AlignLeft, Clock, X } from "lucide-react"
import type { UserEvent, UserCalendar, Task } from "../types"

// ─── Constants ────────────────────────────────────────────────────────────────

const HOUR_HEIGHT  = 56
const START_HOUR   = 7
const END_HOUR     = 22
const HOURS        = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

// ─── Types ────────────────────────────────────────────────────────────────────

type View = 'day' | 'week' | 'month' | 'year'

type Props = {
  events: UserEvent[]
  setEvents: React.Dispatch<React.SetStateAction<UserEvent[]>>
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  calendars: UserCalendar[]
  visibleCalendarIds: string[]
  onToggleTasks?: () => void
  isTasksOpen?: boolean
}

type PopupData = {
  startDate: string
  endDate: string
  x: number
  y: number
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const COLOR_EVENT: Record<string, string> = {
  blue:   'bg-blue-50 border-blue-500 text-blue-800 hover:bg-blue-100/70',
  green:  'bg-emerald-50 border-emerald-500 text-emerald-800 hover:bg-emerald-100/70',
  red:    'bg-rose-50 border-rose-500 text-rose-800 hover:bg-rose-100/70',
  orange: 'bg-amber-50 border-amber-500 text-amber-800 hover:bg-amber-100/70',
  purple: 'bg-violet-50 border-violet-500 text-violet-800 hover:bg-violet-100/70',
  teal:   'bg-cyan-50 border-cyan-500 text-cyan-800 hover:bg-cyan-100/70',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(date: Date): Date[] {
  const d   = new Date(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(d)
    dd.setDate(d.getDate() + i)
    return dd
  })
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  )
}

function formatHour(h: number) {
  if (h === 0 || h === 24) return '12 AM'
  if (h === 12) return '12 PM'
  return h < 12 ? `${h} AM` : `${h - 12} PM`
}

function toDateTimeLocal(date: Date, hour: number): string {
  const d = new Date(date)
  d.setHours(Math.floor(hour), hour % 1 >= 0.5 ? 30 : 0, 0, 0)
  // format as "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toISODate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
}

// ─── Event Popup ──────────────────────────────────────────────────────────────

type EventPopupProps = {
  data: PopupData
  calendars: UserCalendar[]
  onSave: (event: UserEvent) => void
  onClose: () => void
}

function EventPopup({ data, calendars, onSave, onClose }: EventPopupProps) {
  const [title, setTitle]         = useState('')
  const [calendarId, setCalendarId] = useState(calendars[0]?.id ?? '')
  const [startDate, setStartDate] = useState(data.startDate)
  const [endDate, setEndDate]     = useState(data.endDate)
  const [location, setLocation]   = useState('')
  const [description, setDescription] = useState('')

  function handleSave() {
    if (!title.trim()) return
    onSave({
      id:          crypto.randomUUID(),
      title:       title.trim(),
      startDate,
      endDate,
      allDay:      false,
      calendarId,
      location:    location.trim() || undefined,
      description: description.trim() || undefined,
    })
  }

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40 bg-slate-900/10 backdrop-blur-xs" onClick={onClose} />

      <div
        className="fixed z-50 bg-white border border-slate-200 rounded-3xl shadow-xl p-5 w-80 animate-in fade-in zoom-in-95 duration-100"
        style={{ top: data.y, left: data.x }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Plus size={12} strokeWidth={3} className="text-blue-600" /> New Event
          </span>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all">
            <X size={14} strokeWidth={2.5} />
          </button>
        </div>

        <input
          autoFocus
          placeholder="Event title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          className="w-full text-base text-slate-900 border border-slate-200 rounded-xl px-3 py-2 mb-4 outline-none placeholder:text-slate-400 font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
        />

        <div className="flex flex-col gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <Clock size={14} className="text-slate-400 shrink-0" strokeWidth={2.5} />
            <div className="flex-1 flex flex-col gap-1.5">
              <input
                type="datetime-local"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 flex-1"
              />
              <input
                type="datetime-local"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 flex-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <CalendarDays size={14} className="text-slate-400 shrink-0" strokeWidth={2.5} />
            <select
              value={calendarId}
              onChange={e => setCalendarId(e.target.value)}
              className="text-xs font-bold text-slate-600 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 flex-1"
            >
              {calendars.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <MapPin size={14} className="text-slate-400 shrink-0" strokeWidth={2.5} />
            <input
              placeholder="Add location (Optional)"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 flex-1 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-start gap-2.5">
            <AlignLeft size={14} className="text-slate-400 shrink-0 pt-1" strokeWidth={2.5} />
            <textarea
              placeholder="Add description (Optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="text-xs font-semibold text-slate-700 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-blue-500 flex-1 placeholder:text-slate-400 resize-none"
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
            Save Event
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

type WeekViewProps = {
  weekDays: Date[]
  events: UserEvent[]
  tasks: Task[]
  calendars: UserCalendar[]
  visibleCalendarIds: string[]
  onCreateEvent: (popup: PopupData) => void
  onDropTask: (taskId: string, date: Date, hour: number) => void
  onToggleTasks?: () => void
}

function WeekView({
  weekDays,
  events,
  tasks,
  calendars,
  visibleCalendarIds,
  onCreateEvent,
  onDropTask,
  onToggleTasks,
}: WeekViewProps & { onToggleTasks?: () => void }) {
  const dragStart = useRef<{ day: Date; hour: number } | null>(null)
  const [dragRange, setDragRange] = useState<{ day: Date; startHour: number; endHour: number } | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const today = new Date()

  function getHourFromY(el: HTMLElement, clientY: number): number {
    const rect = el.getBoundingClientRect()
    const y    = clientY - rect.top
    const raw  = START_HOUR + y / HOUR_HEIGHT
    return Math.max(START_HOUR, Math.min(END_HOUR - 0.5, raw))
  }

  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    if (e.button !== 0) return
    const hour = getHourFromY(e.currentTarget, e.clientY)
    dragStart.current = { day, hour }
    setDragRange({ day, startHour: hour, endHour: hour + 1 })
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    if (!dragStart.current) return
    if (!isSameDay(dragStart.current.day, day)) return
    const hour = getHourFromY(e.currentTarget, e.clientY)
    setDragRange(prev => prev
      ? { ...prev, endHour: Math.max(prev.startHour + 0.5, hour) }
      : null
    )
  }

  function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragStart.current || !dragRange) {
      dragStart.current = null
      setDragRange(null)
      return
    }
    const popupX = Math.min(e.clientX + 12, window.innerWidth  - 340)
    const popupY = Math.min(e.clientY - 40, window.innerHeight - 380)
    onCreateEvent({
      startDate: toDateTimeLocal(dragRange.day, dragRange.startHour),
      endDate:   toDateTimeLocal(dragRange.day, dragRange.endHour),
      x: popupX,
      y: popupY,
    })
    dragStart.current = null
    setDragRange(null)
  }

  function getEventsForDay(day: Date) {
    return events.filter(ev =>
      visibleCalendarIds.includes(ev.calendarId) &&
      isSameDay(new Date(ev.startDate), day)
    )
  }

  function getTasksForDay(day: Date) {
    return tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day))
  }

  function getCalendarColor(calendarId: string) {
    return calendars.find(c => c.id === calendarId)?.color ?? 'blue'
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, day: Date) {
    e.preventDefault()
    setDragOverCol(toISODate(day))
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, day: Date) {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    if (!taskId) return
    const hour = getHourFromY(e.currentTarget, e.clientY)
    onDropTask(taskId, day, Math.floor(hour))
    setDragOverCol(null)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50">

      {/* Day headers */}
      <div
        className="grid border-b border-slate-200 shrink-0 bg-white"
        style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}
      >
        <div className="border-r border-slate-100/30" />
        {weekDays.map((day, i) => (
          <div key={i} className="text-center py-2.5 border-r border-slate-100/30 last:border-r-0">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              {day.toLocaleDateString('en-GB', { weekday: 'short' })}
            </p>
            <div className={`text-base font-bold mt-1 mx-auto w-8 h-8 flex items-center justify-center rounded-xl transition-all ${
              isSameDay(day, today)
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/25'
                : 'text-slate-800'
            }`}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* All-day tasks row */}
      <div
        className="grid border-b border-slate-200 shrink-0 bg-slate-50"
        style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}
      >
        <div className="border-r border-slate-100/30 flex items-center justify-end pr-2.5 py-1.5">
          {onToggleTasks ? (
            <button onClick={onToggleTasks} className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider hover:text-blue-700 hover:bg-slate-50 px-2 py-1 rounded transition-all">Tasks</button>
          ) : (
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tasks</span>
          )}
        </div>
        {weekDays.map((day, i) => (
          <div key={i} className="border-r border-slate-100/30 last:border-r-0 p-1.5 min-h-8 flex flex-col gap-1 bg-slate-100/30">
            {getTasksForDay(day).map(task => (
              <div
                key={task.id}
                className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 border-l-4 border-l-slate-500 rounded-lg px-2 py-1 truncate shadow-2xs"
              >
                {task.title}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="grid relative"
          style={{ gridTemplateColumns: '60px repeat(7, 1fr)' }}
        >
          {/* Time labels */}
          <div className="border-r border-slate-100/30 bg-white">
            {HOURS.map(h => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="flex items-start justify-end pr-3 pt-2"
              >
                <span className="text-xs font-bold text-slate-400 leading-none">{formatHour(h)}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, i) => {
            const dayEvents       = getEventsForDay(day)
            const isDraggingHere  = dragRange && isSameDay(dragRange.day, day)
            const isDragOver      = dragOverCol === toISODate(day)

            return (
              <div
                key={i}
                className={`border-r border-slate-100/30 last:border-r-0 relative select-none cursor-crosshair transition-colors ${
                  isSameDay(day, today) ? 'bg-blue-50/15' : 'bg-white'
                } ${isDragOver ? 'bg-blue-50/60' : ''}`}
                style={{ height: HOUR_HEIGHT * HOURS.length }}
                onMouseDown={e => handleMouseDown(e, day)}
                onMouseMove={e => handleMouseMove(e, day)}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { if (dragStart.current) { dragStart.current = null; setDragRange(null) } }}
                onDragOver={e => handleDragOver(e, day)}
                onDrop={e => handleDrop(e, day)}
                onDragLeave={() => setDragOverCol(null)}
              >
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-slate-100 pointer-events-none"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Half-hour lines */}
                {HOURS.map(h => (
                  <div
                    key={`half-${h}`}
                    className="absolute w-full border-t border-slate-50/50 border-dashed pointer-events-none"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}

                {/* Drag preview */}
                {isDraggingHere && dragRange && (
                  <div
                    className="absolute left-1 right-1 bg-blue-100/80 border-2 border-blue-400 rounded-xl pointer-events-none z-10"
                    style={{
                      top:    (dragRange.startHour - START_HOUR) * HOUR_HEIGHT,
                      height: Math.max((dragRange.endHour - dragRange.startHour) * HOUR_HEIGHT, 22),
                    }}
                  />
                )}

                {/* Events */}
                {dayEvents.map(event => {
                  const start  = new Date(event.startDate)
                  const end    = new Date(event.endDate)
                  const top    = (start.getHours() + start.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT
                  const height = Math.max(((end.getTime() - start.getTime()) / 3600000) * HOUR_HEIGHT, 24)
                  const color  = getCalendarColor(event.calendarId)

                  return (
                    <div
                      key={event.id}
                      className={`absolute left-1 right-1 rounded-xl border-l-4 px-2 py-1 text-xs font-bold overflow-hidden cursor-pointer shadow-2xs z-10 transition-all ${COLOR_EVENT[color]}`}
                      style={{ top, height }}
                    >
                      <p className="truncate leading-tight font-extrabold">{event.title}</p>
                      <p className="text-[10px] opacity-75 font-semibold mt-0.5 leading-tight">
                        {start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        {' – '}
                        {end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Calendar ─────────────────────────────────────────────────────────────────

function Calendar({ events, setEvents, tasks, setTasks, calendars, visibleCalendarIds, onToggleTasks, isTasksOpen }: Props) {
  const [ready, setReady] = useState(false)

  // Defer rendering of the full calendar grid to improve initial paint and perceived performance.
  useEffect(() => {
    if ((window as any).requestIdleCallback) {
      const id = (window as any).requestIdleCallback(() => setReady(true))
      return () => (window as any).cancelIdleCallback?.(id)
    }
    const t = setTimeout(() => setReady(true), 60)
    return () => clearTimeout(t)
  }, [])

  const [view, setView]             = useState<View>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [popup, setPopup]           = useState<PopupData | null>(null)

  const weekDays = getWeekDays(currentDate)

  const weekLabel = `${weekDays[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${
    weekDays[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }`

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate)
    if (view === 'day')   d.setDate(d.getDate() + dir)
    if (view === 'week')  d.setDate(d.getDate() + dir * 7)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    if (view === 'year')  d.setFullYear(d.getFullYear() + dir)
    setCurrentDate(d)
  }

  function saveEvent(event: UserEvent) {
    setEvents(prev => [...prev, event])
    setPopup(null)
  }

  function handleDropTask(taskId: string, date: Date) {
    const isoDate = toISODate(date);
    
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, dueDate: isoDate } : t
    ));
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-200/80 bg-white shrink-0">
        
        {/* Navigation Button Block */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button onClick={() => navigate(-1)} className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all">
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white px-2.5 py-1 rounded-lg transition-all"
          >
            Today
          </button>
          <button onClick={() => navigate(1)} className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-all">
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>

        {/* Date Title */}
        <span className="text-sm font-extrabold text-slate-900 flex-1 ml-2 md:text-base leading-none">{weekLabel}</span>

        {/* View switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          {(['day', 'week', 'month', 'year'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                view === v 
                  ? 'bg-white text-blue-600 shadow-2xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Desktop Task Toggle (Hidden on mobile as header handles it) */}
        {onToggleTasks && (
          <button
            onClick={onToggleTasks}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all border ${
              isTasksOpen 
                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <ListTodo size={14} strokeWidth={2.5} />
            <span>Tasks</span>
          </button>
        )}
      </div>

      {/* Week view */}
      {view === 'week' && (
        <>
          {!ready ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8">
              <div className="animate-pulse w-full max-w-4xl">
                <div className="h-6 bg-slate-100 rounded mb-4" />
                <div className="grid grid-cols-8 gap-2">
                  <div className="col-span-1">
                    <div className="h-40 bg-slate-100 rounded" />
                  </div>
                  <div className="col-span-7 space-y-2">
                    <div className="h-8 bg-slate-100 rounded" />
                    <div className="h-8 bg-slate-100 rounded" />
                    <div className="h-8 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">Loading calendar…</p>
            </div>
          ) : (
            <WeekView
              weekDays={weekDays}
              events={events}
              tasks={tasks}
              calendars={calendars}
              visibleCalendarIds={visibleCalendarIds}
              onCreateEvent={setPopup}
              onDropTask={handleDropTask}
              onToggleTasks={onToggleTasks}
            />
          )}
        </>
      )}

      {/* Placeholder views */}
      {(view === 'day' || view === 'month' || view === 'year') && (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 p-6">
          <CalendarDays size={40} strokeWidth={1.5} className="text-slate-300 animate-bounce" />
          <p className="font-extrabold text-slate-800 text-sm mt-3">{view.charAt(0).toUpperCase() + view.slice(1)} View is in Development</p>
          <p className="text-slate-400 text-xs mt-1 text-center max-w-xs">Our team is working on this section. Switch to Week View for a fully interactive schedule.</p>
        </div>
      )}

      {/* Event creation popup */}
      {popup && (
        <EventPopup
          data={popup}
          calendars={calendars}
          onSave={saveEvent}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}

export default Calendar
