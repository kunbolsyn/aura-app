type View = "tasks" | "calendar";

type SidebarProps = {
  activeView: View;
  onViewChange: (view: View) => void;
};

function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <div className="w-64 bg-white shadow-md h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">Aura</h1>
      <nav className="flex flex-col space-y-4">
        <button
          onClick={() => onViewChange("tasks")}
          className={`text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeView === "tasks" ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-100"}`}
        >
          Tasks
        </button>

        <button
          onClick={() => onViewChange("calendar")}
          className={`text-left px-4 py-2 rounded-lg text-sm transition-colors ${activeView === "calendar" ? "bg-blue-500 text-white" : "text-gray-700 hover:bg-gray-100"}`}
        >
          Calendar
        </button>
      </nav>
    </div>
  );
}

export default Sidebar;
