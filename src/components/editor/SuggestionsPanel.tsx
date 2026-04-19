"use client";

import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Check, X, MessageSquare } from "lucide-react";
import type { SuggestionMeta } from "@/types";
import {
  snapshotSuggestions,
  type SuggestionSnapshot,
} from "./extensions/Suggesting";
import styles from "./SuggestionsPanel.module.css";

interface Props {
  editor: Editor;
  suggestingEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  suggestions: Record<string, SuggestionMeta>;
  onChange: (next: Record<string, SuggestionMeta>) => void;
}

export function SuggestionsPanel({
  editor,
  suggestingEnabled,
  onToggleEnabled,
  suggestions,
  onChange,
}: Props) {
  // Recompute the snapshot list whenever the document changes.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    editor.on("update", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("update", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  const snapshots = useMemo<SuggestionSnapshot[]>(
    () => snapshotSuggestions(editor.state.doc, editor.state.schema),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editor, tick]
  );

  // Reconcile the metadata dictionary: create entries for new ids, prune
  // entries whose suggestion has disappeared from the doc.
  useEffect(() => {
    const liveIds = new Set(snapshots.map((s) => s.id));
    let changed = false;
    const next = { ...suggestions };
    snapshots.forEach((s) => {
      if (!next[s.id]) {
        next[s.id] = {
          id: s.id,
          kind: s.kind,
          comment: "",
          createdAt: new Date().toISOString(),
        };
        changed = true;
      } else if (next[s.id].kind !== s.kind) {
        next[s.id] = { ...next[s.id], kind: s.kind };
        changed = true;
      }
    });
    Object.keys(next).forEach((id) => {
      if (!liveIds.has(id)) {
        delete next[id];
        changed = true;
      }
    });
    if (changed) onChange(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshots]);

  function setComment(id: string, comment: string) {
    onChange({
      ...suggestions,
      [id]: {
        ...(suggestions[id] ?? {
          id,
          kind: "insertion",
          createdAt: new Date().toISOString(),
        }),
        comment,
      },
    });
  }

  // Use editor.commands.* directly — NOT editor.chain().focus().*
  // Reason: TipTap's chain() batches steps into a combined transaction and
  // can silently drop plain-string meta keys in the process.  That causes the
  // appendTransaction plugin to mistake the accept/reject transaction for a
  // user edit and wrap large ranges in suggestion marks.  Calling commands
  // directly dispatches one transaction per command, keeping all meta intact.
  function accept(id: string) {
    editor.commands.acceptSuggestion(id);
  }

  function reject(id: string) {
    editor.commands.rejectSuggestion(id);
  }

  function acceptAll() {
    editor.commands.acceptAllSuggestions();
  }

  function rejectAll() {
    editor.commands.rejectAllSuggestions();
  }

  return (
    <div className={styles.root}>
      {/* Mode toggle — the pill-switch at the top of the panel */}
      <div className={styles.header}>
        <div className={styles.modeRow}>
          <span className={styles.modeLabel}>Suggesting</span>
          <button
            role="switch"
            aria-checked={suggestingEnabled}
            className={`${styles.switch} ${
              suggestingEnabled ? styles.switchOn : ""
            }`}
            onClick={() => onToggleEnabled(!suggestingEnabled)}
            title={
              suggestingEnabled
                ? "Suggesting mode is ON — your edits are tracked"
                : "Suggesting mode is OFF — edits apply directly"
            }
          >
            <span className={styles.switchKnob} />
          </button>
        </div>
        <p className={styles.modeHint}>
          {suggestingEnabled
            ? "Your edits won't change the document — they'll appear here as suggestions."
            : "Turn on to track your edits as reviewable suggestions."}
        </p>

        {snapshots.length > 1 && (
          <div className={styles.bulkRow}>
            <button className={styles.bulkBtn} onClick={acceptAll}>
              <Check size={11} /> Accept all
            </button>
            <button className={styles.bulkBtn} onClick={rejectAll}>
              <X size={11} /> Reject all
            </button>
          </div>
        )}
      </div>

      <div className={styles.list}>
        {snapshots.length === 0 ? (
          <div className={styles.empty}>
            <MessageSquare size={18} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No suggestions yet</p>
            <p className={styles.emptyHint}>
              {suggestingEnabled
                ? "Start editing — your changes will show up here."
                : "Turn on suggesting mode, then edit the document."}
            </p>
          </div>
        ) : (
          snapshots.map((snap) => {
            const meta = suggestions[snap.id];
            return (
              <article key={snap.id} className={styles.card}>
                <header className={styles.cardHeader}>
                  <span
                    className={`${styles.badge} ${
                      snap.kind === "insertion"
                        ? styles.badgeInsert
                        : snap.kind === "deletion"
                          ? styles.badgeDelete
                          : styles.badgeReplace
                    }`}
                  >
                    {snap.kind === "insertion"
                      ? "Insertion"
                      : snap.kind === "deletion"
                        ? "Deletion"
                        : "Replace"}
                  </span>
                  {meta?.createdAt && (
                    <time className={styles.cardTime}>
                      {formatTime(meta.createdAt)}
                    </time>
                  )}
                </header>

                {snap.context && (
                  <p className={styles.context}>
                    …{snap.context}
                    <span className={styles.contextCaret}>›</span>
                  </p>
                )}

                <div className={styles.diff}>
                  {snap.deleted && (
                    <del className={styles.diffDel}>{snap.deleted}</del>
                  )}
                  {snap.inserted && (
                    <ins className={styles.diffIns}>{snap.inserted}</ins>
                  )}
                </div>

                <textarea
                  className={styles.commentBox}
                  placeholder="Add a note about this change…"
                  value={meta?.comment ?? ""}
                  onChange={(e) => setComment(snap.id, e.target.value)}
                  rows={2}
                />

                <footer className={styles.cardActions}>
                  <button
                    className={`${styles.actionBtn} ${styles.rejectBtn}`}
                    onClick={() => reject(snap.id)}
                    title="Reject this suggestion"
                  >
                    <X size={12} /> Reject
                  </button>
                  <button
                    className={`${styles.actionBtn} ${styles.acceptBtn}`}
                    onClick={() => accept(snap.id)}
                    title="Accept this suggestion"
                  >
                    <Check size={12} /> Accept
                  </button>
                </footer>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (sameDay) {
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
