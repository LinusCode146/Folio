import { vi } from "vitest";

export const documentDir = vi.fn().mockResolvedValue("/mock/documents");
export const homeDir = vi.fn().mockResolvedValue("/mock/home");
export const appDataDir = vi.fn().mockResolvedValue("/mock/appdata");
export const join = vi.fn((...args: string[]) => args.join("/"));
