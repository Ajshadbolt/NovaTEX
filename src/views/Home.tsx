import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir, writeTextFile } from '@tauri-apps/plugin-fs';
import { ProjectMeta } from '../types';
import './Home.css';

interface HomeProps {
  recentProjects: ProjectMeta[];
  onOpenProject: (path: string) => void;
  onRemoveProject: (path: string) => void;
  message: string | null;
}

const TEMPLATE_MAIN_TEX = `\\documentclass[12pt,a4paper]{article}

% Core packages
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[english]{babel}
\\usepackage[a4paper,margin=2.5cm]{geometry}

% Math
\\usepackage{amsmath}
\\usepackage{amssymb}

% Graphics
\\usepackage{graphicx}

% Hyperlinks
\\usepackage[colorlinks=true,allcolors=blue]{hyperref}

\\title{Document Title}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
Write your abstract here.
\\end{abstract}

\\section{Introduction}
Your introduction goes here. You can cite references like this~\\cite{example2023}.

\\section{Methods}

\\subsection{Mathematical Notation}
Inline math: $E = mc^2$. Display equation:
\\begin{equation}
  \\nabla^2 \\phi = 0
\\end{equation}

\\subsection{Including a Figure}
\\begin{figure}[h]
  \\centering
  % \\includegraphics[width=0.5\\textwidth]{figures/example.png}
  \\caption{Caption for your figure.}
  \\label{fig:example}
\\end{figure}

\\subsection{Tables}
\\begin{table}[h]
  \\centering
  \\begin{tabular}{lcc}
    \\hline
    Column 1 & Column 2 & Column 3 \\\\
    \\hline
    Row 1    & Value    & Value    \\\\
    Row 2    & Value    & Value    \\\\
    \\hline
  \\end{tabular}
  \\caption{Caption for your table.}
  \\label{tab:example}
\\end{table}

\\section{Results}
Present your findings here.

\\section{Conclusion}
Summarise your work here.

\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}
`;

const TEMPLATE_REFERENCES_BIB = `@article{example2023,
  author  = {Smith, John and Jones, Jane},
  title   = {An Example Article Title},
  journal = {Example Journal},
  year    = {2023},
  volume  = {1},
  number  = {1},
  pages   = {1--10}
}
`;

export function Home({ recentProjects, onOpenProject, onRemoveProject, message }: HomeProps) {
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
          await writeTextFile(`${selected}/references.bib`, TEMPLATE_REFERENCES_BIB);
          await mkdir(`${selected}/figures`, { recursive: true });
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
    <div className="home-container">
      <div className="home-drag-strip" data-tauri-drag-region aria-hidden="true" />
      <div className="home-content">
        <h1 className="home-title">NovaTeX</h1>
        <p className="home-subtitle">Minimalist local workspace</p>

        {message && <div className="home-message">{message}</div>}
        
        <div className="home-actions">
          <button className="primary action-btn" onClick={handleCreateNew} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'New Project'}
          </button>
          <button className="action-btn" onClick={handleOpenExisting}>
            Open Existing Folder
          </button>
        </div>

        {recentProjects.length > 0 && (
          <div className="recent-projects">
            <h3>Recent Projects</h3>
            <ul className="project-list">
              {recentProjects.map((proj) => (
                <li key={proj.path}>
                  <button className="project-card" onClick={() => onOpenProject(proj.path)}>
                    <div className="project-name">{proj.name}</div>
                    <div className="project-path">{proj.path}</div>
                  </button>
                  <button
                    className="project-remove"
                    onClick={() => onRemoveProject(proj.path)}
                    aria-label={`Remove ${proj.name} from recent projects`}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
