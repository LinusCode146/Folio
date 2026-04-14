"use client";

import { create } from "zustand";
import type { BinderSection, ID } from "@/types";

export const PLOT_GRID_ID = "PLOT_GRID";
export const BOOK_INFO_ID = "BOOK_INFO";
export const COMPILE_ID   = "__compile__";

interface EditorStore {
  activeNodeId: ID | null;
  activeSection: BinderSection | null;
  hasUnsavedEditorContent: boolean;
  zenMode: boolean;
  chapterViewMode: "cards" | "flow";
  setActiveNode: (id: ID, section: BinderSection) => void;
  openPlotGrid: () => void;
  openBookInfo: () => void;
  openCompile: () => void;
  markEditorDirty: () => void;
  markEditorClean: () => void;
  toggleZenMode: () => void;
  exitZenMode: () => void;
  setChapterViewMode: (mode: "cards" | "flow") => void;
}

export const useEditorStore = create<EditorStore>()((set) => ({
  activeNodeId: null,
  activeSection: null,
  hasUnsavedEditorContent: false,
  zenMode: false,
  chapterViewMode: "cards",
  setActiveNode: (id, section) =>
    set({ activeNodeId: id, activeSection: section, hasUnsavedEditorContent: false }),
  openPlotGrid: () =>
    set({ activeNodeId: PLOT_GRID_ID, activeSection: null }),
  openBookInfo: () =>
    set({ activeNodeId: BOOK_INFO_ID, activeSection: null }),
  openCompile: () =>
    set({ activeNodeId: COMPILE_ID, activeSection: null, hasUnsavedEditorContent: false }),
  markEditorDirty: () => set({ hasUnsavedEditorContent: true }),
  markEditorClean: () => set({ hasUnsavedEditorContent: false }),
  toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode })),
  exitZenMode: () => set({ zenMode: false }),
  setChapterViewMode: (mode) => set({ chapterViewMode: mode }),
}));
