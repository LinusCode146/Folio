"use client";

import { useEffect, useState, useCallback } from "react";
import { useProjectStore } from "@/store/projectStore";
import { loadPlace, savePlace } from "@/lib/documentService";
import type { PlaceSheet, ID } from "@/types";
import styles from "./Sheet.module.css";

interface Props { nodeId: ID; title: string }

export function PlaceSheetEditor({ nodeId, title }: Props) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const [sheet, setSheet] = useState<PlaceSheet | null>(null);

  useEffect(() => {
    if (!projectPath) return;
    loadPlace(projectPath, nodeId).then(setSheet);
  }, [nodeId, projectPath]);

  const save = useCallback(async (updated: PlaceSheet) => {
    if (!projectPath) return;
    await savePlace(projectPath, updated);
  }, [projectPath]);

  const update = useCallback(
    (patch: Partial<PlaceSheet>) => {
      setSheet((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        save(next);
        return next;
      });
    },
    [save]
  );

  if (!sheet) return <div className={styles.loading}>Loading…</div>;

  return (
    <div className={styles.root}>
      <div className={styles.scroll}>
        <h1 className={styles.pageTitle}>{title}</h1>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={sheet.name}
            onChange={(e) => update({ name: e.target.value })}
            onBlur={(e) => update({ name: e.target.value })}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            rows={5}
            value={sheet.description}
            onChange={(e) => update({ description: e.target.value })}
            onBlur={(e) => update({ description: e.target.value })}
          />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Notes</label>
          <textarea
            className={styles.textarea}
            rows={3}
            value={sheet.notes}
            onChange={(e) => update({ notes: e.target.value })}
            onBlur={(e) => update({ notes: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
