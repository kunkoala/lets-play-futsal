"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findNameCollision } from "@/lib/playerName";
import { Prisma } from "@/generated/prisma/client";

export type PlayerFormState =
  | {
      error: string;
      /**
       * The existing player the submitted name collides with, when that's why
       * it failed — lets the form offer "you mean this one?" (and a reactivate
       * button for a deactivated player) instead of a dead end.
       */
      conflict?: { id: number; name: string; isActive: boolean };
    }
  | undefined;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name is too long.");

/** Mirrors the `KeeperPref` enum in prisma/schema.prisma. */
const keeperPrefSchema = z.enum(["outfield", "flexible", "goalkeeper"]);

/** Missing/blank falls back to `outfield` so an older form post still works. */
function parseKeeperPref(value: FormDataEntryValue | null) {
  return keeperPrefSchema.catch("outfield").parse(value);
}

function isUniqueNameViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

export async function addPlayer(
  _prevState: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // The form warns about this before you can submit, but the check has to
  // exist here too: two admins adding at the same time never see each other's
  // typing, and `@unique` only catches character-for-character repeats.
  const existing = await prisma.player.findMany({ select: { id: true, name: true, isActive: true } });
  const collision = findNameCollision(parsed.data, existing);
  if (collision) {
    return {
      error: collision.isActive
        ? `${collision.name} is already on the list.`
        : `${collision.name} already exists but is deactivated.`,
      conflict: collision,
    };
  }

  try {
    await prisma.player.create({
      data: { name: parsed.data, keeperPref: parseKeeperPref(formData.get("keeperPref")) },
    });
  } catch (err) {
    if (isUniqueNameViolation(err)) {
      return { error: "A player with that name already exists." };
    }
    throw err;
  }

  revalidatePath("/admin/players");
}

/**
 * Brings a deactivated player back, from the add-player form's "that name
 * already exists" warning — the path that stops an admin working around a
 * hidden player by creating a duplicate.
 */
export async function reactivatePlayer(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await prisma.player.update({ where: { id }, data: { isActive: true } });
  revalidatePath("/admin/players");
}

/** Saves a player's name and goalkeeper preference together, from one row form. */
export async function updatePlayer(
  _prevState: PlayerFormState,
  formData: FormData,
): Promise<PlayerFormState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    return { error: "Invalid player." };
  }

  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Same near-duplicate guard as addPlayer, minus this player themselves —
  // renaming "azhar" to "Azhar" has to stay allowed.
  const others = await prisma.player.findMany({
    where: { id: { not: id } },
    select: { id: true, name: true, isActive: true },
  });
  const collision = findNameCollision(parsed.data, others);
  if (collision) {
    return { error: `That name clashes with ${collision.name}.`, conflict: collision };
  }

  try {
    await prisma.player.update({
      where: { id },
      data: { name: parsed.data, keeperPref: parseKeeperPref(formData.get("keeperPref")) },
    });
  } catch (err) {
    if (isUniqueNameViolation(err)) {
      return { error: "A player with that name already exists." };
    }
    throw err;
  }

  revalidatePath("/admin/players");
}

export async function togglePlayerActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) return;

  await prisma.player.update({
    where: { id },
    data: { isActive: !player.isActive },
  });

  revalidatePath("/admin/players");
}
