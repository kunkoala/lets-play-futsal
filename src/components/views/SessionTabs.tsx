"use client";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@mantine/core";

/**
 * Splits a matchday into "how everyone did" and "what actually happened".
 *
 * Both used to stack on one page, which on a phone meant scrolling past three
 * podiums and a full stats table before reaching the scores — the thing most
 * people open a session for. Tabs put them one tap apart in either direction.
 *
 * Panels are server-rendered and handed in as children: nothing here needs to
 * be a client component except the tab state itself, so the tables and podiums
 * stay out of the browser bundle.
 */
export function SessionTabs({
  stats,
  matches,
}: {
  stats: React.ReactNode;
  matches: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="matches" keepMounted={false}>
      {/* `grow` splits the width evenly, which is what makes this work on a
          phone — two full-width targets rather than two small left-aligned
          ones. */}
      <TabsList grow mb={18}>
        <TabsTab value="matches" fw={700} fz={13}>
          Matches
        </TabsTab>
        <TabsTab value="stats" fw={700} fz={13}>
          Statistics
        </TabsTab>
      </TabsList>

      <TabsPanel value="matches">{matches}</TabsPanel>
      <TabsPanel value="stats">{stats}</TabsPanel>
    </Tabs>
  );
}
