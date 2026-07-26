"use client";

/**
 * Xbox-style badge grid for the player profile. Locked achievements sit
 * grey and flat; unlocked ones get their real color back plus an electric
 * volt glow. Tapping any tile — locked or not — opens a bottom-sheet with
 * the full detail (name, description, tier, points): the single interaction
 * that works identically whether you're on a phone (where most people will
 * actually see this) or clicking with a mouse. Hovering on desktop shows the
 * same name + description in a tooltip first, same pattern as StatTooltip.
 */
import { useMemo, useState } from "react";
import { Box, Drawer, Group, Stack, Text, Tooltip } from "@mantine/core";
import {
  achievementScore,
  TIER_POINTS,
  type AchievementTier,
  type EvaluatedAchievement,
} from "@/lib/achievements";

const TIER_LABEL: Record<AchievementTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const TIER_COLOR: Record<AchievementTier, string> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#ffd23f",
  platinum: "var(--volt)",
};

/** Rarest/hardest first, so an unlocked Platinum outranks an unlocked Bronze. */
const TIER_RANK: Record<AchievementTier, number> = { platinum: 4, gold: 3, silver: 2, bronze: 1 };

/** Unlocked first, then hardest tier first within each group. */
function sortAchievements(achievements: readonly EvaluatedAchievement[]): EvaluatedAchievement[] {
  return [...achievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return TIER_RANK[b.tier] - TIER_RANK[a.tier];
  });
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Text
      component="div"
      fw={700}
      fz={10}
      c="dimmed"
      style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
    >
      {children}
    </Text>
  );
}

function Badge({
  achievement,
  onSelect,
}: {
  achievement: EvaluatedAchievement;
  onSelect: () => void;
}) {
  const unlocked = achievement.unlocked;
  const tierColor = TIER_COLOR[achievement.tier];
  return (
    <Tooltip
      label={
        <>
          <Text fz={12} fw={800} style={{ color: tierColor }}>
            {achievement.name}
            {!unlocked && " 🔒"}
          </Text>
          <Text fz={10} fw={700} c="dimmed" style={{ letterSpacing: "0.06em" }}>
            {TIER_LABEL[achievement.tier].toUpperCase()} · {achievement.points} PTS
          </Text>
          <Text fz={11} fw={500} c="dimmed" mt={2}>
            {achievement.description}
          </Text>
        </>
      }
      withArrow
      multiline
      w={200}
      openDelay={150}
      // Touch left off deliberately: on a phone the tap already opens the
      // full-detail drawer, and showing this tooltip too would just flash
      // and get covered a moment later — hover is a desktop-only bonus here.
      events={{ hover: true, focus: true, touch: false }}
      // Left border in the achievement's tier color — same "class at a
      // glance" indicator as the badge tile's own border below.
      styles={{ tooltip: { padding: "8px 10px", borderLeft: `3px solid ${tierColor}` } }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`${achievement.name}, ${TIER_LABEL[achievement.tier]}, ${unlocked ? "unlocked" : "locked"}`}
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          // Tier color when unlocked doubles as the "what class is this"
          // indicator; locked stays neutral so it doesn't hint at a tier
          // worth chasing before it's actually earned.
          border: unlocked ? `1px solid ${tierColor}` : "1px solid var(--hairline)",
          background: unlocked ? "var(--panel-raised)" : "var(--panel)",
          fontSize: 22,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          filter: unlocked ? "none" : "grayscale(1)",
          opacity: unlocked ? 1 : 0.4,
          boxShadow: unlocked ? "0 0 14px 1px rgba(200,255,47,.55)" : "none",
          transition: "transform 0.1s ease",
        }}
        onPointerDown={(e) => {
          e.currentTarget.style.transform = "scale(0.94)";
        }}
        onPointerUp={(e) => {
          e.currentTarget.style.transform = "scale(1)";
        }}
      >
        {achievement.glyph}
      </button>
    </Tooltip>
  );
}

export function AchievementBadges({ achievements }: { achievements: EvaluatedAchievement[] }) {
  const [selected, setSelected] = useState<EvaluatedAchievement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const sorted = useMemo(() => sortAchievements(achievements), [achievements]);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);
  const score = achievementScore(achievements);

  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 14,
        background: "var(--panel)",
        padding: "14px 16px",
      }}
    >
      <Group
        justify="space-between"
        align="center"
        wrap="nowrap"
        mb={collapsed ? 0 : 10}
        style={{ cursor: "pointer" }}
        onClick={() => setCollapsed((c) => !c)}
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setCollapsed((c) => !c);
          }
        }}
      >
        <Eyebrow>🏅 Achievements</Eyebrow>
        <Group gap={8} wrap="nowrap">
          <Text className="tabular-nums" fz={12} fw={700} c="dimmed">
            {unlockedCount}/{achievements.length} · {score}/{totalPoints} pts
          </Text>
          <Text
            fz={11}
            c="dimmed"
            style={{
              display: "inline-block",
              transition: "transform 0.15s ease",
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </Text>
        </Group>
      </Group>

      {!collapsed && (
        <Group gap={8} wrap="wrap">
          {sorted.map((a) => (
            <Badge key={a.id} achievement={a} onSelect={() => setSelected(a)} />
          ))}
        </Group>
      )}

      <Drawer
        opened={selected !== null}
        onClose={() => setSelected(null)}
        position="bottom"
        withCloseButton
        // `size` sets a fixed height on a bottom drawer (there's no "hug the
        // content" preset), so it's left unset here and the content itself
        // capped/sized via styles instead — a fixed size previously filled
        // the full viewport height, leaving no overlay to tap-to-close.
        styles={{
          content: {
            background: "var(--deep-panel)",
            borderRadius: "18px 18px 0 0",
            height: "auto",
            maxHeight: "75vh",
          },
          header: { background: "var(--deep-panel)", minHeight: 0, padding: "10px 14px 0" },
          body: { padding: "8px 20px calc(20px + env(safe-area-inset-bottom))" },
        }}
      >
        {selected && (
          <Stack gap={10} align="center" ta="center">
            <Box
              style={{
                width: 68,
                height: 68,
                borderRadius: 18,
                border: selected.unlocked
                  ? `1px solid ${TIER_COLOR[selected.tier]}`
                  : "1px solid var(--hairline)",
                background: "var(--panel-raised)",
                fontSize: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                filter: selected.unlocked ? "none" : "grayscale(1)",
                opacity: selected.unlocked ? 1 : 0.5,
                boxShadow: selected.unlocked ? "0 0 20px 2px rgba(200,255,47,.55)" : "none",
              }}
            >
              {selected.glyph}
            </Box>
            <Text className="display-face" fw={800} fz={19} style={{ letterSpacing: "-0.01em" }}>
              {selected.name}
            </Text>
            <Text fz={13} c="dimmed" style={{ maxWidth: 320 }}>
              {selected.description}
            </Text>
            <Group gap={8} mt={4}>
              <Box
                component="span"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: TIER_COLOR[selected.tier],
                  border: `1px solid ${TIER_COLOR[selected.tier]}`,
                  borderRadius: 20,
                  padding: "3px 10px",
                }}
              >
                {TIER_LABEL[selected.tier]} · {TIER_POINTS[selected.tier]} pts
              </Box>
              <Box
                component="span"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: selected.unlocked ? "var(--volt)" : "var(--text-muted)",
                  border: `1px solid ${selected.unlocked ? "var(--volt)" : "var(--hairline)"}`,
                  borderRadius: 20,
                  padding: "3px 10px",
                }}
              >
                {selected.unlocked ? "Unlocked" : "Locked"}
              </Box>
            </Group>
          </Stack>
        )}
      </Drawer>
    </Box>
  );
}
