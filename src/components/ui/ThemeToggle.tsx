"use client";

import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeMode } from "@/store/themeStore";
import styles from "./ThemeToggle.module.css";

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  const cycle: Record<ThemeMode, ThemeMode> = {
    system: "light",
    light: "dark",
    dark: "system",
  };

  return (
    <button
      className={styles.btn}
      onClick={() => setMode(cycle[mode])}
      title={`Theme: ${mode}`}
    >
      {mode === "dark" ? <Moon size={16} /> : mode === "light" ? <Sun size={16} /> : <Monitor size={16} />}
    </button>
  );
}
