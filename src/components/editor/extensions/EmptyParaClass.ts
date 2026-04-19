import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

/**
 * Adds the CSS class "para-empty" to every empty paragraph node.
 * This lets us target empty paragraphs in CSS without relying on
 * :has(), which PostCSS/CSS Modules can mangle.
 *
 * Used to set a min-height on blank paragraphs so the caret has a
 * line-box to sit in and blank lines visually match filled ones.
 */
export const EmptyParaClass = Extension.create({
  name: "emptyParaClass",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name === "paragraph" && node.childCount === 0) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: "para-empty",
                  })
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
