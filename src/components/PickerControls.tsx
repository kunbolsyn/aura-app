import { useEffect, useRef, useState } from "react"
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock } from "lucide-react"

type Option = { value: string; label: string; color?: string }

const SWATCHES: Record<string, string> = {
  blue: "bg-blue-500", green: "bg-emerald-500", red: "bg-rose-500", orange: "bg-amber-500", purple: "bg-violet-500", teal: "bg-cyan-500",
}

export function OptionMenu({ value, options, onChange, placeholder = "Choose an option", className = "" }: { value: string; options: Option[]; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const [openAbove, setOpenAbove] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.value === value)
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])
  return (
    <div ref={ref} className={`relative min-w-0 ${className}`}>
      <button type="button" onClick={() => { const bottom = ref.current?.getBoundingClientRect().bottom ?? 0; setOpenAbove(bottom > window.innerHeight - 280); setOpen(current => !current) }} aria-haspopup="listbox" aria-expanded={open} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10">
        {selected?.color && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SWATCHES[selected.color] ?? "bg-slate-400"}`} />}
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
        <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div role="listbox" className={`absolute left-0 right-0 z-[70] max-h-[40vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-slate-900/10 animate-in fade-in zoom-in-95 duration-150 ${openAbove ? "bottom-full mb-2 origin-bottom slide-in-from-bottom-1" : "top-full mt-2 origin-top slide-in-from-top-1"}`}>
        {options.map(option => <button type="button" role="option" aria-selected={option.value === value} key={option.value} onClick={() => { onChange(option.value); setOpen(false) }} className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all duration-150 hover:translate-x-0.5 hover:bg-slate-50 ${option.value === value ? "bg-blue-50 text-blue-700" : "text-slate-700"}`}>
          {option.color && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${SWATCHES[option.color] ?? "bg-slate-400"}`} />}
          <span className="flex-1 truncate">{option.label}</span>{option.value === value && <Check size={14} />}
        </button>)}
      </div>}
    </div>
  )
}

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value.replace("T", " ") : date.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

function toLocalDate(value: string) { const [date] = value.split("T"); const [year, month, day] = date.split("-").map(Number); return new Date(year, (month || 1) - 1, day || 1) }
function toDateTime(date: Date, time: string) { const pad = (n: number) => String(n).padStart(2, "0"); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}` }

export function CalendarDateTimePicker({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const [openAbove, setOpenAbove] = useState(false)
  const [viewDate, setViewDate] = useState(() => toLocalDate(value))
  const [time, setTime] = useState(() => value.split("T")[1] ?? "09:00")
  const ref = useRef<HTMLDivElement>(null)
  const today = new Date()
  const year = viewDate.getFullYear(), month = viewDate.getMonth()
  const start = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((start + days) / 7) * 7 }, (_, index) => {
    const date = new Date(year, month, index - start + 1)
    return date
  })
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [])
  function selectDate(date: Date) { const next = toDateTime(date, time); onChange(next); setViewDate(date); setOpen(false) }
  return <div ref={ref} className="relative min-w-0 flex-1">
    <button type="button" onClick={() => { const bottom = ref.current?.getBoundingClientRect().bottom ?? 0; setOpenAbove(bottom > window.innerHeight - 370); setOpen(current => !current) }} aria-label={label} aria-expanded={open} className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/10">
      <CalendarDays size={14} className="shrink-0 text-blue-500" /><span className="min-w-0 flex-1 truncate">{formatDateTime(value)}</span><ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className={`absolute left-0 z-[60] w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/15 animate-in fade-in zoom-in-95 duration-150 ${openAbove ? "bottom-full mb-2 origin-bottom slide-in-from-bottom-1" : "top-full mt-2 origin-top slide-in-from-top-1"}`}>
      <div className="mb-3 flex items-center justify-between"><button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"><ChevronLeft size={16} /></button><strong className="text-xs text-slate-800">{viewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</strong><button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100"><ChevronRight size={16} /></button></div>
      <div className="mb-1 grid grid-cols-7">{["M", "T", "W", "T", "F", "S", "S"].map((day, index) => <span key={index} className="py-1 text-center text-[10px] font-black text-slate-400">{day}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">{cells.map(date => { const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; const selected = value.startsWith(iso); const outside = date.getMonth() !== month; const isToday = date.toDateString() === today.toDateString(); return <button type="button" key={iso} onClick={() => selectDate(date)} className={`rounded-lg py-2 text-xs font-bold transition-all hover:scale-105 ${selected ? "bg-blue-600 text-white shadow-md" : isToday ? "bg-blue-50 text-blue-600" : outside ? "text-slate-300" : "text-slate-700 hover:bg-slate-100"}`}>{date.getDate()}</button> })}</div>
      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3"><Clock size={14} className="text-slate-400" /><label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Time</label><input type="time" value={time} onChange={event => { setTime(event.target.value); onChange(toDateTime(toLocalDate(value), event.target.value)) }} className="ml-auto rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-500" /></div>
    </div>}
  </div>
}
