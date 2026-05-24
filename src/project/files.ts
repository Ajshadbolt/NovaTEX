import { DirEntry, readDir, readTextFile } from '@tauri-apps/plugin-fs';

export function sortDirEntries(entries: DirEntry[]): DirEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function listTexFiles(projectPath: string): Promise<string[]> {
  return (await listProjectFiles(projectPath)).filter((file) => file.toLowerCase().endsWith('.tex'));
}

export async function listProjectFiles(projectPath: string): Promise<string[]> {
  async function walk(relativePath = ''): Promise<string[]> {
    const absolutePath = relativePath ? `${projectPath}/${relativePath}` : projectPath;
    const entries = sortDirEntries(await readDir(absolutePath));
    const results: string[] = [];

    for (const entry of entries) {
      const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
      if (entry.isDirectory) {
        results.push(...await walk(childRelativePath));
      } else {
        results.push(childRelativePath);
      }
    }

    return results;
  }

  return walk();
}

const LABEL_RE = /\\label\{([^}]+)\}/g;
const BIBKEY_RE = /@\w+\s*\{\s*([^,\s}]+)/g;

export async function extractLabelsFromTexFiles(
  projectPath: string,
  texFiles: string[],
  excludeFile?: string,
): Promise<string[]> {
  const set = new Set<string>();
  await Promise.all(
    texFiles
      .filter((f) => f !== excludeFile)
      .map(async (file) => {
        try {
          const text = await readTextFile(`${projectPath}/${file}`);
          LABEL_RE.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = LABEL_RE.exec(text)) !== null) set.add(m[1]);
        } catch {
          // ignore unreadable files
        }
      }),
  );
  return Array.from(set);
}

export async function extractBibCitations(
  projectPath: string,
  bibFiles: string[],
): Promise<string[]> {
  const set = new Set<string>();
  await Promise.all(
    bibFiles.map(async (file) => {
      try {
        const text = await readTextFile(`${projectPath}/${file}`);
        BIBKEY_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = BIBKEY_RE.exec(text)) !== null) set.add(m[1]);
      } catch {
        // ignore unreadable files
      }
    }),
  );
  return Array.from(set);
}
