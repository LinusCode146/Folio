"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered, ChevronDown, AlignJustify, Table2, PanelRight,
} from "lucide-react";
import styles from "./EditorToolbar.module.css";

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Palatino", value: "'Palatino Linotype', Palatino, 'Book Antiqua', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Garamond", value: "Garamond, serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Calibri", value: "Calibri, 'Gill Sans', sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];

const FONT_SIZES = ["10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48"];

const LINE_HEIGHTS = [
  { label: "Single", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "Double", value: "2" },
  { label: "2.5", value: "2.5" },
  { label: "Triple", value: "3" },
];

interface Props {
  editor: Editor;
  onToggleSynopsis?: () => void;
  synopsisOpen?: boolean;
}

export function EditorToolbar({ editor, onToggleSynopsis, synopsisOpen }: Props) {
  const [sizeInput, setSizeInput] = useState("12");
  const [fontOpen, setFontOpen] = useState(false);
  const [fontPos, setFontPos] = useState({ top: 0, left: 0 });
  const fontBtnRef = useRef<HTMLButtonElement>(null);

  const [lineOpen, setLineOpen] = useState(false);
  const [linePos, setLinePos] = useState({ top: 0, left: 0 });
  const lineBtnRef = useRef<HTMLButtonElement>(null);

  const [tableOpen, setTableOpen] = useState(false);
  const [tablePos, setTablePos] = useState({ top: 0, left: 0 });
  const tableBtnRef = useRef<HTMLButtonElement>(null);
  const [gridHover, setGridHover] = useState({ cols: 0, rows: 0 });

  // Sync size input from selection
  useEffect(() => {
    const update = () => {
      const attrs = editor.getAttributes("textStyle");
      setSizeInput(attrs.fontSize ?? "12");
    };
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!fontOpen) return;
    function handler(e: MouseEvent) {
      if (fontBtnRef.current && !fontBtnRef.current.contains(e.target as Node)) {
        setFontOpen(false);
      }
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [fontOpen]);

  useEffect(() => {
    if (!lineOpen) return;
    function handler(e: MouseEvent) {
      if (lineBtnRef.current && !lineBtnRef.current.contains(e.target as Node)) {
        setLineOpen(false);
      }
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [lineOpen]);

  useEffect(() => {
    if (!tableOpen) return;
    function handler(e: MouseEvent) {
      if (tableBtnRef.current && !tableBtnRef.current.contains(e.target as Node)) {
        setTableOpen(false);
      }
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [tableOpen]);

  const openTableDropdown = () => {
    if (tableBtnRef.current) {
      const rect = tableBtnRef.current.getBoundingClientRect();
      setTablePos({ top: rect.bottom + 4, left: rect.left });
    }
    setTableOpen((o) => !o);
  };

  const openFontDropdown = () => {
    if (fontBtnRef.current) {
      const rect = fontBtnRef.current.getBoundingClientRect();
      setFontPos({ top: rect.bottom + 4, left: rect.left });
    }
    setFontOpen((o) => !o);
  };

  const openLineDropdown = () => {
    if (lineBtnRef.current) {
      const rect = lineBtnRef.current.getBoundingClientRect();
      setLinePos({ top: rect.bottom + 4, left: rect.left });
    }
    setLineOpen((o) => !o);
  };

  const applySize = useCallback(
    (size: string) => {
      const n = parseFloat(size);
      if (!isNaN(n) && n > 0) {
        editor.chain().focus().setFontSize(String(n)).run();
        setSizeInput(String(n));
      }
    },
    [editor]
  );

  const currentFont = editor.getAttributes("textStyle").fontFamily ?? "";
  const currentFontLabel =
    FONT_FAMILIES.find((f) => f.value === currentFont)?.label ?? "Default";

  const btn = (
    active: boolean,
    onClick: () => void,
    icon: React.ReactNode,
    title: string
  ) => (
    <button
      className={`${styles.btn} ${active ? styles.active : ""}`}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div className={styles.toolbar}>
      {/* Font family */}
      <button
        ref={fontBtnRef}
        className={styles.fontBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openFontDropdown}
        title="Font family"
      >
        <span className={styles.fontLabel}>{currentFontLabel}</span>
        <ChevronDown size={11} />
      </button>

      {fontOpen && typeof document !== "undefined" && createPortal(
        <div
          className={styles.dropdownMenu}
          style={{ top: fontPos.top, left: fontPos.left }}
        >
          {FONT_FAMILIES.map((f) => (
            <button
              key={f.value}
              className={`${styles.dropdownItem} ${currentFont === f.value ? styles.dropdownActive : ""}`}
              style={{ fontFamily: f.value || "inherit" }}
              onMouseDown={(e) => {
                e.preventDefault();
                if (f.value) {
                  editor.chain().focus().setFontFamily(f.value).run();
                } else {
                  editor.chain().focus().unsetFontFamily().run();
                }
                setFontOpen(false);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>,
        document.body
      )}

      <div className={styles.sep} />

      {/* Font size */}
      <div className={styles.sizeControl}>
        <input
          className={styles.sizeInput}
          type="number"
          min="6"
          max="144"
          value={sizeInput}
          onChange={(e) => setSizeInput(e.target.value)}
          onBlur={(e) => applySize(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applySize(sizeInput);
              editor.commands.focus();
            }
          }}
          title="Font size (pt)"
        />
        <div className={styles.sizePresets}>
          {FONT_SIZES.map((s) => (
            <button
              key={s}
              className={`${styles.sizePreset} ${sizeInput === s ? styles.active : ""}`}
              onMouseDown={(e) => { e.preventDefault(); applySize(s); }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.sep} />

      {/* Line height */}
      <button
        ref={lineBtnRef}
        className={styles.lineBtn}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openLineDropdown}
        title="Line spacing"
      >
        <AlignJustify size={13} />
        <ChevronDown size={11} />
      </button>

      {lineOpen && typeof document !== "undefined" && createPortal(
        <div
          className={styles.dropdownMenu}
          style={{ top: linePos.top, left: linePos.left }}
        >
          {LINE_HEIGHTS.map((lh) => {
            const current = editor.getAttributes("paragraph").lineHeight ?? editor.getAttributes("heading").lineHeight;
            return (
              <button
                key={lh.value}
                className={`${styles.dropdownItem} ${current === lh.value ? styles.dropdownActive : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setLineHeight(lh.value).run();
                  setLineOpen(false);
                }}
              >
                {lh.label}
              </button>
            );
          })}
        </div>,
        document.body
      )}

      <div className={styles.sep} />

      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold size={14} />, "Bold (⌘B)")}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic size={14} />, "Italic (⌘I)")}

      <div className={styles.sep} />

      {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), <Heading1 size={14} />, "Heading 1")}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 size={14} />, "Heading 2")}
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List size={14} />, "Bullet list")}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={14} />, "Ordered list")}

      <div className={styles.sep} />

      {/* Table */}
      <button
        ref={tableBtnRef}
        className={`${styles.btn} ${editor.isActive("table") ? styles.active : ""}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={openTableDropdown}
        title="Table"
      >
        <Table2 size={14} />
      </button>

      {onToggleSynopsis && (
        <>
          <div className={styles.spacer} />
          <button
            className={`${styles.btn} ${synopsisOpen ? styles.active : ""}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleSynopsis}
            title="Synopsis"
          >
            <PanelRight size={14} />
          </button>
          <div className={styles.sep} />
        </>
      )}

      {tableOpen && typeof document !== "undefined" && createPortal(
        <div className={styles.tableMenu} style={{ top: tablePos.top, left: tablePos.left }}>
          {/* Grid picker for insert */}
          <div className={styles.tableMenuSection}>
            <div className={styles.tableMenuLabel}>
              {gridHover.cols > 0
                ? `Insert ${gridHover.cols} × ${gridHover.rows} table`
                : "Insert table"}
            </div>
            <div className={styles.gridPicker}>
              {Array.from({ length: 6 }, (_, row) =>
                Array.from({ length: 8 }, (_, col) => (
                  <div
                    key={`${row}-${col}`}
                    className={`${styles.gridCell} ${
                      col < gridHover.cols && row < gridHover.rows ? styles.gridCellActive : ""
                    }`}
                    onMouseEnter={() => setGridHover({ cols: col + 1, rows: row + 1 })}
                    onMouseLeave={() => setGridHover({ cols: 0, rows: 0 })}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor.chain().focus().insertTable({
                        rows: row + 1,
                        cols: col + 1,
                        withHeaderRow: true,
                      }).run();
                      setTableOpen(false);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Row / col / cell operations — only when inside a table */}
          {editor.isActive("table") && (
            <>
              <div className={styles.tableMenuDivider} />
              <div className={styles.tableMenuSection}>
                <div className={styles.tableMenuLabel}>Rows</div>
                <button className={styles.tableMenuBtn} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowBefore().run(); setTableOpen(false); }}>Add row above</button>
                <button className={styles.tableMenuBtn} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); setTableOpen(false); }}>Add row below</button>
                <button className={`${styles.tableMenuBtn} ${styles.tableMenuDanger}`} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); setTableOpen(false); }}>Delete row</button>
              </div>
              <div className={styles.tableMenuDivider} />
              <div className={styles.tableMenuSection}>
                <div className={styles.tableMenuLabel}>Columns</div>
                <button className={styles.tableMenuBtn} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnBefore().run(); setTableOpen(false); }}>Add column left</button>
                <button className={styles.tableMenuBtn} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); setTableOpen(false); }}>Add column right</button>
                <button className={`${styles.tableMenuBtn} ${styles.tableMenuDanger}`} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); setTableOpen(false); }}>Delete column</button>
              </div>
              <div className={styles.tableMenuDivider} />
              <div className={styles.tableMenuSection}>
                <div className={styles.tableMenuLabel}>Cells</div>
                <button className={styles.tableMenuBtn} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().mergeCells().run(); setTableOpen(false); }}>Merge cells</button>
                <button className={styles.tableMenuBtn} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().splitCell().run(); setTableOpen(false); }}>Split cell</button>
                <button className={styles.tableMenuBtn} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeaderRow().run(); setTableOpen(false); }}>Toggle header row</button>
                <button className={styles.tableMenuBtn} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeaderColumn().run(); setTableOpen(false); }}>Toggle header column</button>
              </div>
              <div className={styles.tableMenuDivider} />
              <div className={styles.tableMenuSection}>
                <button className={`${styles.tableMenuBtn} ${styles.tableMenuDanger}`} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); setTableOpen(false); }}>Delete table</button>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
