-- Which shuffle round a team belongs to within its session. Reshuffling
-- mid-session adds a new generation of teams rather than replacing the old
-- ones, which stay attached to whatever matches they already played.
ALTER TABLE "team" ADD COLUMN "generation" INTEGER NOT NULL DEFAULT 1;
