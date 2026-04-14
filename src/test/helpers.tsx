import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { vi } from "vitest";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore } from "@/store/editorStore";
import type { Project, BinderNode, ID } from "@/types";
import type { Editor } from "@tiptap/react";

// ── Project factory ──────────────────────────────────────────────────────────

export function createMockProject(overrides?: Partial<Project>): Project {
  return {
    id: "test-project-id",
    name: "Test Project",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    manuscriptRootIds: [],
    characterIds: [],
    placeIds: [],
    noteIds: [],
    nodes: {},
    plotGrid: { threads: [], cells: {} },
    bookMeta: {
      author: "Test Author",
      subtitle: "",
      dedication: "",
      copyright: "",
      year: "2024",
      isbn: "",
    },
    ...overrides,
  };
}

export function createMockNode(overrides?: Partial<BinderNode>): BinderNode {
  return {
    id: "node-1",
    kind: "scene",
    title: "Scene 1",
    section: "manuscript",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ── Render helper ────────────────────────────────────────────────────────────

interface RenderWithStoresOptions extends RenderOptions {
  project?: Project;
  projectPath?: string;
}

export function renderWithStores(
  ui: React.ReactElement,
  {
    project = createMockProject(),
    projectPath = "/mock/projects/test-project",
    ...renderOptions
  }: RenderWithStoresOptions = {}
) {
  useProjectStore.setState({ project, projectPath, isLoading: false });
  useEditorStore.setState({
    activeNodeId: null,
    activeSection: null,
    hasUnsavedEditorContent: false,
    zenMode: false,
  });
  return render(ui, renderOptions);
}

// ── Mock Tiptap editor ───────────────────────────────────────────────────────

export function createMockEditor(overrides?: Partial<Editor>): Editor {
  // Build a fluent chain proxy: every method returns itself so .chain().focus().toggleBold().run() works
  const chainProxy: Record<string, unknown> = {};
  const chainMethods = [
    "focus", "toggleBold", "toggleItalic", "toggleHeading", "toggleBulletList",
    "toggleOrderedList", "setFontFamily", "unsetFontFamily", "setFontSize",
    "unsetFontSize", "setLineHeight", "unsetLineHeight", "insertTable",
    "addRowBefore", "addRowAfter", "deleteRow", "addColumnBefore",
    "addColumnAfter", "deleteColumn", "mergeCells", "splitCell",
    "toggleHeaderRow", "toggleHeaderColumn", "deleteTable", "setContent",
    "setTextSelection", "scrollIntoView",
  ];
  for (const m of chainMethods) {
    chainProxy[m] = vi.fn().mockReturnValue(chainProxy);
  }
  chainProxy.run = vi.fn().mockReturnValue(true);

  const mockEditor = {
    chain: vi.fn().mockReturnValue(chainProxy),
    isActive: vi.fn().mockReturnValue(false),
    getAttributes: vi.fn().mockReturnValue({}),
    getJSON: vi.fn().mockReturnValue({ type: "doc", content: [] }),
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
    commands: {
      focus: vi.fn(),
      setContent: vi.fn(),
    },
    storage: {
      characterCount: {
        words: vi.fn().mockReturnValue(42),
        characters: vi.fn().mockReturnValue(210),
      },
    },
    state: {
      selection: { anchor: 0 },
      doc: {
        // ProseMirror Node.descendants — no-op in tests (term is empty so it returns early)
        descendants: vi.fn(),
      },
    },
    view: {
      coordsAtPos: vi.fn().mockReturnValue({ top: 100, left: 0, bottom: 120, right: 10 }),
    },
    isDestroyed: false,
    ...overrides,
  } as unknown as Editor;

  return mockEditor;
}

// ── Store reset helpers ──────────────────────────────────────────────────────

export function resetStores() {
  useProjectStore.setState({ project: null, projectPath: null, isLoading: false });
  useEditorStore.setState({
    activeNodeId: null,
    activeSection: null,
    hasUnsavedEditorContent: false,
    zenMode: false,
  });
}

// ── Minimal project with populated binder tree ───────────────────────────────

export function createProjectWithNodes(nodes: BinderNode[], rootIds: ID[]): Project {
  const nodesMap: Record<ID, BinderNode> = {};
  for (const n of nodes) nodesMap[n.id] = n;

  return createMockProject({
    manuscriptRootIds: rootIds,
    nodes: nodesMap,
  });
}
