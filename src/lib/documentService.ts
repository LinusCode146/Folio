import { readJson, writeJson, removeFile, ensureDir } from "./fs";
import type { SceneDocument, CharacterSheet, PlaceSheet, MapDocument, ID } from "@/types";

function now() {
  return new Date().toISOString();
}

// ── Scenes & Notes ──────────────────────────────────────────

export async function loadScene(
  projectPath: string,
  folder: "scenes" | "notes",
  id: ID
): Promise<SceneDocument> {
  const path = `${projectPath}/${folder}/${id}.json`;
  return (
    (await readJson<SceneDocument>(path)) ?? {
      id,
      content: { type: "doc", content: [{ type: "paragraph" }] },
      wordCount: 0,
      synopsis: "",
      annotations: {},
      updatedAt: now(),
    }
  );
}

export async function saveScene(
  projectPath: string,
  folder: "scenes" | "notes",
  doc: SceneDocument
): Promise<void> {
  await writeJson(`${projectPath}/${folder}/${doc.id}.json`, {
    ...doc,
    updatedAt: now(),
  });
}

export async function deleteScene(
  projectPath: string,
  folder: "scenes" | "notes",
  id: ID
): Promise<void> {
  await removeFile(`${projectPath}/${folder}/${id}.json`);
}

// ── Characters ──────────────────────────────────────────────

export async function loadCharacter(
  projectPath: string,
  id: ID
): Promise<CharacterSheet> {
  const path = `${projectPath}/characters/${id}.json`;
  return (
    (await readJson<CharacterSheet>(path)) ?? {
      id,
      name: "",
      age: "",
      role: "",
      backstory: "",
      traits: [],
      notes: "",
      updatedAt: now(),
    }
  );
}

export async function saveCharacter(
  projectPath: string,
  sheet: CharacterSheet
): Promise<void> {
  await writeJson(`${projectPath}/characters/${sheet.id}.json`, {
    ...sheet,
    updatedAt: now(),
  });
}

export async function deleteCharacter(projectPath: string, id: ID): Promise<void> {
  await removeFile(`${projectPath}/characters/${id}.json`);
}

// ── Places ──────────────────────────────────────────────────

export async function loadPlace(
  projectPath: string,
  id: ID
): Promise<PlaceSheet> {
  const path = `${projectPath}/places/${id}.json`;
  return (
    (await readJson<PlaceSheet>(path)) ?? {
      id,
      name: "",
      description: "",
      notes: "",
      updatedAt: now(),
    }
  );
}

export async function savePlace(
  projectPath: string,
  sheet: PlaceSheet
): Promise<void> {
  await writeJson(`${projectPath}/places/${sheet.id}.json`, {
    ...sheet,
    updatedAt: now(),
  });
}

export async function deletePlace(projectPath: string, id: ID): Promise<void> {
  await removeFile(`${projectPath}/places/${id}.json`);
}

// ── Maps ─────────────────────────────────────────────────────

export async function loadMap(
  projectPath: string,
  id: ID
): Promise<MapDocument> {
  // Ensure maps dir exists for projects created before this feature
  await ensureDir(`${projectPath}/maps`);
  const path = `${projectPath}/maps/${id}.json`;
  return (
    (await readJson<MapDocument>(path)) ?? {
      id,
      elements: [],
      canvasWidth: 1600,
      canvasHeight: 1200,
      updatedAt: now(),
    }
  );
}

export async function saveMap(
  projectPath: string,
  doc: MapDocument
): Promise<void> {
  // Ensure maps dir exists for projects created before this feature
  await ensureDir(`${projectPath}/maps`);
  await writeJson(`${projectPath}/maps/${doc.id}.json`, {
    ...doc,
    updatedAt: now(),
  });
}

export async function deleteMap(projectPath: string, id: ID): Promise<void> {
  await removeFile(`${projectPath}/maps/${id}.json`);
}
