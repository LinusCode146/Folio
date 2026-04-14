import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { WordCount } from "@/components/editor/WordCount";
import { createMockEditor } from "@/test/helpers";

describe("WordCount", () => {
  it("displays word count from editor storage", () => {
    const editor = createMockEditor();
    (editor.storage.characterCount.words as ReturnType<typeof vi.fn>).mockReturnValue(123);
    render(<WordCount editor={editor} />);
    expect(screen.getByText(/123/)).toBeInTheDocument();
  });

  it("displays character count from editor storage", () => {
    const editor = createMockEditor();
    (editor.storage.characterCount.characters as ReturnType<typeof vi.fn>).mockReturnValue(456);
    render(<WordCount editor={editor} />);
    expect(screen.getByText(/456/)).toBeInTheDocument();
  });

  it("shows 0 words when characterCount returns 0", () => {
    const editor = createMockEditor();
    (editor.storage.characterCount.words as ReturnType<typeof vi.fn>).mockReturnValue(0);
    (editor.storage.characterCount.characters as ReturnType<typeof vi.fn>).mockReturnValue(0);
    render(<WordCount editor={editor} />);
    expect(screen.getByText(/0/)).toBeInTheDocument();
  });

  it("renders 'words' label in the output", () => {
    const editor = createMockEditor();
    render(<WordCount editor={editor} />);
    expect(screen.getByText(/words/i)).toBeInTheDocument();
  });

  it("renders 'chars' label in the output", () => {
    const editor = createMockEditor();
    render(<WordCount editor={editor} />);
    expect(screen.getByText(/chars/i)).toBeInTheDocument();
  });
});
