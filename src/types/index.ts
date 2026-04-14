export type ID = string;

export type BinderSection = "manuscript" | "characters" | "places" | "notes";

export type BinderNodeKind =
  | "folder"
  | "scene"
  | "character"
  | "place"
  | "note";

export interface BinderNode {
  id: ID;
  kind: BinderNodeKind;
  title: string;
  section: BinderSection;
  children?: ID[];
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
  nodes: Record<ID, BinderNode>;
  plotGrid: PlotGridMeta;
  bookMeta: BookMeta;
}

export interface ProjectRef {
  id: ID;
  name: string;
  path: string;
  updatedAt: string;
}

export interface SceneDocument {
  id: ID;
  content: object;
  wordCount: number;
  synopsis?: string;
  updatedAt: string;
}

export interface CharacterSheet {
  id: ID;
  name: string;
  age: string;
  role: string;
  backstory: string;
  traits: string[];
  notes: string;
  updatedAt: string;
}

export interface PlaceSheet {
  id: ID;
  name: string;
  description: string;
  notes: string;
  updatedAt: string;
}
