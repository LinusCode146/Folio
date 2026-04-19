import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node } from "@tiptap/pm/model";

export const searchPluginKey = new PluginKey<{
  term: string;
  decorations: DecorationSet;
}>("search");

function buildDecorations(doc: Node, term: string): DecorationSet {
  if (!term.trim()) return DecorationSet.empty;
  const decorations: Decoration[] = [];
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    let m: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((m = regex.exec(node.text)) !== null) {
      decorations.push(
        Decoration.inline(pos + m.index, pos + m.index + m[0].length, {
          class: "search-match",
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    search: {
      setSearchTerm: (term: string) => ReturnType;
      replaceCurrentMatch: (replacement: string, index: number) => ReturnType;
      replaceAllMatches: (replacement: string) => ReturnType;
    };
  }
}

export function getMatchPositions(
  doc: Node,
  term: string
): Array<{ from: number; to: number }> {
  const positions: Array<{ from: number; to: number }> = [];
  if (!term.trim()) return positions;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "gi");
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    let m: RegExpExecArray | null;
    regex.lastIndex = 0;
    while ((m = regex.exec(node.text)) !== null) {
      positions.push({ from: pos + m.index, to: pos + m.index + m[0].length });
    }
  });
  return positions;
}

export const SearchHighlight = Extension.create({
  name: "search",

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ editor }) => {
          editor.view.dispatch(
            editor.view.state.tr.setMeta(searchPluginKey, term)
          );
          return true;
        },

      replaceCurrentMatch:
        (replacement: string, index: number) =>
        ({ editor }) => {
          const term = searchPluginKey.getState(editor.state)?.term ?? "";
          const positions = getMatchPositions(editor.state.doc, term);
          if (positions.length === 0 || index < 0 || index >= positions.length) return false;
          const { from, to } = positions[index];
          const { tr, schema } = editor.state;
          if (replacement) {
            editor.view.dispatch(tr.replaceWith(from, to, schema.text(replacement)));
          } else {
            editor.view.dispatch(tr.delete(from, to));
          }
          return true;
        },

      replaceAllMatches:
        (replacement: string) =>
        ({ editor }) => {
          const term = searchPluginKey.getState(editor.state)?.term ?? "";
          const positions = getMatchPositions(editor.state.doc, term);
          if (positions.length === 0) return false;
          const { tr, schema } = editor.state;
          // Reverse order so earlier positions aren't shifted by later replacements
          [...positions].reverse().forEach(({ from, to }) => {
            if (replacement) {
              tr.replaceWith(from, to, schema.text(replacement));
            } else {
              tr.delete(from, to);
            }
          });
          editor.view.dispatch(tr);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: searchPluginKey,
        state: {
          init(_, { doc }) {
            return { term: "", decorations: DecorationSet.empty };
          },
          apply(tr, prev) {
            const meta = tr.getMeta(searchPluginKey);
            const term = typeof meta === "string" ? meta : prev.term;
            const decorations =
              meta !== undefined || tr.docChanged
                ? buildDecorations(tr.doc, term)
                : prev.decorations;
            return { term, decorations };
          },
        },
        props: {
          decorations(state) {
            return searchPluginKey.getState(state)?.decorations;
          },
        },
      }),
    ];
  },
});
