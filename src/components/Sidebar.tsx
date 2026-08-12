import { useState } from "react";
import { LayoutGrid, CalendarDays, Settings, Plus, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { TaskList, UserCalendar } from "../types";

type SidebarProps = {
  lists: TaskList[];
  calendars: UserCalendar[];
  activeListId: string;
  onListSelect: (listId: string) => void;
  visibleCalendarIds: string[];
  onToggleCalendar: (id: string) => void;
  onAddList: (name: string) => void;
  onAddCalendar: (name: string, color: UserCalendar['color']) => void;
}

const CALENDAR_COLORS: UserCalendar['color'][] = [
  'blue', 'green', 'red', 'orange', 'purple', 'teal'
]

const COLOR_DOT: Record<string, string> = {
  blue:   'bg-blue-400',
  green:  'bg-green-400',
  red:    'bg-red-400',
  orange: 'bg-orange-400',
  purple: 'bg-purple-400',
  teal:   'bg-teal-400',
}

const COLOR_BORDER: Record<string, string> = {
  blue:   'border-blue-400',
  green:  'border-green-400',
  red:    'border-red-400',
  orange: 'border-orange-400',
  purple: 'border-purple-400',
  teal:   'border-teal-400',
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar() {
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
    <div className="mb-5 px-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-stone-600">{monthLabel}</span>
        <div className="flex gap-0.5">
          <button onClick={() => setDate(new Date(year, month - 1, 1))} className="p-0.5 text-stone-400 hover:text-stone-600">
            <ChevronLeft size={12} />
          </button>
          <button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-0.5 text-stone-400 hover:text-stone-600">
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-0.5">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[9px] text-stone-400 py-0.5">{d}</div>
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
            <div key={i} className={`text-center text-[10px] py-0.5 rounded-full cursor-pointer transition-colors ${
              isToday
                ? 'bg-stone-800 text-white font-medium'
                : cell.type === 'current'
                ? 'text-stone-600 hover:bg-stone-200'
                : 'text-stone-300'
            }`}>
              {cell.day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  lists,
  calendars,
  activeListId,
  onListSelect,
  visibleCalendarIds,
  onToggleCalendar,
  onAddList,
  onAddCalendar,
}: SidebarProps) {
  const [addingList, setAddingList]         = useState(false)
  const [newListName, setNewListName]       = useState('')
  const [addingCalendar, setAddingCalendar] = useState(false)
  const [newCalName, setNewCalName]         = useState('')
  const [newCalColor, setNewCalColor]       = useState<UserCalendar['color']>('blue')

  function submitList() {
    if (newListName.trim()) onAddList(newListName.trim())
    setNewListName('')
    setAddingList(false)
  }

  function submitCalendar() {
    if (newCalName.trim()) onAddCalendar(newCalName.trim(), newCalColor)
    setNewCalName('')
    setAddingCalendar(false)
  }

  return (
    <div className="w-52 h-screen bg-stone-50 border-r border-stone-200 flex flex-col py-5 shrink-0 overflow-y-auto">

      {/* Logo */}
      <div className="px-4 mb-5">
        <h1 className="text-sm font-medium text-stone-800 tracking-wide">Aura</h1>
        <p className="text-[10px] text-stone-400 mt-0.5">your space to think</p>
      </div>

      {/* Mini calendar */}
      <div className="px-3">
        <MiniCalendar />
      </div>

      {/* Tasks section */}
      <div className="px-4 mb-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400 uppercase tracking-widest">
            <LayoutGrid size={10} /> Tasks
          </div>
          <button
            onClick={() => setAddingList(true)}
            className="text-stone-300 hover:text-stone-500 transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {lists.map(list => (
            <button
              key={list.id}
              onClick={() => onListSelect(list.id)}
              className={`text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                activeListId === list.id
                  ? 'bg-white text-stone-800 font-medium border border-stone-200 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
              }`}
            >
              {list.name}
            </button>
          ))}

          {/* Add list input */}
          {addingList && (
            <input
              autoFocus
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') submitList()
                if (e.key === 'Escape') { setAddingList(false); setNewListName('') }
              }}
              onBlur={submitList}
              placeholder="List name..."
              className="px-2.5 py-1.5 rounded-lg text-xs border border-stone-300 outline-none bg-white text-stone-800 placeholder:text-stone-300"
            />
          )}
        </div>
      </div>

      {/* Calendars section */}
      <div className="px-4 mt-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-stone-400 uppercase tracking-widest">
            <CalendarDays size={10} /> Calendars
          </div>
          <button
            onClick={() => setAddingCalendar(true)}
            className="text-stone-300 hover:text-stone-500 transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="flex flex-col gap-0.5">
          {calendars.map(cal => {
            const isVisible = visibleCalendarIds.includes(cal.id)
            return (
              <button
                key={cal.id}
                onClick={() => onToggleCalendar(cal.id)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-stone-100 transition-colors w-full"
              >
                <div className={`w-3 h-3 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isVisible
                    ? `${COLOR_DOT[cal.color]} border-transparent`
                    : `bg-transparent ${COLOR_BORDER[cal.color]}`
                }`}>
                  {isVisible && <Check size={8} className="text-white" strokeWidth={3} />}
                </div>
                <span className="text-xs text-stone-600 text-left">{cal.name}</span>
              </button>
            )
          })}

          {/* Add calendar form */}
          {addingCalendar && (
            <div className="mt-1 flex flex-col gap-2 bg-white border border-stone-200 rounded-lg p-2">
              <input
                autoFocus
                value={newCalName}
                onChange={e => setNewCalName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitCalendar()
                  if (e.key === 'Escape') { setAddingCalendar(false); setNewCalName('') }
                }}
                placeholder="Calendar name..."
                className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 outline-none text-stone-800 placeholder:text-stone-300"
              />
              <div className="flex gap-1.5 flex-wrap">
                {CALENDAR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewCalColor(color)}
                    className={`w-4 h-4 rounded-full ${COLOR_DOT[color]} transition-transform ${
                      newCalColor === color ? 'scale-125 ring-2 ring-offset-1 ring-stone-400' : ''
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={submitCalendar}
                className="text-xs text-white bg-stone-800 rounded-lg py-1 hover:bg-stone-700 transition-colors"
              >
                Add
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="mt-auto px-4 pt-4">
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-600 transition-colors w-full">
          <Settings size={12} />
          Settings
        </button>
      </div>
    </div>
  )
}

export default Sidebar