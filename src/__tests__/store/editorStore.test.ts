import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore, PLOT_GRID_ID, BOOK_INFO_ID, COMPILE_ID } from "@/store/editorStore";

beforeEach(() => {
  useEditorStore.setState({
    activeNodeId: null,
    activeSection: null,
    hasUnsavedEditorContent: false,
    zenMode: false,
  });
});

describe("editorStore", () => {
  describe("setActiveNode", () => {
    it("sets activeNodeId and activeSection", () => {
      useEditorStore.getState().setActiveNode("node-1", "manuscript");
      const { activeNodeId, activeSection } = useEditorStore.getState();
      expect(activeNodeId).toBe("node-1");
      expect(activeSection).toBe("manuscript");
    });

    it("clears hasUnsavedEditorContent when switching nodes", () => {
      useEditorStore.setState({ hasUnsavedEditorContent: true });
      useEditorStore.getState().setActiveNode("node-2", "notes");
      expect(useEditorStore.getState().hasUnsavedEditorContent).toBe(false);
    });
  });

  describe("openPlotGrid", () => {
    it("sets activeNodeId to PLOT_GRID_ID sentinel", () => {
      useEditorStore.getState().openPlotGrid();
      expect(useEditorStore.getState().activeNodeId).toBe(PLOT_GRID_ID);
      expect(useEditorStore.getState().activeSection).toBeNull();
    });
  });

  describe("openBookInfo", () => {
    it("sets activeNodeId to BOOK_INFO_ID sentinel", () => {
      useEditorStore.getState().openBookInfo();
      expect(useEditorStore.getState().activeNodeId).toBe(BOOK_INFO_ID);
    });
  });

  describe("openCompile", () => {
    it("sets activeNodeId to COMPILE_ID sentinel and clears dirty flag", () => {
      useEditorStore.setState({ hasUnsavedEditorContent: true });
      useEditorStore.getState().openCompile();
      expect(useEditorStore.getState().activeNodeId).toBe(COMPILE_ID);
      expect(useEditorStore.getState().hasUnsavedEditorContent).toBe(false);
    });
  });

  describe("markEditorDirty / markEditorClean", () => {
    it("marks content as unsaved", () => {
      useEditorStore.getState().markEditorDirty();
      expect(useEditorStore.getState().hasUnsavedEditorContent).toBe(true);
    });

    it("clears unsaved flag", () => {
      useEditorStore.setState({ hasUnsavedEditorContent: true });
      useEditorStore.getState().markEditorClean();
      expect(useEditorStore.getState().hasUnsavedEditorContent).toBe(false);
    });
  });

  describe("zenMode", () => {
    it("toggles zen mode on/off", () => {
      expect(useEditorStore.getState().zenMode).toBe(false);
      useEditorStore.getState().toggleZenMode();
      expect(useEditorStore.getState().zenMode).toBe(true);
      useEditorStore.getState().toggleZenMode();
      expect(useEditorStore.getState().zenMode).toBe(false);
    });

    it("exitZenMode forces zen mode off", () => {
      useEditorStore.setState({ zenMode: true });
      useEditorStore.getState().exitZenMode();
      expect(useEditorStore.getState().zenMode).toBe(false);
    });
  });
});
