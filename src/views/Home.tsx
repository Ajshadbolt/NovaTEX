import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { ProjectMeta } from '../types';
import './Home.css';

interface HomeProps {
  recentProjects: ProjectMeta[];
  onOpenProject: (path: string) => void;
}

const TEMPLATE_MAIN_TEX = `\\documentclass{article}
\\usepackage{graphicx}
\\usepackage{amsmath}

\\title{My New Document}
\\author{}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Introduction}
Start writing your LaTeX document here. Type / to use slash commands.

\\end{document}
`;

export function Home({ recentProjects, onOpenProject }: HomeProps) {
  const [isCreating, setIsCreating] = React.useState(false);

  const handleOpenExisting = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Open LaTeX Project'
      });
      if (selected && typeof selected === 'string') {
        onOpenProject(selected);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateNew = async () => {
    try {
      setIsCreating(true);
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Directory to Create New Project'
      });
      
      if (selected && typeof selected === 'string') {
        const mainTexPath = `${selected}/main.tex`;
        
        const fileExists = await exists(mainTexPath);
        if (!fileExists) {
          await writeTextFile(mainTexPath, TEMPLATE_MAIN_TEX);
          // Create figures directory
          await mkdir(`${selected}/figures`);
        }
        onOpenProject(selected);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="home-container" data-tauri-drag-region>
      <div className="home-content">
        <h1 className="home-title">LaTeX Editor</h1>
        <p className="home-subtitle">Minimalist local workspace</p>
        
        <div className="home-actions">
          <button className="primary action-btn" onClick={handleCreateNew} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'New Project'}
          </button>
          <button className="action-btn" onClick={handleOpenExisting}>
            Open Existing folder
          </button>
        </div>

        {recentProjects.length > 0 && (
          <div className="recent-projects">
            <h3>Recent Projects</h3>
            <ul className="project-list">
              {recentProjects.map(proj => (
                <li key={proj.path} onClick={() => onOpenProject(proj.path)}>
                  <div className="project-name">{proj.name}</div>
                  <div className="project-path">{proj.path}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
