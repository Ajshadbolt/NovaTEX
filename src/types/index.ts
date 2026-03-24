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
