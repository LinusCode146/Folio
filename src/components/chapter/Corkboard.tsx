"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore } from "@/store/editorStore";
import { loadScene } from "@/lib/documentService";
import type { ID, SceneDocument } from "@/types";
import styles from "./Corkboard.module.css";

interface Props {
  childIds: ID[];
}

// Recursively extract plain text from a Tiptap JSON node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractPreview(node: any, max = 200): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  let text = "";
  for (const child of node.content) {
    text += extractPreview(child, max);
    if (text.length >= max) break;
  }
  return text.slice(0, max);
}

export function Corkboard({ childIds }: Props) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const nodes = useProjectStore((s) => s.project?.nodes ?? {});
  const { setActiveNode } = useEditorStore();

  const [docs, setDocs] = useState<Record<ID, SceneDocument>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectPath || childIds.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all(
      childIds.map((id) => loadScene(projectPath, "scenes", id).then((doc) => ({ id, doc })))
    )
      .then((results) => {
        const map: Record<ID, SceneDocument> = {};
        for (const { id, doc } of results) map[id] = doc;
        setDocs(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectPath, childIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className={styles.scroll}>
        <div className={styles.grid}>
          {childIds.map((id) => (
            <div key={id} className={`${styles.card} ${styles.cardSkeleton}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.scroll}>
      <div className={styles.grid}>
        {childIds.map((id) => {
          const node = nodes[id];
          const doc = docs[id];
          if (!node) return null;
          const synopsis = doc?.synopsis?.trim() ?? "";
          const prose = doc ? extractPreview(doc.content).trim() : "";
          return (
            <button
              key={id}
              className={styles.card}
              onClick={() => setActiveNode(id, "manuscript")}
              title={node.title}
            >
              <div className={styles.cardTitle}>{node.title}</div>
              {synopsis ? (
                <p className={styles.cardSynopsis}>{synopsis}</p>
              ) : prose ? (
                <p className={styles.cardPreview}>{prose}</p>
              ) : (
                <p className={`${styles.cardPreview} ${styles.cardEmpty}`}>No content yet</p>
              )}
              <div className={styles.cardWordCount}>
                {doc?.wordCount ?? 0} words
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
