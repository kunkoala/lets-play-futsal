"use client";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@mantine/core";

export type PanelTab = {
  value: string;
  label: string;
  /** Server-rendered content. Passed as a prop, so it never enters the client bundle. */
  content: React.ReactNode;
};

/**
 * Splits a page into a few self-contained views.
 *
 * Used where a page had grown into a long vertical stack of unrelated panels —
 * a phone had to scroll past everything to reach the one thing it was opened
 * for. Tabs put each concern one tap away in either direction instead.
 *
 * The panels stay server components and arrive as props, so the only thing
 * this adds to the browser bundle is the tab state itself.
 */
export function PanelTabs({
  tabs,
  defaultValue,
}: {
  tabs: PanelTab[];
  /** Defaults to the first tab. */
  defaultValue?: string;
}) {
  return (
    <Tabs defaultValue={defaultValue ?? tabs[0]?.value} keepMounted={false}>
      {/* `grow` splits the width evenly, which is what makes this work on a
          phone — full-width targets rather than a few small left-aligned ones. */}
      <TabsList grow mb={18}>
        {tabs.map((tab) => (
          <TabsTab key={tab.value} value={tab.value} fw={700} fz={13}>
            {tab.label}
          </TabsTab>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsPanel key={tab.value} value={tab.value}>
          {tab.content}
        </TabsPanel>
      ))}
    </Tabs>
  );
}
