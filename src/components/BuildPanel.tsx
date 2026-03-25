import { BuildIssue, BuildResult, CompileStatus } from '../types';
import './BuildPanel.css';

interface BuildPanelProps {
  compileStatus: CompileStatus;
  buildResult: BuildResult | null;
  issues: BuildIssue[];
  isOpen: boolean;
  isSidebarPinned?: boolean;
  onToggle: () => void;
  onJumpToIssue: (issue: BuildIssue) => void;
}

export function BuildPanel({
  compileStatus,
  buildResult,
  issues,
  isOpen,
  isSidebarPinned = false,
  onToggle,
  onJumpToIssue,
}: BuildPanelProps) {
  const summary = buildResult
    ? `${buildResult.engine} - ${issues.length} issue${issues.length === 1 ? '' : 's'}`
    : 'No build output yet';
  const tone = compileStatus === 'error' ? 'error' : compileStatus === 'success' ? 'success' : compileStatus;
  const statusLabel = compileStatus === 'compiling'
    ? 'Compiling'
    : compileStatus === 'error'
      ? 'Build failed'
      : compileStatus === 'success'
        ? 'Latest build'
        : 'Build';

  return (
    <div className={`build-panel ${isOpen ? 'open' : 'collapsed'} tone-${tone} ${isSidebarPinned ? 'sidebar-offset' : ''}`}>
      <div className="build-panel-header">
        <div className="build-panel-title-group">
          <span className={`build-panel-pill status-${compileStatus}`}>{statusLabel}</span>
          <span className="build-panel-status">{summary}</span>
        </div>
        <button className="build-panel-toggle" onClick={onToggle}>
          {isOpen ? 'Hide Details' : issues.length > 0 ? `Show Issues (${issues.length})` : 'Show Details'}
        </button>
      </div>

      {isOpen && (
        <div className="build-panel-body">
          {issues.length > 0 && (
            <div className="build-issues">
              {issues.map((issue) => (
                <button
                  key={issue.id}
                  className="build-issue"
                  onClick={() => onJumpToIssue(issue)}
                >
                  <span className="build-issue-title">{issue.message}</span>
                  <span className="build-issue-meta">
                    {issue.file}{issue.line ? `:${issue.line}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          <pre className={`build-log ${issues.length === 0 ? 'full-width' : ''}`}>
            {buildResult?.log ?? 'Compile a document to view the raw build log.'}
          </pre>
        </div>
      )}
    </div>
  );
}
