"use client";

import { BookOpen, Trash2 } from "lucide-react";
import type { ProjectRef } from "@/types";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  project: ProjectRef;
  onOpen: (ref: ProjectRef) => void;
  onDelete: (ref: ProjectRef) => void;
}

export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const date = new Date(project.updatedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={styles.card} onClick={() => onOpen(project)}>
      <div className={styles.icon}>
        <BookOpen size={28} />
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{project.name}</span>
        <span className={styles.date}>Last edited {date}</span>
      </div>
      <button
        className={styles.delete}
        onClick={(e) => { e.stopPropagation(); onDelete(project); }}
        title="Delete project"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
