"use client";

import { useProjectStore } from "@/store/projectStore";
import styles from "./StatsPanel.module.css";

function collectSceneIds(
  nodes: Record<string, import("@/types").BinderNode>,
  ids: string[]
): string[] {
  const result: string[] = [];
  for (const id of ids) {
    const node = nodes[id];
    if (!node) continue;
    if (node.kind === "scene") result.push(id);
    if (node.kind === "folder" && node.children) {
      result.push(...collectSceneIds(nodes, node.children));
    }
  }
  return result;
}

export function StatsPanel() {
  const project = useProjectStore((s) => s.project);
  if (!project) return null;

  const { nodes, manuscriptRootIds, wordCounts = {}, bookMeta } = project;
  const target = bookMeta?.targetWordCount;

  // Total across all manuscript scenes
  const allSceneIds = collectSceneIds(nodes, manuscriptRootIds);
  const totalWords = allSceneIds.reduce((sum, id) => sum + (wordCounts[id] ?? 0), 0);
  const pct = target ? Math.min(100, Math.round((totalWords / target) * 100)) : null;

  // Per chapter breakdown (top-level folders + loose scenes)
  const chapters = manuscriptRootIds.map((id) => {
    const node = nodes[id];
    if (!node) return null;
    if (node.kind === "folder") {
      const sceneIds = collectSceneIds(nodes, node.children ?? []);
      const words = sceneIds.reduce((sum, sid) => sum + (wordCounts[sid] ?? 0), 0);
      return { id, title: node.title, words, sceneCount: sceneIds.length };
    }
    // Loose scene at root level
    return { id, title: node.title, words: wordCounts[id] ?? 0, sceneCount: 1 };
  }).filter(Boolean) as { id: string; title: string; words: number; sceneCount: number }[];

  const maxWords = Math.max(...chapters.map((c) => c.words), 1);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Manuscript Statistics</h2>
        <p className={styles.hint}>Word counts reflect the last saved state of each scene.</p>
      </div>

      <div className={styles.total}>
        <div className={styles.totalLine}>
          <span className={styles.totalNumber}>{totalWords.toLocaleString()}</span>
          <span className={styles.totalLabel}>
            {target ? `of ${target.toLocaleString()} words` : "total words"}
          </span>
          {pct !== null && (
            <span className={styles.totalPct}>{pct}%</span>
          )}
        </div>
        {pct !== null && (
          <div className={styles.targetTrack}>
            <div className={styles.targetFill} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      <div className={styles.chapters}>
        <div className={styles.sectionLabel}>By Chapter</div>
        {chapters.length === 0 && (
          <p className={styles.empty}>No chapters yet.</p>
        )}
        {chapters.map((ch) => (
          <div key={ch.id} className={styles.chapterRow}>
            <div className={styles.chapterMeta}>
              <span className={styles.chapterTitle}>{ch.title}</span>
              <span className={styles.chapterCount}>
                {ch.words.toLocaleString()} words · {ch.sceneCount} scene{ch.sceneCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{ width: `${(ch.words / maxWords) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
