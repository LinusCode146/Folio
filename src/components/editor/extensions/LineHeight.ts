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

export const DEFAULT_LINE_HEIGHT = "1.7";

/**
 * LineHeight — editor-global line-height.
 *
 * Sets a CSS custom property (--editor-line-height) on the editor root DOM
 * node, applied to .ProseMirror root in CSS so every block inherits it.
 * A single command updates the whole document at once.
 *
 * Default 1.7 is generous serif body — the caret sits in a properly sized
 * line-box (≈1.7em tall), which feels normal for prose. Anything tighter
 * than ~1.4 makes the caret look truncated against the text it's editing.
 *
 * History: an earlier version pinned line-height to 1 in CSS to "control
 * caret height from the stylesheet". That actually produced the opposite —
 * a caret only as tall as the cap-height with mismatched empty-line
 * heights and broken typewriter scroll math. Removed in favour of normal
 * CSS line-box behaviour.
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
