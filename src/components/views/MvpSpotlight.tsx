import { Box, Group, Stack, Text } from "@mantine/core";
import type { RatingComponent } from "@/lib/rating";
import { NavLink } from "@/components/NavLink";
import { Confetti } from "@/components/Confetti";
import { ArrowRight } from "@/components/icons";

/**
 * MVP hero — volt gradient banner above the computed award cards (handoff §3).
 *
 * The player is normally the season's highest overall rating; `source: "admin"`
 * marks the case where an admin overrode that with a hand-picked winner when
 * closing the season.
 */
export function MvpSpotlight({
  mvp,
  seasonName,
  source,
  subtitle,
  runnerUp,
  breakdown,
  basePath = "",
}: {
  mvp: { id: number; name: string };
  seasonName: string;
  source: "rating" | "admin";
  /** e.g. "Rating 84.2 / 100 · 4 match MVPs". */
  subtitle: string;
  runnerUp?: { name: string; value: string } | null;
  /** Where the rating came from — the top few contributors are listed. */
  breakdown?: RatingComponent[] | null;
  basePath?: string;
}) {
  // Only the metrics that actually moved the needle; the tail is noise.
  const topContributors = [...(breakdown ?? [])]
    .sort((a, b) => b.points - a.points)
    .filter((c) => c.points > 0)
    .slice(0, 4);

  return (
    <Box
      className="fs-pop-in"
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 22,
        padding: "30px 32px",
        color: "#0D0F14",
        background: "linear-gradient(150deg, var(--volt) 0%, var(--volt-end) 100%)",
        boxShadow: "0 12px 30px -12px rgba(200,255,47,.6)",
      }}
    >
      <Confetti />
      {/* faint star watermark */}
      <Box
        aria-hidden
        style={{
          position: "absolute",
          right: -14,
          bottom: -40,
          fontSize: 190,
          lineHeight: 1,
          opacity: 0.14,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        ★
      </Box>
      <Stack gap={6} style={{ position: "relative", zIndex: 1 }}>
        <Text fw={800} fz={11} style={{ letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.72 }}>
          🏆 MVP · {source === "admin" ? "Admin's pick" : "Top rated"}
        </Text>
        <Text
          className="display-face"
          fw={900}
          fz={{ base: 40, sm: 54 }}
          style={{ letterSpacing: "-0.02em", lineHeight: 0.95 }}
        >
          {mvp.name}
        </Text>
        <Text fw={600} fz={14} style={{ opacity: 0.82 }}>
          {subtitle} · {seasonName}
        </Text>
        {runnerUp && (
          <Text fw={600} fz={12} style={{ opacity: 0.68 }}>
            Runner-up: {runnerUp.name} ({runnerUp.value})
          </Text>
        )}

        {/* What the rating was built from, so the pick isn't a black box. */}
        {topContributors.length > 0 && (
          <Group gap={6} mt={8} wrap="wrap">
            {topContributors.map((c) => (
              <Box
                key={c.key}
                component="span"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 20,
                  padding: "3px 10px",
                  background: "rgba(13,15,20,.12)",
                  whiteSpace: "nowrap",
                }}
              >
                {c.label} +{c.points.toFixed(1)}
              </Box>
            ))}
          </Group>
        )}
        <NavLink
          href={`${basePath}/players/${mvp.id}`}
          fw={700}
          fz={13}
          underline="never"
          mt={4}
          style={{ color: "#0D0F14" }}
        >
          <Group gap={5} component="span" wrap="nowrap" align="center">
            <span>View profile</span>
            <ArrowRight size={14} weight="bold" />
          </Group>
        </NavLink>
      </Stack>
    </Box>
  );
}
