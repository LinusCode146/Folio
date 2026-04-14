"use client";

import { useEffect, useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import { loadProject } from "@/lib/projectService";
import { listProjects } from "@/lib/projectService";

export function useProject(projectId: string) {
  const { setProject } = useProjectStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const refs = await listProjects();
        const ref = refs.find((r) => r.id === projectId);
        if (!ref) {
          setError("Project not found");
          setLoading(false);
          return;
        }
        const project = await loadProject(ref.path);
        if (!project) {
          setError("Could not load project file");
          setLoading(false);
          return;
        }
        setProject(project, ref.path);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return { loading, error };
}
