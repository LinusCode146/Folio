export type ID = string;

export type BinderSection = "manuscript" | "characters" | "places" | "notes" | "maps";

export type BinderNodeKind =
  | "folder"
  | "scene"
  | "character"
  | "place"
  | "note"
  | "map";

export type NodeStatus = "outline" | "draft" | "revised" | "final";

export interface BinderNode {
  id: ID;
  kind: BinderNodeKind;
  title: string;
  section: BinderSection;
  children?: ID[];
  status?: NodeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PlotThread {
  id: ID;
  label: string;
  color: string;
}

export interface PlotCell {
  sceneId: ID;
  threadId: ID;
  text: string;
}

export interface PlotGridMeta {
  threads: PlotThread[];
  cells: Record<string, PlotCell>;
}

export interface BookMeta {
  author: string;
  subtitle: string;
  dedication: string;
  copyright: string;
  year: string;
  isbn: string;
  targetWordCount?: number;
}

export interface Project {
  id: ID;
  name: string;
  createdAt: string;
  updatedAt: string;
  manuscriptRootIds: ID[];
  characterIds: ID[];
  placeIds: ID[];
  noteIds: ID[];
  mapIds: ID[];
  nodes: Record<ID, BinderNode>;
  plotGrid: PlotGridMeta;
  bookMeta: BookMeta;
  wordCounts?: Record<ID, number>;
}

export interface ProjectRef {
  id: ID;
  name: string;
  path: string;
  updatedAt: string;
}

export interface SceneSnapshot {
  id: string;
  label: string;
  content: object;
  wordCount: number;
  createdAt: string;
}

export interface SuggestionMeta {
  id: string;
  /** Kind of change — "insertion" (added text), "deletion" (removed text), or "replace" (both). */
  kind: "insertion" | "deletion" | "replace";
  comment: string;
  createdAt: string;
}

export interface SceneDocument {
  id: ID;
  content: object;
  wordCount: number;
  synopsis?: string;
  annotations?: Record<string, string>;
  snapshots?: SceneSnapshot[];
  lineHeight?: string;
  /** Pending tracked-change suggestions, keyed by suggestion id. */
  suggestions?: Record<string, SuggestionMeta>;
  updatedAt: string;
}

export interface CharacterSheet {
  id: ID;
  updatedAt: string;
  // ── Identity ──────────────────────────────
  name: string;
  aliases?: string;            // nicknames, titles, AKAs
  age: string;
  pronouns?: string;
  occupation?: string;
  role: string;                // protagonist / antagonist / supporting / etc.
  // ── Appearance ────────────────────────────
  heightBuild?: string;
  hair?: string;
  eyes?: string;
  distinguishing?: string;     // scars, marks, tattoos, prosthetics
  style?: string;              // how they dress / carry themselves
  voice?: string;              // speech, accent, cadence
  mannerisms?: string;         // gestures, tics, habits
  // ── Personality ───────────────────────────
  traits: string[];
  strengths?: string[];
  flaws?: string[];
  fears?: string[];
  // ── Motivation & conflict ─────────────────
  goal?: string;               // external want
  motivation?: string;         // internal "why"
  internalConflict?: string;
  externalConflict?: string;
  // ── Arc ───────────────────────────────────
  arcStart?: string;           // starting belief / lie they believe
  arcEnd?: string;             // ending belief / truth they accept
  arcSummary?: string;         // the transformation in one paragraph
  // ── Background ────────────────────────────
  origin?: string;
  family?: string;
  education?: string;
  backstory: string;
  formativeEvent?: string;     // the wound / defining moment
  // ── Relationships ─────────────────────────
  relationships?: string;
  // ── Notes ─────────────────────────────────
  notes: string;
}

export interface PlaceSheet {
  id: ID;
  updatedAt: string;
  // ── Identity ──────────────────────────────
  name: string;
  kind?: string;               // city, village, forest, realm, building, ship…
  region?: string;             // parent location / continent
  // ── Geography ─────────────────────────────
  terrain?: string;
  climate?: string;
  size?: string;               // population, area, scale
  layout?: string;             // districts, neighbourhoods, rooms
  // ── Atmosphere (five senses) ──────────────
  mood?: string;
  sights?: string;
  sounds?: string;
  smells?: string;
  textures?: string;           // surfaces, temperature, air
  // ── Architecture & visual ─────────────────
  architecture?: string;
  landmarks?: string;
  // ── Inhabitants & culture ─────────────────
  inhabitants?: string;
  culture?: string;
  government?: string;
  economy?: string;
  // ── History ───────────────────────────────
  history?: string;
  // ── Story role ────────────────────────────
  significance?: string;
  scenesHere?: string;
  // ── Original free-form fields ─────────────
  description: string;
  notes: string;
}

// ── Map Builder ─────────────────────────────────────────────

export type MapElementKind = "pin" | "polygon" | "path" | "label" | "stamp";
export type StampKind = "tree" | "mountain" | "forest";

export interface MapElement {
  id: ID;
  kind: MapElementKind;
  x: number;
  y: number;
  // Pin
  placeNodeId?: ID;
  pinLabel?: string;
  // Polygon / path
  points?: number[];
  closed?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  // Label
  text?: string;
  fontSize?: number;
  color?: string;
  // Stamp (tree / mountain / forest)
  stampKind?: StampKind;
  stampSize?: number;
}

export interface MapDocument {
  id: ID;
  elements: MapElement[];
  canvasWidth: number;
  canvasHeight: number;
  updatedAt: string;
}
