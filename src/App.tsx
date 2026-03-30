import { useState } from "react";
import type { Task, TaskList, UserCalendar, UserEvent } from "./types";
import Sidebar from "./components/Sidebar";
import Tasks from "./components/Tasks";

type View = "tasks" | "calendar";

const DEFAULT_LISTS: TaskList[] = [
  { id: "personal", name: "Personal" },
  { id: "work", name: "Work" },
];

const DEFAULT_CALENDARS: UserCalendar[] = [
  { id: "personal", name: "Personal", color: "green" },
  { id: "work", name: "Work", color: "blue" },
];

function App() {
  const [activeView, setActiveView] = useState<View>("tasks");
  const [activeListId, setActiveListId] = useState<string>("personal");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lists] = useState<TaskList[]>(DEFAULT_LISTS);
  const [calendars] = useState<UserCalendar[]>(DEFAULT_CALENDARS);
  const [events] = useState<UserEvent[]>([]);

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        lists={lists}
        calendars={calendars}
        activeListId={activeListId}
        onListSelect={setActiveListId}
      />
      <main className="flex-1 overflow-y-auto">
        {activeView === "tasks" && (
          <Tasks
            tasks={tasks}
            setTasks={setTasks}
            lists={lists}
            activeListId={activeListId}
          />
        )}
      </main>
    </div>
  );
}

export default App;
