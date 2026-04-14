"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/projectStore";
import type { ID } from "@/types";
import styles from "./PlotGridCell.module.css";

interface Props {
  sceneId: ID;
  threadId: ID;
  threadColor: string;
}

export function PlotGridCell({ sceneId, threadId, threadColor }: Props) {
  const cells = useProjectStore((s) => s.project?.plotGrid.cells);
  const { updatePlotCell } = useProjectStore();
  const key = `${sceneId}::${threadId}`;
  const current = cells?.[key]?.text ?? "";
  const [focused, setFocused] = useState(false);

  return (
    <td
      className={`${styles.cell} ${focused ? styles.focused : ""}`}
      style={current ? { borderTop: `2px solid ${threadColor}` } : undefined}
    >
      <textarea
        className={styles.textarea}
        value={current}
        maxLength={200}
        placeholder="…"
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          updatePlotCell(sceneId, threadId, e.target.value);
        }}
        onChange={(e) => updatePlotCell(sceneId, threadId, e.target.value)}
      />
    </td>
  );
}
