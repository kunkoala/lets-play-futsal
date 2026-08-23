-- Per-match lineups, so a substitution stops rewriting history.
--
-- Until now every stat was derived from `team_player`, read at query time.
-- That roster is session-scoped, so moving a player between teams (or off one)
-- mid-session retroactively changed the results, clean sheets and +/- of every
-- match that team had already played. `match_player` snapshots who was
-- actually on the pitch for one match.
--
-- The backfill copies each finished/in-progress match's two current team
-- rosters verbatim, so every existing figure is reproduced exactly and this
-- migration changes no numbers.

-- CreateTable
CREATE TABLE "match_player" (
    "match_id" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "is_keeper" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "match_player_pkey" PRIMARY KEY ("match_id","player_id")
);

-- CreateIndex
CREATE INDEX "match_player_match_id_idx" ON "match_player"("match_id");

-- CreateIndex
CREATE INDEX "match_player_team_id_idx" ON "match_player"("team_id");

-- CreateIndex
CREATE INDEX "match_player_player_id_idx" ON "match_player"("player_id");

-- AddForeignKey
ALTER TABLE "match_player" ADD CONSTRAINT "match_player_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_player" ADD CONSTRAINT "match_player_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_player" ADD CONSTRAINT "match_player_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: every existing match's lineup is whatever its two teams currently
-- hold. A player who somehow sits on both teams of one match would violate the
-- (match_id, player_id) primary key, so the DISTINCT ON keeps the home side's
-- row rather than aborting the migration.
INSERT INTO "match_player" ("match_id", "player_id", "team_id", "is_keeper")
SELECT DISTINCT ON (sides."match_id", tp."player_id")
    sides."match_id",
    tp."player_id",
    tp."team_id",
    tp."is_keeper"
FROM (
    SELECT m."id" AS match_id, m."home_team_id" AS team_id, 0 AS side FROM "match" m
    UNION ALL
    SELECT m."id" AS match_id, m."away_team_id" AS team_id, 1 AS side FROM "match" m
) AS sides
JOIN "team_player" tp ON tp."team_id" = sides."team_id"
ORDER BY sides."match_id", tp."player_id", sides.side;
