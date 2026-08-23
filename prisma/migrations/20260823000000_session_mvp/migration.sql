-- Man of the match becomes player of the day: one MVP per session instead of
-- one per match, and no longer an input to the rating (see src/lib/rating.ts).
--
-- The match-level column is dropped, so this migration backfills first: for
-- every session that had any match MVPs, the player who won the most of them
-- that day is promoted to session MVP. Ties break on goal contributions that
-- session, then on the lowest player id — deterministic, so re-running against
-- a restored dump lands on the same answer.

-- AlterTable
ALTER TABLE "session" ADD COLUMN "mvp_player_id" INTEGER;

-- Backfill
WITH match_mvp_counts AS (
    SELECT m."session_id", m."mvp_player_id" AS player_id, COUNT(*) AS mvps
    FROM "match" m
    WHERE m."mvp_player_id" IS NOT NULL
    GROUP BY m."session_id", m."mvp_player_id"
),
contributions AS (
    SELECT m."session_id", x.player_id, COUNT(*) AS ga
    FROM "match" m
    JOIN "goal_event" ge ON ge."match_id" = m."id"
    CROSS JOIN LATERAL (VALUES (ge."scorer_id"), (ge."assist_id")) AS x(player_id)
    WHERE x.player_id IS NOT NULL
    GROUP BY m."session_id", x.player_id
),
ranked AS (
    SELECT
        c."session_id",
        c.player_id,
        ROW_NUMBER() OVER (
            PARTITION BY c."session_id"
            ORDER BY c.mvps DESC, COALESCE(g.ga, 0) DESC, c.player_id ASC
        ) AS rn
    FROM match_mvp_counts c
    LEFT JOIN contributions g
        ON g."session_id" = c."session_id" AND g.player_id = c.player_id
)
UPDATE "session" s
SET "mvp_player_id" = r.player_id
FROM ranked r
WHERE r."session_id" = s."id" AND r.rn = 1;

-- CreateIndex
CREATE INDEX "session_mvp_player_id_idx" ON "session"("mvp_player_id");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_mvp_player_id_fkey" FOREIGN KEY ("mvp_player_id") REFERENCES "player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "match" DROP CONSTRAINT "match_mvp_player_id_fkey";

-- DropIndex
DROP INDEX "match_mvp_player_id_idx";

-- AlterTable
ALTER TABLE "match" DROP COLUMN "mvp_player_id";
