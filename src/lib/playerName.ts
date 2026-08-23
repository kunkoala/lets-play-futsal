/**
 * "Is this the same person?" for player names.
 *
 * `Player.name` is `@unique`, so exact duplicates were never possible — the
 * duplicates that actually happened on launch night were near-misses:
 * `Azhar R.` typed again as `azhar r`, or a player who'd been deactivated
 * (and so no longer appears in the shuffle pickers) being re-added from
 * scratch. This key is what the add-player form compares against.
 *
 * Deliberately exact-after-normalisation rather than fuzzy/edit-distance:
 * the result blocks a save, so it has to be something a human can predict.
 * Anything that survives normalisation is left to the suggestion list to
 * catch by eye.
 */
export function playerNameKey(name: string): string {
  return (
    name
      .normalize("NFKD")
      // Combining marks left behind by NFKD — folds "José" onto "Jose".
      .replace(/\p{Mark}/gu, "")
      .toLowerCase()
      // Punctuation becomes a separator rather than vanishing, so "Azhar R."
      // and "Azhar R" agree while "AzharR" stays a different name.
      .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
      .trim()
  );
}

/** Finds the player an about-to-be-typed name would collide with, if any. */
export function findNameCollision<T extends { name: string }>(
  name: string,
  players: readonly T[],
): T | null {
  const key = playerNameKey(name);
  if (key === "") return null;
  return players.find((p) => playerNameKey(p.name) === key) ?? null;
}
