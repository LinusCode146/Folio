"use client";

import { LayoutGrid, AlignJustify } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore } from "@/store/editorStore";
import { Corkboard } from "./Corkboard";
import { Scrivenings } from "./Scrivenings";
import type { ID } from "@/types";
import styles from "./ChapterPanel.module.css";

interface Props {
  chapterId: ID;
}

export function ChapterPanel({ chapterId }: Props) {
  const chapter = useProjectStore((s) => s.project?.nodes[chapterId]);
  const { chapterViewMode, setChapterViewMode } = useEditorStore();

  if (!chapter) return null;

  const childIds = chapter.children ?? [];

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.title}>{chapter.title}</h2>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${chapterViewMode === "cards" ? styles.viewBtnActive : ""}`}
            onClick={() => setChapterViewMode("cards")}
            title="Cards"
          >
            <LayoutGrid size={15} />
            <span>Cards</span>
          </button>
          <button
            className={`${styles.viewBtn} ${chapterViewMode === "flow" ? styles.viewBtnActive : ""}`}
            onClick={() => setChapterViewMode("flow")}
            title="Flow"
          >
            <AlignJustify size={15} />
            <span>Flow</span>
          </button>
        </div>
      </div>

      {childIds.length === 0 ? (
        <div className={styles.empty}>
          <p>No scenes in this chapter yet.</p>
          <p className={styles.emptyHint}>Add scenes from the binder.</p>
        </div>
      ) : chapterViewMode === "cards" ? (
        <Corkboard childIds={childIds} />
      ) : (
        <Scrivenings childIds={childIds} />
      )}
    </div>
  );
}
