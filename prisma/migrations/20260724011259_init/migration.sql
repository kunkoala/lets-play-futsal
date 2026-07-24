-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "session_status" AS ENUM ('draft', 'teams_set', 'completed');

-- CreateEnum
CREATE TYPE "match_status" AS ENUM ('in_progress', 'finished');

-- CreateEnum
CREATE TYPE "award_type" AS ENUM ('mvp');

-- CreateTable
CREATE TABLE "season" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" SERIAL NOT NULL,
    "season_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "status" "session_status" NOT NULL DEFAULT 'draft',

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "session_id" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("session_id","player_id")
);

-- CreateTable
CREATE TABLE "team" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,

    CONSTRAINT "team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_player" (
    "team_id" INTEGER NOT NULL,
    "player_id" INTEGER NOT NULL,

    CONSTRAINT "team_player_pkey" PRIMARY KEY ("team_id","player_id")
);

-- CreateTable
CREATE TABLE "match" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "home_team_id" INTEGER NOT NULL,
    "away_team_id" INTEGER NOT NULL,
    "status" "match_status" NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,

    CONSTRAINT "match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_event" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL,
    "team_id" INTEGER NOT NULL,
    "scorer_id" INTEGER,
    "assist_id" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "award" (
    "id" SERIAL NOT NULL,
    "season_id" INTEGER NOT NULL,
    "type" "award_type" NOT NULL,
    "player_id" INTEGER NOT NULL,

    CONSTRAINT "award_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_name_key" ON "player"("name");

-- CreateIndex
CREATE INDEX "session_season_id_idx" ON "session"("season_id");

-- CreateIndex
CREATE INDEX "team_session_id_idx" ON "team"("session_id");

-- CreateIndex
CREATE INDEX "match_session_id_idx" ON "match"("session_id");

-- CreateIndex
CREATE INDEX "match_home_team_id_idx" ON "match"("home_team_id");

-- CreateIndex
CREATE INDEX "match_away_team_id_idx" ON "match"("away_team_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_session_id_seq_key" ON "match"("session_id", "seq");

-- CreateIndex
CREATE INDEX "goal_event_match_id_idx" ON "goal_event"("match_id");

-- CreateIndex
CREATE INDEX "goal_event_team_id_idx" ON "goal_event"("team_id");

-- CreateIndex
CREATE INDEX "goal_event_scorer_id_idx" ON "goal_event"("scorer_id");

-- CreateIndex
CREATE INDEX "goal_event_assist_id_idx" ON "goal_event"("assist_id");

-- CreateIndex
CREATE UNIQUE INDEX "goal_event_match_id_seq_key" ON "goal_event"("match_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "award_season_id_type_key" ON "award"("season_id", "type");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team" ADD CONSTRAINT "team_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_player" ADD CONSTRAINT "team_player_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_player" ADD CONSTRAINT "team_player_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match" ADD CONSTRAINT "match_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_event" ADD CONSTRAINT "goal_event_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_event" ADD CONSTRAINT "goal_event_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_event" ADD CONSTRAINT "goal_event_scorer_id_fkey" FOREIGN KEY ("scorer_id") REFERENCES "player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_event" ADD CONSTRAINT "goal_event_assist_id_fkey" FOREIGN KEY ("assist_id") REFERENCES "player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award" ADD CONSTRAINT "award_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "award" ADD CONSTRAINT "award_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
