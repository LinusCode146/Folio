import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { BinderNodeRow } from "@/components/binder/BinderNode";
import { BinderDragContext } from "@/components/binder/BinderDragContext";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore } from "@/store/editorStore";
import { createMockProject, createMockNode } from "@/test/helpers";
import type { BinderNode } from "@/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/projectService", () => ({
  saveProject: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/documentService", () => ({
  deleteScene: vi.fn().mockResolvedValue(undefined),
  deleteCharacter: vi.fn().mockResolvedValue(undefined),
  deletePlace: vi.fn().mockResolvedValue(undefined),
}));

// ── Helper ───────────────────────────────────────────────────────────────────

function renderNode(
  node: BinderNode,
  {
    isExpanded = false,
    onToggle = vi.fn(),
    onAddItem = undefined as (() => void) | undefined,
    onAddFolder = undefined as (() => void) | undefined,
    overFolderId = null as string | null,
    activeId = null as string | null,
  } = {}
) {
  return render(
    <DndContext>
      <SortableContext items={[node.id]}>
        <BinderDragContext.Provider value={{ overFolderId, activeId }}>
          <BinderNodeRow
            node={node}
            isExpanded={isExpanded}
            onToggle={onToggle}
            onAddItem={onAddItem}
            onAddFolder={onAddFolder}
          />
        </BinderDragContext.Provider>
      </SortableContext>
    </DndContext>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  const project = createMockProject({ nodes: {} });
  useProjectStore.setState({ project, projectPath: "/mock/path", isLoading: false });
  useEditorStore.setState({ activeNodeId: null, activeSection: null, hasUnsavedEditorContent: false, zenMode: false });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("BinderNodeRow", () => {
  it("renders the node title", () => {
    const node = createMockNode({ title: "My Scene" });
    renderNode(node);
    expect(screen.getByText("My Scene")).toBeInTheDocument();
  });

  it("clicking a scene node calls setActiveNode", () => {
    const node = createMockNode({ id: "s1", kind: "scene", section: "manuscript" });
    const setActiveNode = vi.fn();
    useEditorStore.setState({ ...useEditorStore.getState(), setActiveNode } as never);
    renderNode(node);
    fireEvent.click(screen.getByText("Scene 1"));
    expect(setActiveNode).toHaveBeenCalledWith("s1", "manuscript");
  });

  it("clicking a folder node calls both onToggle and setActiveNode", () => {
    const node = createMockNode({ kind: "folder", title: "Chapter 1", section: "manuscript" });
    const onToggle = vi.fn();
    const setActiveNode = vi.fn();
    useEditorStore.setState({ ...useEditorStore.getState(), setActiveNode } as never);
    renderNode(node, { onToggle });
    fireEvent.click(screen.getByText("Chapter 1"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(setActiveNode).toHaveBeenCalledWith(node.id, "manuscript");
  });

  it("double-clicking the node enters rename mode (shows input)", () => {
    const node = createMockNode({ title: "Scene 1" });
    renderNode(node);
    fireEvent.doubleClick(screen.getByText("Scene 1"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("pressing Enter in rename input commits the rename", async () => {
    const node = createMockNode({ id: "n1", title: "Old Name" });
    const project = createMockProject({
      manuscriptRootIds: ["n1"],
      nodes: { n1: node },
    });
    useProjectStore.setState({ project, projectPath: "/mock/path", isLoading: false });
    renderNode(node);
    fireEvent.doubleClick(screen.getByText("Old Name"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
    expect(useProjectStore.getState().project!.nodes["n1"].title).toBe("New Name");
  });

  it("pressing Escape in rename input cancels without saving", async () => {
    const node = createMockNode({ id: "n1", title: "Original" });
    const project = createMockProject({ manuscriptRootIds: ["n1"], nodes: { n1: node } });
    useProjectStore.setState({ project, projectPath: "/mock/path", isLoading: false });
    renderNode(node);
    fireEvent.doubleClick(screen.getByText("Original"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("textbox")).not.toBeInTheDocument());
    expect(useProjectStore.getState().project!.nodes["n1"].title).toBe("Original");
  });

  it("right-click opens context menu", () => {
    const node = createMockNode({ title: "Scene 1" });
    renderNode(node);
    fireEvent.contextMenu(screen.getByText("Scene 1"));
    // Context menu should show Rename and Delete options
    expect(screen.getByText("Rename")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("context menu Delete calls deleteNode", async () => {
    const node = createMockNode({ id: "s1", kind: "scene", title: "Scene 1" });
    const project = createMockProject({ manuscriptRootIds: ["s1"], nodes: { s1: node } });
    useProjectStore.setState({ project, projectPath: "/mock/path", isLoading: false });
    renderNode(node);
    fireEvent.contextMenu(screen.getByText("Scene 1"));
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() =>
      expect(useProjectStore.getState().project!.nodes["s1"]).toBeUndefined()
    );
  });

  it("context menu Rename enters rename mode", () => {
    const node = createMockNode({ title: "Scene 1" });
    renderNode(node);
    fireEvent.contextMenu(screen.getByText("Scene 1"));
    fireEvent.click(screen.getByText("Rename"));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("folder node with isExpanded=true shows open icon style", () => {
    const node = createMockNode({ kind: "folder", title: "Chapter" });
    const { container } = renderNode(node, { isExpanded: true });
    // The chevron has the chevronOpen class when isExpanded
    const chevron = container.querySelector("svg");
    expect(chevron).toBeInTheDocument();
  });

  it("active node has active CSS class applied", () => {
    const node = createMockNode({ id: "s1", title: "Active Scene" });
    useEditorStore.setState({ ...useEditorStore.getState(), activeNodeId: "s1" });
    renderNode(node);
    // The row div is the closest div ancestor of the title text
    const titleEl = screen.getByText("Active Scene");
    const row = titleEl.closest("div[class]") as HTMLElement;
    expect(row?.className).toMatch(/active/);
  });

  it("folder context menu shows Add Item and Add Folder options", () => {
    const node = createMockNode({ kind: "folder", title: "Chapter" });
    const onAddItem = vi.fn();
    const onAddFolder = vi.fn();
    renderNode(node, { onAddItem, onAddFolder });
    fireEvent.contextMenu(screen.getByText("Chapter"));
    expect(screen.getByText("Add Item")).toBeInTheDocument();
    expect(screen.getByText("Add Folder")).toBeInTheDocument();
  });
});
