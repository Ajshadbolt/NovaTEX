import { BuildIssue } from '../types';

function normalizeTexPath(rawPath: string): string {
  return rawPath.replace(/^\.\//, '').replace(/^\//, '');
}

function extractTexPaths(line: string): string[] {
  const matches = line.match(/(?:^|[\s(])(?:\.\/)?[^()\s]+\.tex\b/g) ?? [];
  return matches
    .map((match) => normalizeTexPath(match.trim().replace(/^\(/, '')))
    .filter(Boolean);
}

export function parseLatexIssues(log: string, fallbackFile: string): BuildIssue[] {
  const lines = log.split(/\r?\n/);
  const issues: BuildIssue[] = [];
  const seen = new Set<string>();
  const fileStack: string[] = [];
  let currentFile = fallbackFile;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const texPaths = extractTexPaths(line);

    if (texPaths.length > 0) {
      currentFile = texPaths[texPaths.length - 1];
      fileStack.push(...texPaths);
    }

    const closeCount = (line.match(/\)/g) ?? []).length;
    if (closeCount > 0 && fileStack.length > 0) {
      fileStack.splice(Math.max(0, fileStack.length - closeCount), closeCount);
      currentFile = fileStack[fileStack.length - 1] ?? currentFile;
    }

    if (!line.startsWith('!')) {
      continue;
    }

    let file = currentFile || fallbackFile;
    let lineNumber: number | null = null;
    const context = [line];

    for (let offset = 1; offset <= 4; offset += 1) {
      const candidate = lines[index + offset];
      if (!candidate) break;
      context.push(candidate);

      const lineMatch = candidate.match(/l\.(\d+)/);
      if (lineMatch) {
        lineNumber = Number(lineMatch[1]);
      }

      const nearbyPaths = extractTexPaths(candidate);
      if (nearbyPaths.length > 0) {
        file = nearbyPaths[nearbyPaths.length - 1];
      }
    }

    const issue: BuildIssue = {
      id: `${file}:${lineNumber ?? 'unknown'}:${line}`,
      message: line.replace(/^!\s*/, ''),
      file,
      line: lineNumber,
      context,
    };

    if (!seen.has(issue.id)) {
      seen.add(issue.id);
      issues.push(issue);
    }
  }

  return issues;
}
