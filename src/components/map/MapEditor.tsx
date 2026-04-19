"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useProjectStore } from "@/store/projectStore";
import { loadMap, saveMap } from "@/lib/documentService";
import type { MapDocument, MapElement, BinderNode } from "@/types";
import { MapToolbar } from "./MapToolbar";
import { MapCanvas, type MapCanvasHandle } from "./MapCanvas";
import { MapInspector } from "./MapInspector";
import styles from "./MapEditor.module.css";

export type MapTool =
  | "select" | "pin" | "polygon" | "path" | "label"
  | "tree" | "mountain" | "forest" | "river";

const TOOL_KEYS: Record<string, MapTool> = {
  v: "select", p: "pin", r: "polygon", d: "path", t: "label",
  e: "tree", m: "mountain", f: "forest", w: "river",
};

const MAX_HISTORY = 50;

interface MapEditorProps {
  nodeId: string;
  title: string;
}

export function MapEditor({ nodeId, title }: MapEditorProps) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const project = useProjectStore((s) => s.project);

  const [doc, setDoc] = useState<MapDocument | null>(null);
  const [activeTool, setActiveTool] = useState<MapTool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<MapElement[][]>([]);
  const [future, setFuture] = useState<MapElement[][]>([]);
  const [exportMsg, setExportMsg] = useState("");

  const canvasRef = useRef<MapCanvasHandle>(null);

  // All place nodes for the inspector's linked-place dropdown
  const placeNodes: BinderNode[] = project
    ? (project.placeIds ?? []).map((id) => project.nodes[id]).filter(Boolean)
    : [];

  // Load on mount
  useEffect(() => {
    if (!projectPath) return;
    loadMap(projectPath, nodeId).then(setDoc);
  }, [nodeId, projectPath]);

  // Auto-save whenever doc changes
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!doc || !projectPath) return;
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      saveMap(projectPath, doc);
    }, 600);
    return () => { if (saveRef.current) clearTimeout(saveRef.current); };
  }, [doc, projectPath]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        setActiveTool("select");
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) handleDeleteSelected();
        return;
      }
      const toolKey = TOOL_KEYS[e.key.toLowerCase()];
      if (toolKey && !e.metaKey && !e.ctrlKey) {
        setActiveTool(toolKey);
        return;
      }
      const isUndo  = (e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey;
      const isRedo  = (e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey));
      if (isUndo) { e.preventDefault(); handleUndo(); }
      if (isRedo) { e.preventDefault(); handleRedo(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Element change with undo push ───────────────────────────
  const handleElementsChange = useCallback((elements: MapElement[]) => {
    setDoc((prev) => {
      if (!prev) return prev;
      setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), prev.elements]);
      setFuture([]);
      return { ...prev, elements };
    });
  }, []);

  // ── Undo / Redo ─────────────────────────────────────────────
  function handleUndo() {
    if (history.length === 0) return;
    setDoc((prev) => {
      if (!prev) return prev;
      const prev_elements = history[history.length - 1];
      setHistory((h) => h.slice(0, -1));
      setFuture((f) => [prev.elements, ...f]);
      setSelectedId(null);
      return { ...prev, elements: prev_elements };
    });
  }

  function handleRedo() {
    if (future.length === 0) return;
    setDoc((prev) => {
      if (!prev) return prev;
      const next_elements = future[0];
      setFuture((f) => f.slice(1));
      setHistory((h) => [...h, prev.elements]);
      setSelectedId(null);
      return { ...prev, elements: next_elements };
    });
  }

  // ── Inspector patch ─────────────────────────────────────────
  function handleInspectorChange(patch: Partial<MapElement>) {
    if (!selectedId || !doc) return;
    handleElementsChange(
      doc.elements.map((el) => el.id === selectedId ? { ...el, ...patch } : el)
    );
  }

  // ── Delete selected ─────────────────────────────────────────
  function handleDeleteSelected() {
    if (!selectedId || !doc) return;
    handleElementsChange(doc.elements.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  }

  // ── PNG export ──────────────────────────────────────────────
  async function handleExport() {
    if (!projectPath) return;
    const uri = canvasRef.current?.getDataURL();
    if (!uri) return;
    const base64 = uri.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    try {
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const outPath = `${projectPath}/maps/${nodeId}.png`;
      await writeFile(outPath, bytes);
      setExportMsg(`Saved to maps/${nodeId}.png`);
      setTimeout(() => setExportMsg(""), 3000);
    } catch {
      setExportMsg("Export failed.");
      setTimeout(() => setExportMsg(""), 3000);
    }
  }

  if (!doc) {
    return <div className={styles.loading}>Loading map…</div>;
  }

  const selectedEl = doc.elements.find((el) => el.id === selectedId) ?? null;

  return (
    <div className={styles.root}>
      <MapToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
        exportMsg={exportMsg}
      />
      <div className={styles.body}>
        <MapCanvas
          ref={canvasRef}
          doc={doc}
          activeTool={activeTool}
          selectedId={selectedId}
          placeNodes={placeNodes}
          onChange={handleElementsChange}
          onSelect={setSelectedId}
        />
        <MapInspector
          selected={selectedEl}
          placeNodes={placeNodes}
          onChange={handleInspectorChange}
          onDelete={handleDeleteSelected}
        />
      </div>
    </div>
  );
}
