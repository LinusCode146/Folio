import { nanoid } from "./nanoid";
import { slugify } from "./slugify";
import {
  getFolioRoot,
  ensureDir,
  readJson,
  writeJson,
  fileExists,
  removeDir,
} from "./fs";
import type { Project, ProjectRef, PlotGridMeta } from "@/types";

const PROJECTS_FILE = "projects.json";

async function getProjectsFilePath(): Promise<string> {
  const root = await getFolioRoot();
  await ensureDir(root);
  return `${root}/${PROJECTS_FILE}`;
}

export async function listProjects(): Promise<ProjectRef[]> {
  const path = await getProjectsFilePath();
  return (await readJson<ProjectRef[]>(path)) ?? [];
}

async function saveProjectsList(refs: ProjectRef[]): Promise<void> {
  const path = await getProjectsFilePath();
  await writeJson(path, refs);
}

export async function createProject(name: string): Promise<Project> {
  const id = nanoid(8);
  const now = new Date().toISOString();
  const root = await getFolioRoot();
  const folderName = slugify(name, id);
  const projectPath = `${root}/${folderName}`;

  await ensureDir(projectPath);
  await ensureDir(`${projectPath}/scenes`);
  await ensureDir(`${projectPath}/notes`);
  await ensureDir(`${projectPath}/characters`);
  await ensureDir(`${projectPath}/places`);

  const emptyGrid: PlotGridMeta = { threads: [], cells: {} };

  const project: Project = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    manuscriptRootIds: [],
    characterIds: [],
    placeIds: [],
    noteIds: [],
    nodes: {},
    plotGrid: emptyGrid,
    bookMeta: { author: "", subtitle: "", dedication: "", copyright: "", year: "", isbn: "" },
  };

  await writeJson(`${projectPath}/project.json`, project);

  const refs = await listProjects();
  refs.unshift({ id, name, path: projectPath, updatedAt: now });
  await saveProjectsList(refs);

  return project;
}

export async function loadProject(projectPath: string): Promise<Project | null> {
  const project = await readJson<Project>(`${projectPath}/project.json`);
  if (!project) return null;
  // Backward compat: add bookMeta if missing (projects created before this feature)
  if (!project.bookMeta) {
    project.bookMeta = { author: "", subtitle: "", dedication: "", copyright: "", year: "", isbn: "" };
  }
  return project;
}

export async function saveProject(projectPath: string, project: Project): Promise<void> {
  const now = new Date().toISOString();
  const updated = { ...project, updatedAt: now };
  await writeJson(`${projectPath}/project.json`, updated);

  // Update the registry entry
  const refs = await listProjects();
  const idx = refs.findIndex((r) => r.id === project.id);
  if (idx !== -1) {
    refs[idx].updatedAt = now;
    refs[idx].name = project.name;
    await saveProjectsList(refs);
  }
}

export async function deleteProject(projectPath: string, projectId: string): Promise<void> {
  await removeDir(projectPath);
  const refs = await listProjects();
  await saveProjectsList(refs.filter((r) => r.id !== projectId));
}

export function getProjectPath(ref: ProjectRef): string {
  return ref.path;
}
