"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { KEEPER_GLYPH } from "@/lib/keeperPref";
import { gradientDarkFor } from "@/lib/teamPalette";
import {
  breakAtSec,
  displaySec,
  elapsedSec,
  formatClock,
  isBreakDue,
  isFullTime,
  type MatchClock,
} from "@/lib/matchClock";
import {
  attachAssist,
  deleteEvent,
  endMatch,
  pauseForBreak,
  recordGoal,
  recordOwnGoal,
  resumeMatch,
  substitutePlayer,
  undoLastEvent,
} from "./actions";

type Player = { id: number; name: string; isKeeper: boolean };
type TeamInfo = { id: number; name: string; color: string; players: Player[] };
type GoalEventT = {
  id: number;
  seq: number;
  teamId: number;
  scorerId: number | null;
  assistId: number | null;
  matchSec: number | null;
};

let optimisticIdCounter = -1;

/** `11'` — floor rather than round, matching the clock's own mm:ss floor. */
function formatMinute(matchSec: number | null): string | null {
  if (matchSec === null) return null;
  return `${Math.floor(matchSec / 60)}'`;
}

export function LiveConsole({
  matchId,
  sessionId,
  homeTeam,
  awayTeam,
  events,
  isFinished,
  matchLabel,
  available,
  clock,
  serverNow,
}: {
  matchId: number;
  sessionId: number;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  events: GoalEventT[];
  isFinished: boolean;
  /** Attendees not currently on the pitch — who a substitution can bring on. */
  available: { id: number; name: string }[];
  /** Eyebrow under the phone scoreboard, e.g. "Matchday 25 Jul · Match 4". */
  matchLabel: string;
  clock: MatchClock;
  /** Server's `Date.now()` at render, used as the first tick so SSR and the
   *  first client render produce identical markup. */
  serverNow: number;
}) {
  const router = useRouter();
  const [optimisticEvents, addOptimisticEvent] = useOptimistic(
    events,
    (state: GoalEventT[], newEvent: GoalEventT) => [...state, newEvent],
  );
  const [isPending, startTransition] = useTransition();
  const [pendingAssist, setPendingAssist] = useState<
    { eventId: number; teamId: number; scorerName: string } | null
  >(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [showFeed, setShowFeed] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  // Half a substitution: who's coming off, waiting on who comes on.
  const [subOff, setSubOff] = useState<Player | null>(null);
  const [subError, setSubError] = useState<string | null>(null);
  const [cooldownIds, setCooldownIds] = useState<Set<number>>(new Set());
  // Phone layout only: which roster is tappable, and whether the list area
  // shows that roster or the event feed.
  const [phoneTeamId, setPhoneTeamId] = useState(homeTeam.id);
  const [phoneFeed, setPhoneFeed] = useState(false);

  // One tick per second drives every clock readout. Seeded with the server's
  // clock so the hydrated markup matches what was sent.
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const onBreak = clock.pausedAt !== null && !isFinished;
  const breakDue = !isFinished && isBreakDue(clock, now);
  const fullTime = !isFinished && isFullTime(clock, now);
  const clockText = formatClock(displaySec(clock, now));

  // The midpoint is noticed here and committed on the server, so a reload —
  // or the other admin's iPad — lands on the same paused clock. The ref keeps
  // a slow round-trip from firing the action once per tick.
  const breakRequested = useRef(false);
  useEffect(() => {
    if (!breakDue || onBreak || breakRequested.current) return;
    breakRequested.current = true;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      await pauseForBreak(fd);
      router.refresh();
    });
  }, [breakDue, onBreak, matchId, router, startTransition]);

  function handleResume() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      await resumeMatch(fd);
      router.refresh();
    });
  }

  const playersById = new Map<number, Player>();
  for (const p of [...homeTeam.players, ...awayTeam.players]) playersById.set(p.id, p);

  const homeScore = optimisticEvents.filter((e) => e.teamId === homeTeam.id).length;
  const awayScore = optimisticEvents.filter((e) => e.teamId === awayTeam.id).length;

  function goalsFor(playerId: number): number {
    return optimisticEvents.filter((e) => e.scorerId === playerId).length;
  }

  function assistsFor(playerId: number): number {
    return optimisticEvents.filter((e) => e.assistId === playerId).length;
  }

  function withCooldown(playerId: number, fn: () => void) {
    if (cooldownIds.has(playerId) || isFinished) return;
    setCooldownIds((prev) => new Set(prev).add(playerId));
    setTimeout(() => {
      setCooldownIds((prev) => {
        const next = new Set(prev);
        next.delete(playerId);
        return next;
      });
    }, 600);
    fn();
  }

  function handleScore(team: TeamInfo, scorer: Player) {
    withCooldown(scorer.id, () => {
      setPendingAssist(null); // any new action auto-dismisses a prior pending assist strip
      startTransition(async () => {
        addOptimisticEvent({
          id: optimisticIdCounter--,
          seq: optimisticEvents.length + 1,
          teamId: team.id,
          scorerId: scorer.id,
          assistId: null,
          matchSec: elapsedSec(clock, Date.now()),
        });
        const fd = new FormData();
        fd.set("matchId", String(matchId));
        fd.set("teamId", String(team.id));
        fd.set("scorerId", String(scorer.id));
        const result = await recordGoal(undefined, fd);
        if (result && "eventId" in result) {
          setPendingAssist({ eventId: result.eventId, teamId: team.id, scorerName: scorer.name });
        }
        router.refresh();
      });
    });
  }

  function handleOwnGoal(team: TeamInfo) {
    setPendingAssist(null);
    startTransition(async () => {
      addOptimisticEvent({
        id: optimisticIdCounter--,
        seq: optimisticEvents.length + 1,
        teamId: team.id,
        scorerId: null,
        assistId: null,
        matchSec: elapsedSec(clock, Date.now()),
      });
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      fd.set("teamId", String(team.id));
      await recordOwnGoal(undefined, fd);
      router.refresh();
    });
  }

  function handleAssist(assistPlayerId: number | null) {
    if (!pendingAssist) return;
    const eventId = pendingAssist.eventId;
    setPendingAssist(null);
    if (assistPlayerId === null) return; // "No assist" — event already has assistId: null
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", String(eventId));
      fd.set("assistId", String(assistPlayerId));
      await attachAssist(fd);
      router.refresh();
    });
  }

  function handleUndo() {
    setPendingAssist(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      await undoLastEvent(fd);
      router.refresh();
    });
  }

  function handleDeleteEvent(eventId: number) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("eventId", String(eventId));
      await deleteEvent(fd);
      router.refresh();
    });
  }

  function handleSub(onPlayerId: number) {
    if (!subOff) return;
    const offId = subOff.id;
    setSubError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      fd.set("offPlayerId", String(offId));
      fd.set("onPlayerId", String(onPlayerId));
      const result = await substitutePlayer(undefined, fd);
      if (result?.error) {
        setSubError(result.error);
        return;
      }
      setSubOff(null);
      setShowSubs(false);
      router.refresh();
    });
  }

  function handleEndMatch() {
    setConfirmEnd(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("matchId", String(matchId));
      await endMatch(undefined, fd); // redirects back to the session page on success
    });
  }

  const pendingEventScorerId = pendingAssist
    ? optimisticEvents.find((e) => e.id === pendingAssist.eventId)?.scorerId
    : null;
  const assistCandidates = pendingAssist
    ? (pendingAssist.teamId === homeTeam.id ? homeTeam.players : awayTeam.players).filter(
        (p) => p.id !== pendingEventScorerId,
      )
    : [];

  return (
    <div className="lc-root">
      <TeamHalf
        team={homeTeam}
        score={homeScore}
        align="start"
        isFinished={isFinished}
        goalsFor={goalsFor}
        assistsFor={assistsFor}
        cooldownIds={cooldownIds}
        onScore={(p) => handleScore(homeTeam, p)}
        onOwnGoal={() => handleOwnGoal(awayTeam)}
      />
      <TeamHalf
        team={awayTeam}
        score={awayScore}
        align="end"
        isFinished={isFinished}
        goalsFor={goalsFor}
        assistsFor={assistsFor}
        cooldownIds={cooldownIds}
        onScore={(p) => handleScore(awayTeam, p)}
        onOwnGoal={() => handleOwnGoal(homeTeam)}
      />

      {/* Phone layout (handoff 5a/5b). Rendered alongside the split court and
          swapped by CSS at 48em, so both share this component's state. */}
      <PhoneConsole
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeScore={homeScore}
        awayScore={awayScore}
        matchLabel={matchLabel}
        isFinished={isFinished}
        clockText={clockText}
        fullTime={fullTime}
        onBreak={onBreak}
        events={optimisticEvents}
        playersById={playersById}
        activeTeamId={phoneTeamId}
        onSelectTeam={setPhoneTeamId}
        showFeed={phoneFeed}
        onToggleFeed={setPhoneFeed}
        goalsFor={goalsFor}
        assistsFor={assistsFor}
        cooldownIds={cooldownIds}
        pendingAssist={pendingAssist}
        pendingScorerId={pendingEventScorerId}
        assistCandidates={assistCandidates}
        onScore={handleScore}
        onOwnGoal={handleOwnGoal}
        onAssist={handleAssist}
        onDeleteEvent={handleDeleteEvent}
        onUndo={handleUndo}
        onEnd={() => setConfirmEnd(true)}
        onExit={() => router.push(`/admin/sessions/${sessionId}`)}
      />

      {/* Floating control pill — top-center */}
      <div
        className="lc-toppill"
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: 4,
          borderRadius: 24,
          background: "rgba(10,11,14,0.86)",
          border: "1px solid var(--hairline)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 10px 30px -12px rgba(0,0,0,.7)",
        }}
      >
        <PillButton onClick={() => router.push(`/admin/sessions/${sessionId}`)}>Exit</PillButton>
        <PillDivider />
        <span
          className={`tabular-nums${fullTime ? " lc-clock-full" : ""}`}
          style={{
            padding: "0 10px",
            fontSize: 16,
            fontWeight: 900,
            color: fullTime ? "var(--volt)" : onBreak ? "var(--team-blue)" : "#fff",
          }}
        >
          {clockText}
        </span>
        <PillDivider />
        {/* Glyph plus a label that CSS drops on a narrow screen — see
            .lc-pill-label. Landscape on a phone still gets the split court, and
            with six controls the row outgrew the viewport and clipped its own
            end buttons. Nothing is removed: this bar is the only Undo the
            split-court layout has (the phone layout's lives in its bottom bar),
            so hiding the words is the right thing to lose, not the button. */}
        <PillButton
          onClick={handleUndo}
          disabled={optimisticEvents.length === 0 || isFinished}
          title="Undo last event"
        >
          ↺<span className="lc-pill-label"> Undo</span>
        </PillButton>
        <PillButton onClick={() => setShowFeed(true)} title="Event feed">
          ☰<span className="lc-pill-label"> Feed</span>
        </PillButton>
        <PillButton
          onClick={() => setShowSubs(true)}
          disabled={available.length === 0}
          title="Substitute a player"
        >
          ⇄<span className="lc-pill-label"> Sub</span>
        </PillButton>
        {!isFinished && (
          <>
            <PillDivider />
            <PillButton onClick={() => setConfirmEnd(true)} accent pulse={fullTime}>
              End<span className="lc-pill-label"> match</span>
            </PillButton>
          </>
        )}
      </div>

      {isFinished && (
        <div
          className="lc-toppill"
          style={{
            position: "absolute",
            top: 58,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            color: "rgba(255,255,255,.7)",
          }}
        >
          MATCH FINISHED
        </div>
      )}

      {/* Assist follow-up strip — bottom-center overlay (split-court layout;
          the phone layout inlines the same prompt under the scorer's tile) */}
      {pendingAssist && (
        <div
          className="lc-assist-float"
          style={{
            position: "absolute",
            bottom: 16,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 25,
            width: "min(560px, calc(100% - 24px))",
            padding: "12px 14px",
            borderRadius: 18,
            background: "rgba(10,11,14,0.94)",
            border: "1px solid var(--hairline)",
            boxShadow: "0 16px 40px -14px rgba(0,0,0,.8)",
          }}
        >
          <Text fw={700} fz={13} c="dimmed" mb={8}>
            Assist for {pendingAssist.scorerName}&apos;s goal?
          </Text>
          <Group gap={8}>
            {assistCandidates.map((p) => (
              <button key={p.id} className="lc-chip" onClick={() => handleAssist(p.id)}>
                {p.name}
              </button>
            ))}
            <button className="lc-chip lc-chip-muted" onClick={() => handleAssist(null)}>
              No assist
            </button>
          </Group>
        </div>
      )}

      {/* Water break — covers both layouts, so it is rendered once here rather
          than inside either. Sits under the end-match Modal's z-index. */}
      {onBreak && (
        <div className="lc-break">
          <div className="lc-break-drop">💧</div>
          <div className="lc-break-title">WATER BREAK</div>
          <div className="tabular-nums lc-break-clock">{clockText}</div>
          <div className="lc-break-sub">
            {breakAtSec(clock.durationSec) === null
              ? "clock stopped"
              : "half time reached · clock stopped"}
          </div>
          <button className="lc-break-resume" onClick={handleResume} disabled={isPending}>
            ▶ Resume
          </button>
        </div>
      )}

      {/* Event feed — slide-up panel */}
      {showFeed && (
        <FeedOverlay
          events={optimisticEvents}
          playersById={playersById}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          onDelete={handleDeleteEvent}
          onClose={() => setShowFeed(false)}
        />
      )}

      <Modal
        opened={showSubs}
        onClose={() => {
          setShowSubs(false);
          setSubOff(null);
          setSubError(null);
        }}
        title="Substitution"
        centered
        zIndex={300}
      >
        <Stack gap="sm">
          <Text fz={13} c="dimmed">
            {subOff
              ? `Who comes on for ${subOff.name}?`
              : "Who's coming off? This only changes this match — goals already scored stay."}
          </Text>

          {subError && (
            <Text fz={13} fw={600} c="red">
              {subError}
            </Text>
          )}

          {subOff ? (
            <>
              <Group gap={6}>
                {available.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="lc-chip"
                    disabled={isPending}
                    onClick={() => handleSub(p.id)}
                  >
                    {p.name}
                  </button>
                ))}
              </Group>
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setSubOff(null)}>
                  Back
                </Button>
              </Group>
            </>
          ) : (
            [homeTeam, awayTeam].map((team) => (
              <Stack key={team.id} gap={6}>
                <Text fw={800} fz={12} style={{ color: team.color }}>
                  {team.name}
                </Text>
                <Group gap={6}>
                  {team.players.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="lc-chip"
                      style={{ borderColor: team.color }}
                      onClick={() => {
                        setSubError(null);
                        setSubOff(p);
                      }}
                    >
                      {p.isKeeper ? `${KEEPER_GLYPH} ` : ""}
                      {p.name}
                    </button>
                  ))}
                </Group>
              </Stack>
            ))
          )}

          <Text fz={11} c="dimmed">
            Subbing off the keeper hands the glove to whoever comes on.
          </Text>
        </Stack>
      </Modal>

      <Modal
        opened={confirmEnd}
        onClose={() => setConfirmEnd(false)}
        title="End match?"
        centered
        zIndex={300}
      >
        <Stack>
          <Text>
            Final score:{" "}
            <Text span fw={700} style={{ color: homeTeam.color }}>
              {homeTeam.name}
            </Text>{" "}
            {homeScore} — {awayScore}{" "}
            <Text span fw={700} style={{ color: awayTeam.color }}>
              {awayTeam.name}
            </Text>
          </Text>

          <Text fz={12} c="dimmed">
            There&apos;s no man of the match any more — pick one player of the day for the
            whole session from the session page when you&apos;re done.
          </Text>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirmEnd(false)}>
              Cancel
            </Button>
            <Button loading={isPending} onClick={handleEndMatch}>
              End match
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

function TeamHalf({
  team,
  score,
  align,
  isFinished,
  goalsFor,
  assistsFor,
  cooldownIds,
  onScore,
  onOwnGoal,
}: {
  team: TeamInfo;
  score: number;
  align: "start" | "end";
  isFinished: boolean;
  goalsFor: (playerId: number) => number;
  assistsFor: (playerId: number) => number;
  cooldownIds: Set<number>;
  onScore: (p: Player) => void;
  onOwnGoal: () => void;
}) {
  return (
    <div
      className="lc-half"
      style={{
        background: `linear-gradient(160deg, ${team.color} 0%, ${gradientDarkFor(team.color)} 100%)`,
      }}
    >
      <div style={{ display: "flex", justifyContent: align === "start" ? "flex-start" : "flex-end" }}>
        <span
          className="display-face"
          style={{
            fontWeight: 900,
            fontSize: 15,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#fff",
            textShadow: "0 2px 12px rgba(0,0,0,.4)",
          }}
        >
          {team.name}
        </span>
      </div>

      <div className="lc-score">{score}</div>

      {isFinished ? (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,.75)", fontWeight: 700, fontSize: 12 }}>
          FINAL
        </div>
      ) : (
        <div className="lc-tiles">
          {team.players.map((p) => (
            <button
              key={p.id}
              className="lc-tile"
              disabled={cooldownIds.has(p.id)}
              onClick={() => onScore(p)}
            >
              <span style={{ textAlign: "center", lineHeight: 1.1 }}>
                {p.isKeeper ? `${KEEPER_GLYPH} ` : ""}
                {p.name}
              </span>
              <span
                className="tabular-nums"
                style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,.72)" }}
              >
                {goalsFor(p.id)} ⚽ · {assistsFor(p.id)} A
              </span>
            </button>
          ))}
          <button className="lc-tile lc-tile-og" onClick={onOwnGoal}>
            Own goal +1
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Phone console — handoff screens 5a/5b, one thumb at ~390px.
 *
 * Presentational: every piece of state and every action comes from
 * `LiveConsole`, so tapping here and tapping the split court hit the same
 * optimistic updates, the same 600ms double-tap guard and the same Server
 * Actions. Only the reflow differs.
 */
function PhoneConsole({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  matchLabel,
  isFinished,
  clockText,
  fullTime,
  onBreak,
  events,
  playersById,
  activeTeamId,
  onSelectTeam,
  showFeed,
  onToggleFeed,
  goalsFor,
  assistsFor,
  cooldownIds,
  pendingAssist,
  pendingScorerId,
  assistCandidates,
  onScore,
  onOwnGoal,
  onAssist,
  onDeleteEvent,
  onUndo,
  onEnd,
  onExit,
}: {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeScore: number;
  awayScore: number;
  matchLabel: string;
  isFinished: boolean;
  clockText: string;
  fullTime: boolean;
  onBreak: boolean;
  events: GoalEventT[];
  playersById: Map<number, Player>;
  activeTeamId: number;
  onSelectTeam: (id: number) => void;
  showFeed: boolean;
  onToggleFeed: (v: boolean) => void;
  goalsFor: (playerId: number) => number;
  assistsFor: (playerId: number) => number;
  cooldownIds: Set<number>;
  pendingAssist: { eventId: number; teamId: number; scorerName: string } | null;
  /** Scorer of the goal awaiting an assist — by id, since names can repeat. */
  pendingScorerId: number | null | undefined;
  assistCandidates: Player[];
  onScore: (team: TeamInfo, player: Player) => void;
  onOwnGoal: (team: TeamInfo) => void;
  onAssist: (playerId: number | null) => void;
  onDeleteEvent: (eventId: number) => void;
  onUndo: () => void;
  onEnd: () => void;
  onExit: () => void;
}) {
  const activeTeam = activeTeamId === awayTeam.id ? awayTeam : homeTeam;
  const sortedEvents = [...events].sort((a, b) => b.seq - a.seq);

  return (
    <div className="lc-phone">
      <div className="lcp-scroll">
        <div className="lcp-topline">
          <button className="lcp-chip lcp-chip-outline" onClick={onExit}>
            ← Exit
          </button>
          {isFinished && (
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "var(--text-muted)" }}>
              MATCH FINISHED
            </span>
          )}
        </div>

        {/* Both scores stay visible whichever roster is active — that is the
            whole reason the split court can be dropped at this width. */}
        <div className="lcp-board">
          <BoardHalf team={homeTeam} score={homeScore} side="left" />
          <BoardHalf team={awayTeam} score={awayScore} side="right" />
        </div>

        <div
          className="lcp-clock"
          data-state={fullTime ? "full" : onBreak ? "break" : "running"}
        >
          <span className="tabular-nums lcp-clock-time">{clockText}</span>
          <span className="lcp-clock-label">
            {fullTime ? "FULL TIME" : onBreak ? "WATER BREAK" : matchLabel}
          </span>
        </div>

        <div className="lcp-seg">
          {[homeTeam, awayTeam].map((team) => {
            const active = !showFeed && team.id === activeTeamId;
            return (
              <button
                key={team.id}
                className="lcp-seg-btn"
                data-active={active}
                style={active ? { background: team.color, color: "#fff" } : undefined}
                onClick={() => {
                  onToggleFeed(false);
                  onSelectTeam(team.id);
                }}
              >
                {team.name.toUpperCase()}
              </button>
            );
          })}
          <button
            className="lcp-seg-btn"
            data-active={showFeed}
            style={showFeed ? { background: "var(--volt)", color: "#0D0F14" } : undefined}
            onClick={() => onToggleFeed(!showFeed)}
          >
            Feed · {events.length}
          </button>
        </div>

        {showFeed ? (
          <>
            <div className="lcp-eyebrow" style={{ textAlign: "left", margin: "14px 0 8px" }}>
              Tap × to delete
            </div>
            <div className="lcp-list" style={{ marginTop: 0 }}>
              {sortedEvents.length === 0 && (
                <Text c="dimmed" fz={14} ta="center" py="lg">
                  No goals yet.
                </Text>
              )}
              {sortedEvents.map((e) => {
                const team = e.teamId === homeTeam.id ? homeTeam : awayTeam;
                const scorer = e.scorerId ? (playersById.get(e.scorerId)?.name ?? "?") : null;
                const assist = e.assistId ? playersById.get(e.assistId)?.name : null;
                const minute = formatMinute(e.matchSec);
                return (
                  <div key={e.id} className="lcp-event">
                    <span className="lcp-event-seq">{e.seq}</span>
                    <span className="lcp-event-dot" style={{ background: team.color }} />
                    <span className="lcp-event-text">
                      {minute && (
                        <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>
                          {minute}{" "}
                        </span>
                      )}
                      {scorer ? (
                        <>
                          {scorer} ⚽
                          {assist && (
                            <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>
                              {" "}
                              ({assist} A)
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          Own goal{" "}
                          <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>
                            for {team.name}
                          </span>
                        </>
                      )}
                    </span>
                    {/* Optimistic rows carry a negative id and have no server
                        row to delete yet. */}
                    {e.id > 0 && !isFinished && (
                      <button
                        className="lcp-event-del"
                        aria-label={`Delete event ${e.seq}`}
                        onClick={() => onDeleteEvent(e.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : isFinished ? (
          <Text c="dimmed" fz={14} ta="center" py="lg">
            Match finished — open the feed to review the goals.
          </Text>
        ) : (
          <div className="lcp-list">
            {activeTeam.players.map((p) => {
              const scored = pendingAssist?.teamId === activeTeam.id && pendingScorerId === p.id;
              const goals = goalsFor(p.id);
              const assists = assistsFor(p.id);
              return (
                <div
                  key={p.id}
                  className="lcp-row"
                  style={
                    scored
                      ? {
                          borderColor: activeTeam.color,
                          boxShadow: `0 0 0 3px color-mix(in srgb, ${activeTeam.color} 16%, transparent)`,
                        }
                      : undefined
                  }
                >
                  <button
                    className="lcp-tile"
                    disabled={cooldownIds.has(p.id)}
                    onClick={() => onScore(activeTeam, p)}
                  >
                    <span style={{ minWidth: 0 }}>
                      {p.isKeeper ? `${KEEPER_GLYPH} ` : ""}
                      {p.name}
                      {scored && <span className="lcp-scored-note"> · scored</span>}
                    </span>
                    <span className="lcp-counts">
                      <span
                        className="lcp-count"
                        style={goals > 0 ? { color: activeTeam.color } : undefined}
                      >
                        {goals}
                        <i>⚽</i>
                      </span>
                      <span
                        className="lcp-count"
                        style={assists > 0 ? { color: activeTeam.color } : undefined}
                      >
                        {assists}
                        <i>A</i>
                      </span>
                    </span>
                  </button>

                  {scored && (
                    <div className="lcp-assist">
                      <div className="lcp-assist-label">ASSIST?</div>
                      <div className="lcp-chips">
                        {assistCandidates.map((c) => (
                          <button key={c.id} className="lcp-chip" onClick={() => onAssist(c.id)}>
                            {c.name}
                          </button>
                        ))}
                        <button
                          className="lcp-chip lcp-chip-outline"
                          onClick={() => onAssist(null)}
                        >
                          No assist
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Scorer-less goal credited to the team currently shown — named
                in full because "own goal" alone does not say who gets it. */}
            <button className="lcp-og" onClick={() => onOwnGoal(activeTeam)}>
              Own goal / unknown +1 for {activeTeam.name}
            </button>
          </div>
        )}
      </div>

      <div className="lcp-bar">
        <button
          className="lcp-bar-btn lcp-undo"
          onClick={onUndo}
          disabled={events.length === 0 || isFinished}
        >
          ↺ Undo
        </button>
        <button
          className={`lcp-bar-btn lcp-end${fullTime ? " lc-pulse" : ""}`}
          onClick={isFinished ? onExit : onEnd}
        >
          {isFinished ? "Back to session" : "End match"}
        </button>
      </div>
    </div>
  );
}

function BoardHalf({ team, score, side }: { team: TeamInfo; score: number; side: "left" | "right" }) {
  return (
    <div
      className="lcp-board-half"
      style={{
        background: `linear-gradient(${side === "left" ? 150 : 200}deg, ${team.color}, ${gradientDarkFor(team.color)})`,
        alignItems: side === "left" ? "flex-start" : "flex-end",
        textAlign: side === "left" ? "left" : "right",
      }}
    >
      <span className="lcp-board-name">{team.name.toUpperCase()}</span>
      <span className="lcp-board-score">{score}</span>
    </div>
  );
}

function PillButton({
  children,
  onClick,
  disabled,
  accent,
  pulse,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  pulse?: boolean;
  /** Doubles as the accessible name once the label is hidden on a narrow screen. */
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={pulse ? "lc-pulse" : undefined}
      style={{
        border: "none",
        borderRadius: 20,
        padding: "9px 14px",
        fontSize: 13,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        background: accent ? "var(--volt)" : "transparent",
        color: accent ? "#0D0F14" : "#fff",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function PillDivider() {
  return <span style={{ width: 1, height: 20, background: "var(--hairline)" }} />;
}

function FeedOverlay({
  events,
  playersById,
  homeTeam,
  awayTeam,
  onDelete,
  onClose,
}: {
  events: GoalEventT[];
  playersById: Map<number, Player>;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  onDelete: (id: number) => void;
  onClose: () => void;
}) {
  const sorted = [...events].sort((a, b) => b.seq - a.seq);
  return (
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 30,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          maxHeight: "70%",
          display: "flex",
          flexDirection: "column",
          background: "var(--panel)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          border: "1px solid var(--hairline)",
          borderBottom: "none",
        }}
      >
        <Group justify="space-between" p="md" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <Text fw={800} fz={13} style={{ letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Event feed
          </Text>
          <button className="lc-chip lc-chip-muted" onClick={onClose}>
            Close
          </button>
        </Group>
        <div style={{ overflowY: "auto", padding: "6px 12px 14px" }}>
          {sorted.length === 0 && (
            <Text c="dimmed" fz={14} ta="center" py="md">
              No goals yet.
            </Text>
          )}
          {sorted.map((e) => {
            const team = e.teamId === homeTeam.id ? homeTeam : awayTeam;
            const scorer = e.scorerId ? (playersById.get(e.scorerId)?.name ?? "?") : "Own goal";
            const assist = e.assistId ? playersById.get(e.assistId)?.name : null;
            const minute = formatMinute(e.matchSec);
            return (
              <Group
                key={e.id}
                justify="space-between"
                wrap="nowrap"
                style={{ padding: "9px 4px", borderBottom: "1px solid var(--hairline)" }}
              >
                <Text fz={14} style={{ minWidth: 0 }}>
                  <Text span className="tabular-nums" c="dimmed" fw={700}>
                    {e.seq}
                  </Text>{" "}
                  {minute && (
                    <Text span className="tabular-nums" c="dimmed" fw={700}>
                      {minute}
                    </Text>
                  )}{" "}
                  <Text span fw={800} style={{ color: team.color }}>
                    {team.name}
                  </Text>{" "}
                  · {scorer} ⚽{assist ? ` (${assist} A)` : ""}
                </Text>
                {e.id > 0 && (
                  <button
                    className="lc-chip lc-chip-danger"
                    onClick={() => onDelete(e.id)}
                    style={{ flexShrink: 0 }}
                  >
                    Delete
                  </button>
                )}
              </Group>
            );
          })}
        </div>
      </div>
    </div>
  );
}
