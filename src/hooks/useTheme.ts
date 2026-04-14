"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

export function useTheme() {
  const { mode, setMode } = useThemeStore();

  useEffect(() => {
    function apply() {
      const dark =
        mode === "dark" ||
        (mode === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.setAttribute(
        "data-theme",
        dark ? "dark" : "light"
      );
    }

    apply();

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mode === "system") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [mode]);

  return { mode, setMode };
}
