import { Box, Container, Group, Stack, Text } from "@mantine/core";
import { CHANGELOG, type ChangeKind, type ChangelogEntry } from "@/lib/changelog";

const KIND_STYLE: Record<ChangeKind, { label: string; color: string; bg: string }> = {
  added: { label: "New", color: "var(--volt)", bg: "rgba(200,255,47,.12)" },
  changed: { label: "Changed", color: "var(--team-blue)", bg: "rgba(77,139,255,.14)" },
  fixed: { label: "Fixed", color: "var(--team-green)", bg: "rgba(47,208,106,.14)" },
};

function KindPill({ kind }: { kind: ChangeKind }) {
  const style = KIND_STYLE[kind];
  return (
    <Box
      component="span"
      style={{
        flexShrink: 0,
        // Fixed width so the text of every item starts on the same line,
        // rather than stepping in and out with the label length.
        width: 62,
        textAlign: "center",
        padding: "3px 0",
        borderRadius: 20,
        fontWeight: 800,
        fontSize: 10,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: style.color,
        background: style.bg,
      }}
    >
      {style.label}
    </Box>
  );
}

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

function Entry({ entry }: { entry: ChangelogEntry }) {
  return (
    <Box
      component="article"
      style={{
        border: "1px solid var(--hairline)",
        borderRadius: 18,
        background: "var(--panel)",
        padding: "20px 22px",
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
        fz={{ base: 20, sm: 24 }}
        mt={6}
        style={{ letterSpacing: "-0.01em", lineHeight: 1.15 }}
      >
        {entry.title}
      </Text>
      {entry.summary && (
        <Text c="dimmed" fz={14} mt={8} style={{ lineHeight: 1.55 }}>
          {entry.summary}
        </Text>
      )}

      <Stack gap={10} mt={16}>
        {entry.items.map((item, i) => (
          <Group key={i} gap={10} wrap="nowrap" align="flex-start">
            <Box mt={2}>
              <KindPill kind={item.kind} />
            </Box>
            <Text fz={14} style={{ lineHeight: 1.55 }}>
              {item.text}
            </Text>
          </Group>
        ))}
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
            Changes to the app, newest first. Anything that moves the numbers you already know
            gets explained here rather than left to be noticed.
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
