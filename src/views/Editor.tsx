import { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FileTree } from '../components/FileTree';
import { CodePane } from '../components/CodePane';
import { PdfPreview } from '../components/PdfPreview';
import { invoke } from '@tauri-apps/api/core';
import './Editor.css';

interface EditorProps {
  projectPath: string;
  onClose: () => void;
}

export function Editor({ projectPath, onClose }: EditorProps) {
  const [activeFile, setActiveFile] = useState<string>('main.tex');
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [compileStatus, setCompileStatus] = useState<'idle'|'compiling'|'success'|'error'>('idle');
  const [compileLog, setCompileLog] = useState('');
  const [compileTick, setCompileTick] = useState(0);

  const handleCompile = async () => {
    setCompileStatus('compiling');
    try {
      const log = await invoke<string>('run_pdflatex', { targetDir: projectPath, fileName: 'main.tex' });
      setCompileLog(log);
      setCompileStatus('success');
      setCompileTick(Date.now());
    } catch (e) {
      setCompileLog(e as string);
      setCompileStatus('error');
    }
  };

  return (
    <div className="editor-container">
      <div className="editor-header" data-tauri-drag-region>
        <div className="header-left" style={{ paddingLeft: '70px' }}>
          <button className="header-btn" onClick={onClose}>&larr; Projects</button>
        </div>
        <div className="header-center" data-tauri-drag-region>
          <span className="project-title">{projectPath.split('/').pop()}</span>
        </div>
        <div className="header-right">
          <button className="compile-btn" onClick={handleCompile} disabled={compileStatus === 'compiling'}>
            {compileStatus === 'compiling' ? 'Compiling...' : 'Compile'}
          </button>
          <div className={`status-indicator status-${compileStatus}`}></div>
        </div>
      </div>

      <div className="editor-workspace">
        <div 
          className="sidebar-hover-zone"
          onMouseEnter={() => setIsSidebarHovered(true)}
          onMouseLeave={() => setIsSidebarHovered(false)}
        >
          <div className={`sidebar-drawer ${isSidebarHovered ? 'open' : ''}`}>
             <FileTree projectPath={projectPath} activeFile={activeFile} onSelectFile={setActiveFile} />
          </div>
        </div>

        <PanelGroup direction="horizontal" className="main-panels">
          <Panel defaultSize={50} minSize={30}>
            <CodePane 
              projectPath={projectPath} 
              activeFile={activeFile} 
              onCompileRequest={handleCompile}
            />
          </Panel>
          <PanelResizeHandle className="custom-resizer" />
          <Panel defaultSize={50} minSize={30}>
            <PdfPreview projectPath={projectPath} compileTick={compileTick} />
          </Panel>
        </PanelGroup>

        {compileStatus === 'error' && (
          <div style={{ position: 'absolute', bottom: '20px', right: '20px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--danger)', borderRadius: '6px', padding: '12px', zIndex: 50, maxWidth: '400px', boxShadow: 'var(--shadow)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', color: 'var(--danger)', fontSize: '13px', fontWeight: 'bold' }}>
              <span>⚠️ Compilation Error</span>
              <button 
                onClick={() => setCompileStatus('idle')}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >✕</button>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: '150px', overflowY: 'auto', fontFamily: 'var(--font-mono)' }}>
              {compileLog.split('\n').filter((line: string) => line.startsWith('!') || line.toLowerCase().includes('error')).slice(0, 5).join('\n') || "Unknown error occurred. Check LaTeX syntax."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
