import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { ArrowLeft, Command, Sparkles } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { BuildPanel } from '../components/BuildPanel';
import { CodePane } from '../components/CodePane';
import { CommandOverlay } from '../components/CommandOverlay';
import { FileTree } from '../components/FileTree';
import { PdfPreview } from '../components/PdfPreview';
import { parseLatexIssues } from '../editor/latexLog';
import { formatShortcut, matchesShortcut } from '../editor/shortcuts';
import { listProjectFiles, listTexFiles } from '../project/files';
import { BuildIssue, BuildResult, CommandDefinition, JumpTarget } from '../types';
import './Editor.css';

interface EditorProps {
  projectPath: string;
  onClose: () => void;
}

type OverlayMode = 'palette' | 'shortcuts' | null;
type PaletteScope = 'all' | 'files';

const INITIAL_PDF_ZOOM = 1;

export function Editor({ projectPath, onClose }: EditorProps) {
  const appWindow = getCurrentWindow();
  const isMac = useMemo(() => /Mac|iPhone|iPad|iPod/i.test(navigator.platform), []);
  const [smoothMode, setSmoothMode] = useState(() => localStorage.getItem('novatex:smooth-editor') === 'enabled');
  const [activeFile, setActiveFile] = useState('');
  const [mainFile, setMainFile] = useState('');
  const [texFiles, setTexFiles] = useState<string[]>([]);
  const [projectFiles, setProjectFiles] = useState<string[]>([]);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [compileTick, setCompileTick] = useState(0);
  const [buildPanelOpen, setBuildPanelOpen] = useState(false);
  const [jumpTarget, setJumpTarget] = useState<JumpTarget | null>(null);
  const [flushSave, setFlushSave] = useState<() => Promise<void>>(() => async () => {});
  const [overlayMode, setOverlayMode] = useState<OverlayMode>(null);
  const [paletteScope, setPaletteScope] = useState<PaletteScope>('all');
  const [pdfZoom, setPdfZoom] = useState(INITIAL_PDF_ZOOM);

  const settingsKey = useMemo(() => `novatex:${projectPath}:main-file`, [projectPath]);
  const previewFile = useMemo(
    () => buildResult?.outputPdf ?? (mainFile ? mainFile.replace(/\.tex$/i, '.pdf') : 'main.pdf'),
    [buildResult?.outputPdf, mainFile],
  );
  const projectName = useMemo(() => projectPath.split('/').pop() ?? projectPath, [projectPath]);
  const isSidebarOpen = isSidebarPinned || isSidebarHovered;

  const loadProjectFiles = useCallback(async () => {
    try {
      const [nextTexFiles, nextProjectFiles] = await Promise.all([
        listTexFiles(projectPath),
        listProjectFiles(projectPath),
      ]);

      setTexFiles(nextTexFiles);
      setProjectFiles(nextProjectFiles);

      const savedMainFile = localStorage.getItem(settingsKey);
      const nextMainFile = savedMainFile && nextTexFiles.includes(savedMainFile)
        ? savedMainFile
        : nextTexFiles.includes('main.tex')
          ? 'main.tex'
          : nextTexFiles[0] ?? '';

      setMainFile(nextMainFile);
      setActiveFile((currentFile) => {
        if (currentFile && nextProjectFiles.includes(currentFile)) {
          return currentFile;
        }

        return nextMainFile || nextProjectFiles[0] || '';
      });
    } catch (error) {
      console.error('Failed to load project files', error);
    }
  }, [projectPath, settingsKey]);

  useEffect(() => {
    void loadProjectFiles();
  }, [loadProjectFiles, refreshToken]);

  useEffect(() => {
    if (mainFile) {
      localStorage.setItem(settingsKey, mainFile);
    }
  }, [mainFile, settingsKey]);

  useEffect(() => {
    localStorage.setItem('novatex:smooth-editor', smoothMode ? 'enabled' : 'disabled');
  }, [smoothMode]);

  useEffect(() => {
    if (!isFocusMode) {
      return;
    }

    setBuildPanelOpen(false);
    setIsSidebarHovered(false);
  }, [isFocusMode]);

  const closeOverlay = useCallback(() => {
    setOverlayMode(null);
  }, []);

  const openPalette = useCallback((scope: PaletteScope = 'all') => {
    setPaletteScope(scope);
    setOverlayMode('palette');
  }, []);

  const openShortcuts = useCallback(() => {
    setOverlayMode('shortcuts');
  }, []);

  const refreshProject = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  const adjustZoom = useCallback((step: number) => {
    setPdfZoom((value) => Math.min(3, Math.max(0.4, Number((value + step).toFixed(2)))));
  }, []);

  const resetZoom = useCallback(() => {
    setPdfZoom(INITIAL_PDF_ZOOM);
  }, []);

  const handleCompile = useCallback(async () => {
    if (!mainFile) {
      return;
    }

    await flushSave();
    setCompileStatus('compiling');

    try {
      const result = await invoke<BuildResult>('run_latex_build', { targetDir: projectPath, fileName: mainFile });
      setBuildResult(result);
      setCompileStatus('success');
      setCompileTick(Date.now());
      setBuildPanelOpen(false);
    } catch (error) {
      setBuildResult({
        engine: 'build failed',
        log: String(error),
        outputPdf: previewFile,
      });
      setCompileStatus('error');
      setBuildPanelOpen(!isFocusMode);
    }
  }, [flushSave, isFocusMode, mainFile, previewFile, projectPath]);

  const buildIssues = useMemo<BuildIssue[]>(
    () => parseLatexIssues(buildResult?.log ?? '', mainFile || activeFile || 'main.tex'),
    [activeFile, buildResult?.log, mainFile],
  );

  const handleJumpToIssue = useCallback((issue: BuildIssue) => {
    const targetFile = issue.file || mainFile || activeFile;
    if (!targetFile) {
      return;
    }

    setActiveFile(targetFile);
    if (issue.line) {
      setJumpTarget({
        file: targetFile,
        line: issue.line,
        nonce: Date.now(),
      });
    }
  }, [activeFile, mainFile]);

  const commands = useMemo<CommandDefinition[]>(() => [
    {
      id: 'compile',
      label: 'Compile document',
      description: 'Build the selected main file',
      group: 'Build',
      shortcut: { code: 'Enter', primary: true },
      disabled: compileStatus === 'compiling' || !mainFile,
      action: () => {
        void handleCompile();
      },
    },
    {
      id: 'toggle-build-panel',
      label: buildPanelOpen ? 'Hide build details' : 'Show build details',
      description: 'Expand or collapse the build sheet',
      group: 'Build',
      shortcut: { code: 'KeyJ', primary: true },
      disabled: isFocusMode,
      stateLabel: buildPanelOpen ? 'Visible' : 'Hidden',
      action: () => setBuildPanelOpen((value) => !value),
    },
    {
      id: 'toggle-file-tree',
      label: isSidebarPinned ? 'Hide file tree' : 'Show file tree',
      description: 'Pin or unpin the project files drawer',
      group: 'Files',
      shortcut: { code: 'KeyB', primary: true },
      stateLabel: isSidebarPinned ? 'Pinned' : 'Floating',
      action: () => setIsSidebarPinned((value) => !value),
    },
    {
      id: 'refresh-project',
      label: 'Refresh project files',
      description: 'Reload the project file list',
      group: 'Files',
      shortcut: { code: 'KeyR', primary: true, shift: true },
      action: refreshProject,
    },
    {
      id: 'quick-open-file',
      label: 'Quick switch file',
      description: 'Search project files and jump directly to one',
      group: 'Files',
      shortcut: { code: 'KeyP', primary: true },
      action: () => openPalette('files'),
    },
    {
      id: 'toggle-focus-mode',
      label: isFocusMode ? 'Exit focus mode' : 'Enter focus mode',
      description: 'Reduce non-essential workspace chrome',
      group: 'View',
      shortcut: { code: 'KeyF', primary: true, shift: true },
      stateLabel: isFocusMode ? 'On' : 'Off',
      action: () => setIsFocusMode((value) => !value),
    },
    {
      id: 'toggle-smooth-mode',
      label: smoothMode ? 'Disable smooth editor motion' : 'Enable smooth editor motion',
      description: 'Toggle the editor movement treatment',
      group: 'View',
      shortcut: { code: 'KeyS', primary: true, alt: true },
      stateLabel: smoothMode ? 'On' : 'Off',
      action: () => setSmoothMode((value) => !value),
    },
    {
      id: 'zoom-pdf-in',
      label: 'Zoom PDF in',
      description: 'Increase preview magnification',
      group: 'View',
      shortcut: { code: 'Equal', primary: true },
      action: () => adjustZoom(0.1),
    },
    {
      id: 'zoom-pdf-out',
      label: 'Zoom PDF out',
      description: 'Decrease preview magnification',
      group: 'View',
      shortcut: { code: 'Minus', primary: true },
      action: () => adjustZoom(-0.1),
    },
    {
      id: 'reset-pdf-zoom',
      label: 'Reset PDF zoom',
      description: 'Return preview magnification to 100%',
      group: 'View',
      shortcut: { code: 'Digit0', primary: true },
      action: resetZoom,
    },
    {
      id: 'return-to-projects',
      label: 'Back to projects',
      description: 'Return to the project launcher',
      group: 'Navigate',
      action: onClose,
    },
    {
      id: 'open-command-palette',
      label: 'Open command palette',
      description: 'Search actions and files',
      group: 'Help',
      shortcut: { code: 'KeyK', primary: true },
      action: () => openPalette('all'),
    },
    {
      id: 'open-shortcuts-help',
      label: 'Show keyboard shortcuts',
      description: 'Open the full keyboard reference sheet',
      group: 'Help',
      shortcut: { code: 'Slash', primary: true },
      action: openShortcuts,
    },
  ], [
    adjustZoom,
    buildPanelOpen,
    compileStatus,
    handleCompile,
    isFocusMode,
    isSidebarPinned,
    mainFile,
    onClose,
    openPalette,
    openShortcuts,
    refreshProject,
    resetZoom,
    smoothMode,
  ]);

  const paletteCommands = useMemo(
    () => commands.filter((command) => command.id !== 'open-command-palette'),
    [commands],
  );

  const commandPaletteShortcut = useMemo(() => {
    const paletteCommand = commands.find((command) => command.id === 'open-command-palette');
    return paletteCommand?.shortcut ? formatShortcut(paletteCommand.shortcut, isMac) : '';
  }, [commands, isMac]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return;
      }

      if (overlayMode) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeOverlay();
        }
        return;
      }

      if (event.key === 'Escape') {
        if (buildPanelOpen) {
          event.preventDefault();
          setBuildPanelOpen(false);
        }
        return;
      }

      const matchedCommand = commands.find((command) => (
        command.shortcut
        && !command.disabled
        && matchesShortcut(event, command.shortcut, isMac)
      ));

      if (!matchedCommand) {
        return;
      }

      event.preventDefault();
      matchedCommand.action();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [buildPanelOpen, closeOverlay, commands, isMac, overlayMode]);

  const handleHeaderMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [role="button"]')) {
      return;
    }

    void appWindow.startDragging().catch((error) => {
      console.error('Failed to start window drag', error);
    });
  };

  const statusLabel = compileStatus === 'compiling'
    ? 'Compiling'
    : compileStatus === 'error'
      ? 'Build failed'
      : compileStatus === 'success'
        ? buildIssues.length > 0
          ? `${buildIssues.length} issue${buildIssues.length === 1 ? '' : 's'}`
          : 'Built'
        : 'Ready';

  return (
    <div className="editor-container">
      {!isFocusMode && (
        <div className="editor-header" onMouseDown={handleHeaderMouseDown} data-tauri-drag-region>
          <div className="header-leading" data-tauri-drag-region>
            <button className="header-back-btn" onClick={onClose} aria-label="Back to projects">
              <ArrowLeft size={16} />
              <span>Projects</span>
            </button>
            <div className="project-identity" data-tauri-drag-region>
              <span className="project-kicker">Project</span>
              <span className="project-title" data-tauri-drag-region>{projectName}</span>
            </div>
          </div>

          <div className="header-actions" data-tauri-drag-region>
            <label className="main-file-field">
              <span className="main-file-label">Main</span>
              <select
                className="main-file-select"
                value={mainFile}
                onChange={(event) => setMainFile(event.target.value)}
                disabled={texFiles.length === 0}
              >
                {texFiles.length === 0 ? (
                  <option value="">No .tex files</option>
                ) : (
                  texFiles.map((file) => (
                    <option key={file} value={file}>{file}</option>
                  ))
                )}
              </select>
            </label>

            <button className="header-utility-btn" onClick={() => openPalette('all')}>
              <Command size={15} />
              <span>Commands</span>
              <kbd>{commandPaletteShortcut}</kbd>
            </button>

            <div className={`header-status status-${compileStatus}`}>
              <span className="header-status-dot" />
              <span>{statusLabel}</span>
            </div>

            <button
              className="compile-btn"
              onClick={() => {
                void handleCompile();
              }}
              disabled={compileStatus === 'compiling' || !mainFile}
            >
              <Sparkles size={15} />
              <span>{compileStatus === 'compiling' ? 'Compiling...' : 'Compile'}</span>
            </button>
          </div>
        </div>
      )}

      <div className={`editor-workspace ${isFocusMode ? 'focus-mode' : ''} ${isSidebarPinned ? 'sidebar-pinned' : ''}`}>
        {!isFocusMode && (
          <div
            className="sidebar-hover-zone"
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
          >
            <div className={`sidebar-drawer ${isSidebarOpen ? 'open' : ''}`}>
              <FileTree
                projectPath={projectPath}
                activeFile={activeFile}
                refreshToken={refreshToken}
                onSelectFile={setActiveFile}
                onRefresh={refreshProject}
              />
            </div>
          </div>
        )}

        <div className="main-panels-shell">
          <PanelGroup direction="horizontal" className="main-panels">
            <Panel defaultSize={52} minSize={30}>
              <div className="workspace-panel">
                <CodePane
                  projectPath={projectPath}
                  activeFile={activeFile}
                  refreshToken={refreshToken}
                  jumpTarget={jumpTarget}
                  registerFlushSave={(flush) => setFlushSave(() => flush)}
                  smoothMode={smoothMode}
                />
              </div>
            </Panel>
            <PanelResizeHandle className="custom-resizer" />
            <Panel defaultSize={48} minSize={30}>
              <div className="workspace-panel preview-panel">
                <PdfPreview
                  projectPath={projectPath}
                  pdfFile={previewFile}
                  compileTick={compileTick}
                  zoom={pdfZoom}
                  setZoom={setPdfZoom}
                />
              </div>
            </Panel>
          </PanelGroup>
        </div>

        {!isFocusMode && (
          <BuildPanel
            compileStatus={compileStatus}
            buildResult={buildResult}
            issues={buildIssues}
            isOpen={buildPanelOpen}
            isSidebarPinned={isSidebarPinned && !isFocusMode}
            onToggle={() => setBuildPanelOpen((value) => !value)}
            onJumpToIssue={handleJumpToIssue}
          />
        )}

        <CommandOverlay
          isOpen={overlayMode !== null}
          mode={overlayMode ?? 'palette'}
          scope={paletteScope}
          commands={overlayMode === 'palette' ? paletteCommands : commands}
          files={projectFiles}
          activeFile={activeFile}
          isMac={isMac}
          onClose={closeOverlay}
          onSelectFile={setActiveFile}
        />
      </div>
    </div>
  );
}
