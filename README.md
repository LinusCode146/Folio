# Folio

A desktop creative writing app for long-form fiction — built with Tauri 2, Next.js 15, and React 19. Inspired by Scrivener, designed to stay out of your way.

---

## Features

### Project Management
- Create, open, and delete writing projects from a clean hub screen
- Each project is stored as a folder of JSON files in `~/Documents/Folio/` — no database, no lock-in

### Binder
- Hierarchical sidebar with four sections: **Manuscript**, **Characters**, **Places**, and **Notes**
- Drag-and-drop reordering of scenes and folders
- Inline rename, right-click context menu, and nested folder support

### Scene Editor
- Rich-text editing powered by [Tiptap](https://tiptap.dev/)
- Toolbar: font family, font size, bold, italic, headings, bullet/ordered lists, tables, line spacing
- **Find bar** (`Ctrl/⌘ + F`) with search highlighting
- **Zen mode** (`⌘⇧Z`) — distraction-free fullscreen writing
- **Synopsis sidebar** — a collapsible panel on the right for per-scene notes and structure
- Auto-save with a 1-second debounce; flush-on-unmount ensures no content is lost when switching scenes

### Chapter Views
Click any chapter folder in the binder to open one of two views:

| Mode | Description |
|------|-------------|
| **Cards** | Card grid overview — one card per scene showing its title, synopsis (or first words), and word count |
| **Flow** | All scenes in the chapter stacked in a single scrollable editor, separated by titled dividers |

### Characters & Places
Structured sheet editors for character profiles (name, age, role, backstory, traits, notes) and locations (description, notes).

### Plot Grid
A thread × scene matrix for tracking plot threads across your manuscript at a glance.

### Compile to PDF
Export your manuscript to PDF via [pdfmake](https://pdfmake.github.io/) with options for:
- Scene separators (stars, hash, blank, rule, custom)
- Table of contents
- Page format (A4 / Letter)
- Per-chapter inclusion toggles
- Live PDF preview before exporting

### Theming
Light and dark themes, toggled from the toolbar, persisted across sessions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop shell | [Tauri 2](https://tauri.app/) |
| Frontend framework | [Next.js 15](https://nextjs.org/) (App Router) |
| UI | React 19 + TypeScript |
| Rich text | [Tiptap](https://tiptap.dev/) |
| State management | [Zustand](https://zustand-demo.pmnd.rs/) |
| Drag and drop | [@dnd-kit](https://dndkit.com/) |
| PDF generation | [pdfmake](https://pdfmake.github.io/) |
| File I/O | `@tauri-apps/plugin-fs` (local filesystem, no backend) |
| Tests | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run tauri dev
```

This starts the Next.js dev server and opens the Tauri desktop window. Hot-reload is active for frontend changes.

### Build for production

```bash
npm run tauri build
```

Produces a signed, distributable app bundle in `src-tauri/target/release/bundle/`.

### Frontend only (type-check / build without Tauri)

```bash
npm run build
```

---

## Project Structure

```
src/                        # Next.js frontend
├── app/
│   ├── page.tsx            # Project hub (/)
│   └── project/page.tsx    # Main workspace (/project?id=...)
├── components/
│   ├── binder/             # Sidebar tree
│   ├── chapter/            # Cards + Flow chapter views
│   ├── compile/            # PDF export panel
│   ├── editor/             # Scene editor + toolbar + extensions
│   ├── plotgrid/           # Plot grid view
│   ├── sheets/             # Character + Place + Book Info editors
│   └── ui/                 # Shared UI primitives
├── hooks/                  # useAutoSave, useProject, useTheme
├── lib/                    # projectService, documentService, fs, tiptapToPdfmake
├── store/                  # Zustand stores (projectStore, editorStore, themeStore)
└── types/                  # Shared TypeScript types

src-tauri/                  # Rust / Tauri backend
└── src/lib.rs              # Single custom command: pick_directory
```

### Data layout on disk

```
~/Documents/Folio/
├── projects.json                   # Registry of all projects
└── my-novel-abc12345/
    ├── project.json                # Binder tree, plot grid, book meta
    ├── scenes/<id>.json            # SceneDocument (Tiptap JSON + word count + synopsis)
    ├── notes/<id>.json             # Same shape as scenes
    ├── characters/<id>.json        # CharacterSheet
    └── places/<id>.json            # PlaceSheet
```

---

## Testing

```bash
npm run test          # watch mode
npm run test:run      # single run
npm run test:coverage # coverage report
```

Tests live in `src/__tests__/` and cover stores, hooks, and all major components.

---

## License

MIT
