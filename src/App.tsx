import { useState } from "react";
import { basename } from "@tauri-apps/api/path";
import { exists } from "@tauri-apps/plugin-fs";
import { Editor } from "./views/Editor";
import { Home } from "./views/Home";
import { useRecentProjects } from "./state/useRecentProjects";
import "./App.css";

function App() {
  const { projects, addProject, removeProject } = useRecentProjects();
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [homeMessage, setHomeMessage] = useState<string | null>(null);

  const handleOpenProject = async (path: string) => {
    const projectExists = await exists(path);
    if (!projectExists) {
      removeProject(path);
      setHomeMessage(`Project folder is no longer available: ${path}`);
      return;
    }

    const nameStr = await basename(path);
    addProject(path, nameStr || "Unknown Project");
    setHomeMessage(null);
    setActiveProject(path);
  };

  return (
    <div className="app-container">
      {!activeProject ? (
        <Home
          recentProjects={projects}
          onOpenProject={handleOpenProject}
          onRemoveProject={removeProject}
          message={homeMessage}
        />
      ) : (
        <Editor
          projectPath={activeProject}
          onClose={() => setActiveProject(null)}
        />
      )}
    </div>
  );
}

export default App;
