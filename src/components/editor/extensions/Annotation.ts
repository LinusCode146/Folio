import { Mark } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    annotation: {
      setAnnotation: (annotationId: string) => ReturnType;
      removeAnnotation: (annotationId: string) => ReturnType;
    };
  }
}

export const Annotation = Mark.create({
  name: "annotation",

  addAttributes() {
    return {
      annotationId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-annotation-id"),
        renderHTML: (attrs) =>
          attrs.annotationId ? { "data-annotation-id": attrs.annotationId } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "mark[data-annotation-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mark", { ...HTMLAttributes, class: "annotation-mark" }, 0];
  },

  addCommands() {
    return {
      setAnnotation:
        (annotationId: string) =>
        ({ commands }) =>
          commands.setMark("annotation", { annotationId }),

      removeAnnotation:
        (annotationId: string) =>
        ({ tr, dispatch, state }) => {
          if (!dispatch) return true;
          const { doc } = state;
          const markType = state.schema.marks.annotation;
          doc.descendants((node, pos) => {
            if (!node.isInline) return;
            node.marks.forEach((mark) => {
              if (
                mark.type === markType &&
                mark.attrs.annotationId === annotationId
              ) {
                tr.removeMark(pos, pos + node.nodeSize, markType);
              }
            });
          });
          dispatch(tr);
          return true;
        },
    };
  },
});
