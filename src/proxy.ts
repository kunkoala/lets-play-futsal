import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same behavior, see
// node_modules/next/dist/docs/.../file-conventions/proxy.md). This file
// must live next to `app/` — i.e. at `src/proxy.ts` since the app dir is
// `src/app`.
//
// This is an OPTIMISTIC, cookie-only check (no DB round-trip) per PLAN.md
// §4: it blocks direct navigation to any /admin/* page when the session
// cookie is missing/invalid, redirecting to /login. It intentionally does
// NOT guard /login itself (that would be a redirect loop) or any public
// route. This is not sufficient protection for mutations on its own — see
// the `requireAdmin()` doc comment in src/lib/auth.ts for why every admin
// Server Action independently re-verifies the session too.
export async function proxy(request: NextRequest) {
  const valid = await verifySession();
  if (!valid) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
