import { useEffect, useRef, useState } from "react";
import { CalendarDays, Settings, Plus, ChevronLeft, ChevronRight, Check, MoreVertical, Pencil, Trash2, Moon, LogOut } from "lucide-react";
import type { UserCalendar, CalendarColor } from "../types";

type SidebarProps = {
  calendars: UserCalendar[];
  visibleCalendarIds: string[];
  onToggleCalendar: (id: string) => void;
  onAddCalendar: (name: string, color: UserCalendar['color']) => void;
  onDeleteCalendar: (id: string) => void;
  onUpdateCalendar: (id: string, name: string, color: UserCalendar['color']) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onSelectDate: (date: Date) => void;
  username: string;
}

const CALENDAR_COLORS: CalendarColor[] = [
  'blue', 'green', 'red', 'orange', 'purple', 'teal'
]

const COLOR_DOT: Record<string, string> = {
  blue:   'bg-blue-500',
  green:  'bg-emerald-500',
  red:    'bg-rose-500',
  orange: 'bg-amber-500',
  purple: 'bg-violet-500',
  teal:   'bg-cyan-500',
}

const COLOR_BORDER: Record<string, string> = {
  blue:   'border-blue-500',
  green:  'border-emerald-500',
  red:    'border-rose-500',
  orange: 'border-amber-500',
  purple: 'border-violet-500',
  teal:   'border-cyan-500',
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ onSelectDate }: { onSelectDate: (date: Date) => void }) {
  const [date, setDate] = useState(new Date())
  const today = new Date()
  const year  = date.getFullYear()
  const month = date.getMonth()

  const firstDay    = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev  = new Date(year, month, 0).getDate()

  const cells: { day: number; type: 'prev' | 'current' | 'next' }[] = []
  for (let i = startOffset - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, type: 'prev' })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, type: 'current' })
  while (cells.length % 7 !== 0)
    cells.push({ day: cells.length - daysInMonth - startOffset + 1, type: 'next' })

  const monthLabel = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className="mb-5 px-1 bg-slate-100/50 p-3 rounded-2xl border border-slate-200/40">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-sm font-bold text-slate-800">{monthLabel}</span>
        <div className="flex gap-1">
          <button onClick={() => setDate(new Date(year, month - 1, 1))} className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all">
            <ChevronLeft size={14} strokeWidth={2.5} />
          </button>
          <button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all">
            <ChevronRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-slate-400 py-0.5">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((cell, i) => {
          const isToday =
            cell.type === 'current' &&
            cell.day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
          return (
            <button key={i} type="button" onClick={() => onSelectDate(new Date(year, month + (cell.type === 'prev' ? -1 : cell.type === 'next' ? 1 : 0), cell.day))} className={`w-full text-center text-xs py-1 font-semibold rounded-lg cursor-pointer transition-all ${
              isToday
                ? 'bg-blue-600 text-white font-bold shadow-xs shadow-blue-600/30'
                : cell.type === 'current'
                ? 'text-slate-700 hover:bg-slate-200'
                : 'text-slate-300'
            }`}>
              {cell.day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  calendars,
  visibleCalendarIds,
  onToggleCalendar,
  onAddCalendar,
  onDeleteCalendar,
  onUpdateCalendar,
  isDarkMode,
  onToggleDarkMode,
  onLogout,
  onSelectDate,
  username,
}: SidebarProps) {
  // Inline editing calendars
  const [editingCalId, setEditingCalId]     = useState<string | null>(null)
  const [editCalName, setEditCalName]       = useState('')
  const [editCalColor, setEditCalColor]     = useState<UserCalendar['color']>('blue')

  const [addingCalendar, setAddingCalendar] = useState(false)
  const [newCalName, setNewCalName]         = useState('')
  const [newCalColor, setNewCalColor]       = useState<UserCalendar['color']>('blue')
  const [settingsOpen, setSettingsOpen]     = useState(false)
  const [calendarMenuId, setCalendarMenuId] = useState<string | null>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const calendarMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function closeSettings(event: MouseEvent) {
      if (!settingsRef.current?.contains(event.target as Node)) setSettingsOpen(false)
    }
    document.addEventListener('mousedown', closeSettings)
    return () => document.removeEventListener('mousedown', closeSettings)
  }, [])

  useEffect(() => {
    function closeCalendarMenu(event: MouseEvent) {
      if (!calendarMenuRef.current?.contains(event.target as Node)) setCalendarMenuId(null)
    }
    document.addEventListener('mousedown', closeCalendarMenu)
    return () => document.removeEventListener('mousedown', closeCalendarMenu)
  }, [])

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setSettingsOpen(false)
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [])

  function submitCalendar() {
    if (newCalName.trim()) onAddCalendar(newCalName.trim(), newCalColor)
    setNewCalName('')
    setAddingCalendar(false)
  }

  function submitRenameCalendar(id: string) {
    if (editCalName.trim()) {
      onUpdateCalendar(id, editCalName.trim(), editCalColor)
    }
    setEditingCalId(null)
  }

  return (
    <div className="w-full h-full bg-slate-50 flex flex-col py-6 shrink-0 overflow-y-auto">

      {/* Logo */}
      <div className="px-6 mb-6">
        <h1 className="text-lg font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-500/20"><Moon size={15} fill="currentColor" strokeWidth={2.5} /></span>
          aura
        </h1>
      </div>

      {/* Mini calendar */}
      <div className="px-4">
        <MiniCalendar onSelectDate={onSelectDate} />
      </div>

      {/* Calendars section */}
      <div className="px-4 mt-2">
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 uppercase tracking-widest">
            <CalendarDays size={13} strokeWidth={2.5} /> Calendars
          </div>
          <button
            onClick={() => setAddingCalendar(true)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-200/60 rounded-lg transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {calendars.map(cal => {
            const isVisible = visibleCalendarIds.includes(cal.id)
            const isEditing = editingCalId === cal.id

            if (isEditing) {
              return (
                <div key={cal.id} className="w-full px-2 py-1.5">
                  <input
                    autoFocus
                    value={editCalName}
                    onChange={e => setEditCalName(e.target.value)}
                    onBlur={() => submitRenameCalendar(cal.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitRenameCalendar(cal.id)
                      if (e.key === 'Escape') setEditingCalId(null)
                    }}
                    placeholder="Calendar name..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              )
            }

            return (
              <div
                key={cal.id}
                className="group flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-slate-200/50 transition-all w-full"
              >
                <button
                  onClick={() => onToggleCalendar(cal.id)}
                  className="flex items-center gap-2.5 flex-1 min-w-0"
                >
                  <div className={`w-3.5 h-3.5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                    isVisible
                      ? `${COLOR_DOT[cal.color]} border-transparent shadow-xs shadow-black/5`
                      : `bg-transparent ${COLOR_BORDER[cal.color]}`
                  }`}>
                    {isVisible && <Check size={10} className="text-white" strokeWidth={3.5} />}
                  </div>
                  <span className="text-sm font-semibold text-slate-700 text-left truncate">{cal.name}</span>
                </button>

                <div className="relative" ref={calendarMenuId === cal.id ? calendarMenuRef : undefined}>
                  <button
                    type="button"
                    onClick={() => setCalendarMenuId(calendarMenuId === cal.id ? null : cal.id)}
                    aria-label={`Options for ${cal.name}`}
                    aria-expanded={calendarMenuId === cal.id}
                    className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all"
                  >
                    <MoreVertical size={15} strokeWidth={2.5} />
                  </button>
                  {calendarMenuId === cal.id && (
                    <div className="absolute right-0 top-full mt-1 z-30 w-48 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                      <button type="button" onClick={() => { setEditCalName(cal.name); setEditCalColor(cal.color); setEditingCalId(cal.id); setCalendarMenuId(null) }} className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"><Pencil size={13} strokeWidth={2.5} />Rename</button>
                      <button type="button" onClick={() => { onDeleteCalendar(cal.id); setCalendarMenuId(null) }} className="w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"><Trash2 size={13} strokeWidth={2.5} />Delete</button>
                      <div className="mt-1 border-t border-slate-100 pt-2 px-2 pb-1">
                        <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Colour</p>
                        <div className="flex flex-nowrap gap-2">
                          {CALENDAR_COLORS.map(color => (
                            <button key={color} type="button" onClick={() => onUpdateCalendar(cal.id, cal.name, color)} aria-label={`Use ${color}`} className={`h-5 w-5 shrink-0 rounded-full ${COLOR_DOT[color]} flex items-center justify-center transition-transform hover:scale-110`}>
                              {cal.color === color && <Check size={12} className="text-white" strokeWidth={3.5} />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add calendar form */}
          {addingCalendar && (
            <div className="mt-1 flex flex-col gap-2 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
              <input
                autoFocus
                value={newCalName}
                onChange={e => setNewCalName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitCalendar()
                  if (e.key === 'Escape') { setAddingCalendar(false); setNewCalName('') }
                }}
                placeholder="Calendar name..."
                className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 outline-none text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="flex gap-1.5 flex-wrap">
                {CALENDAR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCalColor(color)}
                    className={`w-4 h-4 rounded-full ${COLOR_DOT[color]} transition-all ${
                      newCalColor === color ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'opacity-80 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
              <div className="flex gap-1 justify-end mt-1">
                <button
                  onClick={() => setAddingCalendar(false)}
                  className="text-[10px] font-bold text-slate-500 hover:bg-slate-50 px-2 py-1 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCalendar}
                  className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg shadow-xs"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="mt-auto px-4 pt-1 relative" ref={settingsRef}>
        {settingsOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-1 z-50 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
              <p className="text-xs font-extrabold text-slate-800">{username}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Local workspace</p>
            </div>
            <button
              onClick={onToggleDarkMode}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Moon size={15} className="text-slate-500" strokeWidth={2.5} />
              <span className="flex-1 text-left">Dark mode</span>
              <span className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isDarkMode ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <span className={`block w-3 h-3 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-4' : ''}`} />
              </span>
            </button>
            <button
              onClick={() => { setSettingsOpen(false); onLogout() }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut size={15} strokeWidth={2.5} />
              Sign out
            </button>
          </div>
        )}
        <button
          onClick={() => setSettingsOpen(prev => !prev)}
          aria-expanded={settingsOpen}
          aria-haspopup="menu"
          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all w-full ${settingsOpen ? 'text-slate-800 bg-slate-200/60' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-200/50'}`}
        >
          <Settings size={13} strokeWidth={2.5} />
          Settings
        </button>
      </div>
    </div>
  )
}

export default Sidebar
