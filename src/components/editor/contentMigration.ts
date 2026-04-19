/**
 * Content migrations applied when loading a SceneDocument into the editor.
 *
 * These run on the raw ProseMirror JSON before it's handed to the editor,
 * so stale attributes / legacy shapes can be normalised without dirtying
 * the document on disk until the next save.
 */

type PmNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  marks?: unknown[];
  text?: string;
};

/**
 * Remove the legacy per-paragraph `lineHeight` attribute from every node.
 *
 * The attribute used to be registered globally on paragraph/heading via the
 * LineHeight extension. That extension is now editor-global (CSS variable
 * based), so any residue in saved JSON would re-render as an inline
 * `style="line-height: X"` and override the global setting — breaking the
 * caret-height fix on every paragraph that had it.
 *
 * The function is pure (returns a new tree) to keep the input immutable.
 */
export function stripLineHeightAttrs<T extends object>(content: T): T {
  function visit(node: PmNode): PmNode {
    const next: PmNode = { ...node };

    if (next.attrs && Object.prototype.hasOwnProperty.call(next.attrs, "lineHeight")) {
      const { lineHeight: _omitted, ...rest } = next.attrs;
      next.attrs = rest;
    }

    if (Array.isArray(next.content)) {
      next.content = next.content.map(visit);
    }

    return next;
  }

  return visit(content as PmNode) as unknown as T;
}
