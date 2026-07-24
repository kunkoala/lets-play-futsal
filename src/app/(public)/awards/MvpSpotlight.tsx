import { Box, Group, Stack, Text } from "@mantine/core";
import { NavLink } from "@/components/NavLink";
import { Confetti } from "@/components/Confetti";
import { ArrowRight } from "@/components/icons";

/**
 * MVP hero — volt gradient banner with the admin's hand-picked player (handoff
 * §3). Full-width above the three computed award cards.
 */
export function MvpSpotlight({ mvp, seasonName }: { mvp: { id: number; name: string }; seasonName: string }) {
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
          🏆 MVP · Admin&apos;s pick
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
          Most valuable player — {seasonName}
        </Text>
        <NavLink
          href={`/players/${mvp.id}`}
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
