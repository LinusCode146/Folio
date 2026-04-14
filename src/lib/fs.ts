import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
  remove,
  readDir,
} from "@tauri-apps/plugin-fs";
import { documentDir } from "@tauri-apps/api/path";

export const FOLIO_DIR = "Folio";

export async function getFolioRoot(): Promise<string> {
  const docs = await documentDir();
  return `${docs}/${FOLIO_DIR}`;
}

export async function ensureDir(path: string): Promise<void> {
  if (!(await exists(path))) {
    await mkdir(path, { recursive: true });
  }
}

export async function readJson<T>(path: string): Promise<T | null> {
  try {
    const text = await readTextFile(path);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeJson<T>(path: string, data: T): Promise<void> {
  await writeTextFile(path, JSON.stringify(data, null, 2));
}

export async function fileExists(path: string): Promise<boolean> {
  return exists(path);
}

export async function removeFile(path: string): Promise<void> {
  try {
    await remove(path);
  } catch {
    // ignore if not found
  }
}

export async function removeDir(path: string): Promise<void> {
  try {
    await remove(path, { recursive: true });
  } catch {
    // ignore
  }
}

export { readDir };
