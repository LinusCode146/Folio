"use client";

import { useState, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { FileText, Folder, User, MapPin, StickyNote, Search, X, BookOpen, Globe } from "lucide-react";
import { BinderSection } from "./BinderSection";
import { BinderNodeTree } from "./BinderNodeTree";
import { BinderDragContext } from "./BinderDragContext";
import { BinderSearchResults } from "./BinderSearch";
import { useProjectStore } from "@/store/projectStore";
import { useEditorStore } from "@/store/editorStore";
import { BOOK_INFO_ID } from "@/store/editorStore";
import type { BinderSection as Section, BinderNodeKind, ID, Project } from "@/types";
import styles from "./Binder.module.css";

// ── helpers ────────────────────────────────────────────────────────

function findParentId(project: Project, nodeId: ID): ID | null {
  for (const node of Object.values(project.nodes)) {
    if (node.children?.includes(nodeId)) return node.id;
  }
  return null;
}

function getSiblings(project: Project, parentId: ID | null, section: Section): ID[] {
  if (parentId) return project.nodes[parentId]?.children ?? [];
  switch (section) {
    case "manuscript": return project.manuscriptRootIds;
    case "characters": return project.characterIds;
    case "places":     return project.placeIds;
    case "notes":      return project.noteIds;
    case "maps":       return project.mapIds ?? [];
  }
}

function isDescendant(project: Project, ancestorId: ID, targetId: ID): boolean {
  const node = project.nodes[ancestorId];
  if (!node?.children) return false;
  return node.children.some(
    (cid) => cid === targetId || isDescendant(project, cid, targetId)
  );
}

const overlayIcon: Record<BinderNodeKind, React.ReactNode> = {
  folder:    <Folder size={13} />,
  scene:     <FileText size={13} />,
  character: <User size={13} />,
  place:     <MapPin size={13} />,
  note:      <StickyNote size={13} />,
  map:       <Globe size={13} />,
};

// ── per-section DnD wrapper ────────────────────────────────────────

interface SectionDndProps {
  section: Section;
  rootIds: ID[];
  title: string;
  itemKind: BinderNodeKind;
  addLabel: string;
  onCompile?: () => void;
}

function SectionDnd({ section, rootIds, title, itemKind, addLabel, onCompile }: SectionDndProps) {
  const project = useProjectStore((s) => s.project);
  const { addNode, moveNode } = useProjectStore();

  const [overFolderId, setOverFolderId] = useState<ID | null>(null);
  const [activeId, setActiveId] = useState<ID | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as ID);
  }

  function handleDragOver(event: DragOverEvent) {
    if (!project) return;
    const overId = event.over?.id as ID | undefined;
    const overNode = overId ? project.nodes[overId] : undefined;
    setOverFolderId(overNode?.kind === "folder" ? overId! : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setOverFolderId(null);
    setActiveId(null);

    if (!over || !project || active.id === over.id) return;

    const dragId  = active.id as ID;
    const overId  = over.id as ID;
    const dragNode = project.nodes[dragId];
    const overNode = project.nodes[overId];
    if (!dragNode || !overNode) return;

    // Guard: never drop a folder into its own descendant
    if (dragNode.kind === "folder" && isDescendant(project, dragId, overId)) return;

    if (overNode.kind === "folder") {
      // Drop ON a folder → append as last child
      const newIndex = overNode.children?.length ?? 0;
      moveNode(dragId, overId, newIndex);
    } else {
      // Drop ON a sibling → reorder within shared parent
      const overParentId = findParentId(project, overId);
      const siblings = getSiblings(project, overParentId, section);
      const newIndex = siblings.indexOf(overId);
      if (newIndex === -1) return;
      moveNode(dragId, overParentId, newIndex);
    }
  }

  const activeNode = activeId ? project?.nodes[activeId] : null;

  return (
    <BinderDragContext.Provider value={{ overFolderId, activeId }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <BinderSection
          title={title}
          onAdd={() => addNode(itemKind, section)}
          onAddFolder={() => addNode("folder", section)}
          onCompile={onCompile}
          addLabel={addLabel}
        >
          <BinderNodeTree
            ids={rootIds}
            section={section}
            itemKind={itemKind}
          />
        </BinderSection>

        <DragOverlay>
          {activeNode && (
            <div className={styles.dragOverlay}>
              <span className={styles.overlayIcon}>{overlayIcon[activeNode.kind]}</span>
              <span>{activeNode.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </BinderDragContext.Provider>
  );
}

// ── root Binder ────────────────────────────────────────────────────

export function Binder() {
  const project = useProjectStore((s) => s.project);
  const { openCompile, openBookInfo, activeNodeId } = useEditorStore();
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  if (!project) return null;

  const allNodes = Object.values(project.nodes);
  const isSearching = searchTerm.trim().length > 0;

  return (
    <aside className={styles.binder}>
      {/* Search bar */}
      <div className={styles.searchBar}>
        <Search size={13} className={styles.searchIcon} />
        <input
          ref={searchRef}
          className={styles.searchInput}
          placeholder="Search binder…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {isSearching && (
          <button className={styles.searchClear} onClick={() => { setSearchTerm(""); searchRef.current?.focus(); }}>
            <X size={12} />
          </button>
        )}
      </div>

      {isSearching ? (
        <BinderSearchResults
          nodes={allNodes}
          term={searchTerm}
          onClearSearch={() => { setSearchTerm(""); searchRef.current?.focus(); }}
        />
      ) : (
        <>
          <button
            className={`${styles.staticLink} ${activeNodeId === BOOK_INFO_ID ? styles.staticLinkActive : ""}`}
            onClick={openBookInfo}
          >
            <BookOpen size={13} className={styles.staticLinkIcon} />
            Book Info
          </button>
          <SectionDnd section="manuscript" rootIds={project.manuscriptRootIds} title="Manuscript" itemKind="scene"     addLabel="Add Scene"     onCompile={openCompile} />
          <SectionDnd section="characters" rootIds={project.characterIds}       title="Characters" itemKind="character" addLabel="Add Character" />
          <SectionDnd section="places"     rootIds={project.placeIds}           title="Places"     itemKind="place"     addLabel="Add Place"     />
          <SectionDnd section="notes"      rootIds={project.noteIds}            title="Notes"      itemKind="note"      addLabel="Add Note"      />
          <SectionDnd section="maps"       rootIds={project.mapIds ?? []}       title="Maps"       itemKind="map"       addLabel="Add Map"       />
        </>
      )}
    </aside>
  );
}
