import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronRight, FileUp, X } from "lucide-react";
import type { UserCalendar, UserEvent } from "../types";
import { parseIcsEvents } from "../lib/ics";
import { OptionMenu } from "./PickerControls";

type Props = {
  calendars: UserCalendar[];
  initialFiles?: File[];
  onAddEvents: (events: UserEvent[]) => void;
  onClose: () => void;
};

export default function IcsImportDialog({
  calendars,
  initialFiles = [],
  onAddEvents,
  onClose,
}: Props) {
  const [files, setFiles] = useState<File[]>(initialFiles);
  const [calendarId, setCalendarId] = useState(calendars[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(
    initialFiles.some((file) => !file.name.toLowerCase().endsWith(".ics"))
      ? "Only .ics calendar files are accepted."
      : null,
  );
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (calendars.some((calendar) => calendar.id === calendarId)) return;
    setCalendarId(calendars[0]?.id ?? "");
  }, [calendars, calendarId]);

  function addFiles(nextFiles: FileList | File[]) {
    const selected = Array.from(nextFiles);
    if (selected.some((file) => !file.name.toLowerCase().endsWith(".ics"))) {
      setMessage("Only .ics calendar files are accepted.");
      return;
    }
    setFiles((current) => [...current, ...selected]);
    setMessage(null);
  }

  async function handleImport() {
    if (!files.length) {
      setMessage("Choose an .ics file first.");
      return;
    }
    if (!calendarId) {
      setMessage("Choose a destination calendar first.");
      return;
    }

    setIsImporting(true);
    setMessage(null);
    try {
      const imported = (
        await Promise.all(
          files.map(async (file) =>
            parseIcsEvents(await file.text(), calendarId),
          ),
        )
      ).flat();
      if (!imported.length) {
        setMessage("No importable events found in these files.");
        return;
      }
      onAddEvents(imported);
      onClose();
    } catch {
      setMessage("That calendar file could not be read.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150">
        <div className="mb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <CalendarDays size={20} />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Import calendar
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-slate-400">
                Add events from an .ics file
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close import dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-1 flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
            <FileUp size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-slate-700">
              Select from your computer
            </span>
            <span className="mt-0.5 block text-xs font-semibold text-slate-400">
              Choose one or more .ics files
            </span>
          </span>
          <ChevronRight size={17} className="shrink-0 text-slate-400" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".ics,text/calendar"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) addFiles(event.target.files);
            event.target.value = "";
          }}
        />

        <div className="mt-4">
          <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Import into
          </p>
          <OptionMenu
            value={calendarId}
            onChange={setCalendarId}
            className="w-full"
            options={calendars.map((calendar) => ({
              value: calendar.id,
              label: calendar.name,
              color: calendar.color,
            }))}
          />
        </div>

        {files.length > 0 && (
          <p
            className="mt-3 truncate text-xs font-bold text-slate-600"
            title={files.map((file) => file.name).join(", ")}
          >
            {files.length} .ics file{files.length === 1 ? "" : "s"} selected
          </p>
        )}
        {message && (
          <p className="mt-3 text-xs font-bold text-rose-600" role="alert">
            {message}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-xs font-extrabold text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={isImporting || !files.length}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting ? "Importing..." : "Import events"}
          </button>
        </div>
      </div>
    </div>
  );
}
