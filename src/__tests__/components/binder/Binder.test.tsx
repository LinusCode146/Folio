import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { Binder } from "@/components/binder/Binder";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore } from "@/store/editorStore";
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

const sceneA: BinderNode = { id: "sa", kind: "scene", title: "Sunrise", section: "manuscript", createdAt: "", updatedAt: "" };
const sceneB: BinderNode = { id: "sb", kind: "scene", title: "Twilight", section: "manuscript", createdAt: "", updatedAt: "" };
const charA: BinderNode = { id: "ca", kind: "character", title: "Alice", section: "characters", createdAt: "", updatedAt: "" };
const noteA: BinderNode = { id: "na", kind: "note", title: "Research Notes", section: "notes", createdAt: "", updatedAt: "" };

function setupAndRender(overrides = {}) {
  const project = createMockProject({
    manuscriptRootIds: ["sa", "sb"],
    characterIds: ["ca"],
    noteIds: ["na"],
    nodes: { sa: sceneA, sb: sceneB, ca: charA, na: noteA },
    ...overrides,
  });
  useProjectStore.setState({ project, projectPath: "/mock", isLoading: false });
  useEditorStore.setState({ activeNodeId: null, activeSection: null, hasUnsavedEditorContent: false, zenMode: false });
  return render(<Binder />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Binder", () => {
  it("renders nothing when project is null", () => {
    useProjectStore.setState({ project: null, projectPath: null, isLoading: false });
    const { container } = render(<Binder />);
    expect(container.firstChild).toBeNull();
  });

  it("renders all four section headers", () => {
    setupAndRender();
    expect(screen.getByText("Manuscript")).toBeInTheDocument();
    expect(screen.getByText("Characters")).toBeInTheDocument();
    expect(screen.getByText("Places")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("renders nodes from each section", () => {
    setupAndRender();
    expect(screen.getByText("Sunrise")).toBeInTheDocument();
    expect(screen.getByText("Twilight")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Research Notes")).toBeInTheDocument();
  });

  it("renders the search input", () => {
    setupAndRender();
    expect(screen.getByPlaceholderText("Search binder…")).toBeInTheDocument();
  });

  it("typing in the search box shows only matching nodes", () => {
    setupAndRender();
    const search = screen.getByPlaceholderText("Search binder…");
    fireEvent.change(search, { target: { value: "Sunrise" } });
    expect(screen.getByText("Sunrise")).toBeInTheDocument();
    expect(screen.queryByText("Twilight")).not.toBeInTheDocument();
    expect(screen.queryByText("Alice")).not.toBeInTheDocument();
  });

  it("search is case-insensitive", () => {
    setupAndRender();
    const search = screen.getByPlaceholderText("Search binder…");
    fireEvent.change(search, { target: { value: "sunrise" } });
    expect(screen.getByText("Sunrise")).toBeInTheDocument();
  });

  it("clearing the search via X button restores section view", () => {
    const { container } = setupAndRender();
    const search = screen.getByPlaceholderText("Search binder…");
    fireEvent.change(search, { target: { value: "Alice" } });
    // The clear button has CSS class "searchClear" (icon-only, no accessible name)
    const clearButton = container.querySelector(".searchClear") as HTMLElement;
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);
    // Sections should be back
    expect(screen.getByText("Manuscript")).toBeInTheDocument();
  });

  it("renders Book Info link", () => {
    setupAndRender();
    expect(screen.getByText("Book Info")).toBeInTheDocument();
  });

  it("clicking Book Info calls openBookInfo", () => {
    const openBookInfo = vi.fn();
    useEditorStore.setState({ ...useEditorStore.getState(), openBookInfo } as never);
    setupAndRender();
    fireEvent.click(screen.getByText("Book Info"));
    expect(openBookInfo).toHaveBeenCalledTimes(1);
  });

  it("clicking the compile (download) button in Manuscript section calls openCompile", () => {
    const openCompile = vi.fn();
    useEditorStore.setState({ ...useEditorStore.getState(), openCompile } as never);
    setupAndRender();
    fireEvent.click(screen.getByTitle("Compile manuscript"));
    expect(openCompile).toHaveBeenCalledTimes(1);
  });

  it("clicking Add Scene in Manuscript section creates a new scene node", () => {
    setupAndRender();
    fireEvent.click(screen.getByTitle("Add Scene"));
    const project = useProjectStore.getState().project!;
    expect(project.manuscriptRootIds.length).toBe(3);
  });

  it("clicking Add Character creates a new character node", () => {
    setupAndRender();
    fireEvent.click(screen.getByTitle("Add Character"));
    const project = useProjectStore.getState().project!;
    expect(project.characterIds.length).toBe(2);
  });
});
