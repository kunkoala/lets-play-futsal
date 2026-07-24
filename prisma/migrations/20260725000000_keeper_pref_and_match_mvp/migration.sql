-- CreateEnum
CREATE TYPE "keeper_pref" AS ENUM ('outfield', 'flexible', 'goalkeeper');

-- AlterTable
ALTER TABLE "player" ADD COLUMN "keeper_pref" "keeper_pref" NOT NULL DEFAULT 'outfield';

-- AlterTable
ALTER TABLE "team_player" ADD COLUMN "is_keeper" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "match" ADD COLUMN "mvp_player_id" INTEGER;

-- CreateIndex
CREATE INDEX "match_mvp_player_id_idx" ON "match"("mvp_player_id");

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_mvp_player_id_fkey" FOREIGN KEY ("mvp_player_id") REFERENCES "player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
