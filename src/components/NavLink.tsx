"use client";

import Link from "next/link";
import { Anchor, Button, type AnchorProps, type ButtonProps } from "@mantine/core";
import type { ComponentPropsWithoutRef } from "react";

/**
 * `<Anchor component={Link} href="...">` breaks when written directly in a
 * Server Component: Next can't serialize passing the `Link` function itself
 * as a prop across the server/client boundary ("Functions cannot be passed
 * directly to Client Components..."). Wrapping the composition in its own
 * "use client" component keeps that prop-passing entirely on the client, so
 * Server Components can render this like a plain link with no crash.
 */
type NavLinkProps = AnchorProps & ComponentPropsWithoutRef<typeof Link>;

export function NavLink(props: NavLinkProps) {
  return <Anchor component={Link} {...props} />;
}

/** Same fix as NavLink, for a Button that navigates instead of an Anchor. */
type NavButtonProps = ButtonProps & ComponentPropsWithoutRef<typeof Link>;

export function NavButton(props: NavButtonProps) {
  return <Button component={Link} {...props} />;
}
