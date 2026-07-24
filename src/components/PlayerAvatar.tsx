function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/**
 * Mono initials avatar (design handoff §Assets: no photos in v1). Optional
 * `ringColor` draws a 2px team-colored ring — used on the player profile hero
 * ("Usually Red") and anywhere a player's team identity is known.
 */
export function PlayerAvatar({
  name,
  size = 40,
  ringColor,
}: {
  name: string;
  size?: number;
  ringColor?: string;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "var(--panel-raised)",
        color: "var(--text)",
        border: ringColor ? `2px solid ${ringColor}` : "1px solid var(--hairline)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.38,
        letterSpacing: "0.01em",
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}
