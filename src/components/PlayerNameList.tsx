import { Text } from "@mantine/core";
import { NavLink } from "@/components/NavLink";

/**
 * A comma-separated run of player names, each linking to that player's
 * profile.
 *
 * Every stat leader in the app is a *list* — ties are shared rather than
 * broken — so "the top scorer" is regularly three or ten names, and all of
 * them should be as clickable as a single one would be.
 *
 * Rendered as inline text rather than a flex row so it wraps like a sentence;
 * a `Group` would put each name on its own line inside a narrow card.
 */
export function PlayerNameList({
  players,
  basePath = "",
  fz = 13,
  fw = 600,
  c = "inherit",
}: {
  players: readonly { id: number; name: string }[];
  basePath?: string;
  fz?: number;
  fw?: number;
  c?: string;
}) {
  return (
    <Text component="span" fz={fz} fw={fw} style={{ lineHeight: 1.35 }}>
      {players.map((player, i) => (
        <span key={player.id}>
          {i > 0 && <Text span c="dimmed" fw={400}>{", "}</Text>}
          <NavLink
            href={`${basePath}/players/${player.id}`}
            fz={fz}
            fw={fw}
            c={c}
            underline="hover"
          >
            {player.name}
          </NavLink>
        </span>
      ))}
    </Text>
  );
}
