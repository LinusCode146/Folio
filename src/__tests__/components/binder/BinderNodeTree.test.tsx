import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { BinderNodeTree } from "@/components/binder/BinderNodeTree";
import { BinderDragContext } from "@/components/binder/BinderDragContext";
import { useProjectStore } from "@/store/projectStore";
import { createMockProject } from "@/test/helpers";
import type { BinderNode } from "@/types";

vi.mock("@/lib/projectService", () => ({
  saveProject: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/documentService", () => ({
  deleteScene: vi.fn().mockResolvedValue(undefined),
  deleteCharacter: vi.fn().mockResolvedValue(undefined),
  deletePlace: vi.fn().mockResolvedValue(undefined),
}));

function renderTree(ids: string[], nodes: Record<string, BinderNode>) {
  const project = createMockProject({ manuscriptRootIds: ids, nodes });
  useProjectStore.setState({ project, projectPath: "/mock", isLoading: false });

  return render(
    <DndContext>
      <BinderDragContext.Provider value={{ overFolderId: null, activeId: null }}>
        <BinderNodeTree ids={ids} section="manuscript" itemKind="scene" />
      </BinderDragContext.Provider>
    </DndContext>
  );
}

const scene1: BinderNode = { id: "s1", kind: "scene", title: "Scene One", section: "manuscript", createdAt: "", updatedAt: "" };
const scene2: BinderNode = { id: "s2", kind: "scene", title: "Scene Two", section: "manuscript", createdAt: "", updatedAt: "" };
const folder1: BinderNode = { id: "f1", kind: "folder", title: "Chapter 1", section: "manuscript", children: ["s1"], createdAt: "", updatedAt: "" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BinderNodeTree", () => {
  it("renders all nodes in the ids list", () => {
    renderTree(["s1", "s2"], { s1: scene1, s2: scene2 });
    expect(screen.getByText("Scene One")).toBeInTheDocument();
    expect(screen.getByText("Scene Two")).toBeInTheDocument();
  });

  it("renders nothing for an empty ids list", () => {
    renderTree([], {});
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders folder node", () => {
    renderTree(["f1"], { f1: folder1, s1: scene1 });
    expect(screen.getByText("Chapter 1")).toBeInTheDocument();
  });

  it("shows folder's children when expanded (default is expanded)", () => {
    renderTree(["f1"], { f1: folder1, s1: scene1 });
    // The child scene should be visible because folders default to expanded=true
    expect(screen.getByText("Scene One")).toBeInTheDocument();
  });

  it("hides folder children after clicking the folder to toggle collapse", () => {
    renderTree(["f1"], { f1: folder1, s1: scene1 });
    // Click folder row to toggle
    fireEvent.click(screen.getByText("Chapter 1"));
    expect(screen.queryByText("Scene One")).not.toBeInTheDocument();
  });

  it("shows children again after toggling twice", () => {
    renderTree(["f1"], { f1: folder1, s1: scene1 });
    fireEvent.click(screen.getByText("Chapter 1"));
    fireEvent.click(screen.getByText("Chapter 1"));
    expect(screen.getByText("Scene One")).toBeInTheDocument();
  });

  it("adds a scene to folder via context menu Add Item", async () => {
    renderTree(["f1"], { f1: folder1, s1: scene1 });
    // Right-click the folder to open context menu
    fireEvent.contextMenu(screen.getByText("Chapter 1"));
    fireEvent.click(screen.getByText("Add Item"));
    // A new scene should have been added to f1's children
    const children = useProjectStore.getState().project!.nodes["f1"].children!;
    expect(children.length).toBeGreaterThan(1);
  });
});
