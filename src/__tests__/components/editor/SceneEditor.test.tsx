import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor, fireEvent } from "@testing-library/react";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore } from "@/store/editorStore";
import { createMockProject, createMockEditor } from "@/test/helpers";
import type { Editor } from "@tiptap/react";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockEditor = createMockEditor();

// Capture the onUpdate callback so tests can trigger content changes
let capturedOnUpdate: ((args: { editor: Editor }) => void) | null = null;

vi.mock("@tiptap/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tiptap/react")>();
  return {
    ...actual,
    useEditor: vi.fn((config?: { onUpdate?: (args: { editor: Editor }) => void }) => {
      if (config?.onUpdate) capturedOnUpdate = config.onUpdate;
      return mockEditor;
    }),
    EditorContent: ({ editor }: { editor: unknown }) =>
      editor ? <div data-testid="editor-content" /> : null,
  };
});

vi.mock("@/lib/documentService", () => ({
  loadScene: vi.fn().mockResolvedValue({
    id: "scene-1",
    content: { type: "doc", content: [] },
    wordCount: 0,
    updatedAt: "2024-01-01T00:00:00.000Z",
  }),
  saveScene: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/projectService", () => ({
  saveProject: vi.fn().mockResolvedValue(undefined),
}));

import { SceneEditor } from "@/components/editor/SceneEditor";
import { loadScene, saveScene } from "@/lib/documentService";

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  capturedOnUpdate = null;
  vi.clearAllMocks();
  const project = createMockProject({
    nodes: { "scene-1": { id: "scene-1", kind: "scene", title: "Act I", section: "manuscript", createdAt: "", updatedAt: "" } },
    manuscriptRootIds: ["scene-1"],
  });
  useProjectStore.setState({ project, projectPath: "/mock/path", isLoading: false });
  useEditorStore.setState({ activeNodeId: null, activeSection: null, hasUnsavedEditorContent: false, zenMode: false });
});

afterEach(async () => {
  // Flush any pending state updates from async effects (e.g. loadScene) so
  // React doesn't warn about out-of-act updates after the test finishes.
  await act(async () => {});
  vi.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("SceneEditor", () => {
  it("renders the editor content area", async () => {
    await act(async () => { render(<SceneEditor nodeId="scene-1" folder="scenes" title="Act I" />); });
    expect(screen.getByTestId("editor-content")).toBeInTheDocument();
  });

  it("renders the document title", async () => {
    await act(async () => { render(<SceneEditor nodeId="scene-1" folder="scenes" title="The Beginning" />); });
    expect(screen.getByText("The Beginning")).toBeInTheDocument();
  });

  it("calls loadScene on mount with correct arguments", async () => {
    render(<SceneEditor nodeId="scene-1" folder="scenes" title="Act I" />);
    await act(async () => {});
    expect(loadScene).toHaveBeenCalledWith("/mock/path", "scenes", "scene-1");
  });

  it("marks editor as clean after loading the document", async () => {
    render(<SceneEditor nodeId="scene-1" folder="scenes" title="Act I" />);
    await act(async () => {});
    expect(useEditorStore.getState().hasUnsavedEditorContent).toBe(false);
  });

  it("marks editor dirty when content changes (onUpdate fires)", async () => {
    render(<SceneEditor nodeId="scene-1" folder="scenes" title="Act I" />);
    await act(async () => {});
    // Simulate content change
    act(() => { capturedOnUpdate?.({ editor: mockEditor }); });
    expect(useEditorStore.getState().hasUnsavedEditorContent).toBe(true);
  });

  it("auto-saves after 1 second debounce following a content change", async () => {
    render(<SceneEditor nodeId="scene-1" folder="scenes" title="Act I" />);
    await act(async () => {});
    act(() => { capturedOnUpdate?.({ editor: mockEditor }); });
    // Not saved yet
    expect(saveScene).not.toHaveBeenCalled();
    // Advance past the 1-second debounce
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(saveScene).toHaveBeenCalledTimes(1);
  });

  it("marks editor clean after a successful auto-save", async () => {
    render(<SceneEditor nodeId="scene-1" folder="scenes" title="Act I" />);
    await act(async () => {});
    act(() => { capturedOnUpdate?.({ editor: mockEditor }); });
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(useEditorStore.getState().hasUnsavedEditorContent).toBe(false);
  });

  it("opens the find bar on Ctrl+F", async () => {
    render(<SceneEditor nodeId="scene-1" folder="scenes" title="Act I" />);
    await act(async () => {});
    act(() => { fireEvent.keyDown(window, { key: "f", ctrlKey: true }); });
    // FindBar renders an input with placeholder "Find…"
    expect(screen.getByPlaceholderText("Find…")).toBeInTheDocument();
  });

  it("renders the EditorToolbar", async () => {
    await act(async () => { render(<SceneEditor nodeId="scene-1" folder="scenes" title="Act I" />); });
    expect(screen.getByTitle("Bold (⌘B)")).toBeInTheDocument();
  });

  it("renders the WordCount component", async () => {
    await act(async () => { render(<SceneEditor nodeId="scene-1" folder="scenes" title="Act I" />); });
    expect(screen.getByText(/words/i)).toBeInTheDocument();
  });

  it("loads a note (folder='notes') with the notes folder path", async () => {
    render(<SceneEditor nodeId="scene-1" folder="notes" title="Research" />);
    await act(async () => {});
    expect(loadScene).toHaveBeenCalledWith("/mock/path", "notes", "scene-1");
  });
});
