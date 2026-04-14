"use client";

import { useEffect, useRef } from "react";

export function useAutoSave(
  value: unknown,
  onSave: () => Promise<void>,
  delay = 1000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  // Always point to the latest onSave so a stale closure never causes
  // handleSave to run with doc=null when the timer fires after a re-render.
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      onSaveRef.current();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
}
