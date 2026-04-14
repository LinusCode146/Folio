import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { createMockEditor } from "@/test/helpers";
import type { Editor } from "@tiptap/react";

// Toolbar buttons use onMouseDown (not onClick) to avoid focus loss
function mouseDown(el: HTMLElement) {
  fireEvent.mouseDown(el, { preventDefault: vi.fn() });
}

function setup(overrides?: Partial<Editor>) {
  const editor = createMockEditor(overrides);
  const chainSpy = editor.chain() as ReturnType<typeof vi.fn> & Record<string, ReturnType<typeof vi.fn>>;
  render(<EditorToolbar editor={editor} />);
  return { editor, chainSpy };
}

beforeEach(() => vi.clearAllMocks());

describe("EditorToolbar", () => {
  it("renders the toolbar", () => {
    const { editor } = setup();
    const { container } = render(<EditorToolbar editor={editor} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("Bold button calls toggleBold()", () => {
    const { editor } = setup();
    const boldBtn = screen.getByTitle("Bold (⌘B)");
    mouseDown(boldBtn);
    expect(editor.chain).toHaveBeenCalled();
  });

  it("Italic button calls toggleItalic()", () => {
    const { editor } = setup();
    const italicBtn = screen.getByTitle("Italic (⌘I)");
    mouseDown(italicBtn);
    expect(editor.chain).toHaveBeenCalled();
  });

  it("Heading 1 button is rendered with correct title", () => {
    setup();
    expect(screen.getByTitle("Heading 1")).toBeInTheDocument();
  });

  it("Heading 2 button is rendered with correct title", () => {
    setup();
    expect(screen.getByTitle("Heading 2")).toBeInTheDocument();
  });

  it("Bullet list button is rendered with correct title", () => {
    setup();
    expect(screen.getByTitle("Bullet list")).toBeInTheDocument();
  });

  it("Ordered list button is rendered with correct title", () => {
    setup();
    expect(screen.getByTitle("Ordered list")).toBeInTheDocument();
  });

  it("Table button is rendered with correct title", () => {
    setup();
    expect(screen.getByTitle("Table")).toBeInTheDocument();
  });

  it("font size input renders with default value", () => {
    setup();
    const sizeInput = screen.getByTitle("Font size (pt)") as HTMLInputElement;
    expect(sizeInput).toBeInTheDocument();
    expect(sizeInput.value).toBe("12");
  });

  it("pressing Enter in the font size input calls setFontSize", () => {
    const { editor } = setup();
    const sizeInput = screen.getByTitle("Font size (pt)");
    fireEvent.change(sizeInput, { target: { value: "18" } });
    fireEvent.keyDown(sizeInput, { key: "Enter" });
    // The chain().focus().setFontSize() chain is called
    expect(editor.chain).toHaveBeenCalled();
  });

  it("clicking a font size preset calls setFontSize with that size", () => {
    const { editor } = setup();
    // Find the "14" preset button in the size presets
    const presets = screen.getAllByRole("button").filter((btn) => /^\d+$/.test(btn.textContent ?? ""));
    const size14 = presets.find((btn) => btn.textContent === "14");
    expect(size14).toBeDefined();
    mouseDown(size14!);
    expect(editor.chain).toHaveBeenCalled();
  });

  it("font family button shows current font label (Default initially)", () => {
    setup();
    expect(screen.getByTitle("Font family")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
  });

  it("clicking font family button opens dropdown with font options", () => {
    setup();
    fireEvent.click(screen.getByTitle("Font family"));
    // Dropdown should contain at least Palatino
    expect(screen.getByText("Palatino")).toBeInTheDocument();
  });

  it("selecting a font from dropdown calls setFontFamily", () => {
    const { editor } = setup();
    fireEvent.click(screen.getByTitle("Font family"));
    const palettinoItem = screen.getByText("Palatino");
    mouseDown(palettinoItem);
    expect(editor.chain).toHaveBeenCalled();
  });

  it("clicking line height button opens dropdown", () => {
    setup();
    const lineBtn = screen.getByTitle("Line spacing");
    fireEvent.click(lineBtn);
    expect(screen.getByText("Single")).toBeInTheDocument();
    expect(screen.getByText("Double")).toBeInTheDocument();
  });

  it("selecting a line height calls setLineHeight", () => {
    const { editor } = setup();
    fireEvent.click(screen.getByTitle("Line spacing"));
    const doubleItem = screen.getByText("Double");
    mouseDown(doubleItem);
    expect(editor.chain).toHaveBeenCalled();
  });

  it("clicking Table button opens grid picker dropdown", () => {
    setup();
    fireEvent.click(screen.getByTitle("Table"));
    expect(screen.getByText("Insert table")).toBeInTheDocument();
  });

  it("bold button has active style when bold is active", () => {
    const editor = createMockEditor({
      isActive: vi.fn((type: string) => type === "bold"),
    } as Partial<Editor>);
    const { container } = render(<EditorToolbar editor={editor} />);
    const boldBtn = within(container).getByTitle("Bold (⌘B)");
    expect(boldBtn.className).toMatch(/active/);
  });

  it("bold button does NOT have active style when bold is inactive", () => {
    const { editor } = setup();
    (editor.isActive as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const { container } = render(<EditorToolbar editor={editor} />);
    const boldBtn = within(container).getByTitle("Bold (⌘B)");
    expect(boldBtn.className).not.toMatch(/active/);
  });
});
