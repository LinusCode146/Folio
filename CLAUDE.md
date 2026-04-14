# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**Folio** is a desktop creative writing app (Scrivener-style) built with Tauri 2 + Next.js 15 (App Router) + React 19. The app is named "folio" in package.json but branded "Folio" in the UI. There is no backend server — all persistence is via the local filesystem through `@tauri-apps/plugin-fs`.

## Development commands

```bash
# Run the full Tauri desktop app (starts Next.js dev server + Tauri window)
npm run tauri dev

# Build Next.js only (for checking TS/build errors without Tauri)
npm run build

# Build the full desktop app for distribution
npm run tauri build
```

There are no tests and no lint script configured.

## Architecture

### Two-layer persistence
- **Project registry**: `~/Documents/Folio/projects.json` — list of `ProjectRef` entries (id, name, path, updatedAt).
- **Project folder** (e.g. `~/Documents/Folio/my-novel-abc12345/`):
  - `project.json` — the full `Project` object (binder tree, plot grid, book meta)
  - `scenes/<id>.json` — `SceneDocument` (Tiptap JSON content + word count)
  - `notes/<id>.json` — same shape as scenes
  - `characters/<id>.json` — `CharacterSheet`
  - `places/<id>.json` — `PlaceSheet`

All file I/O goes through `src/lib/fs.ts` (wraps `@tauri-apps/plugin-fs`). Higher-level operations live in `src/lib/projectService.ts` and `src/lib/documentService.ts`.

### State management
Two Zustand stores:
- **`useProjectStore`** (`src/store/projectStore.ts`) — holds the loaded `Project`, its file path, and all mutation actions (addNode, deleteNode, moveNode, plotGrid ops, bookMeta). Every mutating action calls `save()` synchronously after the immer update.
- **`useEditorStore`** (`src/store/editorStore.ts`) — UI state: which binder node is active, zen mode, unsaved editor content flag. Special sentinel IDs: `PLOT_GRID_ID`, `BOOK_INFO_ID`, `COMPILE_ID`.

### Routing
Two Next.js routes:
- `/` — `ProjectHub` (list/create/delete projects)
- `/project?id=<projectId>` — main workspace; `useProject` hook loads the project from disk on mount

### Main workspace layout (`/project`)
```
Toolbar (Home, project name, PlotGrid, ZenMode, ThemeToggle)
├── Binder (left sidebar)
│     ├── BinderSearch
│     ├── BinderSection × 4 (manuscript, characters, places, notes)
│     └── BinderNodeTree (recursive, drag-and-drop via @dnd-kit)
└── Main panel (switches on activeNodeId)
      ├── SceneEditor  — Tiptap rich-text editor (scenes + notes)
      ├── CharacterSheetEditor
      ├── PlaceSheetEditor
      ├── PlotGrid     — thread × scene matrix
      └── CompilePanel — export to PDF via pdfmake
```

### Key patterns
- **Auto-save**: `useAutoSave` hook debounces saves by 1 s; used in `SceneEditor` and sheet editors. The project store's structural mutations (add/delete/move/rename) save immediately.
- **Tiptap extensions**: custom `FontSize`, `LineHeight`, and `SearchHighlight` extensions live in `src/components/editor/extensions/`.
- **PDF export**: `src/lib/tiptapToPdfmake.ts` converts the Tiptap JSON AST to pdfmake document definition.
- **Theme**: persisted to `localStorage` via `useThemeStore` (`src/store/themeStore.ts`); applied as a `data-theme` attribute on `<html>`.
- **Drag-and-drop**: binder nodes use `@dnd-kit` with a shared `BinderDragContext`.

### Rust backend (`src-tauri/src/lib.rs`)
Minimal — only one custom command: `pick_directory` (native folder picker dialog). Everything else uses Tauri plugins directly from the frontend (fs, opener, dialog).
