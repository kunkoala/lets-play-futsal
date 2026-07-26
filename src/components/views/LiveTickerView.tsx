"use client";

/**
 * Public, read-only spectator view of whatever match is in progress right
 * now — the admin's LiveConsole minus every control, plus auto-refresh.
 * There's no websocket/SSE in this app (see README — no service worker,
 * every meaningful action is a server write), so freshness comes from
 * polling: a fast 1s tick redraws the clock locally between polls (same
 * trick LiveConsole uses), and a slower 5s tick calls `router.refresh()` to
 * pick up new goals or a match finishing.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Container, Group, Stack, Text } from "@mantine/core";
import { computeScore } from "@/lib/matchScore";
import { displaySec, formatClock, type MatchClock } from "@/lib/matchClock";
import { NavLink } from "@/components/NavLink";

const POLL_MS = 5000;

export type LiveTickerMatch = {
  id: number;
  matchLabel: string;
  sessionId: number;
  homeTeam: { id: number; name: string; color: string };
  awayTeam: { id: number; name: string; color: string };
  goalEvents: {
    id: number;
    teamId: number;
    scorer: { name: string } | null;
    assist: { name: string } | null;
    matchSec: number | null;
  }[];
  clock: MatchClock;
};

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

function GoalLine({
  scorer,
  assist,
  matchSec,
  color,
  align,
}: {
  scorer: string;
  assist: string | null;
  matchSec: number | null;
  color: string;
  align: "left" | "right";
}) {
  const dot = (
    <Box
      aria-hidden
      style={{ width: 7, height: 7, borderRadius: 999, flexShrink: 0, background: color }}
    />
  );
  const label = (
    <Text fz={13} c="dimmed" style={{ textAlign: align }}>
      {matchSec !== null && (
        <Text span className="tabular-nums" fw={700}>
          {Math.floor(matchSec / 60)}&apos;{" "}
        </Text>
      )}
      <Text span fw={600} c="var(--mantine-color-text)">
        {scorer}
      </Text>{" "}
      ⚽
      {assist ? ` · ${assist} A` : ""}
    </Text>
  );
  return (
    <Group gap={7} wrap="nowrap" align="center">
      {align === "left" ? (
        <>
          {dot}
          {label}
        </>
      ) : (
        <>
          {label}
          {dot}
        </>
      )}
    </Group>
  );
}

function LiveMatchCard({ match, now }: { match: LiveTickerMatch; now: number }) {
  const score = computeScore(match.goalEvents, match.homeTeam.id, match.awayTeam.id);
  const clockText = formatClock(displaySec(match.clock, now));
  const onBreak = match.clock.pausedAt !== null;

  return (
    <Box
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 16,
        background: "var(--panel)",
        padding: "16px 18px",
      }}
    >
      <Group gap={8} align="center" wrap="nowrap">
        <Box
          aria-hidden
          className="lc-pulse"
          style={{ width: 7, height: 7, borderRadius: 999, background: "var(--loss-red)" }}
        />
        <Text fz={11} fw={800} style={{ color: "var(--loss-red)", letterSpacing: "0.1em" }}>
          LIVE
        </Text>
        <Text fz={12} c="dimmed">
          {match.matchLabel}
        </Text>
      </Group>

      <Box
        mt={12}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Text fw={800} fz={16} truncate style={{ color: match.homeTeam.color }}>
          {match.homeTeam.name}
        </Text>
        <Group gap={10} align="center" wrap="nowrap">
          <Text className="display-face tabular-nums" fw={900} fz={26}>
            {score.home}
          </Text>
          <Text c="dimmed" fw={700}>
            –
          </Text>
          <Text className="display-face tabular-nums" fw={900} fz={26}>
            {score.away}
          </Text>
        </Group>
        <Text fw={800} fz={16} truncate style={{ color: match.awayTeam.color, textAlign: "right" }}>
          {match.awayTeam.name}
        </Text>
      </Box>

      <Text
        className="tabular-nums"
        fz={13}
        fw={700}
        ta="center"
        mt={8}
        style={{ color: onBreak ? "var(--team-blue)" : "var(--text-muted)" }}
      >
        {onBreak ? `⏸ ${clockText} · water break` : clockText}
      </Text>

      {match.goalEvents.length > 0 && (
        <Group
          mt={12}
          pt={12}
          align="flex-start"
          justify="space-between"
          wrap="nowrap"
          gap={16}
          style={{ borderTop: "1px solid var(--hairline)" }}
        >
          <Stack gap={5} style={{ flex: 1, minWidth: 0 }}>
            {match.goalEvents
              .filter((e) => e.teamId === match.homeTeam.id)
              .map((e) => (
                <GoalLine
                  key={e.id}
                  scorer={e.scorer?.name ?? "Own goal"}
                  assist={e.assist?.name ?? null}
                  matchSec={e.matchSec}
                  color={match.homeTeam.color}
                  align="left"
                />
              ))}
          </Stack>
          <Stack gap={5} style={{ flex: 1, minWidth: 0 }} align="flex-end">
            {match.goalEvents
              .filter((e) => e.teamId === match.awayTeam.id)
              .map((e) => (
                <GoalLine
                  key={e.id}
                  scorer={e.scorer?.name ?? "Own goal"}
                  assist={e.assist?.name ?? null}
                  matchSec={e.matchSec}
                  color={match.awayTeam.color}
                  align="right"
                />
              ))}
          </Stack>
        </Group>
      )}

      <NavLink
        href={`/sessions/${match.sessionId}`}
        fz={12}
        fw={600}
        underline="hover"
        c="dimmed"
        style={{ display: "inline-block", marginTop: 12 }}
      >
        View the full session →
      </NavLink>
    </Box>
  );
}

export function LiveTickerView({
  matches,
  serverNow,
}: {
  matches: LiveTickerMatch[];
  serverNow: number;
}) {
  const router = useRouter();
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => router.refresh(), POLL_MS);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [router]);

  return (
    <Container size="md" py={{ base: 20, sm: 32 }} pb={64}>
      <Eyebrow>Right now</Eyebrow>
      <Text
        component="h1"
        className="display-face"
        fw={900}
        fz={{ base: 26, sm: 32 }}
        mt={4}
        style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
      >
        LIVE TICKER
      </Text>

      <Stack gap={14} mt={20}>
        {matches.length === 0 ? (
          <Box
            style={{
              border: "1px solid var(--hairline)",
              borderRadius: 16,
              background: "var(--panel)",
              padding: "32px 20px",
              textAlign: "center",
            }}
          >
            <Text fz={14} c="dimmed">
              No match live right now.
            </Text>
            <NavLink href="/sessions" fz={13} fw={600} underline="hover" mt={8}>
              Browse past sessions →
            </NavLink>
          </Box>
        ) : (
          matches.map((m) => <LiveMatchCard key={m.id} match={m} now={now} />)
        )}
      </Stack>
    </Container>
  );
}
