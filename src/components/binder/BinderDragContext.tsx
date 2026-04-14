import { createContext, useContext } from "react";

interface BinderDragCtx {
  overFolderId: string | null;
  activeId: string | null;
}

export const BinderDragContext = createContext<BinderDragCtx>({
  overFolderId: null,
  activeId: null,
});

export const useBinderDrag = () => useContext(BinderDragContext);
