"use client";

import { useState, useEffect } from "react";
import { useProjectStore } from "@/store/projectStore";
import type { BookMeta } from "@/types";
import styles from "./BookInfoEditor.module.css";

export function BookInfoEditor() {
  const project = useProjectStore((s) => s.project);
  const updateBookMeta = useProjectStore((s) => s.updateBookMeta);

  const [local, setLocal] = useState<BookMeta>({
    author: "", subtitle: "", dedication: "", copyright: "", year: "", isbn: "", targetWordCount: undefined,
  });
  const [targetInput, setTargetInput] = useState("");

  useEffect(() => {
    if (project?.bookMeta) {
      setLocal(project.bookMeta);
      setTargetInput(project.bookMeta.targetWordCount ? String(project.bookMeta.targetWordCount) : "");
    }
  }, [project?.bookMeta]);

  if (!project) return null;

  function handleBlur() {
    updateBookMeta(local);
  }

  function field(
    label: string,
    key: keyof BookMeta,
    multiline = false,
    placeholder = ""
  ) {
    return (
      <div className={styles.field}>
        <label className={styles.label}>{label}</label>
        {multiline ? (
          <textarea
            className={styles.textarea}
            value={local[key]}
            placeholder={placeholder}
            onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
            onBlur={handleBlur}
            rows={4}
          />
        ) : (
          <input
            className={styles.input}
            type="text"
            value={local[key]}
            placeholder={placeholder}
            onChange={(e) => setLocal((p) => ({ ...p, [key]: e.target.value }))}
            onBlur={handleBlur}
          />
        )}
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <div className={styles.scroll}>
        <div className={styles.page}>
          <h1 className={styles.heading}>Book Info</h1>
          <p className={styles.subheading}>
            This information appears on the title page when you compile your manuscript.
          </p>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Title & Author</h2>
            <div className={styles.readonlyField}>
              <label className={styles.label}>Title</label>
              <div className={styles.readonlyValue}>{project.name}</div>
              <span className={styles.readonlyHint}>Set from project name</span>
            </div>
            {field("Author", "author", false, "Your name")}
            {field("Subtitle", "subtitle", false, "Optional subtitle")}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Publication Details</h2>
            {field("Year", "year", false, new Date().getFullYear().toString())}
            {field("ISBN", "isbn", false, "978-0-000-00000-0")}
            {field("Copyright", "copyright", true, `© ${new Date().getFullYear()} Your Name. All rights reserved.`)}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Front Matter</h2>
            {field("Dedication", "dedication", true, "For…")}
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Writing Goals</h2>
            <div className={styles.field}>
              <label className={styles.label}>Target Word Count</label>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="1000"
                placeholder="e.g. 90000"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onBlur={() => {
                  const n = parseInt(targetInput, 10);
                  const updated = { ...local, targetWordCount: !isNaN(n) && n > 0 ? n : undefined };
                  setLocal(updated);
                  updateBookMeta(updated);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
              />
              <span className={styles.fieldHint}>
                Typical novels: 70,000–100,000 words. Progress shown in Statistics.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
