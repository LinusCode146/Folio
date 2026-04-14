import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useProject } from "@/hooks/useProject";
import { useProjectStore } from "@/store/projectStore";
import { createMockProject } from "@/test/helpers";

// Mock the projectService module
vi.mock("@/lib/projectService", () => ({
  listProjects: vi.fn(),
  loadProject: vi.fn(),
  saveProject: vi.fn().mockResolvedValue(undefined),
}));

import { listProjects, loadProject } from "@/lib/projectService";

beforeEach(() => {
  vi.clearAllMocks();
  useProjectStore.setState({ project: null, projectPath: null, isLoading: false });
});

afterEach(async () => {
  // Drain any pending async state updates so React doesn't warn about
  // out-of-act updates after the test finishes.
  await act(async () => {});
});

describe("useProject", () => {
  it("returns loading: true initially", () => {
    // Never-resolving promise: no async state updates will fire during this test
    vi.mocked(listProjects).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useProject("proj-1"));
    expect(result.current.loading).toBe(true);
  });

  it("sets error when project id is not found in the registry", async () => {
    vi.mocked(listProjects).mockResolvedValue([]);
    const { result } = renderHook(() => useProject("missing-id"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Project not found");
  });

  it("loads the project and calls setProject on success", async () => {
    const mockProject = createMockProject({ id: "proj-1" });
    vi.mocked(listProjects).mockResolvedValue([
      { id: "proj-1", name: "Test", path: "/mock/path", updatedAt: "" },
    ]);
    vi.mocked(loadProject).mockResolvedValue(mockProject);

    const { result } = renderHook(() => useProject("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(loadProject).toHaveBeenCalledWith("/mock/path");
    expect(useProjectStore.getState().project).toEqual(mockProject);
    expect(useProjectStore.getState().projectPath).toBe("/mock/path");
  });

  it("sets error when loadProject returns null (missing file)", async () => {
    vi.mocked(listProjects).mockResolvedValue([
      { id: "proj-1", name: "Test", path: "/mock/path", updatedAt: "" },
    ]);
    vi.mocked(loadProject).mockResolvedValue(null);

    const { result } = renderHook(() => useProject("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Could not load project file");
  });

  it("sets error when listProjects throws", async () => {
    vi.mocked(listProjects).mockRejectedValue(new Error("FS error"));
    const { result } = renderHook(() => useProject("proj-1"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toContain("Error");
  });
});
