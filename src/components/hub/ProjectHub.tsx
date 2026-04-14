"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ProjectCard } from "./ProjectCard";
import { listProjects, createProject, deleteProject } from "@/lib/projectService";
import type { ProjectRef } from "@/types";
import styles from "./ProjectHub.module.css";

export function ProjectHub() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRef | null>(null);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setProjects(await listProjects());
    setLoading(false);
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function handleCreate() {
    if (!newName.trim()) return;
    const project = await createProject(newName.trim());
    setShowCreateModal(false);
    setNewName("");
    router.push(`/project?id=${project.id}`);
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteProject(deleteTarget.path, deleteTarget.id);
    setDeleteTarget(null);
    loadProjects();
  }

  function handleOpen(ref: ProjectRef) {
    router.push(`/project?id=${ref.id}`);
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.logo}>Folio</h1>
        <ThemeToggle />
      </header>

      <main className={styles.main}>
        <div className={styles.topBar}>
          <h2 className={styles.heading}>Your Projects</h2>
          <button className={styles.newBtn} onClick={() => setShowCreateModal(true)}>
            <Plus size={14} /> New Project
          </button>
        </div>

        {loading ? (
          <p className={styles.empty}>Loading…</p>
        ) : projects.length === 0 ? (
          <p className={styles.empty}>No projects yet. Create your first one.</p>
        ) : (
          <div className={styles.grid}>
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onOpen={handleOpen}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <Modal title="New Project" onClose={() => setShowCreateModal(false)}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
            className={styles.form}
          >
            <input
              className={styles.input}
              autoFocus
              placeholder="Project name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button className={styles.createBtn} type="submit" disabled={!newName.trim()}>
              Create
            </button>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete Project" onClose={() => setDeleteTarget(null)}>
          <p className={styles.confirmText}>
            Delete <strong>"{deleteTarget.name}"</strong>? This cannot be undone.
          </p>
          <div className={styles.confirmActions}>
            <button className={styles.cancelBtn} onClick={() => setDeleteTarget(null)}>
              Cancel
            </button>
            <button className={styles.deleteBtn} onClick={handleConfirmDelete}>
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
