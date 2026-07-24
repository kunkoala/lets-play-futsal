"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type PlayerFormState = { error: string } | undefined;

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(100, "Name is too long.");

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

  try {
    await prisma.player.create({ data: { name: parsed.data } });
  } catch (err) {
    if (isUniqueNameViolation(err)) {
      return { error: "A player with that name already exists." };
    }
    throw err;
  }

  revalidatePath("/admin/players");
}

export async function renamePlayer(
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

  try {
    await prisma.player.update({
      where: { id },
      data: { name: parsed.data },
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
