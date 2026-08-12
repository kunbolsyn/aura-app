import { useState, useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
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
}

type PopupData = {
  startDate: string
  endDate: string
  x: number
  y: number
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const COLOR_EVENT: Record<string, string> = {
  blue:   'bg-blue-50 border-blue-400 text-blue-800',
  green:  'bg-green-50 border-green-400 text-green-800',
  red:    'bg-red-50 border-red-400 text-red-800',
  orange: 'bg-orange-50 border-orange-400 text-orange-800',
  purple: 'bg-purple-50 border-purple-400 text-purple-800',
  teal:   'bg-teal-50 border-teal-400 text-teal-800',
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
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className="fixed z-50 bg-white border border-stone-200 rounded-xl shadow-lg p-4 w-72"
        style={{ top: data.y, left: data.x }}
      >
        <input
          autoFocus
          placeholder="Event title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          className="w-full text-sm text-stone-800 border-b border-stone-200 pb-2 mb-3 outline-none placeholder:text-stone-300 font-medium"
        />

        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-400 w-16 shrink-0">Start</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="text-xs text-stone-600 border border-stone-200 rounded-lg px-2 py-1 outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-400 w-16 shrink-0">End</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="text-xs text-stone-600 border border-stone-200 rounded-lg px-2 py-1 outline-none flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-400 w-16 shrink-0">Calendar</label>
            <select
              value={calendarId}
              onChange={e => setCalendarId(e.target.value)}
              className="text-xs text-stone-600 border border-stone-200 rounded-lg px-2 py-1 outline-none flex-1"
            >
              {calendars.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-stone-400 w-16 shrink-0">Location</label>
            <input
              placeholder="Optional"
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="text-xs text-stone-600 border border-stone-200 rounded-lg px-2 py-1 outline-none flex-1 placeholder:text-stone-200"
            />
          </div>
          <div className="flex items-start gap-2">
            <label className="text-xs text-stone-400 w-16 shrink-0 pt-1">Notes</label>
            <textarea
              placeholder="Optional"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="text-xs text-stone-600 border border-stone-200 rounded-lg px-2 py-1 outline-none flex-1 placeholder:text-stone-200 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs text-stone-400 hover:text-stone-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="text-xs text-white bg-stone-800 hover:bg-stone-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Save event
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
}

function WeekView({
  weekDays,
  events,
  tasks,
  calendars,
  visibleCalendarIds,
  onCreateEvent,
  onDropTask,
}: WeekViewProps) {
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
    // only left click
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
    const popupX = Math.min(e.clientX + 12, window.innerWidth  - 300)
    const popupY = Math.min(e.clientY - 40, window.innerHeight - 340)
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

  // ── HTML5 drop handlers for tasks ──────────────────────────────────────────

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
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* Day headers */}
      <div
        className="grid border-b border-stone-200 shrink-0"
        style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
      >
        <div className="border-r border-stone-100" />
        {weekDays.map((day, i) => (
          <div key={i} className="text-center py-2 border-r border-stone-100 last:border-r-0">
            <p className="text-[10px] text-stone-400 uppercase tracking-wide">
              {day.toLocaleDateString('en-GB', { weekday: 'short' })}
            </p>
            <div className={`text-base font-medium mx-auto w-7 h-7 flex items-center justify-center rounded-full ${
              isSameDay(day, today) ? 'bg-stone-800 text-white' : 'text-stone-700'
            }`}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* All-day tasks row */}
      <div
        className="grid border-b border-stone-200 shrink-0"
        style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
      >
        <div className="border-r border-stone-100 flex items-center justify-end pr-1.5 py-1">
          <span className="text-[9px] text-stone-300 uppercase tracking-wide">tasks</span>
        </div>
        {weekDays.map((day, i) => (
          <div key={i} className="border-r border-stone-100 last:border-r-0 p-1 min-h-7 flex flex-col gap-0.5">
            {getTasksForDay(day).map(task => (
              <div
                key={task.id}
                className="text-[10px] text-stone-500 bg-stone-100 border-l-2 border-stone-400 rounded px-1.5 py-0.5 truncate"
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
          className="grid"
          style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
        >
          {/* Time labels */}
          <div className="border-r border-stone-100">
            {HOURS.map(h => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="flex items-start justify-end pr-2 pt-1"
              >
                <span className="text-[10px] text-stone-300 leading-none">{formatHour(h)}</span>
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
                className={`border-r border-stone-100 last:border-r-0 relative select-none cursor-crosshair ${
                  isSameDay(day, today) ? 'bg-stone-50/40' : ''
                } ${isDragOver ? 'bg-blue-50/40' : ''}`}
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
                    className="absolute w-full border-t border-stone-100"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                  />
                ))}

                {/* Half-hour lines */}
                {HOURS.map(h => (
                  <div
                    key={`half-${h}`}
                    className="absolute w-full border-t border-stone-50"
                    style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}

                {/* Drag preview */}
                {isDraggingHere && dragRange && (
                  <div
                    className="absolute left-1 right-1 bg-blue-100 border border-blue-300 rounded pointer-events-none opacity-80"
                    style={{
                      top:    (dragRange.startHour - START_HOUR) * HOUR_HEIGHT,
                      height: Math.max((dragRange.endHour - dragRange.startHour) * HOUR_HEIGHT, 20),
                    }}
                  />
                )}

                {/* Events */}
                {dayEvents.map(event => {
                  const start  = new Date(event.startDate)
                  const end    = new Date(event.endDate)
                  const top    = (start.getHours() + start.getMinutes() / 60 - START_HOUR) * HOUR_HEIGHT
                  const height = Math.max(((end.getTime() - start.getTime()) / 3600000) * HOUR_HEIGHT, 22)
                  const color  = getCalendarColor(event.calendarId)

                  return (
                    <div
                      key={event.id}
                      className={`absolute left-1 right-1 rounded border-l-2 px-1.5 py-0.5 text-[11px] font-medium overflow-hidden cursor-pointer ${COLOR_EVENT[color]}`}
                      style={{ top, height }}
                    >
                      <p className="truncate leading-tight">{event.title}</p>
                      <p className="text-[10px] opacity-60 font-normal leading-tight">
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

function Calendar({ events, setEvents, tasks, setTasks, calendars, visibleCalendarIds }: Props) {
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

  // called when a task is dropped onto a time slot
  function handleDropTask(taskId: string, date: Date) {
    const isoDate = toISODate(date);
    
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, dueDate: isoDate } : t
    ));
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-stone-200 shrink-0">
        <button
          onClick={() => setCurrentDate(new Date())}
          className="text-xs text-stone-600 border border-stone-200 rounded-lg px-3 py-1.5 hover:bg-stone-50 transition-colors"
        >
          Today
        </button>
        <button onClick={() => navigate(-1)} className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors rounded-lg hover:bg-stone-50">
          <ChevronLeft size={15} />
        </button>
        <button onClick={() => navigate(1)} className="p-1.5 text-stone-400 hover:text-stone-600 transition-colors rounded-lg hover:bg-stone-50">
          <ChevronRight size={15} />
        </button>
        <span className="text-sm font-medium text-stone-700 flex-1 ml-1">{weekLabel}</span>

        {/* View switcher */}
        <div className="flex border border-stone-200 rounded-lg overflow-hidden">
          {(['day', 'week', 'month', 'year'] as View[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs transition-colors capitalize border-r border-stone-200 last:border-r-0 ${
                view === v ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-50'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Week view */}
      {view === 'week' && (
        <WeekView
          weekDays={weekDays}
          events={events}
          tasks={tasks}
          calendars={calendars}
          visibleCalendarIds={visibleCalendarIds}
          onCreateEvent={setPopup}
          onDropTask={handleDropTask}
        />
      )}

      {/* Placeholder views */}
      {(view === 'day' || view === 'month' || view === 'year') && (
        <div className="flex-1 flex items-center justify-center text-stone-300 text-sm">
          {view.charAt(0).toUpperCase() + view.slice(1)} view coming soon
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