"use client";

import { useState } from "react";
import { ChevronRight, Plus, FolderPlus, Download } from "lucide-react";
import styles from "./BinderSection.module.css";

interface BinderSectionProps {
  title: string;
  onAdd?: () => void;
  onAddFolder?: () => void;
  onCompile?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}

export function BinderSection({ title, onAdd, onAddFolder, onCompile, addLabel, children }: BinderSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <button className={styles.toggle} onClick={() => setCollapsed((c) => !c)}>
          <ChevronRight
            size={12}
            className={`${styles.chevron} ${collapsed ? "" : styles.open}`}
          />
          <span className={styles.title}>{title}</span>
        </button>
        <div className={styles.actions}>
          {onCompile && (
            <button className={styles.action} onClick={onCompile} title="Compile manuscript">
              <Download size={12} />
            </button>
          )}
          {onAddFolder && (
            <button className={styles.action} onClick={onAddFolder} title="New Folder">
              <FolderPlus size={12} />
            </button>
          )}
          {onAdd && (
            <button className={styles.action} onClick={onAdd} title={addLabel ?? "Add"}>
              <Plus size={12} />
            </button>
          )}
        </div>
      </div>
      {!collapsed && <div className={styles.children}>{children}</div>}
    </div>
  );
}
