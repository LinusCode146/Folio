"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RefreshCw, Download, Check, FolderOpen } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import {
  compileToPdfBlobUrl,
  compileManuscript,
  collectManuscriptScenes,
} from "@/lib/compileService";
import type { CompileOptions } from "@/lib/compileService";
import type { ID } from "@/types";
import styles from "./CompilePanel.module.css";

const SEPARATOR_LABELS: { value: CompileOptions["sceneSeparator"]; label: string }[] = [
  { value: "stars", label: "* * *" },
  { value: "hash",  label: "#" },
  { value: "rule",  label: "———" },
  { value: "blank", label: "blank" },
  { value: "custom", label: "custom" },
];

const FORMAT_LABELS: { value: CompileOptions["pageFormat"]; label: string }[] = [
  { value: "normal",    label: "Normal PDF (single scene)" },
  { value: "paperback", label: "Paperback (5.5\" × 8.5\")" },
  { value: "trade",     label: "Trade (6\" × 9\")" },
  { value: "a4",        label: "A4" },
  { value: "letter",    label: "Letter" },
];

export function CompilePanel() {
  const project     = useProjectStore((s) => s.project);
  const projectPath = useProjectStore((s) => s.projectPath);

  const [separator, setSeparator]         = useState<CompileOptions["sceneSeparator"]>("stars");
  const [customSeparator, setCustomSep]   = useState("* * *");
  const [pageFormat, setPageFormat]       = useState<CompileOptions["pageFormat"]>("paperback");
  const [includeToc, setIncludeToc]       = useState(false);

  const isNormalMode = pageFormat === "normal";

  // Derive chapter folders (book modes) or scenes (normal mode) for the sidebar.
  // Recomputing these together keeps the selected-id state meaningful across
  // mode switches — see the reset effect below.
  const chapterFolders = useMemo(
    () =>
      project
        ? project.manuscriptRootIds
            .map((id) => project.nodes[id])
            .filter((n) => n?.kind === "folder")
        : [],
    [project]
  );
  const manuscriptScenes = useMemo(
    () => (project ? collectManuscriptScenes(project) : []),
    [project]
  );

  // Items shown in the sidebar — the set user ticks.
  const items = isNormalMode ? manuscriptScenes : chapterFolders;
  const itemLabel = isNormalMode ? "Scenes" : "Chapters";
  const emptyLabel = isNormalMode
    ? "No scenes found. Add scenes to the Manuscript section."
    : "No chapters found. Add folders to the Manuscript section.";

  const [includedIds, setIncludedIds] = useState<Set<ID>>(
    () => new Set(chapterFolders.map((n) => n.id))
  );

  // Whenever the format toggles between book-mode and normal-mode, the sidebar
  // contents change (chapters ↔ scenes) — so the previously-ticked IDs no
  // longer map to what's on screen. Reset to "all selected" in the new mode.
  useEffect(() => {
    setIncludedIds(new Set(items.map((n) => n.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNormalMode]);
  const [previewUrl, setPreviewUrl]       = useState<string | null>(null);
  const [isCompiling, setIsCompiling]     = useState(false);
  const [exportStatus, setExportStatus]   = useState<"idle" | "saving" | "done">("idle");
  const [lastPdfPath, setLastPdfPath]     = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildOptions = useCallback((): CompileOptions => ({
    includeToc,
    sceneSeparator: separator,
    customSeparator,
    pageFormat,
    includedChapterIds: includedIds,
  }), [includeToc, separator, customSeparator, pageFormat, includedIds]);

  const refreshPreview = useCallback(async () => {
    if (!project || !projectPath) return;
    if (includedIds.size === 0 && items.length > 0) {
      setPreviewUrl(null);
      return;
    }
    setIsCompiling(true);
    try {
      const url = await compileToPdfBlobUrl(buildOptions(), project, projectPath);
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = url;
      setPreviewUrl(url);
    } catch (e) {
      console.error("Preview failed", e);
    } finally {
      setIsCompiling(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, projectPath, buildOptions]);

  // Debounced auto-refresh on option changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { refreshPreview(); }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [refreshPreview]);

  // Revoke blob URL on unmount
  useEffect(() => {
    return () => { if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current); };
  }, []);

  async function handleExport() {
    if (!project || !projectPath) return;
    setExportStatus("saving");
    setLastPdfPath(null);
    try {
      await compileManuscript(buildOptions(), project, projectPath);
      const pdfPath = `${projectPath}/manuscript.pdf`;
      setLastPdfPath(pdfPath);
      setExportStatus("done"); // stays "done" until the next export attempt
    } catch (e) {
      console.error("Export failed", e);
      setExportStatus("idle");
    }
  }

  async function handleReveal() {
    if (!lastPdfPath) return;
    const { revealItemInDir } = await import("@tauri-apps/plugin-opener");
    await revealItemInDir(lastPdfPath);
  }

  function toggleItem(id: ID) {
    setIncludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() { setIncludedIds(new Set(items.map((n) => n.id))); }
  function deselectAll() { setIncludedIds(new Set()); }
  const allSelected = items.length > 0 && includedIds.size === items.length;

  if (!project) return null;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.title}>Compile</span>
        {/* Top-bar actions. Kept up here so the Export button never collides
            with the PDF viewer's floating zoom / page-nav toolbar that lives
            at the bottom of the preview iframe. */}
        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={refreshPreview} disabled={isCompiling}>
            <RefreshCw size={13} />
            Refresh preview
          </button>
          {exportStatus === "done" && lastPdfPath && (
            <button className={styles.revealBtn} onClick={handleReveal}>
              <FolderOpen size={13} />
              Show in Finder
            </button>
          )}
          <button
            className={styles.exportBtn}
            onClick={handleExport}
            disabled={exportStatus === "saving"}
          >
            {exportStatus === "done" ? (
              <><Check size={13} /> Saved!</>
            ) : (
              <><Download size={13} /> Export PDF</>
            )}
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {/* Left: chapter (or scene) list */}
        <div className={styles.sidebar}>
          <div className={styles.sectionLabel}>{itemLabel}</div>
          {items.length === 0 ? (
            <p className={styles.empty}>{emptyLabel}</p>
          ) : (
            <>
              <button className={styles.toggleAll} onClick={allSelected ? deselectAll : selectAll}>
                {allSelected ? "Deselect all" : "Select all"}
              </button>
              <ul className={styles.chapterList}>
                {items.map((node) => (
                  <li key={node.id} className={styles.chapterItem}>
                    <label className={styles.chapterLabel}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={includedIds.has(node.id)}
                        onChange={() => toggleItem(node.id)}
                      />
                      <span className={styles.chapterTitle}>{node.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Right: options + preview */}
        <div className={styles.main}>
          <div className={styles.options}>
            {/* Page format — always shown; determines the rest of the UI */}
            <div className={styles.optionRow}>
              <span className={styles.optionLabel}>Page format</span>
              <select
                className={styles.select}
                value={pageFormat}
                onChange={(e) => setPageFormat(e.target.value as CompileOptions["pageFormat"])}
              >
                {FORMAT_LABELS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Book-mode-only options — hidden in Normal PDF since each scene
                gets its own page and there's no TOC to generate. */}
            {!isNormalMode && (
              <>
                <div className={styles.optionRow}>
                  <span className={styles.optionLabel}>Scene separator</span>
                  <div className={styles.separatorButtons}>
                    {SEPARATOR_LABELS.map(({ value, label }) => (
                      <button
                        key={value}
                        className={`${styles.sepBtn} ${separator === value ? styles.sepBtnActive : ""}`}
                        onClick={() => setSeparator(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {separator === "custom" && (
                    <input
                      className={styles.customInput}
                      value={customSeparator}
                      onChange={(e) => setCustomSep(e.target.value)}
                      placeholder="e.g. — or ✦"
                    />
                  )}
                </div>

                <div className={styles.optionRow}>
                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={includeToc}
                      onChange={(e) => setIncludeToc(e.target.checked)}
                    />
                    <span>Table of contents</span>
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Preview */}
          <div className={styles.previewArea}>
            {isCompiling && (
              <div className={styles.previewOverlay}>
                <RefreshCw size={18} className={styles.spinner} />
                <span>Generating preview…</span>
              </div>
            )}
            {!isCompiling && includedIds.size === 0 && items.length > 0 && (
              <div className={styles.previewEmpty}>
                Select at least one {isNormalMode ? "scene" : "chapter"} to preview.
              </div>
            )}
            {previewUrl && (
              <iframe
                className={styles.iframe}
                src={previewUrl}
                title="PDF Preview"
              />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
