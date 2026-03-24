import { useState } from "react";
import { Home } from "./views/Home";
import { Editor } from "./views/Editor";
import { useRecentProjects } from "./state/useRecentProjects";
import { basename } from "@tauri-apps/api/path";
import "./App.css";

function App() {
  const { projects, addProject } = useRecentProjects();
  const [activeProject, setActiveProject] = useState<string | null>(null);

  const handleOpenProject = async (path: string) => {
    // Generate an appropriate name from the path if needed
    // In a real app we might read the folder name
    const nameStr = await basename(path);
    addProject(path, nameStr || "Unknown Project");
    setActiveProject(path);
  };

  const handleCloseProject = () => {
    setActiveProject(null);
  };

  return (
    <div className="app-container">
      {!activeProject ? (
        <Home 
          recentProjects={projects} 
          onOpenProject={handleOpenProject} 
        />
      ) : (
        <Editor 
          projectPath={activeProject} 
          onClose={handleCloseProject} 
        />
      )}
    </div>
  );
}

export default App;
