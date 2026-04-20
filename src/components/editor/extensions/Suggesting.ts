/**
 * Suggesting — a Google-Docs-style tracked-changes extension for TipTap.
 *
 * Two inline marks represent pending changes:
 *   - `insertion` — text the author wants to add (rendered green, underlined)
 *   - `deletion`  — text the author wants to remove (rendered red, struck through)
 *
 * Each mark carries a `suggestionId`. Sibling insertion/deletion marks that form
 * a single replacement share the same id, so the UI can show them as one card.
 *
 * # How it works
 *
 * A ProseMirror plugin watches every transaction while "suggesting mode" is on.
 * In `appendTransaction` it rewrites the document so that:
 *   - Any content that was *inserted* by the user gets wrapped in the insertion mark.
 *   - Any content that was *deleted* by the user is restored at the deletion point
 *     but wrapped in the deletion mark — so nothing is actually lost.
 *
 * Adjacency merging: when the user types several characters in a row, each
 * keystroke is a separate transaction. To keep the sidebar from filling up with
 * one-character suggestions, we reuse the id of the immediately adjacent mark
 * when it exists, so consecutive typing collapses into a single suggestion.
 *
 * Accept / reject:
 *   - Accept insertion → strip the insertion mark (content stays).
 *   - Reject insertion → delete the content.
 *   - Accept deletion  → delete the content.
 *   - Reject deletion  → strip the deletion mark (content stays).
 *
 * All accept/reject transactions carry a meta flag so the plugin leaves them
 * alone instead of trying to mark them as new suggestions.
 */

import { Mark, Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Fragment, Slice } from "@tiptap/pm/model";
import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import { ReplaceStep, ReplaceAroundStep } from "@tiptap/pm/transform";

// ── Plugin key & meta ──────────────────────────────────────────────

export const suggestingPluginKey = new PluginKey<SuggestingPluginState>("suggesting");

interface SuggestingPluginState {
  enabled: boolean;
}

/**
 * Meta flag we attach to any transaction originating from the plugin itself
 * (accept / reject / mark-insertion), so appendTransaction knows to skip it.
 *
 * We use the suggestingPluginKey ITSELF as the meta key (not a plain string)
 * because ProseMirror guarantees plugin-key metas survive transaction batching
 * in TipTap chains, whereas plain-string metas can be silently dropped when
 * the chain reconstructs its combined transaction.  The `type` field of the
 * value object distinguishes between `setEnabled` and `internal` operations.
 *
 * The plain-string INTERNAL_META is kept as a belt-and-suspenders guard for
 * code paths that dispatch directly (not through a chain).
 */
const INTERNAL_META = "suggesting/internal";

// ── Insertion mark ─────────────────────────────────────────────────

export const InsertionMark = Mark.create({
  name: "insertion",
  inclusive: true,
  excludes: "",
  addAttributes() {
    return {
      suggestionId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-suggestion-id"),
        renderHTML: (attrs) =>
          attrs.suggestionId ? { "data-suggestion-id": attrs.suggestionId } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "ins[data-suggestion-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["ins", { ...HTMLAttributes, class: "suggestion-insertion" }, 0];
  },
});

// ── Deletion mark ──────────────────────────────────────────────────

export const DeletionMark = Mark.create({
  name: "deletion",
  inclusive: false,
  excludes: "",
  addAttributes() {
    return {
      suggestionId: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-suggestion-id"),
        renderHTML: (attrs) =>
          attrs.suggestionId ? { "data-suggestion-id": attrs.suggestionId } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "del[data-suggestion-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["del", { ...HTMLAttributes, class: "suggestion-deletion" }, 0];
  },
});

// ── Commands typing ────────────────────────────────────────────────

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    suggesting: {
      /** Enable or disable suggesting mode. New edits will become suggestions. */
      setSuggestingEnabled: (enabled: boolean) => ReturnType;
      /** Accept a single suggestion by id (strips insertion mark or deletes deletion-marked content). */
      acceptSuggestion: (id: string) => ReturnType;
      /** Reject a single suggestion by id (deletes insertion-marked content or strips deletion mark). */
      rejectSuggestion: (id: string) => ReturnType;
      /** Accept every pending suggestion in the document. */
      acceptAllSuggestions: () => ReturnType;
      /** Reject every pending suggestion in the document. */
      rejectAllSuggestions: () => ReturnType;
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function genSuggestionId(): string {
  return (
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 6)
  );
}

/** Peek at the marks on the node immediately to the LEFT of `pos`. */
function adjacentInsertionId(
  doc: PMNode,
  pos: number,
  schema: Schema
): string | null {
  if (pos <= 0) return null;
  try {
    const $pos = doc.resolve(pos);
    const before = $pos.nodeBefore;
    if (!before) return null;
    const mark = before.marks.find(
      (m) => m.type === schema.marks.insertion && m.attrs.suggestionId
    );
    return mark ? (mark.attrs.suggestionId as string) : null;
  } catch {
    return null;
  }
}

/** Peek at the marks on the node immediately to either side of `pos` for deletion. */
function adjacentDeletionId(
  doc: PMNode,
  pos: number,
  schema: Schema
): string | null {
  try {
    const $pos = doc.resolve(pos);
    const before = $pos.nodeBefore;
    const after = $pos.nodeAfter;
    const fromBefore = before?.marks.find(
      (m) => m.type === schema.marks.deletion && m.attrs.suggestionId
    );
    if (fromBefore) return fromBefore.attrs.suggestionId as string;
    const fromAfter = after?.marks.find(
      (m) => m.type === schema.marks.deletion && m.attrs.suggestionId
    );
    if (fromAfter) return fromAfter.attrs.suggestionId as string;
    return null;
  } catch {
    return null;
  }
}

/**
 * Rebuild a deleted slice as a new slice where each text node has the deletion
 * mark added. Text that was *already* insertion-marked is dropped entirely —
 * deleting an un-accepted insertion means reverting it, not re-marking it.
 */
function buildDeletionRestore(
  slice: Slice,
  schema: Schema,
  suggestionId: string
): Slice | null {
  const insType = schema.marks.insertion;
  const delType = schema.marks.deletion;

  function processFrag(frag: Fragment): Fragment {
    const out: PMNode[] = [];
    frag.forEach((node) => {
      if (node.isText) {
        if (node.marks.some((m) => m.type === insType)) return; // revert own insert — cancel it
        if (node.marks.some((m) => m.type === delType)) return; // already pending deletion — let deletion go through
        const newMarks = [...node.marks, delType.create({ suggestionId })];
        out.push(node.mark(newMarks));
      } else if (node.isLeaf) {
        // Leaf inline node (e.g. hardBreak) — restore as-is (no deletion mark support on leaves)
        out.push(node);
      } else {
        const child = processFrag(node.content);
        if (child.size > 0) {
          out.push(node.copy(child));
        }
      }
    });
    return Fragment.fromArray(out);
  }

  const content = processFrag(slice.content);
  if (content.size === 0) return null;
  return new Slice(content, slice.openStart, slice.openEnd);
}

/** True if every text node inside this slice already carries the insertion mark. */
function isSliceAllInsertion(slice: Slice, schema: Schema): boolean {
  const insType = schema.marks.insertion;
  let hasText = false;
  let allMarked = true;
  function walk(frag: Fragment) {
    frag.forEach((node) => {
      if (node.isText) {
        hasText = true;
        if (!node.marks.some((m) => m.type === insType)) allMarked = false;
      } else if (node.content && node.content.size > 0) {
        walk(node.content);
      }
    });
  }
  walk(slice.content);
  return hasText && allMarked;
}

// ── markInternal helper ────────────────────────────────────────────

/**
 * Stamp both the plain-string meta AND the plugin-key meta on `tr` so
 * the appendTransaction guard catches it regardless of which path
 * TipTap uses to dispatch.  Plain-string metas can be silently dropped
 * when TipTap's chain() reconstructs a combined transaction; plugin-key
 * metas survive because ProseMirror preserves them through the state
 * machinery.  We use belt-and-suspenders: a guard that passes when
 * EITHER check sees the flag.
 */
function markInternal(tr: Transaction): void {
  tr.setMeta(INTERNAL_META, true);
  tr.setMeta(suggestingPluginKey, { type: "internal" });
  tr.setMeta("addToHistory", false);
}

// ── Core extension ─────────────────────────────────────────────────

export interface SuggestingOptions {
  /** Called when a new suggestion is created, so the host can allocate a meta entry. */
  onSuggestionCreated?: (id: string, kind: "insertion" | "deletion" | "replace") => void;
  /** Called when an existing suggestion is removed (accepted or rejected). */
  onSuggestionResolved?: (id: string) => void;
}

export const Suggesting = Extension.create<SuggestingOptions>({
  name: "suggesting",

  addOptions() {
    return {
      onSuggestionCreated: undefined,
      onSuggestionResolved: undefined,
    };
  },

  addExtensions() {
    return [InsertionMark, DeletionMark];
  },

  addCommands() {
    return {
      setSuggestingEnabled:
        (enabled: boolean) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(suggestingPluginKey, { type: "setEnabled", enabled });
            tr.setMeta(INTERNAL_META, true);
            tr.setMeta("addToHistory", false);
            dispatch(tr);
          }
          return true;
        },

      acceptSuggestion:
        (id: string) =>
        ({ tr, dispatch, state }) => {
          const ranges = collectSuggestionRanges(state, id);
          if (ranges.length === 0) return false;
          if (!dispatch) return true;
          // Process in reverse so earlier positions don't shift.
          ranges.sort((a, b) => b.from - a.from);
          ranges.forEach((r) => {
            if (r.kind === "insertion") {
              tr.removeMark(r.from, r.to, state.schema.marks.insertion);
            } else {
              tr.delete(r.from, r.to);
            }
          });
          markInternal(tr);
          dispatch(tr);
          // Notify React after dispatch so state updates don't race ProseMirror.
          this.options.onSuggestionResolved?.(id);
          return true;
        },

      rejectSuggestion:
        (id: string) =>
        ({ tr, dispatch, state }) => {
          const ranges = collectSuggestionRanges(state, id);
          if (ranges.length === 0) return false;
          if (!dispatch) return true;
          ranges.sort((a, b) => b.from - a.from);
          ranges.forEach((r) => {
            if (r.kind === "insertion") {
              tr.delete(r.from, r.to);
            } else {
              tr.removeMark(r.from, r.to, state.schema.marks.deletion);
            }
          });
          markInternal(tr);
          dispatch(tr);
          this.options.onSuggestionResolved?.(id);
          return true;
        },

      acceptAllSuggestions:
        () =>
        ({ tr, dispatch, state }) => {
          const ids = collectAllSuggestionIds(state);
          if (ids.size === 0) return false;
          if (!dispatch) return true;
          const all: RangeRecord[] = [];
          ids.forEach((id) => all.push(...collectSuggestionRanges(state, id)));
          all.sort((a, b) => b.from - a.from);
          all.forEach((r) => {
            if (r.kind === "insertion") {
              tr.removeMark(r.from, r.to, state.schema.marks.insertion);
            } else {
              tr.delete(r.from, r.to);
            }
          });
          markInternal(tr);
          dispatch(tr);
          ids.forEach((id) => this.options.onSuggestionResolved?.(id));
          return true;
        },

      rejectAllSuggestions:
        () =>
        ({ tr, dispatch, state }) => {
          const ids = collectAllSuggestionIds(state);
          if (ids.size === 0) return false;
          if (!dispatch) return true;
          const all: RangeRecord[] = [];
          ids.forEach((id) => all.push(...collectSuggestionRanges(state, id)));
          all.sort((a, b) => b.from - a.from);
          all.forEach((r) => {
            if (r.kind === "insertion") {
              tr.delete(r.from, r.to);
            } else {
              tr.removeMark(r.from, r.to, state.schema.marks.deletion);
            }
          });
          markInternal(tr);
          dispatch(tr);
          ids.forEach((id) => this.options.onSuggestionResolved?.(id));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin<SuggestingPluginState>({
        key: suggestingPluginKey,

        state: {
          init: () => ({ enabled: false }),
          apply(tr, value) {
            const meta = tr.getMeta(suggestingPluginKey);
            if (meta && meta.type === "setEnabled") {
              return { enabled: !!meta.enabled };
            }
            return value;
          },
        },

        appendTransaction(transactions, oldState, newState) {
          const pluginState = suggestingPluginKey.getState(newState);
          if (!pluginState?.enabled) return null;

          // Skip if every tx was either non-mutating or internal.
          // Belt-and-suspenders: check both the plain-string meta (for direct
          // dispatch paths) AND the plugin-key meta (for chain() dispatch
          // paths where TipTap may drop plain-string metas when batching).
          const relevant = transactions.filter(
            (t) =>
              t.docChanged &&
              !t.getMeta(INTERNAL_META) &&
              t.getMeta(suggestingPluginKey)?.type !== "internal"
          );
          if (relevant.length === 0) return null;

          const schema = newState.schema;
          const insType = schema.marks.insertion;
          const delType = schema.marks.deletion;
          if (!insType || !delType) return null;

          interface Change {
            fromNew: number; // start of the edit in newState.doc
            insertedSize: number;
            deletedSlice: Slice;
          }
          const changes: Change[] = [];

          // Walk every relevant step and compute where its inserted content landed
          // in newState.doc, plus what it deleted from the pre-step doc.
          transactions.forEach((transaction, txIdx) => {
            if (!transaction.docChanged) return;
            if (
              transaction.getMeta(INTERNAL_META) ||
              transaction.getMeta(suggestingPluginKey)?.type === "internal"
            ) return;

            transaction.steps.forEach((step, stepIdx) => {
              let from: number;
              let to: number;
              let slice: Slice;
              if (step instanceof ReplaceStep) {
                const j = step as unknown as { from: number; to: number; slice: Slice };
                from = j.from;
                to = j.to;
                slice = j.slice;
              } else if (step instanceof ReplaceAroundStep) {
                // Fall back gracefully: don't try to rewrite wraps, just let them through.
                return;
              } else {
                return;
              }

              const docBeforeStep = transaction.docs[stepIdx] ?? oldState.doc;
              const deletedSlice = docBeforeStep.slice(from, to);
              const insertedSize = slice.size;

              if (deletedSlice.size === 0 && insertedSize === 0) return;

              // Map `from` through the remaining steps in this tx, then through
              // every subsequent transaction, to land in newState.doc.
              const laterMap = transaction.mapping.slice(stepIdx + 1);
              let posInNew = laterMap.map(from, -1);
              for (let i = txIdx + 1; i < transactions.length; i++) {
                posInNew = transactions[i].mapping.map(posInNew, -1);
              }

              changes.push({
                fromNew: posInNew,
                insertedSize,
                deletedSlice,
              });
            });
          });

          if (changes.length === 0) return null;

          const tr = newState.tr;
          let touched = false;
          // For pure deletions (backspace / delete key) we want the caret to
          // stay where the user's edit put it — BEFORE the restored slice —
          // so the next Backspace hits real text, not the suggestion we just
          // wrote into the document.  Record the target caret pos here and
          // apply it after all changes have been written.
          let caretTarget: number | null = null;

          // Apply highest-position changes first so earlier positions don't shift.
          changes.sort((a, b) => b.fromNew - a.fromNew);

          changes.forEach((change) => {
            const insertedFrom = change.fromNew;
            const insertedTo = change.fromNew + change.insertedSize;

            const hasInsert = change.insertedSize > 0;
            // Skip "reverting own suggestion" deletions — the insertion mark
            // already made the content pending, deleting it means cancel, not
            // add another deletion mark on top.
            const hasDelete =
              change.deletedSlice.size > 0 &&
              !isSliceAllInsertion(change.deletedSlice, schema);

            if (!hasInsert && !hasDelete) return;

            // Share one id across paired insert + delete so the sidebar can
            // show them as a single "replace" suggestion.
            const pairId =
              hasInsert && hasDelete
                ? genSuggestionId()
                : null;

            // Insertion mark: try to extend an adjacent insertion suggestion
            // (so consecutive typing doesn't spawn a new card per keystroke).
            if (hasInsert) {
              const adj =
                pairId == null
                  ? adjacentInsertionId(tr.doc, insertedFrom, schema)
                  : null;
              const id = pairId ?? adj ?? genSuggestionId();
              tr.addMark(
                insertedFrom,
                insertedTo,
                insType.create({ suggestionId: id })
              );
              if (!adj) {
                extension.options.onSuggestionCreated?.(
                  id,
                  hasDelete ? "replace" : "insertion"
                );
              }
            }

            // Deletion: re-insert the removed slice at the edit point, marked.
            if (hasDelete) {
              const adj =
                pairId == null
                  ? adjacentDeletionId(tr.doc, insertedFrom, schema)
                  : null;
              const id = pairId ?? adj ?? genSuggestionId();
              const restored = buildDeletionRestore(
                change.deletedSlice,
                schema,
                id
              );
              if (restored) {
                try {
                  tr.replace(insertedFrom, insertedFrom, restored);
                  if (!adj && !pairId) {
                    extension.options.onSuggestionCreated?.(id, "deletion");
                  } else if (pairId) {
                    // pair was already announced above
                  }
                  touched = true;
                  // Pure deletion (no paired insert) → keep caret BEFORE the
                  // restored slice so subsequent Backspace advances leftward
                  // into real text instead of hitting the suggestion mark.
                  if (!hasInsert) {
                    caretTarget = insertedFrom;
                  }
                } catch {
                  // Cross-block deletions with complex openness can fail to
                  // replace cleanly — in that case we silently drop the
                  // deletion restore rather than corrupt the doc.
                }
              }
            }

            if (hasInsert) touched = true;
          });

          if (!touched) return null;

          // Park the caret before the restored deletion slice so repeated
          // Backspace keeps stepping through real characters.
          if (caretTarget !== null) {
            try {
              const $pos = tr.doc.resolve(caretTarget);
              tr.setSelection(TextSelection.near($pos, -1));
            } catch {
              // ignore — fall back to whatever selection the user's tx set
            }
          }

          markInternal(tr);
          return tr;
        },
      }),
    ];
  },
});

// ── Shared helpers for commands ────────────────────────────────────

interface RangeRecord {
  from: number;
  to: number;
  kind: "insertion" | "deletion";
}

function collectSuggestionRanges(
  state: EditorState,
  id: string
): RangeRecord[] {
  const insType = state.schema.marks.insertion;
  const delType = state.schema.marks.deletion;
  const ranges: RangeRecord[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isInline) return;
    node.marks.forEach((mark) => {
      if (mark.attrs.suggestionId !== id) return;
      if (mark.type === insType)
        ranges.push({ from: pos, to: pos + node.nodeSize, kind: "insertion" });
      else if (mark.type === delType)
        ranges.push({ from: pos, to: pos + node.nodeSize, kind: "deletion" });
    });
  });
  return ranges;
}

function collectAllSuggestionIds(state: EditorState): Set<string> {
  const ids = new Set<string>();
  const insType = state.schema.marks.insertion;
  const delType = state.schema.marks.deletion;
  state.doc.descendants((node) => {
    if (!node.isInline) return;
    node.marks.forEach((mark) => {
      if (
        (mark.type === insType || mark.type === delType) &&
        mark.attrs.suggestionId
      ) {
        ids.add(mark.attrs.suggestionId as string);
      }
    });
  });
  return ids;
}

// ── Snapshot utilities (for sidebar rendering) ─────────────────────

export interface SuggestionSnapshot {
  id: string;
  kind: "insertion" | "deletion" | "replace";
  inserted: string;   // plain text of insertion-marked portions
  deleted: string;    // plain text of deletion-marked portions
  /** Surrounding context snippet, for placement hints. */
  context: string;
}

/** Walk a ProseMirror document and pull every pending suggestion into a
 *  plain-object snapshot suitable for the sidebar panel. Runs on every
 *  editor update — keep it cheap. */
export function snapshotSuggestions(
  doc: PMNode,
  schema: Schema
): SuggestionSnapshot[] {
  const insType = schema.marks.insertion;
  const delType = schema.marks.deletion;
  if (!insType || !delType) return [];

  const byId = new Map<
    string,
    { inserted: string; deleted: string; firstPos: number }
  >();

  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = node.text ?? "";
    const ins = node.marks.find((m) => m.type === insType);
    const del = node.marks.find((m) => m.type === delType);
    if (ins?.attrs.suggestionId) {
      const id = ins.attrs.suggestionId as string;
      const entry = byId.get(id) ?? { inserted: "", deleted: "", firstPos: pos };
      entry.inserted += text;
      if (pos < entry.firstPos) entry.firstPos = pos;
      byId.set(id, entry);
    }
    if (del?.attrs.suggestionId) {
      const id = del.attrs.suggestionId as string;
      const entry = byId.get(id) ?? { inserted: "", deleted: "", firstPos: pos };
      entry.deleted += text;
      if (pos < entry.firstPos) entry.firstPos = pos;
      byId.set(id, entry);
    }
  });

  const out: SuggestionSnapshot[] = [];
  byId.forEach((entry, id) => {
    const hasIns = entry.inserted.length > 0;
    const hasDel = entry.deleted.length > 0;
    const kind: "insertion" | "deletion" | "replace" =
      hasIns && hasDel ? "replace" : hasIns ? "insertion" : "deletion";
    // Short context snippet — 40 chars before the suggestion.
    let context = "";
    try {
      const start = Math.max(0, entry.firstPos - 60);
      context = doc.textBetween(start, entry.firstPos, " ", " ").slice(-40);
    } catch {
      // ignore
    }
    out.push({
      id,
      kind,
      inserted: entry.inserted,
      deleted: entry.deleted,
      context,
    });
  });

  // Order by document position (stable reading order).
  out.sort((a, b) => {
    const posA = byId.get(a.id)?.firstPos ?? 0;
    const posB = byId.get(b.id)?.firstPos ?? 0;
    return posA - posB;
  });
  return out;
}
