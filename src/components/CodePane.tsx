import React, { useState, useEffect, useCallback, useRef } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { createSlashCommandExtension } from '../editor/slashCommands.ts';
import { editorTheme } from '../editor/theme';
import { spellcheckExtension } from '../editor/spellcheck.ts';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';

export interface CodePaneProps {
  projectPath: string;
  activeFile: string;
  onCompileRequest: () => void;
}

export function CodePane({ projectPath, activeFile, onCompileRequest }: CodePaneProps) {
  const [content, setContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load file content
  useEffect(() => {
    async function loadFile() {
      try {
        setLoadError(null);
        const text = await readTextFile(`${projectPath}/${activeFile}`);
        setContent(text);
        setIsDirty(false);
      } catch (e) {
        console.error("Failed to read file", e);
        setLoadError(String(e));
      }
    }
    if (activeFile) loadFile();
  }, [projectPath, activeFile]);

  // Debounced save
  const scheduleSave = useCallback((newContent: string) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await writeTextFile(`${projectPath}/${activeFile}`, newContent);
        setIsDirty(false);
      } catch (e) {
        console.error("Failed to save file", e);
      }
    }, 500); // 500ms debounce
  }, [projectPath, activeFile]);

  const onChange = useCallback((val: string) => {
    setContent(val);
    setIsDirty(true);
    scheduleSave(val);
  }, [scheduleSave]);
  
  // Handle Cmd+Enter
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      // force save before compile if dirty
      if (isDirty) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        writeTextFile(`${projectPath}/${activeFile}`, content).then(() => {
          setIsDirty(false);
          onCompileRequest();
        });
      } else {
        onCompileRequest();
      }
    }
  }, [isDirty, content, projectPath, activeFile, onCompileRequest]);

  const extensions = [
    createSlashCommandExtension(), 
    EditorView.lineWrapping,
    spellcheckExtension,
    StreamLanguage.define(stex),
    EditorView.contentAttributes.of({ 
      spellcheck: "true",
      autocorrect: "on",
      autocapitalize: "on",
    })
  ];

  return (
    <div 
      style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }} 
      onKeyDownCapture={onKeyDown}
    >
      <div style={{ height: '36px', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: '12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
        {activeFile} {isDirty && <span style={{ marginLeft: '6px', color: 'var(--text-primary)' }}>•</span>}
      </div>
      {loadError ? (
        <div style={{ padding: '20px', color: 'red' }}>
          Error loading file: {loadError}
        </div>
      ) : (
        <div 
          style={{ flex: 1, overflow: 'auto', backgroundColor: 'var(--bg-primary)' }}
          onContextMenu={(e) => e.stopPropagation()}
          className="editor-content-wrapper"
          lang="en-GB"
        >
          <CodeMirror
            key={activeFile}
            value={content}
            theme={editorTheme}
            extensions={extensions}
          onChange={onChange}
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
