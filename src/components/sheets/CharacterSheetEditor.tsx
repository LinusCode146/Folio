"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronRight, X } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { loadCharacter, saveCharacter } from "@/lib/documentService";
import type { CharacterSheet, ID } from "@/types";
import styles from "./Sheet.module.css";

interface Props { nodeId: ID; title: string }

export function CharacterSheetEditor({ nodeId, title }: Props) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);

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
      <div className={styles.scrollWide}>
        <h1 className={styles.pageTitle}>{title}</h1>

        <div className={styles.sheetWrap}>
          {/* ── Identity ──────────────────────────── */}
          <Section title="Identity" hint="Who they are" defaultOpen>
            <div className={styles.sectionGrid2}>
              <Field label="Name" value={sheet.name} onChange={(v) => update({ name: v })} />
              <Field label="Aliases & Titles" value={sheet.aliases ?? ""} onChange={(v) => update({ aliases: v })} placeholder="Nicknames, AKAs, honorifics…" />
              <Field label="Pronouns" value={sheet.pronouns ?? ""} onChange={(v) => update({ pronouns: v })} placeholder="she/her, he/him, they/them…" />
              <Field label="Age" value={sheet.age} onChange={(v) => update({ age: v })} />
              <Field label="Occupation" value={sheet.occupation ?? ""} onChange={(v) => update({ occupation: v })} placeholder="Trade, profession, calling…" />
              <Field label="Narrative Role" value={sheet.role} onChange={(v) => update({ role: v })} placeholder="Protagonist, antagonist, mentor, foil…" />
            </div>
          </Section>

          {/* ── Appearance ────────────────────────── */}
          <Section title="Appearance" hint="What they look like" defaultOpen>
            <div className={styles.sectionGrid2}>
              <Field label="Height & Build" value={sheet.heightBuild ?? ""} onChange={(v) => update({ heightBuild: v })} placeholder="Tall and wiry, broad-shouldered…" />
              <Field label="Hair" value={sheet.hair ?? ""} onChange={(v) => update({ hair: v })} placeholder="Colour, length, style…" />
              <Field label="Eyes" value={sheet.eyes ?? ""} onChange={(v) => update({ eyes: v })} placeholder="Colour, expression, striking quality…" />
              <Field label="Style of Dress" value={sheet.style ?? ""} onChange={(v) => update({ style: v })} placeholder="Signature look, wardrobe…" />
            </div>
            <CompactTextarea
              label="Distinguishing Features"
              value={sheet.distinguishing ?? ""}
              onChange={(v) => update({ distinguishing: v })}
              placeholder="Scars, tattoos, birthmarks, missing fingers — anything a reader would notice."
              rows={3}
            />
          </Section>

          {/* ── Voice & Mannerisms ─────────────────── */}
          <Section title="Voice & Mannerisms" hint="How they move through the world" defaultOpen>
            <CompactTextarea
              label="Voice"
              value={sheet.voice ?? ""}
              onChange={(v) => update({ voice: v })}
              placeholder="Cadence, accent, pet words, volume. Do they clip their sentences, trail off, interrupt?"
              rows={3}
            />
            <CompactTextarea
              label="Mannerisms"
              value={sheet.mannerisms ?? ""}
              onChange={(v) => update({ mannerisms: v })}
              placeholder="Physical tics, gestures, habits. What do they do with their hands when they're lying?"
              rows={3}
            />
          </Section>

          {/* ── Personality ────────────────────────── */}
          <Section title="Personality" hint="The human inside" defaultOpen>
            <TagGroup
              label="Traits"
              values={sheet.traits}
              onChange={(tags) => update({ traits: tags })}
              placeholder="stubborn, observant, loyal…"
            />
            <TagGroup
              label="Strengths"
              values={sheet.strengths ?? []}
              onChange={(tags) => update({ strengths: tags })}
              placeholder="quick-thinking, brave, empathetic…"
            />
            <TagGroup
              label="Flaws"
              values={sheet.flaws ?? []}
              onChange={(tags) => update({ flaws: tags })}
              placeholder="prideful, short-tempered, evasive…"
            />
            <TagGroup
              label="Fears"
              values={sheet.fears ?? []}
              onChange={(tags) => update({ fears: tags })}
              placeholder="abandonment, being forgotten, open water…"
            />
          </Section>

          {/* ── Motivation & Conflict ─────────────── */}
          <Section title="Motivation & Conflict" hint="What drives them, what stands in the way">
            <CompactTextarea
              label="External Goal"
              value={sheet.goal ?? ""}
              onChange={(v) => update({ goal: v })}
              placeholder="What they want on the surface — the thing they're chasing in the story."
              rows={2}
            />
            <CompactTextarea
              label="Underlying Motivation"
              value={sheet.motivation ?? ""}
              onChange={(v) => update({ motivation: v })}
              placeholder="The real reason. What deeper need is the external goal standing in for?"
              rows={3}
            />
            <CompactTextarea
              label="Internal Conflict"
              value={sheet.internalConflict ?? ""}
              onChange={(v) => update({ internalConflict: v })}
              placeholder="The war inside them — competing desires, values, fears."
              rows={3}
            />
            <CompactTextarea
              label="External Conflict"
              value={sheet.externalConflict ?? ""}
              onChange={(v) => update({ externalConflict: v })}
              placeholder="Forces in the world that oppose them — antagonists, circumstances, rules."
              rows={3}
            />
          </Section>

          {/* ── Character Arc ─────────────────────── */}
          <Section title="Character Arc" hint="Who they become">
            <CompactTextarea
              label="Lie They Believe (start)"
              value={sheet.arcStart ?? ""}
              onChange={(v) => update({ arcStart: v })}
              placeholder="The wrong belief about themselves or the world that drives their choices in act one."
              rows={3}
            />
            <CompactTextarea
              label="Truth They Come To (end)"
              value={sheet.arcEnd ?? ""}
              onChange={(v) => update({ arcEnd: v })}
              placeholder="The realization or conviction they earn by the final scene."
              rows={3}
            />
            <CompactTextarea
              label="Arc in One Paragraph"
              value={sheet.arcSummary ?? ""}
              onChange={(v) => update({ arcSummary: v })}
              placeholder="From X to Y — summarize the transformation in plain language."
              rows={4}
            />
          </Section>

          {/* ── Background ─────────────────────────── */}
          <Section title="Background" hint="Where they come from">
            <div className={styles.sectionGrid2}>
              <Field label="Origin" value={sheet.origin ?? ""} onChange={(v) => update({ origin: v })} placeholder="Hometown, birth region…" />
              <Field label="Education" value={sheet.education ?? ""} onChange={(v) => update({ education: v })} placeholder="Formal, self-taught, apprenticeship…" />
            </div>
            <CompactTextarea
              label="Family"
              value={sheet.family ?? ""}
              onChange={(v) => update({ family: v })}
              placeholder="Parents, siblings, partners, children — who raised them, who they left behind."
              rows={4}
            />
            <CompactTextarea
              label="Formative Event"
              value={sheet.formativeEvent ?? ""}
              onChange={(v) => update({ formativeEvent: v })}
              placeholder="The wound. The single moment the character still flinches from. What made them who they are?"
              rows={4}
            />
            <Textarea
              label="Backstory"
              value={sheet.backstory}
              onChange={(v) => update({ backstory: v })}
              rows={6}
            />
          </Section>

          {/* ── Relationships ─────────────────────── */}
          <Section title="Relationships" hint="How they connect to others">
            <Textarea
              label="Key Relationships"
              value={sheet.relationships ?? ""}
              onChange={(v) => update({ relationships: v })}
              rows={6}
            />
          </Section>

          {/* ── Notes ──────────────────────────────── */}
          <Section title="Notes" hint="Anything else">
            <Textarea
              label="Scratch Notes"
              value={sheet.notes}
              onChange={(v) => update({ notes: v })}
              rows={5}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

// ── Reusable pieces ──────────────────────────────────────────

function Section({
  title, hint, defaultOpen, children,
}: {
  title: string; hint?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  return (
    <details className={styles.section} open={defaultOpen}>
      <summary className={styles.sectionSummary}>
        <span style={{ display: "flex", alignItems: "baseline", gap: "var(--space-sm)" }}>
          <ChevronRight size={14} className={styles.sectionChevron} />
          <span className={styles.sectionHeading}>{title}</span>
        </span>
        {hint && <span className={styles.sectionHint}>{hint}</span>}
      </summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>
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
      />
    </div>
  );
}

function CompactTextarea({ label, value, onChange, placeholder, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.label}>{label}</label>
      <textarea
        className={styles.compactTextarea}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function TagGroup({ label, values, onChange, placeholder }: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className={styles.fieldGroup}>
      <label className={styles.tagGroupLabel}>{label}</label>
      <div className={styles.traits}>
        {values.map((t, i) => (
          <span key={i} className={styles.trait}>
            {t}
            <button
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              aria-label={`Remove ${t}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          className={styles.traitInput}
          placeholder={placeholder ?? "Add…"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...values, draft.trim()]);
              setDraft("");
            } else if (e.key === "Backspace" && !draft && values.length > 0) {
              // Quick-delete last tag on backspace in an empty input
              onChange(values.slice(0, -1));
            }
          }}
        />
      </div>
    </div>
  );
}
