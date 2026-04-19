"use client";

import { useState, useEffect, useRef } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore } from "@/store/editorStore";
import { loadScene } from "@/lib/documentService";
import type { ID } from "@/types";
import styles from "./SearchPanel.module.css";

// Recursively collect all text from a Tiptap JSON node (no char limit)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  return node.content.map(extractText).join("");
}

// Collect all scene and note IDs from the node map
function collectAllDocIds(nodes: Record<string, import("@/types").BinderNode>): { id: ID; folder: "scenes" | "notes"; title: string }[] {
  return Object.values(nodes)
    .filter((n) => n.kind === "scene" || n.kind === "note")
    .map((n) => ({ id: n.id, folder: n.kind === "scene" ? "scenes" : "notes", title: n.title }));
}

interface Match {
  nodeId: ID;
  folder: "scenes" | "notes";
  title: string;
  context: string;
  matchStart: number; // within context
  matchEnd: number;
}

function findMatches(text: string, query: string, nodeId: ID, folder: "scenes" | "notes", title: string): Match[] {
  if (!query) return [];
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const results: Match[] = [];
  let pos = 0;
  while (pos < lower.length) {
    const idx = lower.indexOf(q, pos);
    if (idx === -1) break;
    const start = Math.max(0, idx - 60);
    const end = Math.min(text.length, idx + q.length + 60);
    const context = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
    const offset = start > 0 ? 1 : 0; // account for "…"
    results.push({ nodeId, folder, title, context, matchStart: idx - start + offset, matchEnd: idx - start + offset + q.length });
    pos = idx + q.length;
  }
  return results;
}

export function SearchPanel() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const nodes = useProjectStore((s) => s.project?.nodes ?? {});
  const { setActiveNode } = useEditorStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q || !projectPath) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const docs = collectAllDocIds(nodes);
      const allMatches: Match[] = [];
      await Promise.all(
        docs.map(async ({ id, folder, title }) => {
          try {
            const doc = await loadScene(projectPath, folder, id);
            const text = extractText(doc.content);
            allMatches.push(...findMatches(text, q, id, folder, title));
          } catch {
            // skip scenes that fail to load
          }
        })
      );
      setResults(allMatches);
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, projectPath]);

  // Group results by scene
  const grouped = results.reduce<Record<ID, Match[]>>((acc, m) => {
    if (!acc[m.nodeId]) acc[m.nodeId] = [];
    acc[m.nodeId].push(m);
    return acc;
  }, {});

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Search</h2>
        <input
          className={styles.input}
          type="search"
          placeholder="Search all scenes and notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query.trim() && !searching && (
          <p className={styles.hint}>
            {results.length === 0 ? "No results" : `${results.length} match${results.length !== 1 ? "es" : ""} in ${Object.keys(grouped).length} scene${Object.keys(grouped).length !== 1 ? "s" : ""}`}
          </p>
        )}
        {searching && <p className={styles.hint}>Searching…</p>}
      </div>

      <div className={styles.results}>
        {Object.entries(grouped).map(([nodeId, matches]) => (
          <div key={nodeId} className={styles.group}>
            <div className={styles.groupTitle}>{matches[0].title}</div>
            {matches.map((m, i) => (
              <button
                key={i}
                className={styles.snippet}
                onClick={() => setActiveNode(nodeId, matches[0].folder === "notes" ? "notes" : "manuscript")}
              >
                <span>{m.context.slice(0, m.matchStart)}</span>
                <mark className={styles.mark}>{m.context.slice(m.matchStart, m.matchEnd)}</mark>
                <span>{m.context.slice(m.matchEnd)}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
