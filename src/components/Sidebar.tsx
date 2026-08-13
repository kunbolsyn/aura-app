import { useState } from "react";
import { LayoutGrid, CalendarDays, Settings, Plus, ChevronLeft, ChevronRight, Check, Edit3, Trash2, X } from "lucide-react";
import type { TaskList, UserCalendar, CalendarColor } from "../types";

type SidebarProps = {
  lists: TaskList[];
  calendars: UserCalendar[];
  activeListId: string;
  onListSelect: (listId: string) => void;
  visibleCalendarIds: string[];
  onToggleCalendar: (id: string) => void;
  onAddList: (name: string) => void;
  onDeleteList: (id: string) => void;
  onRenameList: (id: string, newName: string) => void;
  onAddCalendar: (name: string, color: UserCalendar['color']) => void;
  onDeleteCalendar: (id: string) => void;
  onUpdateCalendar: (id: string, name: string, color: UserCalendar['color']) => void;
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
            <div key={i} className={`text-center text-xs py-1 font-semibold rounded-lg cursor-pointer transition-all ${
              isToday
                ? 'bg-blue-600 text-white font-bold shadow-xs shadow-blue-600/30'
                : cell.type === 'current'
                ? 'text-slate-700 hover:bg-slate-200'
                : 'text-slate-300'
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
  onDeleteList,
  onRenameList,
  onAddCalendar,
  onDeleteCalendar,
  onUpdateCalendar,
}: SidebarProps) {
  const [addingList, setAddingList]         = useState(false)
  const [newListName, setNewListName]       = useState('')

  // Inline editing lists
  const [editingListId, setEditingListId]   = useState<string | null>(null)
  const [editListName, setEditListName]     = useState('')

  // Inline editing calendars
  const [editingCalId, setEditingCalId]     = useState<string | null>(null)
  const [editCalName, setEditCalName]       = useState('')
  const [editCalColor, setEditCalColor]     = useState<UserCalendar['color']>('blue')

  const [addingCalendar, setAddingCalendar] = useState(false)
  const [newCalName, setNewCalName]         = useState('')
  const [newCalColor, setNewCalColor]       = useState<UserCalendar['color']>('blue')

  function submitList() {
    if (newListName.trim()) onAddList(newListName.trim())
    setNewListName('')
    setAddingList(false)
  }

  function submitRenameList(id: string) {
    if (editListName.trim()) {
      onRenameList(id, editListName.trim())
    }
    setEditingListId(null)
  }

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
          <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shadow-sm shadow-blue-500/20"></span>
          Aura
        </h1>
        <p className="text-[11px] font-medium text-slate-400 mt-0.5 ml-5">your space to think</p>
      </div>

      {/* Mini calendar */}
      <div className="px-4">
        <MiniCalendar />
      </div>

      {/* Tasks section */}
      <div className="px-4 mb-2">
        <div className="flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-400 uppercase tracking-widest">
            <LayoutGrid size={13} strokeWidth={2.5} /> Lists
          </div>
          <button
            onClick={() => setAddingList(true)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-200/60 rounded-lg transition-all"
          >
            <Plus size={15} strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {lists.map(list => {
            const isEditing = editingListId === list.id;
            const isActive = activeListId === list.id;

            if (isEditing) {
              return (
                <div key={list.id} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <input
                    autoFocus
                    value={editListName}
                    onChange={e => setEditListName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitRenameList(list.id)
                      if (e.key === 'Escape') setEditingListId(null)
                    }}
                    onBlur={() => submitRenameList(list.id)}
                    className="flex-1 text-xs font-semibold py-1 px-1.5 border border-slate-100 rounded-lg outline-none bg-slate-50 text-slate-800"
                  />
                  <button onClick={() => submitRenameList(list.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                    <Check size={12} strokeWidth={3} />
                  </button>
                  <button onClick={() => setEditingListId(null)} className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg">
                    <X size={12} strokeWidth={3} />
                  </button>
                </div>
              )
            }

            return (
              <div
                key={list.id}
                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/10'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <button
                  onClick={() => onListSelect(list.id)}
                  className="flex-1 text-left truncate py-0.5"
                >
                  {list.name}
                </button>
                
                <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'text-white/90' : 'text-slate-400'}`}>
                  <button
                    onClick={() => {
                      setEditListName(list.name)
                      setEditingListId(list.id)
                    }}
                    className={`p-1 hover:bg-white/20 rounded-lg transition-all`}
                  >
                    <Edit3 size={12} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => onDeleteList(list.id)}
                    className="p-1 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                  >
                    <Trash2 size={12} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            )
          })}

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
              placeholder="New list..."
              className="px-3 py-2 rounded-xl text-sm border border-slate-200 outline-none bg-white text-slate-800 placeholder:text-slate-400 font-semibold focus:ring-2 focus:ring-blue-500/20"
            />
          )}
        </div>
      </div>

      {/* Calendars section */}
      <div className="px-4 mt-4">
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
                <div key={cal.id} className="flex flex-col gap-2 bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs">
                  <input
                    autoFocus
                    value={editCalName}
                    onChange={e => setEditCalName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitRenameCalendar(cal.id)
                      if (e.key === 'Escape') setEditingCalId(null)
                    }}
                    placeholder="Calendar name..."
                    className="text-xs font-semibold border border-slate-200 rounded-lg px-2 py-1.5 outline-none text-slate-800 placeholder:text-slate-300"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {CALENDAR_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditCalColor(color)}
                        className={`w-4 h-4 rounded-full ${COLOR_DOT[color]} transition-transform ${
                          editCalColor === color ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'opacity-80 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1 justify-end mt-1">
                    <button
                      onClick={() => setEditingCalId(null)}
                      className="text-[10px] font-bold text-slate-500 hover:bg-slate-50 px-2 py-1 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => submitRenameCalendar(cal.id)}
                      className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1 rounded-lg shadow-xs"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div
                key={cal.id}
                className="group flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-slate-200/50 transition-all w-full"
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

                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                  <button
                    onClick={() => {
                      setEditCalName(cal.name)
                      setEditCalColor(cal.color)
                      setEditingCalId(cal.id)
                    }}
                    className="p-1 hover:bg-slate-200 rounded-lg transition-all"
                  >
                    <Edit3 size={12} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => onDeleteCalendar(cal.id)}
                    className="p-1 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                  >
                    <Trash2 size={12} strokeWidth={2.5} />
                  </button>
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
      <div className="mt-auto px-4 pt-4">
        <button className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-800 hover:bg-slate-200/50 transition-all w-full">
          <Settings size={14} strokeWidth={2.5} />
          Settings
        </button>
      </div>
    </div>
  )
}

export default Sidebar
