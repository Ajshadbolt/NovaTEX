import { useState, useEffect } from 'react';
import { ProjectMeta } from '../types';

const RECENT_PROJECTS_KEY = 'latex_recent_projects';

export function useRecentProjects() {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent projects', e);
      }
    }
  }, []);

  const addProject = (path: string, name: string) => {
    setProjects(prev => {
      const filtered = prev.filter(p => p.path !== path);
      const updated = [{ path, name, lastOpened: Date.now() }, ...filtered].slice(0, 10);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const removeProject = (path: string) => {
    setProjects(prev => {
      const updated = prev.filter(p => p.path !== path);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return { projects, addProject, removeProject };
}
