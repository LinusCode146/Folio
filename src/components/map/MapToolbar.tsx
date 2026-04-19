"use client";

import {
  MousePointer2, MapPin, Pentagon, Pencil, Type,
  TreePine, Trees, Mountain, Waves,
  Undo2, Redo2, Download,
} from "lucide-react";
import type { MapTool } from "./MapEditor";
import styles from "./MapEditor.module.css";

interface MapToolbarProps {
  activeTool: MapTool;
  onToolChange: (tool: MapTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  exportMsg?: string;
}

// Primary tool group — structural elements
const PRIMARY_TOOLS: { id: MapTool; icon: React.ReactNode; tip: string }[] = [
  { id: "select",  icon: <MousePointer2 size={14} />, tip: "Select & move — V" },
  { id: "pin",     icon: <MapPin size={14} />,        tip: "Place a pin — P" },
  { id: "polygon", icon: <Pentagon size={14} />,      tip: "Draw region (double-click to close) — R" },
  { id: "path",    icon: <Pencil size={14} />,        tip: "Freehand path — D" },
  { id: "label",   icon: <Type size={14} />,          tip: "Add a text label — T" },
];

// Stamp tool group — map elements
const STAMP_TOOLS: { id: MapTool; icon: React.ReactNode; tip: string }[] = [
  { id: "tree",     icon: <TreePine size={14} />, tip: "Place tree — E" },
  { id: "forest",   icon: <Trees size={14} />,    tip: "Place forest cluster — F" },
  { id: "mountain", icon: <Mountain size={14} />, tip: "Place mountain — M" },
  { id: "river",    icon: <Waves size={14} />,    tip: "Draw river — W" },
];

export function MapToolbar({
  activeTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
  exportMsg,
}: MapToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolGroup}>
        {PRIMARY_TOOLS.map((t) => (
          <button
            key={t.id}
            className={`${styles.toolBtn} ${activeTool === t.id ? styles.toolBtnActive : ""}`}
            onClick={() => onToolChange(t.id)}
            data-tooltip={t.tip}
            aria-label={t.tip}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className={styles.toolSep} />

      <div className={styles.toolGroup}>
        {STAMP_TOOLS.map((t) => (
          <button
            key={t.id}
            className={`${styles.toolBtn} ${activeTool === t.id ? styles.toolBtnActive : ""}`}
            onClick={() => onToolChange(t.id)}
            data-tooltip={t.tip}
            aria-label={t.tip}
          >
            {t.icon}
          </button>
        ))}
      </div>

      <div className={styles.toolSep} />

      <div className={styles.toolGroup}>
        <button
          className={styles.toolBtn}
          onClick={onUndo}
          disabled={!canUndo}
          data-tooltip="Undo — ⌘Z"
          aria-label="Undo"
        >
          <Undo2 size={14} />
        </button>
        <button
          className={styles.toolBtn}
          onClick={onRedo}
          disabled={!canRedo}
          data-tooltip="Redo — ⌘⇧Z"
          aria-label="Redo"
        >
          <Redo2 size={14} />
        </button>
      </div>

      <div className={styles.toolSep} />

      <button
        className={styles.toolBtn}
        onClick={onExport}
        data-tooltip="Export map as PNG image"
        aria-label="Export as PNG"
      >
        <Download size={14} />
        <span className={styles.toolBtnLabel}>Export PNG</span>
      </button>

      {exportMsg && (
        <span className={styles.exportMsg}>{exportMsg}</span>
      )}
    </div>
  );
}
