import "@testing-library/jest-dom";
import { vi, beforeEach } from "vitest";

// Tauri plugin detection checks for __TAURI_INTERNALS__ on the window object.
// Provide a stub so any code that reaches Tauri internals doesn't crash.
Object.defineProperty(window, "__TAURI_INTERNALS__", {
  value: {
    invoke: vi.fn().mockResolvedValue(null),
    transformCallback: vi.fn(),
    metadata: {},
  },
  writable: true,
  configurable: true,
});

Object.defineProperty(window, "__TAURI__", {
  value: {},
  writable: true,
  configurable: true,
});

// URL.createObjectURL / revokeObjectURL are not implemented in jsdom
if (!URL.createObjectURL) {
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
}

// Reset all vi.fn() mocks before each test so state doesn't leak
beforeEach(() => {
  vi.clearAllMocks();
});
