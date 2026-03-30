import type { TaskList, UserCalendar } from "../types";
import { LayoutGrid, Calendar, Settings } from "lucide-react";

type View = "tasks" | "calendar";

type SidebarProps = {
  activeView: View;
  onViewChange: (view: View) => void;
  lists: TaskList[];
  calendars: UserCalendar[];
  activeListId: string;
  onListSelect: (listId: string) => void;
};

const COLOR_DOT: Record<string, string> = {
  blue: "bg-blue-400",
  green: "bg-green-400",
  red: "bg-red-400",
  orange: "bg-orange-400",
  purple: "bg-purple-400",
  teal: "bg-teal-400",
};

function Sidebar({
  activeView,
  onViewChange,
  lists,
  calendars,
  activeListId,
  onListSelect,
}: SidebarProps) {
  return (
    <div className="w-56 h-screen bg-stone-50 border-stone-200 flex flex-col px-4 py-6 shrink-0">
      <div className="px-2 mb-8">
        <h1 className="text-base font-meidum text-stone-800 tracking-wide">
          Aura
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">your space to think</p>
      </div>

      <button
        onClick={() => onViewChange("tasks")}
        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm mb-1 transition-colors${
          activeView === "tasks"
            ? " text-stone-800 font-medium"
            : " text-stone-600 hover:text-stone-600"
        }`}
      >
        <LayoutGrid size={14} />
        Tasks
      </button>

      {activeView === "tasks" && (
        <div className="flex flex-col gap-0.5 ml-2 mb-4">
          {lists.map((list) => (
            <button
              key={list.id}
              onClick={() => {
                onViewChange("tasks");
                onListSelect(list.id);
              }}
              className={`text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                activeListId === list.id
                  ? " bg-white text-stone-800 font-medium border border-stone-200"
                  : " text-stone-400 hover:text-stone-600 hover:bg-stone-100"
              }`}
            >
              {list.name}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => onViewChange("calendar")}
        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm mb-1 transition-colors${
          activeView === "calendar"
            ? " text-stone-800 font-medium"
            : " text-stone-600 hover:text-stone-600"
        }`}
      >
        <Calendar size={14} />
        Calendar
      </button>

      {activeView === "calendar" && (
        <div className="flex flex-col gap-0.5 ml-2 mb-4">
          {calendars.map((cal) => (
            <div
              key={cal.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-stone-400"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${COLOR_DOT[cal.color]}`}
              />
              {cal.name}
            </div>
          ))}
        </div>
      )}

      <div className="mt-auto">
        <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm text-stone-600 hover:text-stone-600">
          <Settings size={14} />
          Settings
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
