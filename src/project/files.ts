import { DirEntry, readDir } from '@tauri-apps/plugin-fs';

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
