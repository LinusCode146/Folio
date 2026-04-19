"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { X, ChevronUp, ChevronDown, ArrowLeftRight } from "lucide-react";
import { getMatchPositions } from "./extensions/SearchHighlight";
import styles from "./FindBar.module.css";

interface Props {
  editor: Editor;
  onClose: () => void;
}

export function FindBar({ editor, onClose }: Props) {
  const [term, setTerm] = useState("");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [replaceVal, setReplaceVal] = useState("");
  const [replaceMsg, setReplaceMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Focus replace input when row opens
  useEffect(() => {
    if (replaceOpen) replaceRef.current?.focus();
  }, [replaceOpen]);

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
      setReplaceMsg(null);
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

  const handleReplace = useCallback(() => {
    if (count === 0) return;
    editor.commands.replaceCurrentMatch(replaceVal, currentIdx);
    // Re-read positions from the updated doc
    const next = getMatchPositions(editor.state.doc, term);
    if (next.length > 0) {
      const i = Math.min(currentIdx, next.length - 1);
      setCurrentIdx(i);
      editor.chain().focus().setTextSelection({ from: next[i].from, to: next[i].to }).scrollIntoView().run();
    } else {
      setCurrentIdx(0);
      editor.commands.focus();
    }
    setReplaceMsg(null);
  }, [count, currentIdx, editor, replaceVal, term]);

  const handleReplaceAll = useCallback(() => {
    if (count === 0) return;
    const n = count;
    editor.commands.replaceAllMatches(replaceVal);
    setCurrentIdx(0);
    setReplaceMsg(`Replaced ${n} ${n === 1 ? "occurrence" : "occurrences"}`);
  }, [count, editor, replaceVal]);

  const handleClose = useCallback(() => {
    editor.commands.setSearchTerm("");
    onClose();
  }, [editor, onClose]);

  return (
    <div className={styles.barWrap}>
      {/* Find row */}
      <div className={styles.bar}>
        <button
          className={`${styles.toggleBtn} ${replaceOpen ? styles.toggleBtnOpen : ""}`}
          onClick={() => setReplaceOpen((v) => !v)}
          title={replaceOpen ? "Hide replace" : "Show replace"}
        >
          <ArrowLeftRight size={13} />
        </button>
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
          {term ? (count === 0 ? "No matches" : `${Math.min(currentIdx + 1, count)} / ${count}`) : ""}
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

      {/* Replace row — expands via grid-template-rows, no height animation */}
      <div className={`${styles.replaceWrap} ${replaceOpen ? styles.replaceWrapOpen : ""}`}>
        <div className={styles.replaceRow}>
          <span className={styles.replaceSpacer} />
          <input
            ref={replaceRef}
            className={styles.input}
            placeholder="Replace…"
            value={replaceVal}
            onChange={(e) => { setReplaceVal(e.target.value); setReplaceMsg(null); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (e.metaKey || e.ctrlKey) handleReplaceAll();
                else handleReplace();
              }
            }}
          />
          <button
            className={styles.replaceBtn}
            onClick={handleReplace}
            disabled={count === 0}
            title="Replace current (Enter)"
          >
            Replace
          </button>
          <button
            className={styles.replaceBtn}
            onClick={handleReplaceAll}
            disabled={count === 0}
            title="Replace all (⌘Enter)"
          >
            All
          </button>
          {replaceMsg && <span className={styles.replaceCount}>{replaceMsg}</span>}
        </div>
      </div>
    </div>
  );
}
