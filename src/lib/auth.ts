import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";

// Auth design per PLAN.md §4: a single hardcoded admin account (no user
// table). Password comes from `ADMIN_PASSWORD`; on success we set an
// HTTP-only, Secure, SameSite=Lax cookie holding a jose-signed JWT
// (`{ role: 'admin' }`, 30-day expiry) signed with `SESSION_SECRET`.

const COOKIE_NAME = "session";
const SESSION_DURATION = "30d";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type SessionPayload = { role: "admin" };

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET env var is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Constant-time string comparison for the admin password check. Never use
 * `===` on secrets — that lets an attacker recover the password one byte at
 * a time via response-time measurements. `timingSafeEqual` throws on a
 * buffer length mismatch, so both inputs are padded to the same length
 * before comparing.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  const length = Math.max(aBuf.length, bBuf.length, 1);
  const aPadded = Buffer.alloc(length);
  const bPadded = Buffer.alloc(length);
  aBuf.copy(aPadded);
  bBuf.copy(bPadded);

  // timingSafeEqual on the padded buffers first (constant-time regardless
  // of input length), then fold in the real length check — two buffers of
  // different lengths must never be considered equal even if their padded
  // forms match (e.g. "" vs "\0\0\0").
  const paddedMatch = timingSafeEqual(aPadded, bPadded);
  return paddedMatch && aBuf.length === bBuf.length;
}

/**
 * Sets the signed admin session cookie. Call after the password check
 * succeeds; the caller is responsible for redirecting afterward.
 */
export async function createSession(): Promise<void> {
  const payload: SessionPayload = { role: "admin" };
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
}

/** Clears the admin session cookie (logout). Safe to call unconditionally. */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Reads and verifies the session cookie. Returns `true` only if the cookie
 * is present, its JWT signature/expiry are valid, and the payload carries
 * `role: 'admin'`. Never throws — any verification failure just yields
 * `false`.
 */
export async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });
    return (payload as Partial<SessionPayload>).role === "admin";
  } catch {
    // Expired, malformed, or signed with a different secret — all invalid.
    return false;
  }
}

/**
 * The auth gate for admin Server Components/pages AND Server Actions.
 *
 * *** Convention for every later phase (PLAN.md §4/§9 Phase 2) ***
 * Every admin mutation — every Server Action under `/admin/*` added in
 * Phase 3 onward — MUST call `await requireAdmin();` as its first line,
 * before touching Prisma or any other side effect:
 *
 *   "use server";
 *   import { requireAdmin } from "@/lib/auth";
 *
 *   export async function someAdminAction(...) {
 *     await requireAdmin(); // <-- first line, every time
 *     // ...validate input, call prisma, revalidatePath...
 *   }
 *
 * Why this is required even though `proxy.ts` already blocks
 * unauthenticated navigation to `/admin/*` pages: Proxy is an optimistic,
 * route-level check on page requests. Server Actions are invoked as POST
 * requests to whatever route rendered them, and a future refactor, a
 * changed `matcher`, or an action reused from an unguarded route could
 * silently slip past Proxy. Middleware/Proxy alone is *not* sufficient
 * protection for mutations — each action independently re-verifies here.
 *
 * `redirect()` inside a Server Action is an officially supported Next.js
 * pattern (identical to using it in a Server Component) — it aborts the
 * action immediately (nothing after this call executes) and the client
 * navigates to `/login` once the action settles.
 */
export async function requireAdmin(): Promise<void> {
  const valid = await verifySession();
  if (!valid) {
    redirect("/login");
  }
}
