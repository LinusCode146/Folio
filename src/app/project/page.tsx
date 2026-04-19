"use client";

import { Suspense, useState, useEffect } from "react";
import { LayoutGrid, Home, Maximize2, BarChart2, Search } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { useTheme } from "@/hooks/useTheme";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore, PLOT_GRID_ID, COMPILE_ID, BOOK_INFO_ID, SEARCH_ID, STATS_ID } from "@/store/editorStore";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ZoomBar } from "@/components/ui/ZoomBar";
import { Binder } from "@/components/binder/Binder";
import { SceneEditor } from "@/components/editor/SceneEditor";
import { CharacterSheetEditor } from "@/components/sheets/CharacterSheetEditor";
import { PlaceSheetEditor } from "@/components/sheets/PlaceSheetEditor";
import { BookInfoEditor } from "@/components/sheets/BookInfoEditor";
import { PlotGrid } from "@/components/plotgrid/PlotGrid";
import { CompilePanel } from "@/components/compile/CompilePanel";
import { ChapterPanel } from "@/components/chapter/ChapterPanel";
import { StatsPanel } from "@/components/stats/StatsPanel";
import { SearchPanel } from "@/components/search/SearchPanel";
import { MapEditor } from "@/components/map/MapEditor";
import styles from "./page.module.css";

function WorkspaceInner() {
  const [projectId, setProjectId] = useState("");

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id") ?? "";
    setProjectId(id);
    if (!id) window.location.href = "/";
  }, []);

  const { loading, error } = useProject(projectId);
  useTheme();

  const project = useProjectStore((s) => s.project);
  const { activeNodeId, openPlotGrid, openStats, openSearch, toggleZenMode } = useEditorStore();
  const editorZoom = useEditorStore((s) => s.editorZoom);
  const zoomIn = useEditorStore((s) => s.zoomIn);
  const zoomOut = useEditorStore((s) => s.zoomOut);
  const resetZoom = useEditorStore((s) => s.resetZoom);

  // Global zoom shortcuts: ⌘= / ⌘+ zoom in, ⌘- zoom out, ⌘0 reset
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomIn(); }
      else if (e.key === "-")              { e.preventDefault(); zoomOut(); }
      else if (e.key === "0")              { e.preventDefault(); resetZoom(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomIn, zoomOut, resetZoom]);

  if (!projectId || loading) return <div className={styles.splash}>Loading…</div>;

  if (error || !project) {
    return (
      <div className={styles.splash}>
        Project not found.{" "}
        <button onClick={() => { window.location.href = "/"; }}>Go home</button>
      </div>
    );
  }

  const activeNode =
    activeNodeId && activeNodeId !== PLOT_GRID_ID
      ? project.nodes[activeNodeId]
      : null;

  function renderMain() {
    if (activeNodeId === COMPILE_ID) return <CompilePanel />;
    if (activeNodeId === PLOT_GRID_ID) return <PlotGrid />;
    if (activeNodeId === BOOK_INFO_ID) return <BookInfoEditor />;
    if (activeNodeId === STATS_ID) return <StatsPanel />;
    if (activeNodeId === SEARCH_ID) return <SearchPanel />;
    if (!activeNode) return <Welcome projectName={project!.name} />;
    if (activeNode.kind === "folder")
      return <ChapterPanel key={activeNode.id} chapterId={activeNode.id} />;
    if (activeNode.kind === "scene")
      return <SceneEditor key={activeNode.id} nodeId={activeNode.id} folder="scenes" title={activeNode.title} />;
    if (activeNode.kind === "note")
      return <SceneEditor key={activeNode.id} nodeId={activeNode.id} folder="notes" title={activeNode.title} />;
    if (activeNode.kind === "character")
      return <CharacterSheetEditor nodeId={activeNode.id} title={activeNode.title} />;
    if (activeNode.kind === "place")
      return <PlaceSheetEditor nodeId={activeNode.id} title={activeNode.title} />;
    if (activeNode.kind === "map")
      return <MapEditor key={activeNode.id} nodeId={activeNode.id} title={activeNode.title} />;
    return null;
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.toolbar}>
        <button
          className={styles.toolbarBtn}
          onClick={() => { window.location.href = "/"; }}
          title="Home"
        >
          <Home size={14} />
        </button>
        <span className={styles.projectName}>{project.name}</span>
        <div className={styles.toolbarRight}>
          <button
            className={styles.toolbarBtn}
            onClick={openSearch}
            title="Search"
          >
            <Search size={14} />
          </button>
          <button
            className={styles.toolbarBtn}
            onClick={openStats}
            title="Manuscript Statistics"
          >
            <BarChart2 size={14} />
          </button>
          <button
            className={styles.toolbarBtn}
            onClick={openPlotGrid}
            title="Plot Grid"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            className={styles.toolbarBtn}
            onClick={toggleZenMode}
            title="Zen mode (⌘⇧Z)"
          >
            <Maximize2 size={14} />
          </button>
          <ThemeToggle />
        </div>
      </header>
      <div className={styles.body}>
        <Binder />
        <main className={styles.main}>
          <div
            className={styles.zoomWrap}
            style={editorZoom === 1 ? undefined : { zoom: editorZoom }}
          >
            {renderMain()}
          </div>
          <ZoomBar />
        </main>
      </div>
    </div>
  );
}

function Welcome({ projectName }: { projectName: string }) {
  return (
    <div className={styles.welcome}>
      <h2 className={styles.welcomeTitle}>{projectName}</h2>
      <p className={styles.welcomeHint}>
        Select an item from the binder to start writing.
      </p>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className={styles.splash}>Loading…</div>}>
      <WorkspaceInner />
    </Suspense>
  );
}
