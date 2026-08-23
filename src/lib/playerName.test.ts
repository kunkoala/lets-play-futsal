import { describe, expect, it } from "vitest";
import { findNameCollision, playerNameKey } from "./playerName";

describe("playerNameKey", () => {
  it("folds the near-misses that actually produced duplicate players", () => {
    expect(playerNameKey("Azhar R.")).toBe(playerNameKey("azhar r"));
    expect(playerNameKey("Azhar  R")).toBe(playerNameKey("Azhar R"));
    expect(playerNameKey("  Azhar R  ")).toBe(playerNameKey("Azhar R"));
  });

  it("folds accents so José and Jose are one person", () => {
    expect(playerNameKey("José")).toBe(playerNameKey("Jose"));
  });

  it("keeps genuinely different names apart", () => {
    expect(playerNameKey("Azhar R")).not.toBe(playerNameKey("Azhar S"));
    // Punctuation separates rather than vanishing, so a run-together name is
    // still its own person.
    expect(playerNameKey("Azhar R.")).not.toBe(playerNameKey("AzharR"));
    expect(playerNameKey("Rizky")).not.toBe(playerNameKey("Rizki"));
  });

  it("reduces a name with nothing but punctuation to an empty key", () => {
    expect(playerNameKey("...")).toBe("");
    expect(playerNameKey("   ")).toBe("");
  });
});

describe("findNameCollision", () => {
  const players = [
    { id: 1, name: "Azhar R.", isActive: true },
    { id: 2, name: "Rizky Maulana", isActive: false },
  ];

  it("finds a match regardless of case, spacing or punctuation", () => {
    expect(findNameCollision("azhar r", players)?.id).toBe(1);
    expect(findNameCollision("AZHAR   R", players)?.id).toBe(1);
  });

  it("finds deactivated players too — they're the ones admins can't see", () => {
    expect(findNameCollision("rizky maulana", players)?.id).toBe(2);
  });

  it("returns null for a genuinely new name", () => {
    expect(findNameCollision("Bagus Saputra", players)).toBeNull();
  });

  it("returns null for an empty key rather than matching everything", () => {
    expect(findNameCollision("", players)).toBeNull();
    expect(findNameCollision("  ", players)).toBeNull();
  });
});
