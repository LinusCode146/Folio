import { vi } from "vitest";

const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
};

export const useRouter = vi.fn(() => mockRouter);
export const useSearchParams = vi.fn(() => new URLSearchParams());
export const usePathname = vi.fn(() => "/");
export const useParams = vi.fn(() => ({}));
export { mockRouter };
