"use client";

import type { Editor } from "@tiptap/react";
import styles from "./WordCount.module.css";

interface Props { editor: Editor }

export function WordCount({ editor }: Props) {
  const chars = editor.storage.characterCount?.characters() ?? 0;
  const words = editor.storage.characterCount?.words() ?? 0;
  return (
    <div className={styles.count}>
      {words.toLocaleString()} {words === 1 ? "word" : "words"} · {chars.toLocaleString()} chars
    </div>
  );
}
