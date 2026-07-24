"use server";

import { redirect } from "next/navigation";
import { constantTimeEqual, createSession } from "@/lib/auth";

export type LoginState = { error: string } | undefined;

/**
 * Login is the one action that intentionally does NOT start with
 * `requireAdmin()` — it's the action that *creates* the session in the
 * first place. Every other admin Server Action added from Phase 3 onward
 * must call `requireAdmin()` as its first line (see the doc comment on
 * `requireAdmin` in `src/lib/auth.ts`).
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Password is required." };
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Misconfigured deployment — fail closed, don't leak why.
    return { error: "Login is not available right now." };
  }

  // There's no username, just the one admin password — don't phrase the
  // error in a way that implies any other credential is being checked.
  if (!constantTimeEqual(password, adminPassword)) {
    return { error: "Incorrect password." };
  }

  await createSession();
  redirect("/admin");
}
