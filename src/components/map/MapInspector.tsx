"use client";

import { Trash2, ExternalLink } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore } from "@/store/editorStore";
import type { MapElement, BinderNode } from "@/types";
import styles from "./MapEditor.module.css";

// 6 themed fill swatches derived from the design system palette
const FILL_SWATCHES = [
  { label: "Amber",   value: "oklch(0.78 0.12 78 / 0.45)" },
  { label: "Slate",   value: "oklch(0.55 0.008 240 / 0.45)" },
  { label: "Sage",    value: "oklch(0.72 0.10 150 / 0.45)" },
  { label: "Teal",    value: "oklch(0.70 0.10 195 / 0.45)" },
  { label: "Rust",    value: "oklch(0.62 0.14 25 / 0.45)" },
  { label: "Lavender",value: "oklch(0.68 0.10 280 / 0.45)" },
];

const FONT_SIZES = [12, 14, 18, 24, 32];

interface MapInspectorProps {
  selected: MapElement | null;
  placeNodes: BinderNode[];
  onChange: (patch: Partial<MapElement>) => void;
  onDelete: () => void;
}

export function MapInspector({ selected, placeNodes, onChange, onDelete }: MapInspectorProps) {
  const { setActiveNode } = useEditorStore();
  const project = useProjectStore((s) => s.project);

  if (!selected) {
    return (
      <div className={styles.inspector}>
        <p className={styles.inspectorHint}>
          Select an element to edit its properties, or choose a tool to start drawing.
        </p>
      </div>
    );
  }

  const linkedPlace = selected.placeNodeId
    ? project?.nodes[selected.placeNodeId]
    : null;

  return (
    <div className={styles.inspector}>
      <div className={styles.inspectorSection}>
        <span className={styles.inspectorKind}>
          {selected.kind === "pin" ? "Pin" :
           selected.kind === "polygon" ? "Region" :
           selected.kind === "path" ? "Path" :
           selected.kind === "stamp"
             ? (selected.stampKind === "tree" ? "Tree"
               : selected.stampKind === "forest" ? "Forest"
               : "Mountain")
             : "Label"}
        </span>
      </div>

      {/* Pin inspector */}
      {selected.kind === "pin" && (
        <>
          <div className={styles.inspectorField}>
            <label className={styles.inspectorLabel}>Label</label>
            <input
              className={styles.inspectorInput}
              value={selected.pinLabel ?? ""}
              placeholder={linkedPlace?.title ?? "Unnamed pin"}
              onChange={(e) => onChange({ pinLabel: e.target.value })}
            />
          </div>
          <div className={styles.inspectorField}>
            <label className={styles.inspectorLabel}>Linked Place</label>
            <select
              className={styles.inspectorSelect}
              value={selected.placeNodeId ?? ""}
              onChange={(e) => onChange({ placeNodeId: e.target.value || undefined })}
            >
              <option value="">— none —</option>
              {placeNodes.map((n) => (
                <option key={n.id} value={n.id}>{n.title}</option>
              ))}
            </select>
          </div>
          {linkedPlace && (
            <button
              className={styles.inspectorLinkBtn}
              onClick={() => setActiveNode(linkedPlace.id, linkedPlace.section)}
            >
              <ExternalLink size={12} />
              Open Place Sheet
            </button>
          )}
        </>
      )}

      {/* Polygon / path inspector */}
      {(selected.kind === "polygon" || selected.kind === "path") && (
        <>
          <div className={styles.inspectorField}>
            <label className={styles.inspectorLabel}>Fill</label>
            <div className={styles.swatches}>
              {FILL_SWATCHES.map((s) => (
                <button
                  key={s.label}
                  className={`${styles.swatch} ${selected.fill === s.value ? styles.swatchActive : ""}`}
                  style={{ background: s.value }}
                  title={s.label}
                  onClick={() => onChange({ fill: s.value })}
                />
              ))}
              <button
                className={`${styles.swatch} ${!selected.fill ? styles.swatchActive : ""}`}
                style={{ background: "transparent", border: "1px dashed var(--color-border)" }}
                title="No fill"
                onClick={() => onChange({ fill: undefined })}
              />
            </div>
          </div>
          <div className={styles.inspectorField}>
            <label className={styles.inspectorLabel}>
              Opacity — {Math.round((selected.opacity ?? 1) * 100)}%
            </label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={selected.opacity ?? 1}
              className={styles.inspectorRange}
              onChange={(e) => onChange({ opacity: parseFloat(e.target.value) })}
            />
          </div>
          <div className={styles.inspectorField}>
            <label className={styles.inspectorLabel}>Stroke width</label>
            <input
              type="range"
              min={0}
              max={8}
              step={0.5}
              value={selected.strokeWidth ?? 2}
              className={styles.inspectorRange}
              onChange={(e) => onChange({ strokeWidth: parseFloat(e.target.value) })}
            />
          </div>
        </>
      )}

      {/* Label inspector */}
      {selected.kind === "label" && (
        <>
          <div className={styles.inspectorField}>
            <label className={styles.inspectorLabel}>Text</label>
            <input
              className={styles.inspectorInput}
              value={selected.text ?? ""}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </div>
          <div className={styles.inspectorField}>
            <label className={styles.inspectorLabel}>Size</label>
            <div className={styles.sizeGroup}>
              {FONT_SIZES.map((sz) => (
                <button
                  key={sz}
                  className={`${styles.sizeBtn} ${(selected.fontSize ?? 16) === sz ? styles.sizeBtnActive : ""}`}
                  onClick={() => onChange({ fontSize: sz })}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.inspectorField}>
            <label className={styles.inspectorLabel}>Color</label>
            <div className={styles.swatches}>
              {FILL_SWATCHES.map((s) => (
                <button
                  key={s.label}
                  className={`${styles.swatch} ${selected.color === s.value.replace(/ \/ 0\.45\)/, ")") ? styles.swatchActive : ""}`}
                  style={{ background: s.value }}
                  title={s.label}
                  onClick={() => onChange({ color: s.value.replace(/ \/ 0\.45\)/, ")") })}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Stamp inspector — size control for trees / forests / mountains */}
      {selected.kind === "stamp" && (
        <div className={styles.inspectorField}>
          <label className={styles.inspectorLabel}>
            Size — {Math.round(selected.stampSize ?? 32)}px
          </label>
          <input
            type="range"
            min={16}
            max={96}
            step={2}
            value={selected.stampSize ?? 32}
            className={styles.inspectorRange}
            onChange={(e) => onChange({ stampSize: parseFloat(e.target.value) })}
          />
        </div>
      )}

      <button className={styles.inspectorDelete} onClick={onDelete}>
        <Trash2 size={13} />
        Delete element
      </button>
    </div>
  );
}
