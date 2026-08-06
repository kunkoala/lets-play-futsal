import { beforeEach, describe, expect, it } from "vitest";
import {
  normalizeRoute,
  rateLimit,
  referrerHost,
  resetRateLimit,
  sanitizeName,
  sanitizePath,
} from "./analyticsCollect";

describe("normalizeRoute", () => {
  it("collapses numeric ids so every profile counts as one route", () => {
    expect(normalizeRoute("/players/12")).toBe("/players/[id]");
    expect(normalizeRoute("/demo/sessions/7")).toBe("/demo/sessions/[id]");
  });

  it("leaves static routes alone", () => {
    expect(normalizeRoute("/sessions")).toBe("/sessions");
    expect(normalizeRoute("/")).toBe("/");
  });

  it("drops the query string and trailing slash", () => {
    expect(normalizeRoute("/?season=2&sort=goals")).toBe("/");
    expect(normalizeRoute("/sessions/")).toBe("/sessions");
  });
});

describe("sanitizePath", () => {
  it("rejects anything that isn't a site path", () => {
    expect(sanitizePath("https://evil.test/x")).toBe("/");
    expect(sanitizePath("javascript:alert(1)")).toBe("/");
  });

  it("keeps the query so a route can still be drilled into", () => {
    expect(sanitizePath("/?sort=goals")).toBe("/?sort=goals");
  });
});

describe("referrerHost", () => {
  it("keeps only the host, never the path someone came from", () => {
    expect(referrerHost("https://news.test/private/thread", "ligaminggu.test")).toBe("news.test");
  });

  it("strips www so one source isn't split in two", () => {
    expect(referrerHost("https://www.google.com/search?q=futsal", "ligaminggu.test")).toBe(
      "google.com",
    );
  });

  it("ignores self-referrals and junk", () => {
    expect(referrerHost("https://ligaminggu.test/sessions", "ligaminggu.test")).toBeNull();
    expect(referrerHost("not a url", "ligaminggu.test")).toBeNull();
    expect(referrerHost(undefined, "ligaminggu.test")).toBeNull();
  });
});

describe("sanitizeName", () => {
  it("trims, caps length, and treats blank as absent", () => {
    expect(sanitizeName("  player_row  ")).toBe("player_row");
    expect(sanitizeName("   ")).toBeNull();
    expect(sanitizeName(undefined)).toBeNull();
    expect(sanitizeName("x".repeat(200))).toHaveLength(60);
  });
});

describe("rateLimit", () => {
  beforeEach(resetRateLimit);

  it("allows a normal browsing burst", () => {
    expect(rateLimit("visitor", 10)).toBe(true);
    expect(rateLimit("visitor", 10)).toBe(true);
  });

  it("cuts off a visitor spamming the endpoint", () => {
    expect(rateLimit("visitor", 120)).toBe(true);
    expect(rateLimit("visitor", 1)).toBe(false);
  });

  it("counts each visitor separately", () => {
    rateLimit("noisy", 200);
    expect(rateLimit("quiet", 1)).toBe(true);
  });

  it("forgives once the window has passed", () => {
    const start = 1_000_000;
    expect(rateLimit("visitor", 200, start)).toBe(false);
    expect(rateLimit("visitor", 1, start + 61_000)).toBe(true);
  });
});
