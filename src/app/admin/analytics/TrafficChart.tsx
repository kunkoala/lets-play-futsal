"use client";

import { useState } from "react";
import { Box, Text } from "@mantine/core";
import type { DailyPoint } from "@/lib/analytics";

/**
 * Daily page views over the selected range.
 *
 * One series, on purpose. Visitors-per-day matters too, but a second scaled
 * line would either need a second axis (never) or would sit squashed against
 * the baseline under the views line; it rides in the tooltip instead, as text.
 * With a single series the colour carries no identity, so the brand volt is
 * free to be used as-is and no legend is needed — the panel title names it.
 */

const WIDTH = 760;
const HEIGHT = 200;
const PAD = { top: 14, right: 8, bottom: 22, left: 34 };

const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

/** Day label as "5 Aug" — the ISO string is what the tooltip shows in full. */
function shortDay(day: string): string {
  const [, month, date] = day.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(date)} ${months[Number(month) - 1] ?? ""}`;
}

/** A tick scale that lands on round numbers rather than the raw maximum. */
function niceMax(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

export function TrafficChart({ points }: { points: DailyPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) return null;

  const max = niceMax(Math.max(...points.map((p) => p.views)));
  const stepX = points.length > 1 ? PLOT_W / (points.length - 1) : 0;
  const x = (i: number) => PAD.left + i * stepX;
  const y = (value: number) => PAD.top + PLOT_H - (value / max) * PLOT_H;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.views)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${PAD.top + PLOT_H} L${x(0)},${PAD.top + PLOT_H} Z`;

  const gridValues = [0, max / 2, max];
  const peakIndex = points.reduce((best, p, i) => (p.views > points[best].views ? i : best), 0);
  const active = hover ?? null;
  const activePoint = active === null ? null : points[active];

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    // The SVG scales to its container, so pointer x has to be mapped back into
    // viewBox units before it means anything.
    const svgX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    const index = stepX === 0 ? 0 : Math.round((svgX - PAD.left) / stepX);
    setHover(Math.min(points.length - 1, Math.max(0, index)));
  };

  return (
    <Box style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", height: "auto", display: "block", touchAction: "pan-y" }}
        role="img"
        aria-label={`Page views per day. Peak ${points[peakIndex].views} on ${points[peakIndex].day}.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="traffic-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--volt)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--volt)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive grid: hairlines and muted tick labels, never competing
            with the data. */}
        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(value)}
              y2={y(value)}
              stroke="var(--hairline)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(value) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--text-muted)"
            >
              {Math.round(value)}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#traffic-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--volt)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Selective direct label: the peak only. A number on every point is
            noise, and the tooltip covers the rest. */}
        {points[peakIndex].views > 0 && (
          <text
            x={Math.min(WIDTH - PAD.right - 14, Math.max(PAD.left + 10, x(peakIndex)))}
            y={Math.max(10, y(points[peakIndex].views) - 8)}
            textAnchor="middle"
            fontSize={10}
            fontWeight={700}
            fill="var(--text)"
          >
            {points[peakIndex].views}
          </text>
        )}

        {active !== null && activePoint && (
          <>
            <line
              x1={x(active)}
              x2={x(active)}
              y1={PAD.top}
              y2={PAD.top + PLOT_H}
              stroke="var(--text-muted)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {/* 2px surface ring so the marker reads against the fill. */}
            <circle
              cx={x(active)}
              cy={y(activePoint.views)}
              r={5}
              fill="var(--volt)"
              stroke="var(--panel)"
              strokeWidth={2}
            />
          </>
        )}

        {/* First/middle/last date only — 30 rotated labels is unreadable. */}
        {[0, Math.floor((points.length - 1) / 2), points.length - 1]
          .filter((index, i, all) => all.indexOf(index) === i)
          .map((index) => (
            <text
              key={index}
              x={x(index)}
              y={HEIGHT - 6}
              textAnchor={index === 0 ? "start" : index === points.length - 1 ? "end" : "middle"}
              fontSize={9}
              fill="var(--text-muted)"
            >
              {shortDay(points[index].day)}
            </text>
          ))}
      </svg>

      {activePoint && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            // Flips to the left half once the cursor passes the midpoint, so
            // the card never hangs off the panel.
            left: active !== null && active > points.length / 2 ? undefined : "50%",
            right: active !== null && active > points.length / 2 ? "50%" : undefined,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            background: "var(--panel-raised)",
            border: "1px solid var(--hairline)",
            borderRadius: 10,
            padding: "8px 12px",
            whiteSpace: "nowrap",
          }}
        >
          <Text fz={11} fw={700} c="dimmed">
            {activePoint.day}
          </Text>
          <Text fz={13} fw={800} className="tabular-nums">
            {activePoint.views} views
          </Text>
          <Text fz={11} c="dimmed" className="tabular-nums">
            {activePoint.visitors} visitor{activePoint.visitors === 1 ? "" : "s"}
          </Text>
        </Box>
      )}
    </Box>
  );
}
