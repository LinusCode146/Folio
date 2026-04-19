"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import styles from "./ZoomBar.module.css";

export function ZoomBar() {
  const { editorZoom, zoomIn, zoomOut, resetZoom } = useEditorStore();

  const pct = Math.round(editorZoom * 100);
  const atMin = editorZoom <= 0.5;
  const atMax = editorZoom >= 2.0;

  return (
    <div className={styles.root}>
      <button
        className={styles.btn}
        onClick={zoomOut}
        disabled={atMin}
        data-tooltip="Zoom out — ⌘−"
        aria-label="Zoom out"
      >
        <Minus size={13} />
      </button>
      <button
        className={`${styles.btn} ${styles.pctBtn}`}
        onClick={resetZoom}
        disabled={editorZoom === 1}
        data-tooltip="Reset zoom — ⌘0"
        aria-label="Reset zoom to 100%"
      >
        <span className={styles.pct}>{pct}%</span>
      </button>
      <button
        className={styles.btn}
        onClick={zoomIn}
        disabled={atMax}
        data-tooltip="Zoom in — ⌘+"
        aria-label="Zoom in"
      >
        <Plus size={13} />
      </button>
      {editorZoom !== 1 && (
        <button
          className={`${styles.btn} ${styles.resetBtn}`}
          onClick={resetZoom}
          data-tooltip="Reset to 100%"
          aria-label="Reset zoom"
        >
          <RotateCcw size={11} />
        </button>
      )}
    </div>
  );
}
