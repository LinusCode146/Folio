import { loadScene } from "./documentService";
import { tiptapToPdfmake } from "./tiptapToPdfmake";
import type { Project, ID } from "@/types";

const formatSpaced = (str: string) => str.toUpperCase().split("").join(" ");

export interface CompileOptions {
  includeToc: boolean;
  sceneSeparator: "stars" | "hash" | "blank" | "rule" | "custom";
  customSeparator: string;
  pageFormat: "paperback" | "trade" | "a4" | "letter";
  includedChapterIds: Set<ID>;
}

const PAGE_SIZES: Record<CompileOptions["pageFormat"], [number, number]> = {
  paperback: [396, 612],
  trade: [432, 648],
  a4: [595, 842],
  letter: [612, 792],
};

function separator(options: CompileOptions): Record<string, unknown> {
  switch (options.sceneSeparator) {
    case "stars":  return { text: "* * *", alignment: "center", margin: [0, 16, 0, 16], color: "#666666" };
    case "hash":   return { text: "#",     alignment: "center", margin: [0, 16, 0, 16], color: "#666666" };
    case "blank":  return { text: " ",                          margin: [0, 12, 0, 12] };
    case "rule":   return {
      canvas: [{ type: "line", x1: 60, y1: 0, x2: 260, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" }],
      margin: [0, 16, 0, 16],
    };
    case "custom": return { text: options.customSeparator || "* * *", alignment: "center", margin: [0, 16, 0, 16], color: "#666666" };
  }
}

async function loadSceneBlocks(
    projectPath: string,
    sceneId: ID
): Promise<Record<string, unknown>[]> {
  const sceneDoc = await loadScene(projectPath, "scenes", sceneId);
  return tiptapToPdfmake(sceneDoc.content) as Record<string, unknown>[];
}

function pushScenesWithSeparators(
    content: Record<string, unknown>[],
    sceneBlocksList: Record<string, unknown>[][],
    options: CompileOptions
) {
  const nonEmpty = sceneBlocksList.filter((b) => b.length > 0);
  for (let i = 0; i < nonEmpty.length; i++) {
    content.push(...nonEmpty[i]);
    if (i < nonEmpty.length - 1) {
      content.push(separator(options));
    }
  }
}

async function buildContent(
    options: CompileOptions,
    project: Project,
    projectPath: string
): Promise<Record<string, unknown>[]> {
  const { bookMeta } = project;

  type ChapterBlock = { id: ID; title: string; sceneIds: ID[] };
  type RootScene    = { id: ID; title: string };

  const chapters: ChapterBlock[] = [];
  const rootScenes: RootScene[] = [];

  for (const id of project.manuscriptRootIds) {
    const node = project.nodes[id];
    if (!node) continue;
    if (node.kind === "folder") {
      if (!options.includedChapterIds.has(id)) continue;
      chapters.push({
        id,
        title: node.title,
        sceneIds: (node.children ?? []).filter((cid) => {
          const child = project.nodes[cid];
          return child?.kind === "scene";
        }),
      });
    } else if (node.kind === "scene") {
      rootScenes.push({ id, title: node.title });
    }
  }

  const content: Record<string, unknown>[] = [];

  // ── Title page ───────────────────────────────────────────────────────
  content.push({ text: project.name, fontSize: 24, bold: true, alignment: "center", margin: [0, 100, 0, 12] });
  if (bookMeta.subtitle) {
    content.push({ text: bookMeta.subtitle, fontSize: 14, alignment: "center", margin: [0, 0, 0, 40], color: "#555555" });
  } else {
    content.push({ text: " ", margin: [0, 0, 0, 40] });
  }
  if (bookMeta.author) {
    content.push({ text: bookMeta.author, fontSize: 12, alignment: "center", margin: [0, 0, 0, 8] });
  }
  if (bookMeta.year) {
    content.push({ text: bookMeta.year, fontSize: 10, alignment: "center", color: "#777777" });
  }
  content.push({ text: "", pageBreak: "after" });

  // ── Dedication ───────────────────────────────────────────────────────
  if (bookMeta.dedication.trim()) {
    content.push({ text: " ", margin: [0, 100, 0, 0] });
    content.push({ text: bookMeta.dedication, fontSize: 11, italics: true, alignment: "center", margin: [40, 0, 40, 0] });
    content.push({ text: "", pageBreak: "after" });
  }

  // ── Table of contents ────────────────────────────────────────────────
  if (options.includeToc && chapters.length > 0) {
    content.push({
      text: "Contents",
      fontSize: 16,
      bold: true,
      alignment: "left",
      margin: [0, 40, 0, 20],
      pageBreak: "before",
    });
    content.push({
      canvas: [{ type: "line", x1: 0, y1: 0, x2: 324, y2: 0, lineWidth: 0.5, lineColor: "#cccccc" }],
      margin: [0, 0, 0, 12],
    });
    content.push({
      toc: {
        textStyle: { fontSize: 10 },
        numberStyle: { fontSize: 10, color: "#777777" },
      },
    });
    content.push({ text: "", pageBreak: "after" });
  }

  // ── Chapters ─────────────────────────────────────────────────────────
  let chapterIndex = 0;
  for (const chapter of chapters) {
    chapterIndex++;
    content.push({
      text: `Chapter ${chapterIndex}`,
      fontSize: 10,
      color: "#888888",
      alignment: "center",
      margin: [0, 60, 0, 8],
      pageBreak: "before",
    });
    content.push({
      text: chapter.title,
      fontSize: 18,
      bold: true,
      alignment: "center",
      margin: [0, 0, 0, 30],
      tocItem: options.includeToc,
    });

    const sceneBlocksList = await Promise.all(
        chapter.sceneIds.map((id) => loadSceneBlocks(projectPath, id))
    );
    pushScenesWithSeparators(content, sceneBlocksList, options);
  }

  // ── Root-level scenes ──────────────────────────────────────────────
  if (rootScenes.length > 0) {
    if (chapters.length > 0) content.push({ text: "", pageBreak: "before" });
    const sceneBlocksList = await Promise.all(
        rootScenes.map(({ id }) => loadSceneBlocks(projectPath, id))
    );
    pushScenesWithSeparators(content, sceneBlocksList, options);
  }

  // ── Copyright page ───────────────────────────────────────────────────
  if (bookMeta.copyright.trim() || bookMeta.isbn.trim()) {
    content.push({ text: "", pageBreak: "before" });
    content.push({ text: " ", margin: [0, 180, 0, 0] });
    if (bookMeta.copyright) {
      content.push({ text: bookMeta.copyright, fontSize: 9, color: "#777777", margin: [0, 0, 0, 6] });
    }
    if (bookMeta.isbn) {
      content.push({ text: `ISBN: ${bookMeta.isbn}`, fontSize: 9, color: "#777777" });
    }
  }

  return content;
}

async function buildDocDefinition(
    options: CompileOptions,
    project: Project,
    projectPath: string
): Promise<any> {
  const pageSize = PAGE_SIZES[options.pageFormat];
  const margins = [50, 60, 50, 60];
  const content = await buildContent(options, project, projectPath);

  const titleStr = formatSpaced(project.name || "");
  const authorStr = formatSpaced(project.bookMeta.author || "");

  return {
    pageSize: { width: pageSize[0], height: pageSize[1] },
    pageMargins: margins,

    defaultStyle: {
      font: "Times",
      fontSize: 11,
      lineHeight: 1.3,
      // ENTFERNT Leerzeilen zwischen Absätzen im gesamten Dokument:
      margin: [0, 0, 0, 0]
    },

    styles: {
      // Diese Klasse sorgt für den Einzug im PDF
      paragraph: {
        margin: [0, 0, 0, 0],
        leadingIndent: 12 // Entspricht etwa dem "Tab" Einzug
      },
      // Falls Kapitelüberschriften doch Abstand brauchen, definieren wir das hier:
      chapterTitle: {
        fontSize: 18,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 30] // Unten Abstand zur ersten Textzeile
      }
    },

    content,
    // ... dein Header-Code bleibt gleich
    header: (currentPage: number) => {
      if (currentPage <= 1) return null;
      const isEven = currentPage % 2 === 0;
      const sideMargin = 30;
      const topMargin = 20;

      return {
        text: isEven
            ? `${currentPage}  |  ${authorStr}`
            : `${titleStr}  |  ${currentPage}`,
        fontSize: 8,
        color: "#aaaaaa",
        alignment: isEven ? "left" : "right",
        margin: isEven ? [sideMargin, topMargin, 0, 0] : [0, topMargin, sideMargin, 0],
      };
    },
    footer: null,
    info: {
      title: project.name,
      author: project.bookMeta.author,
    },
  };
}

async function getPdfMake() {
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const vfsFonts = (await import("pdfmake/build/vfs_fonts")).default;
  const timesFont = (await import("pdfmake/build/standard-fonts/Times" as any)).default;
  const courierFont = (await import("pdfmake/build/standard-fonts/Courier" as any)).default;

  pdfMake.addVirtualFileSystem(vfsFonts);
  pdfMake.addFontContainer(timesFont);
  pdfMake.addFontContainer(courierFont);

  return pdfMake;
}

export async function compileToPdfBlobUrl(
    options: CompileOptions,
    project: Project,
    projectPath: string
): Promise<string> {
  const [pdfMake, docDefinition] = await Promise.all([
    getPdfMake(),
    buildDocDefinition(options, project, projectPath),
  ]);

  const buffer: ArrayBuffer = await (pdfMake.createPdf(docDefinition) as any).getBuffer();
  const blob = new Blob([new Uint8Array(buffer)], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

export async function compileManuscript(
    options: CompileOptions,
    project: Project,
    projectPath: string
): Promise<void> {
  const [pdfMake, docDefinition] = await Promise.all([
    getPdfMake(),
    buildDocDefinition(options, project, projectPath),
  ]);

  const buffer: ArrayBuffer = await (pdfMake.createPdf(docDefinition) as any).getBuffer();
  const { writeFile } = await import("@tauri-apps/plugin-fs");
  await writeFile(`${projectPath}/manuscript.pdf`, new Uint8Array(buffer));
}