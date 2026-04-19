"use client";

import React, { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { Stage, Layer, Circle, Line, Text, Transformer, Rect, Group } from "react-konva";
import type Konva from "konva";
import { nanoid } from "@/lib/nanoid";
import type { MapDocument, MapElement, BinderNode, StampKind } from "@/types";
import type { MapTool } from "./MapEditor";
import styles from "./MapEditor.module.css";

// Color approximations for Konva canvas (HTML Canvas doesn't support oklch with alpha notation everywhere)
const PIN_COLOR   = "#b87c35";
const PIN_ACTIVE  = "#d4933f";
const PIN_STROKE  = "#7a5020";
const SHAPE_STROKE = "#8a7060";
const LABEL_COLOR = "#3d2e1e";

// Stamp & river palette — hand-drawn cartography feel, warm + muted
const TREE_FOLIAGE = "#4a7048";
const TREE_TRUNK   = "#6b4a2c";
const MTN_ROCK     = "#7a6b5e";
const MTN_SNOW     = "#f5efe2";
const RIVER_COLOR  = "#6b8ea8";

// Map oklch swatch values → canvas-safe colors
const FILL_HEX: Record<string, string> = {
  "oklch(0.78 0.12 78 / 0.45)":   "rgba(184,124,53,0.45)",
  "oklch(0.55 0.008 240 / 0.45)": "rgba(94,104,120,0.45)",
  "oklch(0.72 0.10 150 / 0.45)":  "rgba(74,144,104,0.45)",
  "oklch(0.70 0.10 195 / 0.45)":  "rgba(58,138,138,0.45)",
  "oklch(0.62 0.14 25 / 0.45)":   "rgba(154,64,48,0.45)",
  "oklch(0.68 0.10 280 / 0.45)":  "rgba(120,88,160,0.45)",
};
const COLOR_HEX: Record<string, string> = {
  "oklch(0.78 0.12 78)":  "#b87c35",
  "oklch(0.55 0.008 240)":"#5e6878",
  "oklch(0.72 0.10 150)": "#4a9068",
  "oklch(0.70 0.10 195)": "#3a8a8a",
  "oklch(0.62 0.14 25)":  "#9a4030",
  "oklch(0.68 0.10 280)": "#785890",
};

function toFill(v: string | undefined): string | undefined {
  if (!v) return undefined;
  return FILL_HEX[v] ?? v;
}
function toColor(v: string | undefined, fallback: string): string {
  if (!v) return fallback;
  return COLOR_HEX[v] ?? FILL_HEX[v] ?? v;
}

export interface MapCanvasHandle {
  getDataURL: () => string | undefined;
}

interface MapCanvasProps {
  doc: MapDocument;
  activeTool: MapTool;
  selectedId: string | null;
  placeNodes: BinderNode[];
  onChange: (elements: MapElement[]) => void;
  onSelect: (id: string | null) => void;
}

export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { doc, activeTool, selectedId, placeNodes, onChange, onSelect },
  ref
) {
  const stageRef  = useRef<Konva.Stage>(null);
  const trRef     = useRef<Konva.Transformer>(null);
  const layerRef  = useRef<Konva.Layer>(null);

  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [polygonPts, setPolygonPts] = useState<number[]>([]);
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const [pathPts, setPathPts] = useState<number[]>([]);

  // Refs for stale-closure-safe access inside tool-change effect
  const polygonPtsRef = useRef<number[]>([]);
  polygonPtsRef.current = polygonPts;
  const docRef = useRef(doc);
  docRef.current = doc;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useImperativeHandle(ref, () => ({
    getDataURL: () => stageRef.current?.toDataURL({ pixelRatio: 2 }),
  }));

  // Resize observer for stage
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const ro = new ResizeObserver(([e]) => {
      setStageSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(node);
    setStageSize({ w: node.clientWidth, h: node.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Keep Transformer synced with selectedId
  useEffect(() => {
    if (!trRef.current || !layerRef.current) return;
    if (!selectedId) {
      trRef.current.nodes([]);
      return;
    }
    const node = layerRef.current.findOne(`#${selectedId}`);
    if (node) {
      trRef.current.nodes([node]);
    } else {
      trRef.current.nodes([]);
    }
  }, [selectedId, doc.elements]);

  // Auto-commit in-progress polygon when switching away from polygon tool.
  // Without this, half-drawn hexagons disappear when the user picks a different tool.
  useEffect(() => {
    if (activeTool === "polygon") return;
    const pts = polygonPtsRef.current;
    if (pts.length >= 6) {
      const el: MapElement = {
        id: nanoid(8), kind: "polygon", x: 0, y: 0,
        points: [...pts],
        closed: true,
        fill: "oklch(0.78 0.12 78 / 0.45)",
        stroke: SHAPE_STROKE,
        strokeWidth: 2,
        opacity: 1,
      };
      onChangeRef.current([...docRef.current.elements, el]);
      onSelectRef.current(el.id);
    }
    if (pts.length > 0) setPolygonPts([]);
  }, [activeTool]);

  function getPos() {
    const stage = stageRef.current;
    const pos = stage?.getPointerPosition();
    return pos ?? { x: 0, y: 0 };
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const onEmpty = e.target === e.target.getStage() || e.target.name() === "bg";

    if (activeTool === "select") {
      if (onEmpty) onSelect(null);
      return;
    }

    const { x, y } = getPos();

    if (activeTool === "pin") {
      const el: MapElement = { id: nanoid(8), kind: "pin", x, y, pinLabel: "" };
      onChange([...doc.elements, el]);
      onSelect(el.id);
      return;
    }
    if (activeTool === "polygon") {
      setPolygonPts((pts) => [...pts, x, y]);
      return;
    }
    if (activeTool === "label") {
      const el: MapElement = {
        id: nanoid(8), kind: "label", x, y,
        text: "Label", fontSize: 16, color: LABEL_COLOR,
      };
      onChange([...doc.elements, el]);
      onSelect(el.id);
      return;
    }
    // Stamp tools — single-click placement of tree/mountain/forest glyphs
    if (activeTool === "tree" || activeTool === "mountain" || activeTool === "forest") {
      const stampKind: StampKind = activeTool;
      const el: MapElement = {
        id: nanoid(8), kind: "stamp", x, y,
        stampKind,
        stampSize: stampKind === "forest" ? 44 : 32,
      };
      onChange([...doc.elements, el]);
      onSelect(el.id);
      return;
    }
  }

  function handleDblClick() {
    if (activeTool === "polygon" && polygonPts.length >= 4) {
      const el: MapElement = {
        id: nanoid(8), kind: "polygon", x: 0, y: 0,
        points: [...polygonPts],
        closed: true,
        fill: "oklch(0.78 0.12 78 / 0.45)",
        stroke: SHAPE_STROKE,
        strokeWidth: 2,
        opacity: 1,
      };
      onChange([...doc.elements, el]);
      onSelect(el.id);
      setPolygonPts([]);
    }
  }

  function handleMouseDown() {
    if (activeTool === "path" || activeTool === "river") {
      const { x, y } = getPos();
      setIsDrawingPath(true);
      setPathPts([x, y]);
    }
  }
  function handleMouseMove() {
    if ((activeTool === "path" || activeTool === "river") && isDrawingPath) {
      const { x, y } = getPos();
      setPathPts((pts) => [...pts, x, y]);
    }
  }
  function handleMouseUp() {
    if ((activeTool === "path" || activeTool === "river") && isDrawingPath && pathPts.length >= 4) {
      const simplified = simplifyPoints(pathPts, 4);
      const isRiver = activeTool === "river";
      const el: MapElement = {
        id: nanoid(8), kind: "path", x: 0, y: 0,
        points: simplified,
        closed: false,
        stroke: isRiver ? RIVER_COLOR : SHAPE_STROKE,
        strokeWidth: isRiver ? 4 : 2.5,
        opacity: isRiver ? 0.85 : 1,
      };
      onChange([...doc.elements, el]);
      onSelect(el.id);
    }
    setIsDrawingPath(false);
    setPathPts([]);
  }

  function onElClick(id: string, e: Konva.KonvaEventObject<MouseEvent>) {
    if (activeTool !== "select") return;
    e.cancelBubble = true;
    onSelect(id);
  }

  function onElDragEnd(id: string, e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    onChange(doc.elements.map((el) =>
      el.id === id ? { ...el, x: node.x(), y: node.y() } : el
    ));
  }

  // After transformer drag/resize, persist new positions
  function onTransformEnd(id: string, e: Konva.KonvaEventObject<Event>) {
    const node = e.target;
    onChange(doc.elements.map((el) =>
      el.id === id ? { ...el, x: node.x(), y: node.y() } : el
    ));
    node.scaleX(1);
    node.scaleY(1);
  }

  const cursor = activeTool === "select" ? "default" : "crosshair";

  return (
    <div ref={containerRef} className={styles.canvasWrap} style={{ cursor }}>
      {stageSize.w > 0 && (
        <Stage
          ref={stageRef}
          width={stageSize.w}
          height={stageSize.h}
          onClick={handleStageClick}
          onDblClick={handleDblClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Background + dot grid */}
          <Layer listening={false}>
            <Rect
              name="bg"
              x={0} y={0}
              width={stageSize.w} height={stageSize.h}
              fill="transparent"
            />
            <DotGrid width={stageSize.w} height={stageSize.h} />
          </Layer>

          {/* Main interactive layer */}
          <Layer ref={layerRef}>
            {/* Polygons and paths */}
            {doc.elements
              .filter((el) => el.kind === "polygon" || el.kind === "path")
              .map((el) => (
                <Line
                  key={el.id}
                  id={el.id}
                  x={el.x} y={el.y}
                  points={el.points ?? []}
                  closed={el.kind === "polygon"}
                  fill={el.kind === "polygon" ? (toFill(el.fill) ?? "rgba(184,124,53,0.3)") : undefined}
                  stroke={el.stroke ?? SHAPE_STROKE}
                  strokeWidth={el.strokeWidth ?? 2}
                  opacity={el.opacity ?? 1}
                  lineCap="round"
                  lineJoin="round"
                  tension={el.kind === "path" && el.stroke === RIVER_COLOR ? 0.35 : 0}
                  draggable={activeTool === "select"}
                  onClick={(e) => onElClick(el.id, e)}
                  onDragEnd={(e) => onElDragEnd(el.id, e)}
                  onTransformEnd={(e) => onTransformEnd(el.id, e)}
                />
              ))}

            {/* Labels */}
            {doc.elements
              .filter((el) => el.kind === "label")
              .map((el) => (
                <Text
                  key={el.id}
                  id={el.id}
                  x={el.x} y={el.y}
                  text={el.text ?? ""}
                  fontSize={el.fontSize ?? 16}
                  fill={toColor(el.color, LABEL_COLOR)}
                  fontFamily="Georgia, serif"
                  fontStyle="italic"
                  draggable={activeTool === "select"}
                  onClick={(e) => onElClick(el.id, e)}
                  onDragEnd={(e) => onElDragEnd(el.id, e)}
                  onTransformEnd={(e) => onTransformEnd(el.id, e)}
                />
              ))}

            {/* Pins */}
            {doc.elements
              .filter((el) => el.kind === "pin")
              .map((el) => {
                const linked = el.placeNodeId
                  ? placeNodes.find((n) => n.id === el.placeNodeId)
                  : null;
                const label = el.pinLabel || linked?.title || "";
                const isSelected = selectedId === el.id;

                return (
                  <Group
                    key={el.id}
                    id={el.id}
                    x={el.x} y={el.y}
                    draggable={activeTool === "select"}
                    onClick={(e) => onElClick(el.id, e)}
                    onDragEnd={(e) => onElDragEnd(el.id, e)}
                  >
                    <Circle
                      radius={isSelected ? 8 : 6}
                      fill={isSelected ? PIN_ACTIVE : PIN_COLOR}
                      stroke={PIN_STROKE}
                      strokeWidth={1.5}
                      shadowColor={PIN_COLOR}
                      shadowBlur={isSelected ? 10 : 3}
                      shadowOpacity={0.6}
                      shadowOffsetY={1}
                    />
                    {label && (
                      <Text
                        x={11}
                        y={-8}
                        text={label}
                        fontSize={12}
                        fill={LABEL_COLOR}
                        fontFamily="Georgia, serif"
                        fontStyle="italic"
                        listening={false}
                      />
                    )}
                  </Group>
                );
              })}

            {/* Stamps — tree / mountain / forest glyphs */}
            {doc.elements
              .filter((el) => el.kind === "stamp")
              .map((el) => (
                <Group
                  key={el.id}
                  id={el.id}
                  x={el.x} y={el.y}
                  draggable={activeTool === "select"}
                  onClick={(e) => onElClick(el.id, e)}
                  onDragEnd={(e) => onElDragEnd(el.id, e)}
                  onTransformEnd={(e) => onTransformEnd(el.id, e)}
                >
                  <StampGlyph kind={el.stampKind ?? "tree"} size={el.stampSize ?? 32} />
                </Group>
              ))}

            {/* Transformer */}
            <Transformer
              ref={trRef}
              rotateEnabled={false}
              borderStroke={PIN_ACTIVE}
              borderStrokeWidth={1.5}
              anchorStroke={PIN_STROKE}
              anchorFill="#fff"
              anchorSize={7}
              keepRatio={false}
            />
          </Layer>

          {/* Preview layer — in-progress drawing, no interaction */}
          <Layer listening={false}>
            {activeTool === "polygon" && polygonPts.length >= 2 && (
              <Line
                points={polygonPts}
                stroke={PIN_COLOR}
                strokeWidth={1.5}
                dash={[6, 3]}
                opacity={0.7}
              />
            )}
            {isDrawingPath && pathPts.length >= 2 && (
              <Line
                points={pathPts}
                stroke={activeTool === "river" ? RIVER_COLOR : PIN_COLOR}
                strokeWidth={activeTool === "river" ? 4 : 2}
                opacity={0.6}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
});

// ── Stamp glyphs — hand-drawn cartography style, not emoji ────────
// Drawn with Konva primitives so they sit cleanly in the Writer's-Study palette.
function StampGlyph({ kind, size }: { kind: StampKind; size: number }) {
  if (kind === "tree") return <TreeGlyph size={size} />;
  if (kind === "mountain") return <MountainGlyph size={size} />;
  if (kind === "forest") return <ForestGlyph size={size} />;
  return null;
}

function TreeGlyph({ size }: { size: number }) {
  const s = size;
  // Center at (0,0); foliage cone + trunk rectangle
  const trunkW = s * 0.14;
  const trunkH = s * 0.22;
  const foliageH = s * 0.78;
  const foliageW = s * 0.55;
  return (
    <>
      {/* Trunk */}
      <Rect
        x={-trunkW / 2}
        y={s / 2 - trunkH}
        width={trunkW}
        height={trunkH}
        fill={TREE_TRUNK}
        cornerRadius={1}
      />
      {/* Two-tier conifer foliage */}
      <Line
        points={[
          0, -s / 2,
          -foliageW / 2, -s / 2 + foliageH * 0.55,
          -foliageW / 3, -s / 2 + foliageH * 0.55,
          -foliageW / 1.7, s / 2 - trunkH,
           foliageW / 1.7, s / 2 - trunkH,
           foliageW / 3, -s / 2 + foliageH * 0.55,
           foliageW / 2, -s / 2 + foliageH * 0.55,
        ]}
        closed
        fill={TREE_FOLIAGE}
        stroke={SHAPE_STROKE}
        strokeWidth={0.75}
        lineJoin="round"
      />
    </>
  );
}

function MountainGlyph({ size }: { size: number }) {
  const s = size;
  const w = s * 0.95;
  const h = s * 0.85;
  // Main peak triangle
  return (
    <>
      <Line
        points={[
          -w / 2, h / 2,
          0, -h / 2,
          w / 2, h / 2,
        ]}
        closed
        fill={MTN_ROCK}
        stroke={SHAPE_STROKE}
        strokeWidth={0.9}
        lineJoin="round"
      />
      {/* Snow cap — small triangle at top */}
      <Line
        points={[
          -w * 0.14, -h * 0.18,
          0, -h / 2,
          w * 0.14, -h * 0.18,
          w * 0.07, -h * 0.06,
          0, -h * 0.14,
          -w * 0.08, -h * 0.04,
        ]}
        closed
        fill={MTN_SNOW}
        stroke={MTN_ROCK}
        strokeWidth={0.5}
        lineJoin="round"
      />
      {/* A secondary smaller peak to the left for silhouette interest */}
      <Line
        points={[
          -w * 0.55, h / 2,
          -w * 0.25, -h * 0.08,
          -w * 0.05, h / 2,
        ]}
        closed
        fill={MTN_ROCK}
        stroke={SHAPE_STROKE}
        strokeWidth={0.75}
        opacity={0.85}
        lineJoin="round"
      />
    </>
  );
}

function ForestGlyph({ size }: { size: number }) {
  // Three small trees clustered — back, front-left, front-right
  const unit = size * 0.55;
  return (
    <Group>
      <Group x={0} y={-size * 0.14}>
        <TreeGlyph size={unit} />
      </Group>
      <Group x={-size * 0.30} y={size * 0.08}>
        <TreeGlyph size={unit * 0.9} />
      </Group>
      <Group x={size * 0.30} y={size * 0.08}>
        <TreeGlyph size={unit * 0.9} />
      </Group>
    </Group>
  );
}

// ── Dot grid drawn via canvas manually for performance ────────────
function DotGrid({ width, height }: { width: number; height: number }) {
  const spacing = 40;
  const dots: React.ReactNode[] = [];
  for (let x = spacing; x < width; x += spacing) {
    for (let y = spacing; y < height; y += spacing) {
      dots.push(
        <Circle key={`${x}|${y}`} x={x} y={y} radius={1.2} fill="#c8b89a" opacity={0.35} />
      );
    }
  }
  return <>{dots}</>;
}

// ── Ramer–Douglas–Peucker point simplification ───────────────────
function simplifyPoints(pts: number[], epsilon: number): number[] {
  if (pts.length < 6) return pts;
  const points: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i += 2) {
    points.push([pts[i], pts[i + 1]]);
  }
  const simplified = rdp(points, epsilon);
  return simplified.flatMap(([x, y]) => [x, y]);
}

function rdp(pts: [number, number][], eps: number): [number, number][] {
  if (pts.length <= 2) return pts;
  let maxDist = 0;
  let maxIdx = 0;
  const [x1, y1] = pts[0];
  const [x2, y2] = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = pointLineDistance(pts[i], [x1, y1], [x2, y2]);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > eps) {
    const left  = rdp(pts.slice(0, maxIdx + 1), eps);
    const right = rdp(pts.slice(maxIdx), eps);
    return [...left.slice(0, -1), ...right];
  }
  return [pts[0], pts[pts.length - 1]];
}

function pointLineDistance(p: [number, number], a: [number, number], b: [number, number]): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax, dy = by - ay;
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay);
  const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
