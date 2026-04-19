"use client";

import { FileText, Folder, User, MapPin, StickyNote, Globe } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import type { BinderNode, BinderSection } from "@/types";
import styles from "./BinderSearch.module.css";

const sectionLabel: Record<BinderSection, string> = {
  manuscript: "Manuscript",
  characters: "Characters",
  places: "Places",
  notes: "Notes",
  maps: "Maps",
};

const kindIcon = (kind: BinderNode["kind"]) => {
  switch (kind) {
    case "folder":    return <Folder size={13} />;
    case "scene":     return <FileText size={13} />;
    case "character": return <User size={13} />;
    case "place":     return <MapPin size={13} />;
    case "note":      return <StickyNote size={13} />;
    case "map":       return <Globe size={13} />;
  }
};

interface Props {
  nodes: BinderNode[];
  term: string;
  onClearSearch: () => void;
}

export function BinderSearchResults({ nodes, term, onClearSearch }: Props) {
  const { activeNodeId, setActiveNode } = useEditorStore();

  const results = nodes.filter(
    (n) =>
      n.title.toLowerCase().includes(term.toLowerCase()) &&
      term.trim().length > 0
  );

  if (results.length === 0) {
    return <p className={styles.empty}>No results for "{term}"</p>;
  }

  return (
    <div className={styles.list}>
      {results.map((node) => (
        <button
          key={node.id}
          className={`${styles.result} ${activeNodeId === node.id ? styles.active : ""}`}
          onClick={() => {
            if (node.kind === "folder") {
              onClearSearch();
            } else {
              setActiveNode(node.id, node.section);
            }
          }}
          title={node.kind === "folder" ? "Go to folder in binder" : undefined}
        >
          <span className={styles.icon}>{kindIcon(node.kind)}</span>
          <span className={styles.title}>{highlight(node.title, term)}</span>
          <span className={styles.section}>
            {node.kind === "folder" ? "Go to folder" : sectionLabel[node.section]}
          </span>
        </button>
      ))}
    </div>
  );
}

function highlight(text: string, term: string): React.ReactNode {
  if (!term.trim()) return text;
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? <mark key={i} className={styles.mark}>{part}</mark> : part
  );
}
