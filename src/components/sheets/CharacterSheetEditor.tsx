"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, X } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { loadCharacter, saveCharacter } from "@/lib/documentService";
import type { CharacterSheet, ID } from "@/types";
import styles from "./Sheet.module.css";

interface Props { nodeId: ID; title: string }

export function CharacterSheetEditor({ nodeId, title }: Props) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  const [newTrait, setNewTrait] = useState("");

  useEffect(() => {
    if (!projectPath) return;
    loadCharacter(projectPath, nodeId).then(setSheet);
  }, [nodeId, projectPath]);

  const save = useCallback(async (updated: CharacterSheet) => {
    if (!projectPath) return;
    await saveCharacter(projectPath, updated);
  }, [projectPath]);

  const update = useCallback(
    (patch: Partial<CharacterSheet>) => {
      setSheet((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        save(next);
        return next;
      });
    },
    [save]
  );

  if (!sheet) return <div className={styles.loading}>Loading…</div>;

  return (
    <div className={styles.root}>
      <div className={styles.scroll}>
        <h1 className={styles.pageTitle}>{title}</h1>

        <div className={styles.grid}>
          <Field label="Name" value={sheet.name} onChange={(v) => update({ name: v })} />
          <Field label="Age" value={sheet.age} onChange={(v) => update({ age: v })} />
          <Field label="Role" value={sheet.role} onChange={(v) => update({ role: v })} placeholder="Protagonist, antagonist…" />
        </div>

        <Textarea label="Backstory" value={sheet.backstory} onChange={(v) => update({ backstory: v })} rows={5} />
        <Textarea label="Notes" value={sheet.notes} onChange={(v) => update({ notes: v })} rows={3} />

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Traits</label>
          <div className={styles.traits}>
            {sheet.traits.map((t, i) => (
              <span key={i} className={styles.trait}>
                {t}
                <button onClick={() => update({ traits: sheet.traits.filter((_, j) => j !== i) })}>
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              className={styles.traitInput}
              placeholder="Add trait…"
              value={newTrait}
              onChange={(e) => setNewTrait(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTrait.trim()) {
                  update({ traits: [...sheet.traits, newTrait.trim()] });
                  setNewTrait("");
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>{label}</label>
      <input
        className={styles.input}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Textarea({ label, value, onChange, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>{label}</label>
      <textarea
        className={styles.textarea}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
