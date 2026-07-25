-- Snapshot of the match clock's elapsed seconds at the moment each goal was
-- recorded. Nullable: existing goal_event rows predate the column and there
-- is no way to reconstruct their minute after the fact (see schema.prisma).
ALTER TABLE "goal_event" ADD COLUMN "match_sec" INTEGER;
