"use client";

import { useState, useRef, useCallback } from "react";
import { FileText, Folder, FolderOpen, User, MapPin, StickyNote, ChevronRight, Globe } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ContextMenu, type ContextMenuItem } from "@/components/ui/ContextMenu";
import { useEditorStore } from "@/store/editorStore";
import { useProjectStore } from "@/store/projectStore";
import { useBinderDrag } from "./BinderDragContext";
import type { BinderNode as BinderNodeType } from "@/types";
import styles from "./BinderNode.module.css";

interface BinderNodeProps {
  node: BinderNodeType;
  depth?: number;
  isExpanded?: boolean;
  onToggle?: () => void;
  onAddItem?: () => void;
  onAddFolder?: () => void;
}

const kindIcon = (kind: BinderNodeType["kind"], expanded?: boolean) => {
  switch (kind) {
    case "folder":    return expanded ? <FolderOpen size={14} /> : <Folder size={14} />;
    case "scene":     return <FileText size={14} />;
    case "character": return <User size={14} />;
    case "place":     return <MapPin size={14} />;
    case "note":      return <StickyNote size={14} />;
    case "map":       return <Globe size={14} />;
  }
};

const itemLabel: Record<BinderNodeType["kind"], string> = {
  folder:    "Folder",
  scene:     "Scene",
  character: "Character",
  place:     "Place",
  note:      "Note",
  map:       "Map",
};

export function BinderNodeRow({
  node,
  depth = 0,
  isExpanded,
  onToggle,
  onAddItem,
  onAddFolder,
}: BinderNodeProps) {
  const { activeNodeId, setActiveNode } = useEditorStore();
  const { renameNode, deleteNode, setNodeStatus } = useProjectStore();
  const { overFolderId, activeId } = useBinderDrag();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [ctx, setCtx] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  const isActive     = activeNodeId === node.id;
  const isDropTarget = node.kind === "folder" && overFolderId === node.id && activeId !== node.id;

  const handleClick = useCallback(() => {
    if (node.kind === "folder") {
      onToggle?.();
      setActiveNode(node.id, node.section);
    } else {
      setActiveNode(node.id, node.section);
    }
  }, [node, onToggle, setActiveNode]);

  const handleRename = useCallback(() => {
    setEditing(true);
    setEditTitle(node.title);
    setTimeout(() => inputRef.current?.select(), 0);
  }, [node.title]);

  const commitRename = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== node.title) renameNode(node.id, trimmed);
    setEditing(false);
  }, [editTitle, node.id, node.title, renameNode]);

  const statusItems: ContextMenuItem[] = node.kind === "scene" || node.kind === "note"
    ? [
        { label: "Outline", dot: "var(--status-outline)", onClick: () => setNodeStatus(node.id, "outline") },
        { label: "Draft",   dot: "var(--status-draft)",   onClick: () => setNodeStatus(node.id, "draft") },
        { label: "Revised", dot: "var(--status-revised)", onClick: () => setNodeStatus(node.id, "revised") },
        { label: "Final",   dot: "var(--status-final)",   onClick: () => setNodeStatus(node.id, "final") },
        { label: "Clear status", onClick: () => setNodeStatus(node.id, undefined) },
      ]
    : [];

  const menuItems: ContextMenuItem[] = [
    ...(node.kind === "folder" && onAddItem
      ? [{ label: "Add Item", onClick: onAddItem }]
      : []),
    ...(node.kind === "folder" && onAddFolder
      ? [{ label: "Add Folder", onClick: onAddFolder }]
      : []),
    { label: "Rename", onClick: handleRename },
    ...statusItems,
    { label: "Delete", onClick: () => deleteNode(node.id), danger: true },
  ];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    paddingLeft: `${(depth + 1) * 16 + 8}px`,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={[
          styles.row,
          isActive     ? styles.active     : "",
          isDragging   ? styles.dragging   : "",
          isDropTarget ? styles.dropTarget : "",
        ].join(" ")}
        onClick={handleClick}
        onDoubleClick={handleRename}
        onContextMenu={(e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }); }}
      >
        {node.kind === "folder" && (
          <ChevronRight
            size={12}
            className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ""}`}
          />
        )}
        <span className={styles.icon}>{kindIcon(node.kind, isExpanded)}</span>
        {node.status && (
          <span className={`${styles.statusDot} ${styles[`status_${node.status}`]}`} />
        )}
        {editing ? (
          <input
            ref={inputRef}
            className={styles.input}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className={styles.title}>{node.title}</span>
        )}
      </div>
      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} items={menuItems} onClose={() => setCtx(null)} />
      )}
    </>
  );
}
