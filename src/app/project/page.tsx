"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LayoutGrid, Home, Maximize2 } from "lucide-react";
import { useProject } from "@/hooks/useProject";
import { useTheme } from "@/hooks/useTheme";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore, PLOT_GRID_ID, COMPILE_ID, BOOK_INFO_ID } from "@/store/editorStore";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Binder } from "@/components/binder/Binder";
import { SceneEditor } from "@/components/editor/SceneEditor";
import { CharacterSheetEditor } from "@/components/sheets/CharacterSheetEditor";
import { PlaceSheetEditor } from "@/components/sheets/PlaceSheetEditor";
import { BookInfoEditor } from "@/components/sheets/BookInfoEditor";
import { PlotGrid } from "@/components/plotgrid/PlotGrid";
import { CompilePanel } from "@/components/compile/CompilePanel";
import { ChapterPanel } from "@/components/chapter/ChapterPanel";
import styles from "./page.module.css";

function WorkspaceInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("id") ?? "";
  const { loading, error } = useProject(projectId);
  useTheme();

  const project = useProjectStore((s) => s.project);
  const { activeNodeId, openPlotGrid, toggleZenMode } = useEditorStore();

  if (!projectId) {
    router.replace("/");
    return null;
  }

  if (loading) return <div className={styles.splash}>Loading…</div>;

  if (error || !project) {
    return (
      <div className={styles.splash}>
        Project not found.{" "}
        <button onClick={() => router.push("/")}>Go home</button>
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
    return null;
  }

  return (
    <div className={styles.workspace}>
      <header className={styles.toolbar}>
        <button
          className={styles.toolbarBtn}
          onClick={() => router.push("/")}
          title="Home"
        >
          <Home size={14} />
        </button>
        <span className={styles.projectName}>{project.name}</span>
        <div className={styles.toolbarRight}>
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
        <main className={styles.main}>{renderMain()}</main>
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
