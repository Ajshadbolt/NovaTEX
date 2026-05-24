import { useCallback, useEffect, useRef, useState } from 'react';
import { DirEntry, mkdir, readDir, remove, rename, writeTextFile } from '@tauri-apps/plugin-fs';
import { ChevronRight, FilePlus, FileText, Folder, FolderOpen, FolderPlus, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { sortDirEntries } from '../project/files';
import './FileTree.css';

export interface FileTreeProps {
  projectPath: string;
  activeFile: string;
  refreshToken: number;
  onSelectFile: (file: string) => void;
  onRefresh: () => void;
}

type ContextMenu = {
  x: number;
  y: number;
  relPath: string;
  isDirectory: boolean;
} | null;

type PendingCreate = {
  parentRelPath: string;
  type: 'file' | 'folder';
  inputValue: string;
} | null;

type Renaming = {
  relPath: string;
  inputValue: string;
} | null;

const getDepth = (pathPrefix: string) => (pathPrefix ? pathPrefix.split('/').length : 0);

export function FileTree({ projectPath, activeFile, refreshToken, onSelectFile, onRefresh }: FileTreeProps) {
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [subEntries, setSubEntries] = useState<Record<string, DirEntry[]>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenu>(null);
  const [pendingCreate, setPendingCreate] = useState<PendingCreate>(null);
  const [renaming, setRenaming] = useState<Renaming>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const reloadRoot = useCallback(async () => {
    try {
      setEntries(sortDirEntries(await readDir(projectPath)));
    } catch (e) {
      console.error('Failed to reload root', e);
    }
  }, [projectPath]);

  const reloadFolder = useCallback(async (folderRelPath: string) => {
    try {
      const result = sortDirEntries(await readDir(`${projectPath}/${folderRelPath}`));
      setSubEntries((prev) => ({ ...prev, [folderRelPath]: result }));
    } catch (e) {
      console.error('Failed to reload folder', e);
    }
  }, [projectPath]);

  useEffect(() => {
    async function loadTree() {
      try {
        setEntries(sortDirEntries(await readDir(projectPath)));
        setSubEntries({});
        setExpandedFolders(new Set());
      } catch (e) {
        console.error('Failed to read dir', e);
      }
    }
    void loadTree();
  }, [projectPath, refreshToken]);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    window.addEventListener('click', handler);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu]);

  useEffect(() => {
    if (pendingCreate) {
      // Small delay so the element is in the DOM before focusing
      setTimeout(() => createInputRef.current?.focus(), 0);
    }
  }, [pendingCreate]);

  useEffect(() => {
    if (renaming) {
      setTimeout(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      }, 0);
    }
  }, [renaming]);

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

  const startCreate = async (parentRelPath: string, type: 'file' | 'folder') => {
    setContextMenu(null);
    if (parentRelPath !== '' && !expandedFolders.has(parentRelPath)) {
      const nextExpanded = new Set(expandedFolders);
      nextExpanded.add(parentRelPath);
      setExpandedFolders(nextExpanded);
      if (!subEntries[parentRelPath]) {
        try {
          const result = sortDirEntries(await readDir(`${projectPath}/${parentRelPath}`));
          setSubEntries((prev) => ({ ...prev, [parentRelPath]: result }));
        } catch (e) {
          console.error(e);
        }
      }
    }
    setPendingCreate({ parentRelPath, type, inputValue: '' });
  };

  const commitCreate = async () => {
    if (!pendingCreate) return;
    const name = pendingCreate.inputValue.trim();
    if (!name) {
      setPendingCreate(null);
      return;
    }

    const absParent = pendingCreate.parentRelPath
      ? `${projectPath}/${pendingCreate.parentRelPath}`
      : projectPath;
    const absPath = `${absParent}/${name}`;

    try {
      if (pendingCreate.type === 'folder') {
        await mkdir(absPath, { recursive: true });
      } else {
        await writeTextFile(absPath, '');
      }

      if (pendingCreate.parentRelPath === '') {
        await reloadRoot();
      } else {
        await reloadFolder(pendingCreate.parentRelPath);
      }
      onRefresh();

      if (pendingCreate.type === 'file') {
        const newRelPath = pendingCreate.parentRelPath
          ? `${pendingCreate.parentRelPath}/${name}`
          : name;
        onSelectFile(newRelPath);
      }
    } catch (e) {
      console.error('Failed to create', e);
    }

    setPendingCreate(null);
  };

  const startRename = (relPath: string) => {
    const name = relPath.split('/').pop() ?? relPath;
    setContextMenu(null);
    setRenaming({ relPath, inputValue: name });
  };

  const commitRename = async () => {
    if (!renaming) return;
    const newName = renaming.inputValue.trim();
    if (!newName) {
      setRenaming(null);
      return;
    }

    const parts = renaming.relPath.split('/');
    const oldName = parts[parts.length - 1];
    if (newName === oldName) {
      setRenaming(null);
      return;
    }

    const newRelPath = [...parts.slice(0, -1), newName].join('/');
    const absOldPath = `${projectPath}/${renaming.relPath}`;
    const absNewPath = `${projectPath}/${newRelPath}`;

    try {
      await rename(absOldPath, absNewPath);

      const parentRelPath = parts.slice(0, -1).join('/');
      if (parentRelPath === '') {
        await reloadRoot();
      } else {
        await reloadFolder(parentRelPath);
      }
      onRefresh();

      if (activeFile === renaming.relPath) {
        onSelectFile(newRelPath);
      }
    } catch (e) {
      console.error('Failed to rename', e);
    }

    setRenaming(null);
  };

  const handleDelete = async (relPath: string, isDirectory: boolean) => {
    setContextMenu(null);
    const name = relPath.split('/').pop() ?? relPath;
    const message = isDirectory
      ? `Delete folder "${name}" and all its contents?`
      : `Delete "${name}"?`;

    if (!window.confirm(message)) return;

    const absPath = `${projectPath}/${relPath}`;
    try {
      await remove(absPath, { recursive: true });

      const parts = relPath.split('/');
      const parentRelPath = parts.slice(0, -1).join('/');
      if (parentRelPath === '') {
        await reloadRoot();
      } else {
        await reloadFolder(parentRelPath);
      }
      onRefresh();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, relPath: string, isDirectory: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, relPath, isDirectory });
  };

  const renderInlineInput = (parentRelPath: string) => {
    if (!pendingCreate || pendingCreate.parentRelPath !== parentRelPath) return null;

    const depth = getDepth(parentRelPath);
    const indentation = 26 + depth * 16;
    const Icon = pendingCreate.type === 'folder' ? Folder : FileText;
    const placeholder = pendingCreate.type === 'folder' ? 'folder-name' : 'filename.tex';

    return (
      <div
        key="__pending-create__"
        className="file-tree-item"
        style={{ paddingLeft: `${indentation}px` }}
      >
        <Icon className="file-tree-icon" />
        <input
          ref={createInputRef}
          className="file-tree-inline-input"
          value={pendingCreate.inputValue}
          placeholder={placeholder}
          onChange={(e) => setPendingCreate((prev) => prev ? { ...prev, inputValue: e.target.value } : null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); void commitCreate(); }
            if (e.key === 'Escape') { e.preventDefault(); setPendingCreate(null); }
          }}
          onBlur={() => void commitCreate()}
        />
      </div>
    );
  };

  const renderEntry = (entry: DirEntry, pathPrefix = '') => {
    if (!entry.name) return null;
    const fullRelativePath = pathPrefix ? `${pathPrefix}/${entry.name}` : entry.name;
    const isSelected = activeFile === fullRelativePath;
    const isRenaming = renaming?.relPath === fullRelativePath;
    const depth = getDepth(pathPrefix);

    if (entry.isDirectory) {
      const isExpanded = expandedFolders.has(fullRelativePath);
      const dirIndent = 8 + depth * 16;

      return (
        <div key={fullRelativePath} style={{ marginBottom: '2px' }}>
          <div
            className="file-tree-item"
            onClick={() => { if (!isRenaming) void toggleFolder(fullRelativePath); }}
            onContextMenu={(e) => handleContextMenu(e, fullRelativePath, true)}
            style={{ paddingLeft: `${dirIndent}px` }}
          >
            <ChevronRight className={`file-tree-chevron ${isExpanded ? 'expanded' : ''}`} />
            {isExpanded ? <FolderOpen className="file-tree-icon" /> : <Folder className="file-tree-icon" />}
            {isRenaming ? (
              <input
                ref={renameInputRef}
                className="file-tree-inline-input"
                value={renaming.inputValue}
                onChange={(e) => setRenaming((prev) => prev ? { ...prev, inputValue: e.target.value } : null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); void commitRename(); }
                  if (e.key === 'Escape') { e.preventDefault(); setRenaming(null); }
                }}
                onBlur={() => void commitRename()}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span>{entry.name}</span>
            )}
          </div>
          {isExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
              {renderInlineInput(fullRelativePath)}
              {(subEntries[fullRelativePath] ?? []).map((sub) => renderEntry(sub, fullRelativePath))}
            </div>
          )}
        </div>
      );
    }

    const fileIndent = 26 + depth * 16;

    return (
      <div
        key={fullRelativePath}
        className={`file-tree-item ${isSelected ? 'selected' : ''}`}
        onClick={() => { if (!isRenaming) onSelectFile(fullRelativePath); }}
        onContextMenu={(e) => handleContextMenu(e, fullRelativePath, false)}
        style={{ paddingLeft: `${fileIndent}px` }}
      >
        <FileText className="file-tree-icon" />
        {isRenaming ? (
          <input
            ref={renameInputRef}
            className="file-tree-inline-input"
            value={renaming.inputValue}
            onChange={(e) => setRenaming((prev) => prev ? { ...prev, inputValue: e.target.value } : null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); void commitRename(); }
              if (e.key === 'Escape') { e.preventDefault(); setRenaming(null); }
            }}
            onBlur={() => void commitRename()}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span>{entry.name}</span>
        )}
      </div>
    );
  };

  return (
    <div className="file-tree-container">
      <div className="file-tree-header-row">
        <h4 className="file-tree-header">Project Files</h4>
        <div className="file-tree-header-actions">
          <button
            className="file-tree-action-btn"
            onClick={() => void startCreate('', 'file')}
            aria-label="New file"
            title="New file"
          >
            <FilePlus className="file-tree-icon" />
          </button>
          <button
            className="file-tree-action-btn"
            onClick={() => void startCreate('', 'folder')}
            aria-label="New folder"
            title="New folder"
          >
            <FolderPlus className="file-tree-icon" />
          </button>
          <button
            className="file-tree-action-btn"
            onClick={onRefresh}
            aria-label="Refresh project files"
            title="Refresh"
          >
            <RefreshCw className="file-tree-icon" />
          </button>
        </div>
      </div>
      <div className="file-tree-list">
        {renderInlineInput('')}
        {entries.map((entry) => renderEntry(entry))}
      </div>

      {contextMenu && (
        <div
          className="file-tree-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.isDirectory && (
            <>
              <button
                className="file-tree-context-item"
                onClick={() => void startCreate(contextMenu.relPath, 'file')}
              >
                <FilePlus size={13} />
                <span>New File</span>
              </button>
              <button
                className="file-tree-context-item"
                onClick={() => void startCreate(contextMenu.relPath, 'folder')}
              >
                <FolderPlus size={13} />
                <span>New Folder</span>
              </button>
              <div className="file-tree-context-separator" />
            </>
          )}
          <button
            className="file-tree-context-item"
            onClick={() => startRename(contextMenu.relPath)}
          >
            <Pencil size={13} />
            <span>Rename</span>
          </button>
          <button
            className="file-tree-context-item danger"
            onClick={() => void handleDelete(contextMenu.relPath, contextMenu.isDirectory)}
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
