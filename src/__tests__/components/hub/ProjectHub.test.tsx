import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { ProjectHub } from "@/components/hub/ProjectHub";
import { mockRouter } from "@/test/__mocks__/nextNavigation";
import type { ProjectRef } from "@/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/projectService", () => ({
  listProjects: vi.fn(),
  createProject: vi.fn(),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  saveProject: vi.fn().mockResolvedValue(undefined),
}));

// ThemeToggle uses the theme store, mock it to keep tests simple
vi.mock("@/components/ui/ThemeToggle", () => ({
  ThemeToggle: () => <button>ThemeToggle</button>,
}));

import { listProjects, createProject, deleteProject } from "@/lib/projectService";

// ── Test data ────────────────────────────────────────────────────────────────

const projectA: ProjectRef = { id: "p1", name: "Project Alpha", path: "/mock/p1", updatedAt: "2024-01-01T00:00:00.000Z" };
const projectB: ProjectRef = { id: "p2", name: "Project Beta", path: "/mock/p2", updatedAt: "2024-02-01T00:00:00.000Z" };

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listProjects).mockResolvedValue([projectA, projectB]);
  vi.mocked(createProject).mockResolvedValue({
    id: "new-proj",
    name: "My New Project",
    createdAt: "",
    updatedAt: "",
    manuscriptRootIds: [],
    characterIds: [],
    placeIds: [],
    noteIds: [],
    nodes: {},
    plotGrid: { threads: [], cells: {} },
    bookMeta: { author: "", subtitle: "", dedication: "", copyright: "", year: "", isbn: "" },
  });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("ProjectHub", () => {
  it("shows loading state initially", () => {
    // Delay the resolution so we can see the loading state
    vi.mocked(listProjects).mockImplementation(() => new Promise(() => {}));
    render(<ProjectHub />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("renders project cards after loading", async () => {
    render(<ProjectHub />);
    await waitFor(() => expect(screen.getByText("Project Alpha")).toBeInTheDocument());
    expect(screen.getByText("Project Beta")).toBeInTheDocument();
  });

  it("shows empty state when no projects exist", async () => {
    vi.mocked(listProjects).mockResolvedValue([]);
    render(<ProjectHub />);
    await waitFor(() => expect(screen.getByText(/No projects yet/)).toBeInTheDocument());
  });

  it("renders 'Folio' heading", async () => {
    render(<ProjectHub />);
    await waitFor(() => expect(screen.getByText("Folio")).toBeInTheDocument());
  });

  it("renders 'Your Projects' heading", async () => {
    render(<ProjectHub />);
    await waitFor(() => expect(screen.getByText("Your Projects")).toBeInTheDocument());
  });

  it("renders New Project button", async () => {
    render(<ProjectHub />);
    await waitFor(() => expect(screen.getByText("New Project")).toBeInTheDocument());
  });

  it("clicking New Project opens the create modal", async () => {
    render(<ProjectHub />);
    await waitFor(() => screen.getByText("New Project"));
    fireEvent.click(screen.getByText("New Project"));
    expect(screen.getByPlaceholderText("Project name…")).toBeInTheDocument();
  });

  it("submitting the create modal calls createProject and redirects", async () => {
    render(<ProjectHub />);
    await waitFor(() => screen.getByText("New Project"));
    fireEvent.click(screen.getByText("New Project"));
    const input = screen.getByPlaceholderText("Project name…");
    fireEvent.change(input, { target: { value: "My New Project" } });
    await act(async () => { fireEvent.submit(input.closest("form")!); });
    expect(createProject).toHaveBeenCalledWith("My New Project");
    expect(mockRouter.push).toHaveBeenCalledWith("/project?id=new-proj");
  });

  it("create button is disabled when name is empty", async () => {
    render(<ProjectHub />);
    await waitFor(() => screen.getByText("New Project"));
    fireEvent.click(screen.getByText("New Project"));
    const createBtn = screen.getByRole("button", { name: "Create" });
    expect(createBtn).toBeDisabled();
  });

  it("clicking a project card navigates to the project", async () => {
    render(<ProjectHub />);
    await waitFor(() => screen.getByText("Project Alpha"));
    fireEvent.click(screen.getByText("Project Alpha"));
    expect(mockRouter.push).toHaveBeenCalledWith("/project?id=p1");
  });

  it("clicking delete on a project card opens the delete confirmation modal", async () => {
    render(<ProjectHub />);
    await waitFor(() => screen.getByText("Project Alpha"));
    const deleteButtons = screen.getAllByTitle("Delete project");
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByText(/Delete Project/)).toBeInTheDocument();
    expect(screen.getByText(/"Project Alpha"/)).toBeInTheDocument();
  });

  it("confirming delete calls deleteProject and reloads the list", async () => {
    render(<ProjectHub />);
    await waitFor(() => screen.getByText("Project Alpha"));
    const deleteButtons = screen.getAllByTitle("Delete project");
    fireEvent.click(deleteButtons[0]);
    // The modal now has a Delete button
    const confirmDelete = screen.getByRole("button", { name: "Delete" });
    await act(async () => { fireEvent.click(confirmDelete); });
    expect(deleteProject).toHaveBeenCalledWith(projectA.path, projectA.id);
    expect(listProjects).toHaveBeenCalledTimes(2); // initial load + reload
  });

  it("cancelling delete modal dismisses it without deleting", async () => {
    render(<ProjectHub />);
    await waitFor(() => screen.getByText("Project Alpha"));
    const deleteButtons = screen.getAllByTitle("Delete project");
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(deleteProject).not.toHaveBeenCalled();
    expect(screen.queryByText(/This cannot be undone/)).not.toBeInTheDocument();
  });
});
