"use client";

import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BinderNodeRow } from "./BinderNode";
import { useProjectStore } from "@/store/projectStore";
import type { BinderNode, BinderNodeKind, BinderSection, ID } from "@/types";
import styles from "./BinderNodeTree.module.css";

interface TreeProps {
  ids: ID[];
  section: BinderSection;
  itemKind: BinderNodeKind;
  depth?: number;
  parentId?: ID;
}

function NodeWithChildren({
  nodeId,
  depth,
  section,
  itemKind,
  parentId,
}: {
  nodeId: ID;
  depth: number;
  section: BinderSection;
  itemKind: BinderNodeKind;
  parentId?: ID;
}) {
  const node = useProjectStore((s) => s.project?.nodes[nodeId]) as BinderNode | undefined;
  const { addNode } = useProjectStore();
  const [expanded, setExpanded] = useState(true);

  if (!node) return null;

  const isFolder = node.kind === "folder";

  return (
    <>
      <BinderNodeRow
        node={node}
        depth={depth}
        isExpanded={expanded}
        onToggle={() => setExpanded((e) => !e)}
        onAddItem={isFolder ? () => addNode(itemKind, section, node.id) : undefined}
        onAddFolder={isFolder ? () => addNode("folder", section, node.id) : undefined}
      />
      {isFolder && expanded && node.children && node.children.length > 0 && (
        <BinderNodeTree
          ids={node.children}
          section={section}
          itemKind={itemKind}
          depth={depth + 1}
          parentId={node.id}
        />
      )}
    </>
  );
}

export function BinderNodeTree({ ids, section, itemKind, depth = 0, parentId }: TreeProps) {
  return (
    <SortableContext items={ids} strategy={verticalListSortingStrategy}>
      <div className={styles.tree}>
        {ids.map((id) => (
          <NodeWithChildren
            key={id}
            nodeId={id}
            depth={depth}
            section={section}
            itemKind={itemKind}
            parentId={parentId}
          />
        ))}
      </div>
    </SortableContext>
  );
}
