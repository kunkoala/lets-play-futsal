"use server";

import { redirect } from "next/navigation";
import { clearSession } from "@/lib/auth";

// *** Convention for every admin Server Action added from Phase 3 onward ***
// Start with `await requireAdmin();` (from "@/lib/auth") before touching
// Prisma or any other side effect — see the doc comment on `requireAdmin`
// in src/lib/auth.ts for why `proxy.ts`'s /admin/* guard alone isn't enough.
//
// `logout` is the one exception: it must succeed even when the session
// cookie is missing, expired, or tampered with, so it always just clears
// whatever is there rather than gating on `requireAdmin()`.
export async function logout(): Promise<void> {
  await clearSession();
  redirect("/login");
}
