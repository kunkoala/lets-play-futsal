import { Box, Container, Group, Stack, Text } from "@mantine/core";
import { CHANGELOG, type ChangeKind, type ChangelogEntry } from "@/lib/changelog";

const KIND_ORDER: ChangeKind[] = ["added", "changed", "fixed"];

const KIND_LABEL: Record<ChangeKind, { heading: string; accent: string }> = {
  added: { heading: "New", accent: "var(--volt)" },
  changed: { heading: "Changed", accent: "var(--team-blue)" },
  fixed: { heading: "Fixed", accent: "var(--team-green)" },
};

/** Human date — "23 August 2026". The ISO string stays in the data. */
function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return `${day} ${months[month - 1]} ${year}`;
}

/**
 * A change that moves a figure someone already knew — a shifted rating, a stat
 * that now counts differently.
 *
 * Given its own block above the feature list because it is the only part of
 * this page a player actually needs to read, and burying it as one bullet
 * among a dozen is how it gets missed.
 */
function HeadsUp({ title, text }: { title: string; text: string }) {
  return (
    <Box
      style={{
        border: "1px solid var(--team-yellow)",
        borderRadius: 12,
        background: "rgba(255,209,71,.08)",
        padding: "12px 14px",
      }}
    >
      <Text fw={800} fz={13} style={{ color: "var(--team-yellow)" }}>
        {title}
      </Text>
      <Text fz={13} mt={4} style={{ lineHeight: 1.55 }}>
        {text}
      </Text>
    </Box>
  );
}

/**
 * One kind of change, as a headed list.
 *
 * Grouped rather than tagged per row: a pill beside every line made a ragged
 * left edge and repeated the same three words a dozen times, when the reader
 * only needs to know which group they are in.
 */
function KindSection({ kind, items }: { kind: ChangeKind; items: string[] }) {
  const { heading, accent } = KIND_LABEL[kind];

  return (
    <Box>
      <Group gap={8} align="center" mb={8}>
        {/* A bar, not a dot — the items below use dots, and the heading has to
            read as a heading rather than the first bullet. */}
        <Box
          aria-hidden
          style={{ width: 14, height: 3, borderRadius: 2, background: accent, flexShrink: 0 }}
        />
        <Text
          fw={800}
          fz={10}
          style={{ letterSpacing: "0.14em", textTransform: "uppercase", color: accent }}
        >
          {heading}
        </Text>
      </Group>

      {/* Markers are drawn rather than left to `list-style`: Tailwind's
          preflight strips it from every list, so a plain <li> renders bare.
          Drawing them also lets each bullet carry its section's accent, which
          ties a line back to its heading when the eye lands mid-list. */}
      <Stack gap={8} component="ul" style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {items.map((text, i) => (
          <Group key={i} component="li" gap={10} wrap="nowrap" align="flex-start">
            <Box
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: accent,
                flexShrink: 0,
                // Centres the dot on the first line of 14px/1.55 text.
                marginTop: 8,
              }}
            />
            <Text fz={14} style={{ lineHeight: 1.55 }}>
              {text}
            </Text>
          </Group>
        ))}
      </Stack>
    </Box>
  );
}

function Entry({ entry }: { entry: ChangelogEntry }) {
  return (
    <Box
      component="article"
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 18,
        background: "var(--panel)",
        padding: "22px 24px",
      }}
    >
      <Text
        fz={10}
        fw={800}
        c="var(--text-muted)"
        style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}
      >
        <time dateTime={entry.date}>{longDate(entry.date)}</time>
      </Text>
      <Text
        component="h2"
        className="display-face"
        fw={900}
        fz={{ base: 21, sm: 26 }}
        mt={6}
        style={{ letterSpacing: "-0.01em", lineHeight: 1.15 }}
      >
        {entry.title}
      </Text>
      {entry.summary && (
        <Text c="dimmed" fz={14} mt={6} style={{ lineHeight: 1.55 }}>
          {entry.summary}
        </Text>
      )}

      {entry.headsUp && entry.headsUp.length > 0 && (
        <Stack gap={10} mt={18}>
          {entry.headsUp.map((notice) => (
            <HeadsUp key={notice.title} {...notice} />
          ))}
        </Stack>
      )}

      <Stack gap={20} mt={22}>
        {KIND_ORDER.map((kind) => {
          const items = entry.items.filter((i) => i.kind === kind).map((i) => i.text);
          if (items.length === 0) return null;
          return <KindSection key={kind} kind={kind} items={items} />;
        })}
      </Stack>
    </Box>
  );
}

export function ChangelogView() {
  return (
    <Container size="sm" py={{ base: 20, sm: 32 }} pb={64}>
      <Stack gap="xl">
        <div className="fs-fade-up">
          <Text
            component="h1"
            className="display-face"
            fw={900}
            fz={{ base: 26, sm: 32 }}
            style={{ letterSpacing: "-0.02em", lineHeight: 1 }}
          >
            WHAT&apos;S NEW
          </Text>
          <Text c="dimmed" fz={13} mt={6} style={{ lineHeight: 1.55 }}>
            Changes to the app, newest first. Anything that moves a number you already know is
            called out at the top of its entry.
          </Text>
        </div>

        <Stack gap={16} className="fs-fade-up" style={{ animationDelay: "0.05s" }}>
          {CHANGELOG.map((entry) => (
            <Entry key={entry.date} entry={entry} />
          ))}
          {CHANGELOG.length === 0 && (
            <Text c="dimmed" fz={14}>
              Nothing logged yet.
            </Text>
          )}
        </Stack>
      </Stack>
    </Container>
  );
}
