import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

const focusModeKey = new PluginKey("focusMode");

export const FocusMode = Extension.create({
  name: "focusMode",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: focusModeKey,
        state: {
          init(_, { doc, selection }) {
            return buildDecorations(doc, selection.anchor);
          },
          apply(tr, prev) {
            if (tr.docChanged || tr.selectionSet) {
              return buildDecorations(tr.doc, tr.selection.anchor);
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            return focusModeKey.getState(state);
          },
        },
      }),
    ];
  },
});

function buildDecorations(doc: Node, anchor: number): DecorationSet {
  try {
    const resolved = doc.resolve(anchor);
    // Depth 0 means the cursor is at the doc level — nothing to highlight
    if (resolved.depth === 0) return DecorationSet.empty;

    // Walk up to the top-level block (direct child of doc, depth 1)
    const from = resolved.before(1);  // position immediately before the block node
    const to = resolved.after(1);     // position immediately after the block node

    // Validate that the computed range exactly spans a single node
    const nodeAtFrom = doc.nodeAt(from);
    if (!nodeAtFrom || from + nodeAtFrom.nodeSize !== to) return DecorationSet.empty;

    return DecorationSet.create(doc, [
      Decoration.node(from, to, { class: "focus-paragraph" }),
    ]);
  } catch {
    return DecorationSet.empty;
  }
}
