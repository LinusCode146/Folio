"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronRight } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { loadPlace, savePlace } from "@/lib/documentService";
import type { PlaceSheet, ID } from "@/types";
import styles from "./Sheet.module.css";

interface Props { nodeId: ID; title: string }

export function PlaceSheetEditor({ nodeId, title }: Props) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const [sheet, setSheet] = useState<PlaceSheet | null>(null);

  useEffect(() => {
    if (!projectPath) return;
    loadPlace(projectPath, nodeId).then(setSheet);
  }, [nodeId, projectPath]);

  const save = useCallback(async (updated: PlaceSheet) => {
    if (!projectPath) return;
    await savePlace(projectPath, updated);
  }, [projectPath]);

  const update = useCallback(
    (patch: Partial<PlaceSheet>) => {
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
          <Section title="Identity" hint="What it's called, what it is" defaultOpen>
            <div className={styles.sectionGrid2}>
              <Field label="Name" value={sheet.name} onChange={(v) => update({ name: v })} />
              <Field label="Kind" value={sheet.kind ?? ""} onChange={(v) => update({ kind: v })} placeholder="City, village, forest, inn, ship…" />
              <Field label="Region" value={sheet.region ?? ""} onChange={(v) => update({ region: v })} placeholder="Continent, kingdom, parent location…" />
            </div>
          </Section>

          {/* ── Geography ─────────────────────────── */}
          <Section title="Geography" hint="Land, shape, scale" defaultOpen>
            <div className={styles.sectionGrid2}>
              <Field label="Terrain" value={sheet.terrain ?? ""} onChange={(v) => update({ terrain: v })} placeholder="Hills, coast, plains, crags…" />
              <Field label="Climate" value={sheet.climate ?? ""} onChange={(v) => update({ climate: v })} placeholder="Seasons, weather, prevailing winds…" />
              <Field label="Size & Scale" value={sheet.size ?? ""} onChange={(v) => update({ size: v })} placeholder="Population, area, walking time across…" />
            </div>
            <CompactTextarea
              label="Layout"
              value={sheet.layout ?? ""}
              onChange={(v) => update({ layout: v })}
              placeholder="Districts, neighbourhoods, rooms. How is the space organized — where does the reader enter?"
              rows={3}
            />
          </Section>

          {/* ── Sensory Atmosphere ────────────────── */}
          <Section title="Sensory Atmosphere" hint="The five senses" defaultOpen>
            <CompactTextarea
              label="Mood"
              value={sheet.mood ?? ""}
              onChange={(v) => update({ mood: v })}
              placeholder="The emotional temperature of the place. Oppressive, welcoming, uneasy, reverent…"
              rows={2}
            />
            <CompactTextarea
              label="Sights"
              value={sheet.sights ?? ""}
              onChange={(v) => update({ sights: v })}
              placeholder="What catches the eye — light quality, colours, motion, the skyline."
              rows={3}
            />
            <CompactTextarea
              label="Sounds"
              value={sheet.sounds ?? ""}
              onChange={(v) => update({ sounds: v })}
              placeholder="Ambient noise, near and far — wind through reeds, distant bells, the hush under snow."
              rows={3}
            />
            <CompactTextarea
              label="Smells"
              value={sheet.smells ?? ""}
              onChange={(v) => update({ smells: v })}
              placeholder="Often the most evocative sense. Smoke, salt, rain on stone, old paper, turned earth."
              rows={3}
            />
            <CompactTextarea
              label="Textures & Air"
              value={sheet.textures ?? ""}
              onChange={(v) => update({ textures: v })}
              placeholder="Underfoot, underhand. Temperature, humidity, the feel of the air on skin."
              rows={3}
            />
          </Section>

          {/* ── Architecture & Landmarks ──────────── */}
          <Section title="Architecture & Landmarks" hint="The built world">
            <CompactTextarea
              label="Architecture"
              value={sheet.architecture ?? ""}
              onChange={(v) => update({ architecture: v })}
              placeholder="Building materials, styles, silhouettes. How old are the structures? What do they say about the people?"
              rows={4}
            />
            <CompactTextarea
              label="Landmarks"
              value={sheet.landmarks ?? ""}
              onChange={(v) => update({ landmarks: v })}
              placeholder="The places a traveller would be told to meet at. Fountains, gates, towers, named trees."
              rows={4}
            />
          </Section>

          {/* ── Inhabitants & Culture ─────────────── */}
          <Section title="Inhabitants & Culture" hint="Who lives here, how they live">
            <CompactTextarea
              label="Inhabitants"
              value={sheet.inhabitants ?? ""}
              onChange={(v) => update({ inhabitants: v })}
              placeholder="Peoples, species, classes. Demographics without reducing them to numbers."
              rows={3}
            />
            <CompactTextarea
              label="Culture & Customs"
              value={sheet.culture ?? ""}
              onChange={(v) => update({ culture: v })}
              placeholder="Daily life, festivals, taboos, language, what's on the table at dinner."
              rows={4}
            />
            <div className={styles.sectionGrid2}>
              <CompactTextarea
                label="Government"
                value={sheet.government ?? ""}
                onChange={(v) => update({ government: v })}
                placeholder="Who rules, how, with what legitimacy."
                rows={3}
              />
              <CompactTextarea
                label="Economy"
                value={sheet.economy ?? ""}
                onChange={(v) => update({ economy: v })}
                placeholder="Trade, industry, currency, what's scarce."
                rows={3}
              />
            </div>
          </Section>

          {/* ── History ───────────────────────────── */}
          <Section title="History" hint="What happened before the story">
            <Textarea
              label="History"
              value={sheet.history ?? ""}
              onChange={(v) => update({ history: v })}
              rows={6}
            />
          </Section>

          {/* ── Story Role ────────────────────────── */}
          <Section title="Story Role" hint="Why this place matters to the book">
            <CompactTextarea
              label="Significance"
              value={sheet.significance ?? ""}
              onChange={(v) => update({ significance: v })}
              placeholder="Why does this place exist in the narrative? What does it do that no other location could?"
              rows={3}
            />
            <CompactTextarea
              label="Scenes Set Here"
              value={sheet.scenesHere ?? ""}
              onChange={(v) => update({ scenesHere: v })}
              placeholder="Key scenes, confrontations, revelations that happen in this location."
              rows={4}
            />
          </Section>

          {/* ── Description ───────────────────────── */}
          <Section title="Description" hint="A writerly summary">
            <Textarea
              label="Description"
              value={sheet.description}
              onChange={(v) => update({ description: v })}
              rows={6}
            />
          </Section>

          {/* ── Notes ─────────────────────────────── */}
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
