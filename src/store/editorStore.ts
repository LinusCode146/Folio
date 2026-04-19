"use client";

import { create } from "zustand";
import type { BinderSection, ID } from "@/types";

export const PLOT_GRID_ID = "PLOT_GRID";
export const BOOK_INFO_ID = "BOOK_INFO";
export const COMPILE_ID   = "__compile__";
export const SEARCH_ID    = "__search__";
export const STATS_ID     = "__stats__";

interface EditorStore {
  activeNodeId: ID | null;
  activeSection: BinderSection | null;
  hasUnsavedEditorContent: boolean;
  zenMode: boolean;
  chapterViewMode: "cards" | "flow";
  typewriterMode: boolean;
  focusMode: boolean;
  // Session goal (feature 3)
  sessionWordsAdded: number;
  sessionGoal: number;
  // Editor zoom — applies to SceneEditor, sheet editors, and MapEditor
  editorZoom: number;

  setActiveNode: (id: ID, section: BinderSection) => void;
  openPlotGrid: () => void;
  openBookInfo: () => void;
  openCompile: () => void;
  openSearch: () => void;
  openStats: () => void;
  markEditorDirty: () => void;
  markEditorClean: () => void;
  toggleZenMode: () => void;
  exitZenMode: () => void;
  setChapterViewMode: (mode: "cards" | "flow") => void;
  toggleTypewriterMode: () => void;
  toggleFocusMode: () => void;
  addSessionWords: (delta: number) => void;
  setSessionGoal: (n: number) => void;
  setEditorZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_STEP = 0.1;

function clampZoom(z: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(z * 100) / 100));
}

function loadZoom(): number {
  if (typeof localStorage === "undefined") return 1;
  const raw = parseFloat(localStorage.getItem("writable-editor-zoom") ?? "1");
  return clampZoom(Number.isFinite(raw) ? raw : 1);
}

function loadGoal(): number {
  if (typeof localStorage === "undefined") return 1000;
  return parseInt(localStorage.getItem("writable-session-goal") ?? "1000", 10) || 1000;
}

export const useEditorStore = create<EditorStore>()((set) => ({
  activeNodeId: null,
  activeSection: null,
  hasUnsavedEditorContent: false,
  zenMode: false,
  chapterViewMode: "cards",
  typewriterMode: false,
  focusMode: false,
  sessionWordsAdded: 0,
  sessionGoal: 1000, // will be replaced on first render via loadGoal()
  editorZoom: 1,     // replaced on first render via loadZoom()

  setActiveNode: (id, section) =>
    set({ activeNodeId: id, activeSection: section, hasUnsavedEditorContent: false }),
  openPlotGrid: () =>
    set({ activeNodeId: PLOT_GRID_ID, activeSection: null }),
  openBookInfo: () =>
    set({ activeNodeId: BOOK_INFO_ID, activeSection: null }),
  openCompile: () =>
    set({ activeNodeId: COMPILE_ID, activeSection: null, hasUnsavedEditorContent: false }),
  openSearch: () =>
    set({ activeNodeId: SEARCH_ID, activeSection: null }),
  openStats: () =>
    set({ activeNodeId: STATS_ID, activeSection: null }),
  markEditorDirty: () => set({ hasUnsavedEditorContent: true }),
  markEditorClean: () => set({ hasUnsavedEditorContent: false }),
  toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode })),
  exitZenMode: () => set({ zenMode: false }),
  setChapterViewMode: (mode) => set({ chapterViewMode: mode }),
  toggleTypewriterMode: () => set((s) => ({ typewriterMode: !s.typewriterMode })),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  addSessionWords: (delta) => set((s) => ({ sessionWordsAdded: s.sessionWordsAdded + delta })),
  setSessionGoal: (n) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("writable-session-goal", String(n));
    }
    set({ sessionGoal: n });
  },
  setEditorZoom: (z) => {
    const clamped = clampZoom(z);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("writable-editor-zoom", String(clamped));
    }
    set({ editorZoom: clamped });
  },
  zoomIn: () => set((s) => {
    const next = clampZoom(s.editorZoom + ZOOM_STEP);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("writable-editor-zoom", String(next));
    }
    return { editorZoom: next };
  }),
  zoomOut: () => set((s) => {
    const next = clampZoom(s.editorZoom - ZOOM_STEP);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("writable-editor-zoom", String(next));
    }
    return { editorZoom: next };
  }),
  resetZoom: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("writable-editor-zoom", "1");
    }
    set({ editorZoom: 1 });
  },
}));

// Hydrate from localStorage after store is created (client-side only)
if (typeof window !== "undefined") {
  useEditorStore.setState({ sessionGoal: loadGoal(), editorZoom: loadZoom() });
}
