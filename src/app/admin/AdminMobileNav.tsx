"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Burger, Button, Divider, Drawer, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { NavLink } from "@/components/NavLink";
import { logout } from "./actions";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/seasons", label: "Seasons" },
  { href: "/admin/analytics", label: "Analytics" },
];

/**
 * Phone nav for the admin chrome. The section links were `visibleFrom="xs"`,
 * so on a phone the bar offered nothing but "View site" and "Log out" — you
 * could not reach Players or Seasons at all without going through the
 * dashboard. Everything now lives in here below `sm`.
 */
export function AdminMobileNav({ seasonName }: { seasonName: string | null }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const pathname = usePathname();

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
        aria-label="Toggle admin navigation"
        hiddenFrom="sm"
      />
      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="min(78vw, 300px)"
        title="Matchday HQ"
        hiddenFrom="sm"
        zIndex={300}
        overlayProps={{ backgroundOpacity: 0.6, blur: 3 }}
        // Same Dynamic Island fix as the public MobileNav's drawer.
        styles={{
          content: { background: "var(--deep-panel)" },
          header: { background: "var(--deep-panel)", paddingTop: "env(safe-area-inset-top)" },
        }}
      >
        <Stack gap={4}>
          {seasonName && (
            <Text fz={11} fw={700} c="var(--volt)" mb={4} style={{ letterSpacing: "0.08em" }}>
              {seasonName.toUpperCase()}
            </Text>
          )}
          {LINKS.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              underline="never"
              fw={700}
              fz={16}
              px={12}
              py={12}
              c="var(--text)"
              style={{ borderRadius: 12, borderBottom: "1px solid var(--hairline)" }}
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink
            href="/"
            underline="never"
            fw={700}
            fz={16}
            px={12}
            py={12}
            c="var(--volt)"
            style={{ borderRadius: 12, borderBottom: "1px solid var(--hairline)" }}
          >
            View site ↗
          </NavLink>
          <Divider my={8} color="transparent" />
          <form action={logout}>
            <Button type="submit" variant="light" color="gray" fullWidth size="md">
              Log out
            </Button>
          </form>
        </Stack>
      </Drawer>
    </>
  );
}
