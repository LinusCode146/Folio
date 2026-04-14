import { describe, it, expect } from "vitest";
import { tiptapToPdfmake } from "@/lib/tiptapToPdfmake";

describe("tiptapToPdfmake", () => {
  it("returns empty array for null/undefined doc", () => {
    expect(tiptapToPdfmake(null)).toEqual([]);
    expect(tiptapToPdfmake(undefined)).toEqual([]);
    expect(tiptapToPdfmake({})).toEqual([]);
  });

  it("returns empty array for doc with no content", () => {
    expect(tiptapToPdfmake({ type: "doc" })).toEqual([]);
    expect(tiptapToPdfmake({ type: "doc", content: [] })).toEqual([]);
  });

  it("converts a paragraph node with text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello world" }],
        },
      ],
    };
    const result = tiptapToPdfmake(doc);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      alignment: "justify",
      style: "paragraph",
      margin: [0, 0, 0, 0],
    });
    const textContent = (result[0] as Record<string, unknown>).text as unknown[];
    expect(textContent[0]).toMatchObject({ text: "Hello world" });
  });

  it("converts an empty paragraph to a space placeholder", () => {
    const doc = {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
    const result = tiptapToPdfmake(doc);
    expect(result[0]).toMatchObject({ text: " ", style: "paragraph" });
  });

  it("converts heading level 1 with correct font size", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Chapter One" }],
        },
      ],
    };
    const result = tiptapToPdfmake(doc);
    expect(result[0]).toMatchObject({ fontSize: 18, bold: true });
  });

  it("converts heading level 2 with correct font size", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Section" }],
        },
      ],
    };
    expect(tiptapToPdfmake(doc)[0]).toMatchObject({ fontSize: 14, bold: true });
  });

  it("converts heading level 3 with correct font size", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 3 },
          content: [{ type: "text", text: "Sub" }],
        },
      ],
    };
    expect(tiptapToPdfmake(doc)[0]).toMatchObject({ fontSize: 12, bold: true });
  });

  it("applies bold mark", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Bold", marks: [{ type: "bold" }] }],
        },
      ],
    };
    const para = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    const inline = (para.text as Record<string, unknown>[])[0];
    expect(inline).toMatchObject({ text: "Bold", bold: true });
  });

  it("applies italic mark", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Slanted", marks: [{ type: "italic" }] }],
        },
      ],
    };
    const para = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    const inline = (para.text as Record<string, unknown>[])[0];
    expect(inline).toMatchObject({ text: "Slanted", italics: true });
  });

  it("applies strikethrough mark", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Strike", marks: [{ type: "strike" }] }],
        },
      ],
    };
    const para = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    const inline = (para.text as Record<string, unknown>[])[0];
    expect(inline).toMatchObject({ decoration: "lineThrough" });
  });

  it("applies code mark (Courier font + 10pt)", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "inline code", marks: [{ type: "code" }] }],
        },
      ],
    };
    const para = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    const inline = (para.text as Record<string, unknown>[])[0];
    expect(inline).toMatchObject({ font: "Courier", fontSize: 10 });
  });

  it("applies textStyle fontSize mark", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Big text",
              marks: [{ type: "textStyle", attrs: { fontSize: "24pt" } }],
            },
          ],
        },
      ],
    };
    const para = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    const inline = (para.text as Record<string, unknown>[])[0];
    expect((inline as Record<string, unknown>).fontSize).toBe(24);
  });

  it("converts hardBreak to newline string", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Line 1" },
            { type: "hardBreak" },
            { type: "text", text: "Line 2" },
          ],
        },
      ],
    };
    const para = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    const inline = para.text as unknown[];
    expect(inline).toContain("\n");
  });

  it("converts bulletList to pdfmake ul", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Item A" }] }],
            },
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Item B" }] }],
            },
          ],
        },
      ],
    };
    const result = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    expect(result).toHaveProperty("ul");
    expect((result.ul as unknown[]).length).toBe(2);
  });

  it("converts orderedList to pdfmake ol", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "orderedList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "Step 1" }] }],
            },
          ],
        },
      ],
    };
    const result = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    expect(result).toHaveProperty("ol");
  });

  it("converts blockquote to italic indented text", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            { type: "paragraph", content: [{ type: "text", text: "A quote" }] },
          ],
        },
      ],
    };
    const result = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    expect(result).toMatchObject({ italics: true, margin: [20, 0, 0, 8] });
  });

  it("converts codeBlock to Courier font with gray background", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "codeBlock",
          content: [{ type: "text", text: "const x = 1;" }],
        },
      ],
    };
    const result = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    expect(result).toMatchObject({ font: "Courier", fontSize: 10, background: "#f5f5f5" });
  });

  it("converts horizontalRule to a canvas line", () => {
    const doc = {
      type: "doc",
      content: [{ type: "horizontalRule" }],
    };
    const result = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    expect(result).toHaveProperty("canvas");
    expect(Array.isArray(result.canvas)).toBe(true);
  });

  it("converts a table with header row", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Name" }] }],
                },
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Age" }] }],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Alice" }] }],
                },
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "30" }] }],
                },
              ],
            },
          ],
        },
      ],
    };
    const result = tiptapToPdfmake(doc)[0] as Record<string, unknown>;
    expect(result).toHaveProperty("table");
    const table = result.table as Record<string, unknown>;
    const body = table.body as Record<string, unknown>[][];
    expect(body).toHaveLength(2);
    // Header cells should have bold: true and fillColor
    expect(body[0][0]).toMatchObject({ bold: true, fillColor: "#f0f0f0" });
    // Data cells should not have bold or fillColor
    expect(body[1][0]).toMatchObject({ bold: false });
    expect(body[1][0].fillColor).toBeUndefined();
  });

  it("ignores unknown node types (returns null internally, not in output)", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "unknownNode" },
        { type: "paragraph", content: [{ type: "text", text: "Valid" }] },
      ],
    };
    const result = tiptapToPdfmake(doc);
    expect(result).toHaveLength(1);
  });
});
