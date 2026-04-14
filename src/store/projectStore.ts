"use client";

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { nanoid } from "@/lib/nanoid";
import { saveProject } from "@/lib/projectService";
import { deleteScene, deleteCharacter, deletePlace } from "@/lib/documentService";
import type {
  Project,
  BinderNode,
  BinderNodeKind,
  BinderSection,
  BookMeta,
  ID,
} from "@/types";

interface ProjectStore {
  project: Project | null;
  projectPath: string | null;
  isLoading: boolean;

  setProject: (project: Project, path: string) => void;
  clearProject: () => void;
  save: () => Promise<void>;

  addNode: (
    kind: BinderNodeKind,
    section: BinderSection,
    parentId?: ID
  ) => ID;
  deleteNode: (id: ID) => Promise<void>;
  renameNode: (id: ID, title: string) => void;
  moveNode: (id: ID, targetParentId: ID | null, index: number) => void;

  addPlotThread: (label: string) => void;
  deletePlotThread: (threadId: ID) => void;
  updatePlotCell: (sceneId: ID, threadId: ID, text: string) => void;
  updateBookMeta: (meta: BookMeta) => void;
}

function getRootIds(project: Project, section: BinderSection): ID[] {
  switch (section) {
    case "manuscript": return project.manuscriptRootIds;
    case "characters": return project.characterIds;
    case "places": return project.placeIds;
    case "notes": return project.noteIds;
  }
}

function removeFromParent(project: Project, id: ID) {
  // Remove from root arrays
  project.manuscriptRootIds = project.manuscriptRootIds.filter((x) => x !== id);
  project.characterIds = project.characterIds.filter((x) => x !== id);
  project.placeIds = project.placeIds.filter((x) => x !== id);
  project.noteIds = project.noteIds.filter((x) => x !== id);
  // Remove from any folder's children
  for (const node of Object.values(project.nodes)) {
    if (node.children) {
      node.children = node.children.filter((x) => x !== id);
    }
  }
}

function collectDescendants(project: Project, id: ID): ID[] {
  const node = project.nodes[id];
  if (!node?.children) return [id];
  return [id, ...node.children.flatMap((c) => collectDescendants(project, c))];
}

export const useProjectStore = create<ProjectStore>()(
  immer((set, get) => ({
    project: null,
    projectPath: null,
    isLoading: false,

    setProject: (project, path) =>
      set({ project, projectPath: path, isLoading: false }),

    clearProject: () => set({ project: null, projectPath: null }),

    save: async () => {
      const { project, projectPath } = get();
      if (!project || !projectPath) return;
      await saveProject(projectPath, project);
    },

    addNode: (kind, section, parentId) => {
      const id = nanoid(8);
      const now = new Date().toISOString();
      const node: BinderNode = {
        id,
        kind,
        section,
        title:
          kind === "folder"
            ? "New Folder"
            : kind === "character"
            ? "New Character"
            : kind === "place"
            ? "New Place"
            : kind === "note"
            ? "New Note"
            : "New Scene",
        createdAt: now,
        updatedAt: now,
        ...(kind === "folder" ? { children: [] } : {}),
      };

      set((state) => {
        if (!state.project) return;
        state.project.nodes[id] = node;

        if (parentId && state.project.nodes[parentId]?.children) {
          state.project.nodes[parentId].children!.push(id);
        } else {
          getRootIds(state.project, section).push(id);
        }
      });

      get().save();
      return id;
    },

    deleteNode: async (id) => {
      const { project, projectPath } = get();
      if (!project || !projectPath) return;

      const allIds = collectDescendants(project, id);

      for (const nodeId of allIds) {
        const node = project.nodes[nodeId];
        if (!node) continue;
        if (node.kind === "scene") await deleteScene(projectPath, "scenes", nodeId);
        if (node.kind === "note") await deleteScene(projectPath, "notes", nodeId);
        if (node.kind === "character") await deleteCharacter(projectPath, nodeId);
        if (node.kind === "place") await deletePlace(projectPath, nodeId);
      }

      set((state) => {
        if (!state.project) return;
        removeFromParent(state.project, id);
        for (const nodeId of allIds) {
          delete state.project.nodes[nodeId];
        }
      });

      await get().save();
    },

    renameNode: (id, title) => {
      set((state) => {
        if (!state.project?.nodes[id]) return;
        state.project.nodes[id].title = title;
      });
      get().save();
    },

    moveNode: (id, targetParentId, index) => {
      set((state) => {
        if (!state.project) return;
        const node = state.project.nodes[id];
        if (!node) return;

        removeFromParent(state.project, id);

        if (targetParentId) {
          const parent = state.project.nodes[targetParentId];
          if (parent?.children) {
            parent.children.splice(index, 0, id);
          }
        } else {
          const rootArr = getRootIds(state.project, node.section);
          rootArr.splice(index, 0, id);
        }
      });
      get().save();
    },

    addPlotThread: (label) => {
      const id = nanoid(8);
      const colors = ["#6b9bd2", "#7ec8a0", "#e8a87c", "#c97ab2", "#e8c87c"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      set((state) => {
        if (!state.project) return;
        state.project.plotGrid.threads.push({ id, label, color });
      });
      get().save();
    },

    deletePlotThread: (threadId) => {
      set((state) => {
        if (!state.project) return;
        state.project.plotGrid.threads = state.project.plotGrid.threads.filter(
          (t) => t.id !== threadId
        );
        for (const key of Object.keys(state.project.plotGrid.cells)) {
          if (key.endsWith(`::${threadId}`)) {
            delete state.project.plotGrid.cells[key];
          }
        }
      });
      get().save();
    },

    updatePlotCell: (sceneId, threadId, text) => {
      const key = `${sceneId}::${threadId}`;
      set((state) => {
        if (!state.project) return;
        state.project.plotGrid.cells[key] = { sceneId, threadId, text };
      });
      get().save();
    },

    updateBookMeta: (meta) => {
      set((state) => {
        if (!state.project) return;
        state.project.bookMeta = meta;
      });
      get().save();
    },
  }))
);
