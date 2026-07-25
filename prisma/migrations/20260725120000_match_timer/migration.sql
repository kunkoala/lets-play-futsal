-- Match clock. Every column is nullable or defaulted, so existing rows keep
-- working: a match with duration_sec NULL simply counts up and never reaches
-- "full time", which is the honest reading for matches played before there
-- was an agreed length.
ALTER TABLE "match" ADD COLUMN "duration_sec" INTEGER;
ALTER TABLE "match" ADD COLUMN "paused_at" TIMESTAMPTZ;
ALTER TABLE "match" ADD COLUMN "paused_total_sec" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "match" ADD COLUMN "break_taken_at" TIMESTAMPTZ;
