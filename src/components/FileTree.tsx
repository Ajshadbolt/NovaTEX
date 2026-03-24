import { useState, useEffect } from 'react';
import { readDir, DirEntry } from '@tauri-apps/plugin-fs';
import { Folder, FolderOpen, FileText, ChevronRight } from 'lucide-react';
import './FileTree.css';

export interface FileTreeProps {
  projectPath: string;
  activeFile: string;
  onSelectFile: (file: string) => void;
}

export function FileTree({ projectPath, activeFile, onSelectFile }: FileTreeProps) {
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [subEntries, setSubEntries] = useState<Record<string, DirEntry[]>>({});

  useEffect(() => {
    async function loadTree() {
      try {
        const result = await readDir(projectPath);
        // Sort: folders first, then alphabetical
        result.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name);
        });
        setEntries(result);
      } catch (e) {
        console.error("Failed to read dir", e);
      }
    }
    loadTree();
  }, [projectPath]);

  const toggleFolder = async (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
      setExpandedFolders(newExpanded);
    } else {
      newExpanded.add(folderPath);
      setExpandedFolders(newExpanded);
      if (!subEntries[folderPath]) {
        try {
          const result = await readDir(`${projectPath}/${folderPath}`);
          result.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });
          setSubEntries(prev => ({ ...prev, [folderPath]: result }));
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const renderEntry = (entry: DirEntry, pathPrefix: string = '') => {
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
              {subEntries[fullRelativePath].map(sub => renderEntry(sub, fullRelativePath))}
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
      <h4 className="file-tree-header">
        Project Files
      </h4>
      <div className="file-tree-list">
        {entries.map(e => renderEntry(e))}
      </div>
    </div>
  );
}
