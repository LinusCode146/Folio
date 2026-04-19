"use client";

import { useRef, useState, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { nanoid } from "@/lib/nanoid";
import styles from "./AnnotationPanel.module.css";

interface Props {
  editor: Editor;
  annotations: Record<string, string>;
  onChange: (annotations: Record<string, string>) => void;
}

// Extract the text covered by marks with a given annotationId
function getAnnotatedText(editor: Editor, annotationId: string): string {
  const { doc } = editor.state;
  const markType = editor.schema.marks.annotation;
  if (!markType) return "";
  const parts: string[] = [];
  doc.descendants((node) => {
    if (!node.isText) return;
    if (node.marks.some((m) => m.type === markType && m.attrs.annotationId === annotationId)) {
      parts.push(node.text ?? "");
    }
  });
  const full = parts.join("").slice(0, 40);
  return full.length < parts.join("").length ? full + "…" : full;
}

export function AnnotationPanel({ editor, annotations, onChange }: Props) {
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  function addAnnotation() {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const id = nanoid(8);
    editor.chain().focus().setAnnotation(id).run();
    const next = { ...annotations, [id]: "" };
    onChange(next);
    setTimeout(() => textareaRefs.current[id]?.focus(), 50);
  }

  function removeAnnotation(id: string) {
    editor.commands.removeAnnotation(id);
    const next = { ...annotations };
    delete next[id];
    onChange(next);
  }

  function updateText(id: string, text: string) {
    onChange({ ...annotations, [id]: text });
  }

  const [selectionEmpty, setSelectionEmpty] = useState(() => editor.state.selection.empty);

  useEffect(() => {
    const update = () => setSelectionEmpty(editor.state.selection.empty);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const ids = Object.keys(annotations);
  const empty = selectionEmpty;

  return (
    <>
      <div className={styles.addBar}>
        <button
          className={`${styles.addBtn} ${empty ? styles.addBtnDisabled : ""}`}
          onClick={addAnnotation}
          disabled={empty}
          title={empty ? "Select text to annotate" : "Add annotation"}
        >
          + Add
        </button>
      </div>

      <div className={styles.list}>
        {ids.length === 0 && (
          <p className={styles.empty}>Select text and click + Add to annotate.</p>
        )}
        {ids.map((id) => {
          const excerpt = getAnnotatedText(editor, id);
          return (
            <div key={id} className={styles.item}>
              {excerpt && (
                <div className={styles.excerpt} title={excerpt}>"{excerpt}"</div>
              )}
              <div className={styles.itemBody}>
                <textarea
                  ref={(el) => { textareaRefs.current[id] = el; }}
                  className={styles.textarea}
                  value={annotations[id]}
                  onChange={(e) => updateText(id, e.target.value)}
                  placeholder="Write a comment…"
                  rows={3}
                />
                <button
                  className={styles.deleteBtn}
                  onClick={() => removeAnnotation(id)}
                  title="Remove annotation"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
