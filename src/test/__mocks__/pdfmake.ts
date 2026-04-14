import { vi } from "vitest";

const mockPdfMake = {
  createPdf: vi.fn(() => ({
    getBlob: vi.fn((cb: (blob: Blob) => void) => cb(new Blob(["mock-pdf"], { type: "application/pdf" }))),
    download: vi.fn(),
    getBase64: vi.fn((cb: (data: string) => void) => cb("bW9jay1wZGY=")),
    getBuffer: vi.fn((cb: (buf: ArrayBuffer) => void) => cb(new ArrayBuffer(8))),
  })),
  vfs: {},
  fonts: {},
};

export default mockPdfMake;
