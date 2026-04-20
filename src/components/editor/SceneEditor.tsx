"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { PanelRight, MessageSquare, Camera, GitPullRequestArrow, X } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Typography from "@tiptap/extension-typography";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { TableKit } from "@tiptap/extension-table";
import { FontSize } from "./extensions/FontSize";
import { LineHeight, DEFAULT_LINE_HEIGHT } from "./extensions/LineHeight";
import { SearchHighlight } from "./extensions/SearchHighlight";
import { FocusMode } from "./extensions/FocusMode";
import { Annotation } from "./extensions/Annotation";
import { EmptyParaClass } from "./extensions/EmptyParaClass";
import { Suggesting } from "./extensions/Suggesting";
import { stripLineHeightAttrs } from "./contentMigration";
import { AnnotationPanel } from "./AnnotationPanel";
import { SuggestionsPanel } from "./SuggestionsPanel";
import { EditorToolbar } from "./EditorToolbar";
import { FindBar } from "./FindBar";
import { WordCount } from "./WordCount";
import { SessionGoal } from "./SessionGoal";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useEditorStore } from "@/store/editorStore";
import { useProjectStore } from "@/store/projectStore";
import { loadScene, saveScene } from "@/lib/documentService";
import type { SceneDocument, SceneSnapshot, SuggestionMeta, ID } from "@/types";
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
  const updateWordCount = useProjectStore((s) => s.updateWordCount);
  const { markEditorDirty, markEditorClean, zenMode, exitZenMode, toggleZenMode, addSessionWords, typewriterMode, focusMode } = useEditorStore();
  const [doc, setDoc] = useState<SceneDocument | null>(null);
  const [contentSnapshot, setContentSnapshot] = useState<object | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"synopsis" | "annotations" | "snapshots" | "suggestions" | null>(null);
  const [suggestingEnabled, setSuggestingEnabled] = useState(false);
  const [suggestions, setSuggestions] = useState<Record<string, SuggestionMeta>>({});
  const suggestionsRef = useRef<Record<string, SuggestionMeta>>({});
  suggestionsRef.current = suggestions;
  const [synopsis, setSynopsis] = useState("");
  const synopsisRef = useRef(synopsis);
  const lastWordCountRef = useRef(0);
  const [annotations, setAnnotations] = useState<Record<string, string>>({});
  const annotationsRef = useRef(annotations);
  const [snapshots, setSnapshots] = useState<SceneSnapshot[]>([]);
  const snapshotsRef = useRef<SceneSnapshot[]>([]);
  const [snapLabelInput, setSnapLabelInput] = useState("");
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);

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
  annotationsRef.current     = annotations;
  snapshotsRef.current       = snapshots;

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
      FocusMode,
      Annotation,
      EmptyParaClass,
      Suggesting.configure({
        onSuggestionCreated: (id, kind) => {
          // Seed a metadata entry as soon as the plugin mints a new id, so the
          // sidebar shows the card immediately without waiting on the render
          // reconcile effect.
          const existing = suggestionsRef.current[id];
          if (existing) return;
          const next = {
            ...suggestionsRef.current,
            [id]: {
              id,
              kind,
              comment: "",
              createdAt: new Date().toISOString(),
            },
          };
          suggestionsRef.current = next;
          setSuggestions(next);
        },
        onSuggestionResolved: (id) => {
          const next = { ...suggestionsRef.current };
          delete next[id];
          suggestionsRef.current = next;
          setSuggestions(next);
        },
      }),
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

  // Click on an annotation mark → open the annotation panel
  useEffect(() => {
    if (!editor || inline) return;
    const dom = editor.view.dom;
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest(".annotation-mark");
      if (!target) return;
      setSidebarTab("annotations");
    }
    dom.addEventListener("click", handleClick);
    return () => dom.removeEventListener("click", handleClick);
  }, [editor, inline]);

  // Typewriter scrolling in normal mode (non-zen): keep cursor at ~38% from top
  useEffect(() => {
    if (!editor || !typewriterMode || zenMode) return;
    const handler = () => {
      const container = scrollRef.current;
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
  }, [editor, typewriterMode, zenMode]);

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
      setAnnotations(loaded.annotations ?? {});
      setSnapshots(loaded.snapshots ?? []);
      const loadedSuggestions = loaded.suggestions ?? {};
      setSuggestions(loadedSuggestions);
      suggestionsRef.current = loadedSuggestions;
      lastWordCountRef.current = loaded.wordCount ?? 0;
      // Strip legacy per-paragraph lineHeight attrs from old documents
      // (the attribute is no longer in the schema; without this, inline
      // style="line-height: X" would leak through and override global line-height).
      const migratedContent = stripLineHeightAttrs(loaded.content);
      // @ts-ignore
      editor.commands.setContent(migratedContent as object, false);
      // Restore per-scene global line-height
      editor.chain().setLineHeight(loaded.lineHeight ?? DEFAULT_LINE_HEIGHT).run();
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
          snapshots: snapshotsRef.current,
          suggestions: suggestionsRef.current,
        });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async () => {
    if (!projectPath || !editor || !doc) return;
    const words = (editor.storage.characterCount?.words() as number) ?? 0;
    // Track session words added (positive delta only)
    const delta = words - lastWordCountRef.current;
    if (delta > 0) addSessionWords(delta);
    lastWordCountRef.current = words;
    await saveScene(projectPath, folder, {
      ...doc,
      content: editor.getJSON(),
      wordCount: words,
      synopsis: synopsisRef.current,
      annotations: annotationsRef.current,
      snapshots: snapshotsRef.current,
      suggestions: suggestionsRef.current,
      lineHeight: editor.storage.lineHeight?.current ?? DEFAULT_LINE_HEIGHT,
    });
    updateWordCount(nodeId, words);
    hasPendingSave.current = false; // timed save succeeded — unmount flush not needed
    markEditorClean();
  }, [projectPath, editor, doc, folder, nodeId, markEditorClean, updateWordCount, addSessionWords]);

  // Debounced save when only synopsis changes (preserve current annotations).
  // IMPORTANT: always forward `pendingContentRef.current` rather than `doc.content`
  // so we never overwrite a newer in-memory draft (e.g. marks from suggesting mode)
  // with the snapshot that was on disk when the scene was first opened.
  useEffect(() => {
    if (!projectPath || !doc) return;
    const timer = setTimeout(() => {
      saveScene(projectPath, folder, {
        ...doc,
        content: pendingContentRef.current ?? doc.content,
        synopsis,
        annotations: annotationsRef.current,
        suggestions: suggestionsRef.current,
      });
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [synopsis]);

  // Debounced save when annotations change (editor content may be unchanged)
  useEffect(() => {
    if (!projectPath || !doc) return;
    const timer = setTimeout(() => {
      saveScene(projectPath, folder, {
        ...doc,
        content: pendingContentRef.current ?? doc.content,
        synopsis: synopsisRef.current,
        annotations,
        suggestions: suggestionsRef.current,
      });
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annotations]);

  // Debounced save when suggestion metadata (comments) changes without a doc edit
  useEffect(() => {
    if (!projectPath || !doc) return;
    const timer = setTimeout(() => {
      saveScene(projectPath, folder, {
        ...doc,
        content: pendingContentRef.current ?? doc.content,
        synopsis: synopsisRef.current,
        annotations: annotationsRef.current,
        snapshots: snapshotsRef.current,
        suggestions,
      });
    }, 600);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions]);

  // Keep the Suggesting plugin's state in sync with the React toggle.
  useEffect(() => {
    if (!editor) return;
    // @ts-ignore custom command declared by the Suggesting extension
    editor.commands.setSuggestingEnabled(suggestingEnabled);
  }, [editor, suggestingEnabled]);

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
      <EditorContent
        editor={editor}
        className={styles.editor}
        {...(focusMode ? { "data-focus-mode": "true" } : {})}
      />
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

  function toggleSidebar(tab: "synopsis" | "annotations" | "snapshots" | "suggestions") {
    setSidebarTab((cur) => (cur === tab ? null : tab));
  }

  function handleSnapshot(label: string) {
    if (!editor || !projectPath || !doc) return;
    const snap: SceneSnapshot = {
      id: crypto.randomUUID(),
      label: label.trim() || new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      content: editor.getJSON(),
      wordCount: (editor.storage.characterCount?.words() as number) ?? 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [snap, ...snapshotsRef.current];
    setSnapshots(updated);
    saveScene(projectPath, folder, {
      ...doc,
      synopsis: synopsisRef.current,
      annotations: annotationsRef.current,
      snapshots: updated,
    });
  }

  function handleRestore(snap: SceneSnapshot) {
    if (!editor || !projectPath || !doc) return;
    // Auto-save current state as a snapshot before restoring
    const autoSnap: SceneSnapshot = {
      id: crypto.randomUUID(),
      label: `Before restoring "${snap.label}"`,
      content: editor.getJSON(),
      wordCount: (editor.storage.characterCount?.words() as number) ?? 0,
      createdAt: new Date().toISOString(),
    };
    const updatedSnaps = [autoSnap, ...snapshotsRef.current];
    setSnapshots(updatedSnaps);
    setPendingRestoreId(null);
    // @ts-ignore
    editor.commands.setContent(snap.content as object, false);
    saveScene(projectPath, folder, {
      ...doc,
      content: snap.content,
      synopsis: synopsisRef.current,
      annotations: annotationsRef.current,
      snapshots: updatedSnaps,
    });
  }

  function handleDeleteSnapshot(snapId: string) {
    if (!projectPath || !doc) return;
    const updated = snapshotsRef.current.filter((s) => s.id !== snapId);
    setSnapshots(updated);
    saveScene(projectPath, folder, {
      ...doc,
      synopsis: synopsisRef.current,
      annotations: annotationsRef.current,
      snapshots: updated,
    });
  }

  return (
    <div className={styles.root}>
      <EditorToolbar
        editor={editor}
        activeSidebar={inline ? undefined : sidebarTab}
        onToggleSidebar={inline ? undefined : toggleSidebar}
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
          <SessionGoal />
        </div>
        {sidebarTab !== null && !inline && (
          <div className={styles.sidebarPanel}>
            <div className={styles.sidebarTabs}>
              <button
                className={`${styles.sidebarTab} ${sidebarTab === "synopsis" ? styles.sidebarTabActive : ""}`}
                onClick={() => setSidebarTab("synopsis")}
                title="Synopsis"
              >
                <PanelRight size={15} />
              </button>
              <button
                className={`${styles.sidebarTab} ${sidebarTab === "annotations" ? styles.sidebarTabActive : ""}`}
                onClick={() => setSidebarTab("annotations")}
                title="Annotations"
              >
                <MessageSquare size={15} />
              </button>
              <button
                className={`${styles.sidebarTab} ${sidebarTab === "snapshots" ? styles.sidebarTabActive : ""}`}
                onClick={() => setSidebarTab("snapshots")}
                title="Snapshots"
              >
                <Camera size={15} />
              </button>
              <button
                className={`${styles.sidebarTab} ${sidebarTab === "suggestions" ? styles.sidebarTabActive : ""}`}
                onClick={() => setSidebarTab("suggestions")}
                title="Suggestions (track changes)"
              >
                <GitPullRequestArrow size={15} />
              </button>
              <div className={styles.sidebarTabsDivider} />
              <button
                className={styles.sidebarClose}
                onClick={() => setSidebarTab(null)}
                title="Close panel"
              >
                <X size={13} />
              </button>
            </div>
            <div className={styles.sidebarContent}>
              {sidebarTab === "synopsis" && (
                <textarea
                  className={styles.synopsisTextarea}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder="Summarise this scene — its purpose, key beats, notes…"
                />
              )}
              {sidebarTab === "annotations" && (
                <AnnotationPanel
                  editor={editor}
                  annotations={annotations}
                  onChange={setAnnotations}
                />
              )}
              {sidebarTab === "suggestions" && (
                <SuggestionsPanel
                  editor={editor}
                  suggestingEnabled={suggestingEnabled}
                  onToggleEnabled={setSuggestingEnabled}
                  suggestions={suggestions}
                  onChange={setSuggestions}
                />
              )}
              {sidebarTab === "snapshots" && (
                <div className={styles.snapshotPanel}>
                  <div className={styles.snapshotSaveArea}>
                    <input
                      className={styles.snapshotLabelInput}
                      placeholder="Label (optional)…"
                      value={snapLabelInput}
                      onChange={(e) => setSnapLabelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSnapshot(snapLabelInput);
                          setSnapLabelInput("");
                        }
                      }}
                    />
                    <button
                      className={styles.snapshotSaveBtn}
                      onClick={() => { handleSnapshot(snapLabelInput); setSnapLabelInput(""); }}
                    >
                      Save
                    </button>
                  </div>
                  {snapshots.length === 0 ? (
                    <p className={styles.snapshotEmpty}>
                      No snapshots yet. Save one before a major edit.
                    </p>
                  ) : (
                    <ul className={styles.snapshotList}>
                      {snapshots.map((snap) => (
                        <li key={snap.id} className={styles.snapshotItem}>
                          <div className={styles.snapshotMeta}>
                            <span className={styles.snapshotDate}>
                              {new Date(snap.createdAt).toLocaleString(undefined, {
                                month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </span>
                            <span className={styles.snapshotWords}>
                              {snap.wordCount.toLocaleString()} w
                            </span>
                          </div>
                          <span className={styles.snapshotItemLabel}>{snap.label}</span>
                              <div className={styles.snapshotItemActions}>
                            {pendingRestoreId === snap.id ? (
                              <>
                                <span className={styles.snapshotConfirmText}>Restore this?</span>
                                <button
                                  className={styles.snapshotConfirmBtn}
                                  onClick={() => handleRestore(snap)}
                                >
                                  Yes
                                </button>
                                <button
                                  className={styles.snapshotDeleteBtn}
                                  onClick={() => setPendingRestoreId(null)}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className={styles.snapshotRestoreBtn}
                                  onClick={() => setPendingRestoreId(snap.id)}
                                >
                                  Restore
                                </button>
                                <button
                                  className={styles.snapshotDeleteBtn}
                                  onClick={() => handleDeleteSnapshot(snap.id)}
                                  title="Delete snapshot"
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
