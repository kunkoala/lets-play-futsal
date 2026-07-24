-- DropForeignKey
ALTER TABLE "goal_event" DROP CONSTRAINT "goal_event_team_id_fkey";

-- DropForeignKey
ALTER TABLE "match" DROP CONSTRAINT "match_away_team_id_fkey";

-- DropForeignKey
ALTER TABLE "match" DROP CONSTRAINT "match_home_team_id_fkey";

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_event" ADD CONSTRAINT "goal_event_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
