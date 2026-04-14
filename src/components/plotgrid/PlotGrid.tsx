"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { PlotGridCell } from "./PlotGridCell";
import styles from "./PlotGrid.module.css";

export function PlotGrid() {
  const project = useProjectStore((s) => s.project);
  const { addPlotThread, deletePlotThread } = useProjectStore();
  const [newThread, setNewThread] = useState("");

  if (!project) return null;

  const { threads } = project.plotGrid;

  // Get all scenes from manuscript (flat, depth-first)
  function collectScenes(ids: string[]): { id: string; title: string }[] {
    const result: { id: string; title: string }[] = [];
    for (const id of ids) {
      const node = project!.nodes[id];
      if (!node) continue;
      if (node.kind === "scene") result.push({ id: node.id, title: node.title });
      if (node.kind === "folder" && node.children) {
        result.push(...collectScenes(node.children));
      }
    }
    return result;
  }

  const scenes = collectScenes(project.manuscriptRootIds);

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.title}>Plot Grid</h2>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.cornerCell}>Scene</th>
              {threads.map((thread) => (
                <th key={thread.id} className={styles.threadHeader}>
                  <div className={styles.threadHeaderInner}>
                    <span
                      className={styles.threadDot}
                      style={{ background: thread.color }}
                    />
                    <span className={styles.threadLabel}>{thread.label}</span>
                    <button
                      className={styles.deleteThread}
                      onClick={() => deletePlotThread(thread.id)}
                      title="Delete thread"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </th>
              ))}
              <th className={styles.addThreadCell}>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newThread.trim()) {
                      addPlotThread(newThread.trim());
                      setNewThread("");
                    }
                  }}
                >
                  <input
                    className={styles.newThreadInput}
                    placeholder="+ Thread"
                    value={newThread}
                    onChange={(e) => setNewThread(e.target.value)}
                  />
                </form>
              </th>
            </tr>
          </thead>
          <tbody>
            {scenes.length === 0 ? (
              <tr>
                <td colSpan={threads.length + 2} className={styles.empty}>
                  Add scenes to the Manuscript to populate the grid.
                </td>
              </tr>
            ) : (
              scenes.map((scene) => (
                <tr key={scene.id}>
                  <td className={styles.sceneCell}>{scene.title}</td>
                  {threads.map((thread) => (
                    <PlotGridCell
                      key={thread.id}
                      sceneId={scene.id}
                      threadId={thread.id}
                      threadColor={thread.color}
                    />
                  ))}
                  <td />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
