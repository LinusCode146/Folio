// Converts TipTap/ProseMirror JSONContent to pdfmake content array.
// Only handles node types produced by the app's TipTap extensions.

type JSONContent = {
  type?: string;
  text?: string;
  content?: JSONContent[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  attrs?: Record<string, unknown>;
};

type PdfContent = Record<string, unknown>;

// ── inline (text + marks) ────────────────────────────────────────────

function convertInline(node: JSONContent): PdfContent | string {
  if (node.type === "hardBreak") return "\n";
  if (node.type !== "text") return "";

  const obj: PdfContent = { text: node.text ?? "" };

  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":         obj.bold = true; break;
      case "italic":       obj.italics = true; break;
      case "strike":       obj.decoration = "lineThrough"; break;
      case "code":         obj.font = "Courier"; obj.fontSize = 10; break;
      case "textStyle": {
        const fs = mark.attrs?.fontSize;
        if (typeof fs === "string" && fs) {
          const n = parseFloat(fs);
          if (!isNaN(n)) obj.fontSize = n;
        }
        break;
      }
    }
  }

  return obj;
}

function inlineContent(nodes: JSONContent[] = []): PdfContent[] {
  return nodes.map(convertInline).filter(Boolean) as PdfContent[];
}

// ── block nodes ──────────────────────────────────────────────────────

function convertNode(node: JSONContent): PdfContent | PdfContent[] | null {
  switch (node.type) {
    case "paragraph": {
      const inline = inlineContent(node.content);
      // LEERZEILEN ENTFERNT: Margin auf [0,0,0,0] gesetzt und Style 'paragraph' zugewiesen
      if (inline.length === 0) return { text: " ", margin: [0, 0, 0, 0], style: "paragraph" };
      return {
        text: inline,
        margin: [0, 0, 0, 0],
        alignment: "justify",
        style: "paragraph" // WICHTIG: Nutzt nun die Definition aus compileService
      };
    }

    case "heading": {
      const level = (node.attrs?.level as number) ?? 1;
      const sizes: Record<number, number> = { 1: 18, 2: 14, 3: 12 };
      const margins: Record<number, number[]> = {
        1: [0, 12, 0, 6],
        2: [0, 10, 0, 4],
        3: [0, 8, 0, 4],
      };
      return {
        text: inlineContent(node.content),
        fontSize: sizes[level] ?? 12,
        bold: true,
        margin: margins[level] ?? [0, 8, 0, 4],
      };
    }

    case "bulletList":
      return {
        ul: (node.content ?? []).map((item) => listItemContent(item)),
        margin: [0, 0, 0, 8],
      };

    case "orderedList":
      return {
        ol: (node.content ?? []).map((item) => listItemContent(item)),
        margin: [0, 0, 0, 8],
      };

    case "blockquote":
      return {
        text: inlineContent(node.content?.[0]?.content),
        italics: true,
        margin: [20, 0, 0, 8],
      };

    case "codeBlock":
      return {
        text: inlineContent(node.content),
        font: "Courier",
        fontSize: 10,
        margin: [0, 0, 0, 8],
        background: "#f5f5f5",
      };

    case "horizontalRule":
      return {
        canvas: [{ type: "line", x1: 0, y1: 0, x2: 400, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" }],
        margin: [0, 8, 0, 8],
      };

    case "table":
      return convertTable(node);

    default:
      return null;
  }
}

function listItemContent(item: JSONContent): PdfContent {
  const paras = item.content ?? [];
  const inline = paras.flatMap((p) => inlineContent(p.content));
  return { text: inline };
}

function convertTable(node: JSONContent): PdfContent {
  const body: PdfContent[][] = [];

  for (const row of node.content ?? []) {
    const cells: PdfContent[] = [];
    for (const cell of row.content ?? []) {
      const cellContent = (cell.content ?? []).flatMap((n) => {
        const r = convertNode(n);
        return r ? (Array.isArray(r) ? r : [r]) : [];
      });
      const isHeader = cell.type === "tableHeader";
      cells.push({
        stack: cellContent.length ? cellContent : [{ text: " " }],
        bold: isHeader,
        fillColor: isHeader ? "#f0f0f0" : undefined,
        margin: [4, 4, 4, 4],
      });
    }
    body.push(cells);
  }

  return {
    table: { body, widths: body[0] ? body[0].map(() => "*") : [] },
    layout: "lightHorizontalLines",
    margin: [0, 0, 0, 12],
  };
}

export function tiptapToPdfmake(doc: unknown): PdfContent[] {
  const root = doc as JSONContent;
  if (!root?.content) return [];

  const result: PdfContent[] = [];
  for (const node of root.content) {
    const converted = convertNode(node);
    if (!converted) continue;
    if (Array.isArray(converted)) result.push(...converted);
    else result.push(converted);
  }
  return result;
}