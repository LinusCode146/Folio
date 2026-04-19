"use client";

import { useState, useRef } from "react";
import { useEditorStore } from "@/store/editorStore";
import styles from "./SessionGoal.module.css";

export function SessionGoal() {
  const { sessionWordsAdded, sessionGoal, setSessionGoal } = useEditorStore();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pct = sessionGoal > 0 ? Math.min((sessionWordsAdded / sessionGoal) * 100, 100) : 0;
  const done = sessionWordsAdded >= sessionGoal && sessionGoal > 0;

  function openEdit() {
    setInputVal(String(sessionGoal));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commitEdit() {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n) && n > 0) setSessionGoal(n);
    setEditing(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <div className={`${styles.root} ${done ? styles.done : ""}`} onClick={!editing ? openEdit : undefined} title="Click to set daily goal">
      {editing ? (
        <input
          ref={inputRef}
          className={styles.input}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKey}
          type="number"
          min={1}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={styles.label}>
          {sessionWordsAdded.toLocaleString()} / {sessionGoal.toLocaleString()} today
        </span>
      )}
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
