import { describe, expect, it } from "vitest";
import {
  breakAtSec,
  displaySec,
  elapsedSec,
  formatClock,
  isBreakDue,
  isFullTime,
  remainingSec,
  type MatchClock,
} from "./matchClock";

const T0 = Date.UTC(2026, 6, 25, 10, 0, 0);

function clock(overrides: Partial<MatchClock> = {}): MatchClock {
  return {
    startedAt: T0,
    durationSec: 12 * 60,
    pausedAt: null,
    pausedTotalSec: 0,
    breakTakenAt: null,
    ...overrides,
  };
}

/** `n` seconds after kick-off. */
function at(sec: number): number {
  return T0 + sec * 1000;
}

describe("elapsedSec", () => {
  it("counts wall-clock seconds since kick-off", () => {
    expect(elapsedSec(clock(), at(90))).toBe(90);
  });

  it("never goes negative if the client clock is behind the server's", () => {
    expect(elapsedSec(clock(), at(-30))).toBe(0);
  });

  it("subtracts time already spent paused", () => {
    expect(elapsedSec(clock({ pausedTotalSec: 45 }), at(120))).toBe(75);
  });

  it("freezes while paused, no matter how much later `now` is", () => {
    const paused = clock({ pausedAt: at(360) });
    expect(elapsedSec(paused, at(400))).toBe(360);
    expect(elapsedSec(paused, at(4000))).toBe(360);
  });
});

describe("remainingSec", () => {
  it("counts down from the planned duration", () => {
    expect(remainingSec(clock(), at(120))).toBe(12 * 60 - 120);
  });

  it("floors at zero rather than going negative", () => {
    expect(remainingSec(clock(), at(20 * 60))).toBe(0);
  });

  it("is null for a match with no planned length", () => {
    expect(remainingSec(clock({ durationSec: null }), at(120))).toBeNull();
  });
});

describe("breakAtSec", () => {
  it("is null at exactly 10 minutes — that plays straight through", () => {
    expect(breakAtSec(10 * 60)).toBeNull();
  });

  it("is null below 10 minutes", () => {
    expect(breakAtSec(8 * 60)).toBeNull();
  });

  it("sits at the midpoint above 10 minutes, not at a fixed 10:00", () => {
    expect(breakAtSec(16 * 60)).toBe(8 * 60);
    expect(breakAtSec(15 * 60)).toBe(7 * 60 + 30);
    expect(breakAtSec(20 * 60)).toBe(10 * 60);
  });

  it("is null when no duration was set", () => {
    expect(breakAtSec(null)).toBeNull();
  });
});

describe("isBreakDue", () => {
  const long = clock({ durationSec: 16 * 60 });

  it("is false before the midpoint", () => {
    expect(isBreakDue(long, at(8 * 60 - 1))).toBe(false);
  });

  it("fires at the midpoint", () => {
    expect(isBreakDue(long, at(8 * 60))).toBe(true);
  });

  it("never fires for a match short enough to play through", () => {
    expect(isBreakDue(clock({ durationSec: 10 * 60 }), at(9 * 60))).toBe(false);
  });

  it("does not re-fire after the break has been taken", () => {
    const resumed = clock({
      durationSec: 16 * 60,
      breakTakenAt: at(8 * 60),
      pausedTotalSec: 120,
    });
    expect(isBreakDue(resumed, at(12 * 60))).toBe(false);
  });
});

describe("isFullTime", () => {
  it("is false while time remains", () => {
    expect(isFullTime(clock(), at(11 * 60))).toBe(false);
  });

  it("is true once the duration is used up", () => {
    expect(isFullTime(clock(), at(12 * 60))).toBe(true);
  });

  it("is never true without a planned duration", () => {
    expect(isFullTime(clock({ durationSec: null }), at(99 * 60))).toBe(false);
  });

  it("accounts for the break, so a paused match reaches full time later", () => {
    const withBreak = clock({ durationSec: 12 * 60, pausedTotalSec: 90 });
    expect(isFullTime(withBreak, at(12 * 60))).toBe(false);
    expect(isFullTime(withBreak, at(12 * 60 + 90))).toBe(true);
  });
});

describe("displaySec", () => {
  it("counts down when a duration was set", () => {
    expect(displaySec(clock(), at(60))).toBe(11 * 60);
  });

  it("counts up when it wasn't", () => {
    expect(displaySec(clock({ durationSec: null }), at(60))).toBe(60);
  });
});

describe("formatClock", () => {
  it("zero-pads both halves", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(9)).toBe("00:09");
    expect(formatClock(65)).toBe("01:05");
  });

  it("does not roll minutes over at 60", () => {
    expect(formatClock(90 * 60)).toBe("90:00");
  });

  it("clamps negatives", () => {
    expect(formatClock(-5)).toBe("00:00");
  });
});
