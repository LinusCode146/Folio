"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { TableKit } from "@tiptap/extension-table";
import { FontSize } from "./extensions/FontSize";
import { LineHeight } from "./extensions/LineHeight";
import { SearchHighlight } from "./extensions/SearchHighlight";
import { EditorToolbar } from "./EditorToolbar";
import { FindBar } from "./FindBar";
import { WordCount } from "./WordCount";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useEditorStore } from "@/store/editorStore";
import { useProjectStore } from "@/store/projectStore";
import { loadScene, saveScene } from "@/lib/documentService";
import type { SceneDocument, ID } from "@/types";
import type { Editor } from "@tiptap/react";
import styles from "./SceneEditor.module.css";

interface Props {
  nodeId: ID;
  folder: "scenes" | "notes";
  title: string;
  inline?: boolean;
  onFocusEditor?: (editor: Editor) => void;
}

export function SceneEditor({ nodeId, folder, title, inline = false, onFocusEditor }: Props) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const projectName = useProjectStore((s) => s.project?.name ?? "");
  const { markEditorDirty, markEditorClean, zenMode, exitZenMode, toggleZenMode } = useEditorStore();
  const [doc, setDoc] = useState<SceneDocument | null>(null);
  const [contentSnapshot, setContentSnapshot] = useState<object | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [synopsis, setSynopsis] = useState("");
  const synopsisRef = useRef(synopsis);

  // Refs that are always current — used by onUpdate (stale closure) and the
  // unmount flush (editor already destroyed by then, so we can't call getJSON).
  const pendingContentRef    = useRef<object | null>(null);
  const pendingDocRef        = useRef<SceneDocument | null>(null);
  const pendingProjectPath   = useRef<string | null>(null);
  const hasPendingSave       = useRef(false);

  // Keep the sync refs up-to-date on every render (outside effects).
  pendingDocRef.current      = doc;
  pendingProjectPath.current = projectPath;
  synopsisRef.current        = synopsis;

  // Zen mode: fade-in overlay controls
  const [zenControlsVisible, setZenControlsVisible] = useState(false);
  const zenIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const zenScrollRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Begin writing…" }),
      CharacterCount,
      Typography,
      TextStyle,
      FontFamily,
      TableKit,
      FontSize,
      LineHeight,
      SearchHighlight,
    ],
    content: { type: "doc", content: [] },
    onFocus: ({ editor }) => {
      onFocusEditor?.(editor as Editor);
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      // Store serialized content while the editor is still alive so the
      // unmount flush can write it even after the editor is destroyed.
      pendingContentRef.current = json;
      hasPendingSave.current = true;
      markEditorDirty();
      setContentSnapshot(json);
    },
  });

  // Typewriter scrolling: keep cursor at ~40% from top when in zen mode
  useEffect(() => {
    if (!editor || !zenMode) return;
    const handler = () => {
      const container = zenScrollRef.current;
      if (!container) return;
      const { anchor } = editor.state.selection;
      try {
        const coords = editor.view.coordsAtPos(anchor);
        const rect = container.getBoundingClientRect();
        const target = rect.top + rect.height * 0.38;
        const delta = coords.top - target;
        if (Math.abs(delta) > 4) {
          container.scrollTop += delta;
        }
      } catch {
        // ignore out-of-range coords
      }
    };
    editor.on("update", handler);
    editor.on("selectionUpdate", handler);
    return () => {
      editor.off("update", handler);
      editor.off("selectionUpdate", handler);
    };
  }, [editor, zenMode]);

  // Zen controls fade logic
  const showZenControls = useCallback(() => {
    setZenControlsVisible(true);
    if (zenIdleTimer.current) clearTimeout(zenIdleTimer.current);
    zenIdleTimer.current = setTimeout(() => setZenControlsVisible(false), 2500);
  }, []);

  useEffect(() => {
    if (!zenMode) return;
    window.addEventListener("mousemove", showZenControls);
    window.addEventListener("keydown", showZenControls);
    return () => {
      window.removeEventListener("mousemove", showZenControls);
      window.removeEventListener("keydown", showZenControls);
      if (zenIdleTimer.current) clearTimeout(zenIdleTimer.current);
    };
  }, [zenMode, showZenControls]);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setFindOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        toggleZenMode();
      }
      if (e.key === "Escape" && zenMode) {
        exitZenMode();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zenMode, toggleZenMode, exitZenMode]);

  // Load document once the editor is ready.
  // `editor` starts as null (immediatelyRender: false) and becomes non-null
  // after mount — so this effect must re-run when editor transitions to ready.
  useEffect(() => {
    if (!projectPath || !editor) return;
    let cancelled = false;

    loadScene(projectPath, folder, nodeId).then((loaded) => {
      if (cancelled || editor.isDestroyed) return;
      setDoc(loaded);
      pendingDocRef.current = loaded;
      setSynopsis(loaded.synopsis ?? "");
      // @ts-ignore
      editor.commands.setContent(loaded.content as object, false);
      markEditorClean();
    }).catch(console.error);

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, projectPath]);

  // Flush unsaved content to disk on unmount (e.g. user switches scenes within
  // the 1-second debounce window). The editor is already destroyed at this point
  // so we use pre-serialized content stored in refs by onUpdate.
  useEffect(() => {
    return () => {
      if (
        hasPendingSave.current &&
        pendingContentRef.current &&
        pendingProjectPath.current &&
        pendingDocRef.current
      ) {
        saveScene(pendingProjectPath.current, folder, {
          ...pendingDocRef.current,
          content: pendingContentRef.current,
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async () => {
    if (!projectPath || !editor || !doc) return;
    const words = (editor.storage.characterCount?.words() as number) ?? 0;
    await saveScene(projectPath, folder, {
      ...doc,
      content: editor.getJSON(),
      wordCount: words,
      synopsis: synopsisRef.current,
    });
    hasPendingSave.current = false; // timed save succeeded — unmount flush not needed
    markEditorClean();
  }, [projectPath, editor, doc, folder, markEditorClean]);

  // Debounced save when only synopsis changes (editor content unchanged)
  useEffect(() => {
    if (!projectPath || !doc) return;
    const timer = setTimeout(() => {
      saveScene(projectPath, folder, { ...doc, synopsis });
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synopsis]);

  useAutoSave(contentSnapshot, handleSave);

  if (!editor) return null;

  const wordCount = (editor.storage.characterCount?.words() as number) ?? 0;

  // Inline (scrivenings) mode: no toolbar, no title, no scroll wrapper
  if (inline) {
    return (
      <div className={styles.inlineRoot}>
        <EditorContent editor={editor} className={styles.editor} />
      </div>
    );
  }

  const pageContent = (
    <div className={styles.page}>
      <h1 className={styles.docTitle}>{title}</h1>
      <EditorContent editor={editor} className={styles.editor} />
    </div>
  );

  if (zenMode && typeof document !== "undefined") {
    return (
      <>
        {/* Normal slot stays mounted so editor doesn't unmount */}
        <div className={styles.root} style={{ visibility: "hidden", pointerEvents: "none" }} />

        {createPortal(
          <div className={styles.zenOverlay}>
            {/* Fade-in top bar */}
            <div className={`${styles.zenBar} ${styles.zenBarTop} ${zenControlsVisible ? styles.zenBarVisible : ""}`}>
              <span className={styles.zenProjectName}>{projectName}</span>
              <span className={styles.zenTitle}>{title}</span>
              <button className={styles.zenExitBtn} onClick={exitZenMode} title="Exit zen mode (Esc)">
                Exit
              </button>
            </div>

            {/* Scrollable writing area */}
            <div className={styles.zenScroll} ref={zenScrollRef}>
              <div className={styles.zenPage}>
                <h1 className={styles.docTitle}>{title}</h1>
                <EditorContent editor={editor} className={styles.editor} />
              </div>
            </div>

            {/* Fade-in bottom bar */}
            <div className={`${styles.zenBar} ${styles.zenBarBottom} ${zenControlsVisible ? styles.zenBarVisible : ""}`}>
              <span className={styles.zenWordCount}>{wordCount.toLocaleString()} words</span>
              <span className={styles.zenHint}>Esc to exit · ⌘⇧Z to toggle</span>
            </div>

            {findOpen && (
              <FindBar editor={editor} onClose={() => setFindOpen(false)} />
            )}
          </div>,
          document.body
        )}
      </>
    );
  }

  return (
    <div className={styles.root}>
      <EditorToolbar
        editor={editor}
        onToggleSynopsis={inline ? undefined : () => setSynopsisOpen((o) => !o)}
        synopsisOpen={synopsisOpen}
      />
      {findOpen && (
        <FindBar editor={editor} onClose={() => setFindOpen(false)} />
      )}
      <div className={styles.body}>
        <div className={styles.editorColumn}>
          <div className={styles.scroll} ref={scrollRef}>
            {pageContent}
          </div>
          <WordCount editor={editor} />
        </div>
        {synopsisOpen && !inline && (
          <div className={styles.synopsisPanel}>
            <div className={styles.synopsisHeader}>
              <span className={styles.synopsisTitle}>Synopsis</span>
              <button
                className={styles.synopsisClose}
                onClick={() => setSynopsisOpen(false)}
                title="Close synopsis"
              >
                ✕
              </button>
            </div>
            <textarea
              className={styles.synopsisTextarea}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Summarise this scene — its purpose, key beats, notes…"
            />
          </div>
        )}
      </div>
    </div>
  );
}
