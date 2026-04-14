import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import { CompilePanel } from "@/components/compile/CompilePanel";
import { useProjectStore } from "@/store/projectStore";
import { createMockProject } from "@/test/helpers";
import type { BinderNode } from "@/types";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/compileService", () => ({
  compileToPdfBlobUrl: vi.fn().mockResolvedValue("blob:mock-preview-url"),
  compileManuscript: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/projectService", () => ({
  saveProject: vi.fn().mockResolvedValue(undefined),
}));

import { compileToPdfBlobUrl, compileManuscript } from "@/lib/compileService";

// ── Test data ────────────────────────────────────────────────────────────────

const chapterFolder: BinderNode = {
  id: "ch1",
  kind: "folder",
  title: "Chapter 1",
  section: "manuscript",
  children: ["s1"],
  createdAt: "",
  updatedAt: "",
};

const chapterFolder2: BinderNode = {
  id: "ch2",
  kind: "folder",
  title: "Chapter 2",
  section: "manuscript",
  children: [],
  createdAt: "",
  updatedAt: "",
};

const scene1: BinderNode = {
  id: "s1",
  kind: "scene",
  title: "Scene 1",
  section: "manuscript",
  createdAt: "",
  updatedAt: "",
};

function setupWithChapters() {
  const project = createMockProject({
    manuscriptRootIds: ["ch1", "ch2"],
    nodes: { ch1: chapterFolder, ch2: chapterFolder2, s1: scene1 },
  });
  useProjectStore.setState({ project, projectPath: "/mock/path", isLoading: false });
}

function setupEmpty() {
  const project = createMockProject({
    manuscriptRootIds: [],
    nodes: {},
  });
  useProjectStore.setState({ project, projectPath: "/mock/path", isLoading: false });
}

// ── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CompilePanel", () => {
  it("renders nothing when project is null", () => {
    useProjectStore.setState({ project: null, projectPath: null, isLoading: false });
    const { container } = render(<CompilePanel />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Compile title", () => {
    setupWithChapters();
    render(<CompilePanel />);
    expect(screen.getByText("Compile")).toBeInTheDocument();
  });

  it("shows chapter folders in the chapter checklist", () => {
    setupWithChapters();
    render(<CompilePanel />);
    expect(screen.getByText("Chapter 1")).toBeInTheDocument();
    expect(screen.getByText("Chapter 2")).toBeInTheDocument();
  });

  it("all chapters are checked by default", () => {
    setupWithChapters();
    render(<CompilePanel />);
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    const chapterChecks = checkboxes.filter((_, i) => i < 2);
    chapterChecks.forEach((cb) => expect(cb.checked).toBe(true));
  });

  it("unchecking a chapter unchecks its checkbox", () => {
    setupWithChapters();
    render(<CompilePanel />);
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    const firstChapter = checkboxes[0];
    fireEvent.click(firstChapter);
    expect(firstChapter.checked).toBe(false);
  });

  it("shows 'Select all' when not all chapters selected", async () => {
    setupWithChapters();
    render(<CompilePanel />);
    // Uncheck one chapter
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    fireEvent.click(checkboxes[0]);
    expect(screen.getByText("Select all")).toBeInTheDocument();
  });

  it("shows 'Deselect all' when all chapters selected", () => {
    setupWithChapters();
    render(<CompilePanel />);
    expect(screen.getByText("Deselect all")).toBeInTheDocument();
  });

  it("clicking 'Deselect all' unchecks all chapters", () => {
    setupWithChapters();
    render(<CompilePanel />);
    fireEvent.click(screen.getByText("Deselect all"));
    const checkboxes = screen.getAllByRole("checkbox") as HTMLInputElement[];
    checkboxes.forEach((cb) => expect(cb.checked).toBe(false));
  });

  it("shows scene separator buttons", () => {
    setupWithChapters();
    render(<CompilePanel />);
    expect(screen.getByText("* * *")).toBeInTheDocument();
    expect(screen.getByText("#")).toBeInTheDocument();
    expect(screen.getByText("blank")).toBeInTheDocument();
  });

  it("custom separator input is hidden when separator is not 'custom'", () => {
    setupWithChapters();
    render(<CompilePanel />);
    expect(screen.queryByPlaceholderText("e.g. — or ✦")).not.toBeInTheDocument();
  });

  it("clicking 'custom' separator reveals custom input", () => {
    setupWithChapters();
    render(<CompilePanel />);
    fireEvent.click(screen.getByText("custom"));
    expect(screen.getByPlaceholderText("e.g. — or ✦")).toBeInTheDocument();
  });

  it("page format select renders with 'paperback' selected by default", () => {
    setupWithChapters();
    render(<CompilePanel />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("paperback");
  });

  it("changing page format updates the select value", () => {
    setupWithChapters();
    render(<CompilePanel />);
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "a4" } });
    expect(select.value).toBe("a4");
  });

  it("TOC checkbox is unchecked by default", () => {
    setupWithChapters();
    render(<CompilePanel />);
    const tocCheckbox = screen.getByRole("checkbox", { name: /table of contents/i });
    expect((tocCheckbox as HTMLInputElement).checked).toBe(false);
  });

  it("checking TOC checkbox enables it", () => {
    setupWithChapters();
    render(<CompilePanel />);
    const tocCheckbox = screen.getByRole("checkbox", { name: /table of contents/i });
    fireEvent.click(tocCheckbox);
    expect((tocCheckbox as HTMLInputElement).checked).toBe(true);
  });

  it("renders Export PDF button", () => {
    setupWithChapters();
    render(<CompilePanel />);
    expect(screen.getByText("Export PDF")).toBeInTheDocument();
  });

  it("renders Refresh preview button", () => {
    setupWithChapters();
    render(<CompilePanel />);
    expect(screen.getByText("Refresh preview")).toBeInTheDocument();
  });

  it("calls compileToPdfBlobUrl on mount (debounced preview)", async () => {
    setupWithChapters();
    render(<CompilePanel />);
    await act(async () => { vi.advanceTimersByTime(600); });
    expect(compileToPdfBlobUrl).toHaveBeenCalledTimes(1);
  });

  it("clicking Export PDF calls compileManuscript", async () => {
    setupWithChapters();
    render(<CompilePanel />);
    const exportBtn = screen.getByText("Export PDF");
    await act(async () => { fireEvent.click(exportBtn); });
    expect(compileManuscript).toHaveBeenCalledTimes(1);
  });

  it("shows 'Saved!' and Show in Finder button after successful export", async () => {
    setupWithChapters();
    render(<CompilePanel />);
    await act(async () => { fireEvent.click(screen.getByText("Export PDF")); });
    expect(screen.getByText("Saved!")).toBeInTheDocument();
    expect(screen.getByText("Show in Finder")).toBeInTheDocument();
  });

  it("shows empty-state message when no chapters exist", () => {
    setupEmpty();
    render(<CompilePanel />);
    expect(screen.getByText(/No chapters found/i)).toBeInTheDocument();
  });

  it("renders iframe for PDF preview once URL is available", async () => {
    setupWithChapters();
    render(<CompilePanel />);
    // Advance past debounce, then flush all microtasks/promises
    await act(async () => {
      vi.advanceTimersByTime(600);
      // Flush the resolved promise from compileToPdfBlobUrl
      await Promise.resolve();
      await Promise.resolve();
    });
    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
  });
});
