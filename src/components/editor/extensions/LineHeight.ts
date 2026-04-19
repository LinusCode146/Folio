import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (value: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
  interface Storage {
    lineHeight: {
      current: string;
    };
  }
}

export const DEFAULT_LINE_HEIGHT = "1";

/**
 * LineHeight — editor-global line-height.
 *
 * Previous implementation stored line-height as a per-paragraph attribute,
 * which had two problems:
 *   1) Toolbar changes only applied to the current paragraph (or the
 *      selection), leaving the rest of the document inconsistent.
 *   2) Inline styles on individual <p> elements overrode any attempt to
 *      control caret height from the stylesheet, so the caret stayed
 *      1.5× font-size on old paragraphs even after global CSS fixes.
 *
 * This version sets a CSS custom property (--editor-line-height) on the
 * editor root DOM node. Every paragraph inherits from it via CSS, so a
 * single change updates the whole document — and there are no per-node
 * inline styles to override the caret-height baseline of line-height: 1.
 */
export const LineHeight = Extension.create({
  name: "lineHeight",

  addStorage() {
    return { current: DEFAULT_LINE_HEIGHT };
  },

  onCreate() {
    this.editor.view.dom.style.setProperty(
      "--editor-line-height",
      this.storage.current
    );
  },

  addCommands() {
    return {
      setLineHeight:
        (value: string) =>
        ({ editor, tr, dispatch }) => {
          const normalised = value && value.trim() !== "" ? value : DEFAULT_LINE_HEIGHT;
          editor.storage.lineHeight.current = normalised;
          editor.view.dom.style.setProperty(
            "--editor-line-height",
            normalised
          );
          if (dispatch) dispatch(tr.setMeta("lineHeightChange", normalised));
          return true;
        },
      unsetLineHeight:
        () =>
        ({ editor, tr, dispatch }) => {
          editor.storage.lineHeight.current = DEFAULT_LINE_HEIGHT;
          editor.view.dom.style.setProperty(
            "--editor-line-height",
            DEFAULT_LINE_HEIGHT
          );
          if (dispatch) dispatch(tr.setMeta("lineHeightChange", DEFAULT_LINE_HEIGHT));
          return true;
        },
    };
  },
});
