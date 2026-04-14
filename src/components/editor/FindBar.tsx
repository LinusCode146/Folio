"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { getMatchPositions } from "./extensions/SearchHighlight";
import styles from "./FindBar.module.css";

interface Props {
  editor: Editor;
  onClose: () => void;
}

export function FindBar({ editor, onClose }: Props) {
  const [term, setTerm] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const matches = getMatchPositions(editor.state.doc, term);
  const count = matches.length;

  const handleChange = useCallback(
    (value: string) => {
      setTerm(value);
      setCurrentIdx(0);
      editor.commands.setSearchTerm(value);
    },
    [editor]
  );

  const goTo = useCallback(
    (idx: number) => {
      if (count === 0) return;
      const i = ((idx % count) + count) % count;
      setCurrentIdx(i);
      const { from, to } = matches[i];
      editor.chain().focus().setTextSelection({ from, to }).scrollIntoView().run();
    },
    [count, matches, editor]
  );

  const handleClose = useCallback(() => {
    editor.commands.setSearchTerm("");
    onClose();
  }, [editor, onClose]);

  return (
    <div className={styles.bar}>
      <input
        ref={inputRef}
        className={styles.input}
        placeholder="Find…"
        value={term}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            goTo(e.shiftKey ? currentIdx - 1 : currentIdx + 1);
          }
        }}
      />
      <span className={styles.count}>
        {term ? (count === 0 ? "No matches" : `${count > 0 ? Math.min(currentIdx + 1, count) : 0} / ${count}`) : ""}
      </span>
      <button className={styles.navBtn} onClick={() => goTo(currentIdx - 1)} title="Previous (Shift+Enter)" disabled={count === 0}>
        <ChevronUp size={13} />
      </button>
      <button className={styles.navBtn} onClick={() => goTo(currentIdx + 1)} title="Next (Enter)" disabled={count === 0}>
        <ChevronDown size={13} />
      </button>
      <button className={styles.closeBtn} onClick={handleClose} title="Close (Esc)">
        <X size={13} />
      </button>
    </div>
  );
}
