"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SeasonFormState = { error: string } | undefined;

const seasonSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name is required.")
      .max(100, "Name is too long."),
    startsOn: z.string().min(1, "Start date is required."),
    endsOn: z.string().min(1, "End date is required."),
  })
  .refine((data) => new Date(data.startsOn) < new Date(data.endsOn), {
    message: "Start date must be before end date.",
    path: ["endsOn"],
  });

function parseSeasonForm(formData: FormData) {
  return seasonSchema.safeParse({
    name: formData.get("name"),
    startsOn: formData.get("startsOn"),
    endsOn: formData.get("endsOn"),
  });
}

export async function createSeason(
  _prevState: SeasonFormState,
  formData: FormData,
): Promise<SeasonFormState> {
  await requireAdmin(); // convention: see src/lib/auth.ts's requireAdmin() doc comment

  const parsed = parseSeasonForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const makeActive = formData.get("makeActive") === "on";

  // Exactly one active season at a time (PLAN.md §3/§9 Phase 3): deactivating
  // the rest and activating this one happen in a single transaction.
  await prisma.$transaction(async (tx) => {
    if (makeActive) {
      await tx.season.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }
    await tx.season.create({
      data: {
        name: parsed.data.name,
        startsOn: new Date(parsed.data.startsOn),
        endsOn: new Date(parsed.data.endsOn),
        isActive: makeActive,
      },
    });
  });

  revalidatePath("/admin/seasons");
}

export async function updateSeason(
  _prevState: SeasonFormState,
  formData: FormData,
): Promise<SeasonFormState> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    return { error: "Invalid season." };
  }

  const parsed = parseSeasonForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.season.update({
    where: { id },
    data: {
      name: parsed.data.name,
      startsOn: new Date(parsed.data.startsOn),
      endsOn: new Date(parsed.data.endsOn),
    },
  });

  revalidatePath("/admin/seasons");
}

export async function setActiveSeason(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;

  await prisma.$transaction([
    prisma.season.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    }),
    prisma.season.update({ where: { id }, data: { isActive: true } }),
  ]);

  revalidatePath("/admin/seasons");
}

export async function setMvp(
  _prevState: SeasonFormState,
  formData: FormData,
): Promise<SeasonFormState> {
  await requireAdmin();

  const seasonId = Number(formData.get("seasonId"));
  const playerId = Number(formData.get("playerId"));
  if (!Number.isInteger(seasonId) || !Number.isInteger(playerId)) {
    return { error: "Pick a player first." };
  }

  await prisma.award.upsert({
    where: { seasonId_type: { seasonId, type: "mvp" } },
    create: { seasonId, type: "mvp", playerId },
    update: { playerId },
  });

  revalidatePath("/admin/seasons");
  revalidatePath("/awards");
}
