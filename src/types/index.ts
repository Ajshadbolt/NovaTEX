export interface ProjectMeta {
  path: string;
  name: string;
  lastOpened: number;
}

export type CompileStatus = 'idle' | 'compiling' | 'success' | 'error';

export interface CompileResult {
  status: CompileStatus;
  log: string;
}

export interface BuildResult {
  engine: string;
  log: string;
  outputPdf: string;
}

export interface BuildIssue {
  id: string;
  message: string;
  file: string;
  line: number | null;
  context: string[];
}

export interface JumpTarget {
  file: string;
  line: number;
  nonce: number;
}

export type CommandGroup = 'Build' | 'Files' | 'View' | 'Navigate' | 'Help';

export interface ShortcutDefinition {
  code: string;
  primary?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export interface CommandDefinition {
  id: string;
  label: string;
  description?: string;
  group: CommandGroup;
  shortcut?: ShortcutDefinition;
  keywords?: string[];
  disabled?: boolean;
  stateLabel?: string;
  action: () => void;
}
