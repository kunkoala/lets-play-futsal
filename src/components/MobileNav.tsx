"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Burger, Drawer, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { NavLink } from "@/components/NavLink";

export type MobileNavItem = { href: string; label: string; accent?: boolean };

/**
 * Phone nav for the public site. The four links used to sit in a `nowrap` row
 * next to the wordmark, which on a 360px screen pushed "Admin login" off the
 * edge and squeezed the wordmark. Below `sm` they move in here instead.
 *
 * Kept as its own client component because the Navbar is an async Server
 * Component and can't hold the open/closed state itself.
 */
export function MobileNav({ items }: { items: MobileNavItem[] }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();

  // Next keeps this mounted across a client-side navigation, so without this
  // the drawer stays open on top of the page you just asked for.
  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <>
      <Burger
        opened={opened}
        onClick={toggle}
        size="sm"
        color="var(--text)"
        aria-label="Toggle navigation"
        hiddenFrom="sm"
      />
      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="min(78vw, 300px)"
        title="Menu"
        hiddenFrom="sm"
        zIndex={300}
        overlayProps={{ backgroundOpacity: 0.6, blur: 3 }}
        styles={{ content: { background: "var(--deep-panel)" }, header: { background: "var(--deep-panel)" } }}
      >
        <Stack gap={4}>
          {items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              underline="never"
              fw={700}
              fz={16}
              px={12}
              py={12}
              c={item.accent ? "var(--volt)" : "var(--text)"}
              style={{ borderRadius: 12, borderBottom: "1px solid var(--hairline)" }}
            >
              {item.label}
            </NavLink>
          ))}
        </Stack>
      </Drawer>
    </>
  );
}
