"use client";

import { useState } from "react";
import { Box, Group, Text } from "@mantine/core";
import { formatRating } from "@/lib/rating";
import type { RatingPoint } from "@/lib/ratingHistory";

/**
 * A player's season in two pictures: how the rating moved, and what they did
 * each matchday to move it.
 *
 * Hand-rolled SVG, following `admin/analytics/TrafficChart.tsx` — the app has
 * no charting dependency and doesn't need one for two small series.
 *
 * The rating line is deliberately **not** zero-based. Ratings in a real season
 * live in a narrow band, and anchoring at 0 flattens every one of them into
 * the same straight line; the y-axis is labelled at both ends so the zoom is
 * legible rather than hidden.
 */

const WIDTH = 560;
const HEIGHT = 150;
const PAD = { top: 14, right: 10, bottom: 20, left: 34 };

const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function shortDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
}

function ChartFrame({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        background: "var(--panel)",
        padding: "14px 16px",
      }}
    >
      <Group justify="space-between" align="baseline" gap={8} mb={6}>
        <Text
          fz={10}
          fw={800}
          c="var(--text-muted)"
          style={{ letterSpacing: "0.12em", textTransform: "uppercase" }}
        >
          {title}
        </Text>
        {hint && (
          <Text fz={11} c="dimmed">
            {hint}
          </Text>
        )}
      </Group>
      {children}
    </Box>
  );
}

function RatingLine({ points }: { points: RatingPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const values = points.map((p) => p.rating);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // A flat season would divide by zero; give it a band to sit in the middle of.
  const span = rawMax - rawMin;
  const pad = span < 1 ? 1 : span * 0.15;
  const min = Math.max(0, rawMin - pad);
  const max = Math.min(100, rawMax + pad);

  const stepX = points.length > 1 ? PLOT_W / (points.length - 1) : 0;
  const x = (i: number) => PAD.left + i * stepX;
  const y = (value: number) => PAD.top + PLOT_H - ((value - min) / (max - min)) * PLOT_H;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.rating)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${PAD.top + PLOT_H} L${x(0)},${PAD.top + PLOT_H} Z`;

  const active = hover === null ? null : points[hover];

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
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
        aria-label={`Rating over ${points.length} matchdays, from ${formatRating(values[0])} to ${formatRating(values[values.length - 1])}.`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="rating-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--volt)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--volt)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[min, max].map((value) => (
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
              x={PAD.left - 6}
              y={y(value) + 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--text-muted)"
            >
              {Math.round(value)}
            </text>
          </g>
        ))}

        <path d={area} fill="url(#rating-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--volt)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hover !== null && active && (
          <circle
            cx={x(hover)}
            cy={y(active.rating)}
            r={4.5}
            fill="var(--volt)"
            stroke="var(--panel)"
            strokeWidth={2}
          />
        )}

        {[0, points.length - 1]
          .filter((index, i, all) => all.indexOf(index) === i)
          .map((index) => (
            <text
              key={index}
              x={x(index)}
              y={HEIGHT - 5}
              textAnchor={index === 0 ? "start" : "end"}
              fontSize={9}
              fill="var(--text-muted)"
            >
              {shortDate(points[index].date)}
            </text>
          ))}
      </svg>

      {active && (
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: hover !== null && hover > points.length / 2 ? undefined : "50%",
            right: hover !== null && hover > points.length / 2 ? "50%" : undefined,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            background: "var(--panel-raised)",
            border: "1px solid var(--hairline)",
            borderRadius: 10,
            padding: "6px 10px",
            whiteSpace: "nowrap",
          }}
        >
          <Text fz={11} fw={700} c="dimmed">
            {shortDate(active.date)}
          </Text>
          <Text fz={13} fw={800} className="tabular-nums">
            {formatRating(active.rating)} · #{active.rank}
          </Text>
        </Box>
      )}
    </Box>
  );
}

function GoalBars({ points }: { points: RatingPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.goalsThisSession));
  const slot = PLOT_W / points.length;
  // Capped so a three-matchday season doesn't render three fat slabs.
  const barW = Math.min(26, Math.max(4, slot * 0.6));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label={`Goals per matchday. Best is ${max}.`}
    >
      <line
        x1={PAD.left}
        x2={WIDTH - PAD.right}
        y1={PAD.top + PLOT_H}
        y2={PAD.top + PLOT_H}
        stroke="var(--hairline)"
        strokeWidth={1}
      />
      <text x={PAD.left - 6} y={PAD.top + 8} textAnchor="end" fontSize={9} fill="var(--text-muted)">
        {max}
      </text>

      {points.map((point, i) => {
        const height = (point.goalsThisSession / max) * PLOT_H;
        const cx = PAD.left + slot * i + slot / 2;
        return (
          <g key={point.sessionId}>
            <rect
              x={cx - barW / 2}
              y={PAD.top + PLOT_H - height}
              width={barW}
              height={height}
              rx={2}
              fill={point.goalsThisSession > 0 ? "var(--volt)" : "var(--hairline)"}
            >
              <title>
                {shortDate(point.date)}: {point.goalsThisSession} goal
                {point.goalsThisSession === 1 ? "" : "s"}
              </title>
            </rect>
            {/* A blank matchday still gets a stub, so the gaps are visible. */}
            {point.goalsThisSession === 0 && (
              <rect
                x={cx - barW / 2}
                y={PAD.top + PLOT_H - 2}
                width={barW}
                height={2}
                rx={1}
                fill="var(--hairline)"
              />
            )}
          </g>
        );
      })}

      {[0, points.length - 1]
        .filter((index, i, all) => all.indexOf(index) === i)
        .map((index) => (
          <text
            key={index}
            x={PAD.left + slot * index + slot / 2}
            y={HEIGHT - 5}
            textAnchor={index === 0 ? "start" : "end"}
            fontSize={9}
            fill="var(--text-muted)"
          >
            {shortDate(points[index].date)}
          </text>
        ))}
    </svg>
  );
}

export function PlayerProgressCharts({ points }: { points: RatingPoint[] }) {
  // One point is a dot, not a trend — the profile's stat tiles already say
  // everything a single matchday can.
  if (points.length < 2) return null;

  const first = points[0];
  const latest = points[points.length - 1];
  const delta = latest.rating - first.rating;
  const totalGoals = points.reduce((sum, p) => sum + p.goalsThisSession, 0);

  return (
    <>
      <ChartFrame
        title="Rating over the season"
        hint={`${delta >= 0 ? "+" : "−"}${formatRating(Math.abs(delta))} since ${shortDate(first.date)}`}
      >
        <RatingLine points={points} />
      </ChartFrame>

      <ChartFrame title="Goals per matchday" hint={`${totalGoals} in ${points.length}`}>
        <GoalBars points={points} />
      </ChartFrame>
    </>
  );
}
