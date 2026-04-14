import { vi } from "vitest";

export const readTextFile = vi.fn().mockResolvedValue("{}");
export const writeTextFile = vi.fn().mockResolvedValue(undefined);
export const mkdir = vi.fn().mockResolvedValue(undefined);
export const exists = vi.fn().mockResolvedValue(false);
export const remove = vi.fn().mockResolvedValue(undefined);
export const readDir = vi.fn().mockResolvedValue([]);
export const documentDir = vi.fn().mockResolvedValue("/mock/documents");
export const BaseDirectory = { Document: 4 };
