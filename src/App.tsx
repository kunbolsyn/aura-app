import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Calendar from "./components/Calendar";
import Tasks from "./components/Tasks";

type View = "tasks" | "calendar";

function App() {
  const [activeView, setActiveView] = useState<View>("tasks");

  return (
    <div className="flex h-screen bg-white">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-y-auto">
        {activeView === "tasks" && <Tasks />}
        {activeView === "calendar" && <Calendar />}
      </main>
    </div>
  );
}

export default App;
