import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { EditorSelection } from '@codemirror/state';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { createSlashCommandExtension } from '../editor/slashCommands.ts';
import { spellcheckExtension } from '../editor/spellcheck.ts';
import { createEditorTheme } from '../editor/theme';
import { JumpTarget } from '../types';
import './CodePane.css';

export interface CodePaneProps {
  projectPath: string;
  activeFile: string;
  projectFiles: string[];
  extraLabels: string[];
  bibCitations: string[];
  refreshToken: number;
  jumpTarget: JumpTarget | null;
  registerFlushSave: (flush: () => Promise<void>) => void;
  smoothMode: boolean;
}

function CodePaneInner({
  projectPath,
  activeFile,
  projectFiles,
  extraLabels,
  bibCitations,
  refreshToken,
  jumpTarget,
  registerFlushSave,
  smoothMode,
}: CodePaneProps) {
  // `loadedContent` only changes when a file is loaded — never on keystrokes.
  // This stops `<CodeMirror value={...}>` from doing O(doc) work every keystroke.
  const [loadedContent, setLoadedContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<{ path: string; content: string } | null>(null);
  const currentFilePathRef = useRef('');
  const latestContentRef = useRef('');
  const isDirtyRef = useRef(false);
  const editorRef = useRef<EditorView | null>(null);

  // Refs that the completion source reads lazily — updating these does not
  // force CodeMirror to reconfigure.
  const projectFilesRef = useRef<string[]>(projectFiles);
  const extraLabelsRef = useRef<string[]>(extraLabels);
  const bibCitationsRef = useRef<string[]>(bibCitations);
  useEffect(() => { projectFilesRef.current = projectFiles; }, [projectFiles]);
  useEffect(() => { extraLabelsRef.current = extraLabels; }, [extraLabels]);
  useEffect(() => { bibCitationsRef.current = bibCitations; }, [bibCitations]);

  const currentFilePath = activeFile ? `${projectPath}/${activeFile}` : '';

  useEffect(() => {
    currentFilePathRef.current = currentFilePath;
  }, [currentFilePath]);

  const persistContent = useCallback(async (targetPath: string, nextContent: string) => {
    if (!targetPath) return;

    try {
      await writeTextFile(targetPath, nextContent);
      pendingSaveRef.current = null;

      if (currentFilePathRef.current === targetPath && latestContentRef.current === nextContent) {
        isDirtyRef.current = false;
        setIsDirty(false);
      }
    } catch (e) {
      console.error('Failed to save file', e);
    }
  }, []);

  useEffect(() => {
    async function loadFile() {
      try {
        setLoadError(null);
        const text = await readTextFile(currentFilePath);
        latestContentRef.current = text;
        isDirtyRef.current = false;
        setIsDirty(false);
        setLoadedContent(text);
      } catch (e) {
        console.error('Failed to read file', e);
        setLoadError(String(e));
      }
    }

    if (activeFile) {
      void loadFile();
    }

    return () => {
      if (saveTimeoutRef.current && pendingSaveRef.current?.path === currentFilePath) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        void persistContent(currentFilePath, pendingSaveRef.current.content);
      }
    };
  }, [activeFile, currentFilePath, persistContent, refreshToken]);

  const scheduleSave = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    pendingSaveRef.current = {
      path: currentFilePathRef.current,
      content: newContent,
    };

    saveTimeoutRef.current = setTimeout(() => {
      const pendingSave = pendingSaveRef.current;
      if (!pendingSave) return;

      saveTimeoutRef.current = null;
      void persistContent(pendingSave.path, pendingSave.content);
    }, 500);
  }, [persistContent]);

  const flushPendingSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const pendingSave = pendingSaveRef.current;
    if (pendingSave) {
      await persistContent(pendingSave.path, pendingSave.content);
      return;
    }

    if (isDirtyRef.current && currentFilePathRef.current) {
      await persistContent(currentFilePathRef.current, latestContentRef.current);
    }
  }, [persistContent]);

  useEffect(() => {
    registerFlushSave(flushPendingSave);
  }, [flushPendingSave, registerFlushSave]);

  // Keystroke hot path. Avoid React state updates here; only the dirty flag
  // ever needs to flip (and only once per save cycle).
  const onChange = useCallback((value: string) => {
    latestContentRef.current = value;
    if (!isDirtyRef.current) {
      isDirtyRef.current = true;
      setIsDirty(true);
    }
    scheduleSave(value);
  }, [scheduleSave]);

  useEffect(() => {
    if (!jumpTarget || jumpTarget.file !== activeFile || !editorRef.current) {
      return;
    }

    const line = editorRef.current.state.doc.line(Math.max(1, jumpTarget.line));
    editorRef.current.dispatch({
      selection: EditorSelection.single(line.from),
      scrollIntoView: true,
    });
    editorRef.current.focus();
  }, [activeFile, jumpTarget]);

  // Extensions are stable for the life of the editor instance. Cross-file
  // data is read through getter refs so it can update without reconfiguring.
  const extensions = useMemo(() => [
    createSlashCommandExtension({
      projectFiles,
      getExtraLabels: () => extraLabelsRef.current,
      getBibCitations: () => bibCitationsRef.current,
    }),
    EditorView.lineWrapping,
    spellcheckExtension,
    StreamLanguage.define(stex),
    EditorView.contentAttributes.of({
      spellcheck: 'true',
      autocorrect: 'on',
      autocapitalize: 'on',
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [projectFiles]);

  const editorTheme = useMemo(() => createEditorTheme(smoothMode), [smoothMode]);

  return (
    <div className="code-pane">
      <div className="code-pane-header">
        <div className="code-pane-title-group">
          <span className="code-pane-kicker">Editing</span>
          <span className="code-pane-file">{activeFile || 'No file selected'}</span>
        </div>
        {isDirty && (
          <span className="code-pane-dirty" aria-label="Unsaved changes">
            Unsaved
          </span>
        )}
      </div>
      {loadError ? (
        <div className="code-pane-error">
          Error loading file: {loadError}
        </div>
      ) : (
        <div
          className="editor-content-wrapper code-pane-editor-shell"
          onContextMenu={(e) => e.stopPropagation()}
          onKeyDownCapture={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          lang="en-GB"
        >
          <CodeMirror
            key={`${activeFile}:${smoothMode ? 'smooth' : 'standard'}`}
            value={loadedContent}
            theme={editorTheme}
            extensions={extensions}
            onChange={onChange}
            onCreateEditor={(view) => {
              editorRef.current = view;
            }}
            height="100%"
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: true,
              bracketMatching: true,
              indentOnInput: true,
            }}
            style={{ height: '100%', fontSize: '14px' }}
          />
        </div>
      )}
    </div>
  );
}

export const CodePane = memo(CodePaneInner);
