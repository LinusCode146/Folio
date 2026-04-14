"use client";

import { useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { useProjectStore } from "@/store/projectStore";
import { SceneEditor } from "@/components/editor/SceneEditor";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import type { ID } from "@/types";
import styles from "./Scrivenings.module.css";

interface Props {
  childIds: ID[];
}

export function Scrivenings({ childIds }: Props) {
  const nodes = useProjectStore((s) => s.project?.nodes ?? {});
  const [focusedEditor, setFocusedEditor] = useState<Editor | null>(null);

  const handleFocus = useCallback((editor: Editor) => {
    setFocusedEditor(editor);
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        {focusedEditor
          ? <EditorToolbar editor={focusedEditor} />
          : <div className={styles.toolbarPlaceholder} />}
      </div>
      <div className={styles.scroll}>
        <div className={styles.page}>
          {childIds.map((id, index) => {
            const node = nodes[id];
            if (!node) return null;
            return (
              <div key={id} className={styles.sceneBlock}>
                <div className={styles.divider}>
                  <span className={styles.dividerLabel}>{node.title}</span>
                </div>
                <SceneEditor
                  key={id}
                  nodeId={id}
                  folder="scenes"
                  title={node.title}
                  inline
                  onFocusEditor={handleFocus}
                />
                {index < childIds.length - 1 && (
                  <div className={styles.sceneSeparator} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
