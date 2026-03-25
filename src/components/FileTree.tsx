import { useEffect, useState } from 'react';
import { DirEntry, readDir } from '@tauri-apps/plugin-fs';
import { ChevronRight, FileText, Folder, FolderOpen, RefreshCw } from 'lucide-react';
import { sortDirEntries } from '../project/files';
import './FileTree.css';

export interface FileTreeProps {
  projectPath: string;
  activeFile: string;
  refreshToken: number;
  onSelectFile: (file: string) => void;
  onRefresh: () => void;
}

export function FileTree({ projectPath, activeFile, refreshToken, onSelectFile, onRefresh }: FileTreeProps) {
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [subEntries, setSubEntries] = useState<Record<string, DirEntry[]>>({});

  useEffect(() => {
    async function loadTree() {
      try {
        setEntries(sortDirEntries(await readDir(projectPath)));
        setSubEntries({});
        setExpandedFolders(new Set());
      } catch (e) {
        console.error("Failed to read dir", e);
      }
    }
    void loadTree();
  }, [projectPath, refreshToken]);

  const toggleFolder = async (folderPath: string) => {
    const nextExpanded = new Set(expandedFolders);
    if (nextExpanded.has(folderPath)) {
      nextExpanded.delete(folderPath);
      setExpandedFolders(nextExpanded);
      return;
    }

    nextExpanded.add(folderPath);
    setExpandedFolders(nextExpanded);

    if (!subEntries[folderPath]) {
      try {
        const result = sortDirEntries(await readDir(`${projectPath}/${folderPath}`));
        setSubEntries((prev) => ({ ...prev, [folderPath]: result }));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const renderEntry = (entry: DirEntry, pathPrefix = '') => {
    const fullRelativePath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
    const isSelected = activeFile === fullRelativePath;

    if (entry.isDirectory) {
      const isExpanded = expandedFolders.has(fullRelativePath);
      const indentation = pathPrefix ? 24 : 8;
      return (
        <div key={fullRelativePath} style={{ marginBottom: '2px' }}>
          <div
            className="file-tree-item"
            onClick={() => toggleFolder(fullRelativePath)}
            style={{ paddingLeft: `${indentation}px` }}
          >
            <ChevronRight className={`file-tree-chevron ${isExpanded ? 'expanded' : ''}`} />
            {isExpanded ? <FolderOpen className="file-tree-icon" /> : <Folder className="file-tree-icon" />}
            <span>{entry.name}</span>
          </div>
          {isExpanded && subEntries[fullRelativePath] && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
              {subEntries[fullRelativePath].map((sub) => renderEntry(sub, fullRelativePath))}
            </div>
          )}
        </div>
      );
    }

    const itemIndentation = pathPrefix ? (pathPrefix.split('/').length * 16 + 26) : 26;

    return (
      <div
        key={fullRelativePath}
        className={`file-tree-item ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelectFile(fullRelativePath)}
        style={{ paddingLeft: `${itemIndentation}px` }}
      >
        <FileText className="file-tree-icon" />
        <span>{entry.name}</span>
      </div>
    );
  };

  return (
    <div className="file-tree-container">
      <div className="file-tree-header-row">
        <h4 className="file-tree-header">Project Files</h4>
        <button className="file-tree-refresh" onClick={onRefresh} aria-label="Refresh project files">
          <RefreshCw className="file-tree-icon" />
        </button>
      </div>
      <div className="file-tree-list">
        {entries.map((entry) => renderEntry(entry))}
      </div>
    </div>
  );
}
