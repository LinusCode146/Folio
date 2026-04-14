import { describe, it, expect, beforeEach, vi } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { createMockProject } from "@/test/helpers";

// Mock the services that hit the filesystem
vi.mock("@/lib/projectService", () => ({
  saveProject: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/documentService", () => ({
  deleteScene: vi.fn().mockResolvedValue(undefined),
  deleteCharacter: vi.fn().mockResolvedValue(undefined),
  deletePlace: vi.fn().mockResolvedValue(undefined),
}));

import { saveProject } from "@/lib/projectService";
import { deleteScene, deleteCharacter, deletePlace } from "@/lib/documentService";

const PROJECT_PATH = "/mock/test-project";

function resetStore(overrides = {}) {
  const project = createMockProject(overrides);
  useProjectStore.setState({ project, projectPath: PROJECT_PATH, isLoading: false });
  return project;
}

beforeEach(() => {
  vi.clearAllMocks();
  useProjectStore.setState({ project: null, projectPath: null, isLoading: false });
});

describe("projectStore", () => {
  describe("setProject / clearProject", () => {
    it("setProject stores project and path", () => {
      const p = createMockProject();
      useProjectStore.getState().setProject(p, "/some/path");
      expect(useProjectStore.getState().project).toEqual(p);
      expect(useProjectStore.getState().projectPath).toBe("/some/path");
      expect(useProjectStore.getState().isLoading).toBe(false);
    });

    it("clearProject resets to null", () => {
      resetStore();
      useProjectStore.getState().clearProject();
      expect(useProjectStore.getState().project).toBeNull();
      expect(useProjectStore.getState().projectPath).toBeNull();
    });
  });

  describe("addNode", () => {
    it("adds a scene to manuscript root ids", () => {
      resetStore();
      const id = useProjectStore.getState().addNode("scene", "manuscript");
      const { project } = useProjectStore.getState();
      expect(project!.manuscriptRootIds).toContain(id);
      expect(project!.nodes[id]).toMatchObject({
        id,
        kind: "scene",
        section: "manuscript",
        title: "New Scene",
      });
    });

    it("adds a character to characterIds", () => {
      resetStore();
      const id = useProjectStore.getState().addNode("character", "characters");
      const { project } = useProjectStore.getState();
      expect(project!.characterIds).toContain(id);
      expect(project!.nodes[id]?.title).toBe("New Character");
    });

    it("adds a place to placeIds", () => {
      resetStore();
      const id = useProjectStore.getState().addNode("place", "places");
      expect(useProjectStore.getState().project!.placeIds).toContain(id);
    });

    it("adds a note to noteIds", () => {
      resetStore();
      const id = useProjectStore.getState().addNode("note", "notes");
      expect(useProjectStore.getState().project!.noteIds).toContain(id);
    });

    it("adds a folder node with empty children array", () => {
      resetStore();
      const id = useProjectStore.getState().addNode("folder", "manuscript");
      const node = useProjectStore.getState().project!.nodes[id];
      expect(node.kind).toBe("folder");
      expect(node.children).toEqual([]);
      expect(node.title).toBe("New Folder");
    });

    it("adds node as child of parent folder when parentId provided", () => {
      const folderNode = {
        id: "folder-1",
        kind: "folder" as const,
        title: "Chapter 1",
        section: "manuscript" as const,
        children: [],
        createdAt: "",
        updatedAt: "",
      };
      resetStore({
        manuscriptRootIds: ["folder-1"],
        nodes: { "folder-1": folderNode },
      });
      const sceneId = useProjectStore.getState().addNode("scene", "manuscript", "folder-1");
      const folder = useProjectStore.getState().project!.nodes["folder-1"];
      expect(folder.children).toContain(sceneId);
      // Should NOT be in root ids
      expect(useProjectStore.getState().project!.manuscriptRootIds).not.toContain(sceneId);
    });

    it("calls save after adding a node", () => {
      resetStore();
      useProjectStore.getState().addNode("scene", "manuscript");
      expect(saveProject).toHaveBeenCalledTimes(1);
    });
  });

  describe("renameNode", () => {
    it("updates the node title", () => {
      const node = {
        id: "n1",
        kind: "scene" as const,
        title: "Old Name",
        section: "manuscript" as const,
        createdAt: "",
        updatedAt: "",
      };
      resetStore({ manuscriptRootIds: ["n1"], nodes: { n1: node } });
      useProjectStore.getState().renameNode("n1", "New Name");
      expect(useProjectStore.getState().project!.nodes["n1"].title).toBe("New Name");
    });

    it("calls save after renaming", () => {
      const node = {
        id: "n1",
        kind: "scene" as const,
        title: "Old",
        section: "manuscript" as const,
        createdAt: "",
        updatedAt: "",
      };
      resetStore({ manuscriptRootIds: ["n1"], nodes: { n1: node } });
      useProjectStore.getState().renameNode("n1", "New");
      expect(saveProject).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteNode", () => {
    it("removes a scene node from root ids and nodes map", async () => {
      const node = {
        id: "s1",
        kind: "scene" as const,
        title: "Scene 1",
        section: "manuscript" as const,
        createdAt: "",
        updatedAt: "",
      };
      resetStore({ manuscriptRootIds: ["s1"], nodes: { s1: node } });
      await useProjectStore.getState().deleteNode("s1");
      expect(useProjectStore.getState().project!.manuscriptRootIds).not.toContain("s1");
      expect(useProjectStore.getState().project!.nodes["s1"]).toBeUndefined();
    });

    it("calls deleteScene for scene nodes", async () => {
      const node = {
        id: "s1",
        kind: "scene" as const,
        title: "Scene",
        section: "manuscript" as const,
        createdAt: "",
        updatedAt: "",
      };
      resetStore({ manuscriptRootIds: ["s1"], nodes: { s1: node } });
      await useProjectStore.getState().deleteNode("s1");
      expect(deleteScene).toHaveBeenCalledWith(PROJECT_PATH, "scenes", "s1");
    });

    it("calls deleteCharacter for character nodes", async () => {
      const node = {
        id: "c1",
        kind: "character" as const,
        title: "Alice",
        section: "characters" as const,
        createdAt: "",
        updatedAt: "",
      };
      resetStore({ characterIds: ["c1"], nodes: { c1: node } });
      await useProjectStore.getState().deleteNode("c1");
      expect(deleteCharacter).toHaveBeenCalledWith(PROJECT_PATH, "c1");
    });

    it("calls deletePlace for place nodes", async () => {
      const node = {
        id: "p1",
        kind: "place" as const,
        title: "Forest",
        section: "places" as const,
        createdAt: "",
        updatedAt: "",
      };
      resetStore({ placeIds: ["p1"], nodes: { p1: node } });
      await useProjectStore.getState().deleteNode("p1");
      expect(deletePlace).toHaveBeenCalledWith(PROJECT_PATH, "p1");
    });

    it("recursively deletes folder and all descendants", async () => {
      const folder = {
        id: "f1",
        kind: "folder" as const,
        title: "Chapter",
        section: "manuscript" as const,
        children: ["s1", "s2"],
        createdAt: "",
        updatedAt: "",
      };
      const scene1 = { id: "s1", kind: "scene" as const, title: "S1", section: "manuscript" as const, createdAt: "", updatedAt: "" };
      const scene2 = { id: "s2", kind: "scene" as const, title: "S2", section: "manuscript" as const, createdAt: "", updatedAt: "" };
      resetStore({
        manuscriptRootIds: ["f1"],
        nodes: { f1: folder, s1: scene1, s2: scene2 },
      });
      await useProjectStore.getState().deleteNode("f1");
      const nodes = useProjectStore.getState().project!.nodes;
      expect(nodes["f1"]).toBeUndefined();
      expect(nodes["s1"]).toBeUndefined();
      expect(nodes["s2"]).toBeUndefined();
      expect(deleteScene).toHaveBeenCalledTimes(2);
    });

    it("removes node from parent folder children", async () => {
      const folder = {
        id: "f1",
        kind: "folder" as const,
        title: "Chapter",
        section: "manuscript" as const,
        children: ["s1"],
        createdAt: "",
        updatedAt: "",
      };
      const scene = { id: "s1", kind: "scene" as const, title: "S", section: "manuscript" as const, createdAt: "", updatedAt: "" };
      resetStore({
        manuscriptRootIds: ["f1"],
        nodes: { f1: folder, s1: scene },
      });
      await useProjectStore.getState().deleteNode("s1");
      expect(useProjectStore.getState().project!.nodes["f1"].children).not.toContain("s1");
    });
  });

  describe("moveNode", () => {
    it("reorders node within root ids", () => {
      const s1 = { id: "s1", kind: "scene" as const, title: "S1", section: "manuscript" as const, createdAt: "", updatedAt: "" };
      const s2 = { id: "s2", kind: "scene" as const, title: "S2", section: "manuscript" as const, createdAt: "", updatedAt: "" };
      resetStore({ manuscriptRootIds: ["s1", "s2"], nodes: { s1, s2 } });
      useProjectStore.getState().moveNode("s2", null, 0);
      expect(useProjectStore.getState().project!.manuscriptRootIds[0]).toBe("s2");
    });

    it("moves node into a folder", () => {
      const folder = { id: "f1", kind: "folder" as const, title: "Chapter", section: "manuscript" as const, children: [], createdAt: "", updatedAt: "" };
      const scene = { id: "s1", kind: "scene" as const, title: "S1", section: "manuscript" as const, createdAt: "", updatedAt: "" };
      resetStore({ manuscriptRootIds: ["f1", "s1"], nodes: { f1: folder, s1: scene } });
      useProjectStore.getState().moveNode("s1", "f1", 0);
      expect(useProjectStore.getState().project!.nodes["f1"].children).toContain("s1");
      expect(useProjectStore.getState().project!.manuscriptRootIds).not.toContain("s1");
    });

    it("calls save after moving", () => {
      const s1 = { id: "s1", kind: "scene" as const, title: "S1", section: "manuscript" as const, createdAt: "", updatedAt: "" };
      const s2 = { id: "s2", kind: "scene" as const, title: "S2", section: "manuscript" as const, createdAt: "", updatedAt: "" };
      resetStore({ manuscriptRootIds: ["s1", "s2"], nodes: { s1, s2 } });
      useProjectStore.getState().moveNode("s1", null, 1);
      expect(saveProject).toHaveBeenCalledTimes(1);
    });
  });

  describe("plotGrid operations", () => {
    it("addPlotThread appends a thread", () => {
      resetStore();
      useProjectStore.getState().addPlotThread("Romance");
      const threads = useProjectStore.getState().project!.plotGrid.threads;
      expect(threads).toHaveLength(1);
      expect(threads[0].label).toBe("Romance");
      expect(threads[0].color).toBeTruthy();
    });

    it("deletePlotThread removes the thread and its cells", () => {
      resetStore({
        plotGrid: {
          threads: [{ id: "t1", label: "T1", color: "#f00" }],
          cells: { "s1::t1": { sceneId: "s1", threadId: "t1", text: "plot" } },
        },
      });
      useProjectStore.getState().deletePlotThread("t1");
      const { threads, cells } = useProjectStore.getState().project!.plotGrid;
      expect(threads).toHaveLength(0);
      expect(cells["s1::t1"]).toBeUndefined();
    });

    it("updatePlotCell stores the cell text", () => {
      resetStore();
      useProjectStore.getState().updatePlotCell("s1", "t1", "A plot point");
      const cells = useProjectStore.getState().project!.plotGrid.cells;
      expect(cells["s1::t1"]).toMatchObject({ sceneId: "s1", threadId: "t1", text: "A plot point" });
    });
  });

  describe("updateBookMeta", () => {
    it("replaces bookMeta", () => {
      resetStore();
      const meta = { author: "Alice", subtitle: "A Tale", dedication: "", copyright: "", year: "2024", isbn: "" };
      useProjectStore.getState().updateBookMeta(meta);
      expect(useProjectStore.getState().project!.bookMeta).toEqual(meta);
    });
  });
});
