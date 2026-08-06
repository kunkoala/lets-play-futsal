-- First-party analytics event log. Append-only; every dashboard figure is
-- derived from these rows at query time (see src/lib/analytics.ts).

-- CreateEnum
CREATE TYPE "analytics_event_type" AS ENUM ('pageview', 'impression', 'action');

-- CreateTable
CREATE TABLE "analytics_event" (
    "id" SERIAL NOT NULL,
    "type" "analytics_event_type" NOT NULL,
    "route" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT,
    "target_id" INTEGER,
    "visitor_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "referrer_host" TEXT,
    "device" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "dwell_ms" INTEGER,
    "client_event_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Unique so a retried/duplicated beacon collides instead of double-counting,
-- and so the dwell beacon can find its pageview row by this id.
CREATE UNIQUE INDEX "analytics_event_client_event_id_key" ON "analytics_event"("client_event_id");

-- CreateIndex
CREATE INDEX "analytics_event_created_at_idx" ON "analytics_event"("created_at");

-- CreateIndex
CREATE INDEX "analytics_event_type_created_at_idx" ON "analytics_event"("type", "created_at");

-- CreateIndex
CREATE INDEX "analytics_event_visitor_id_idx" ON "analytics_event"("visitor_id");

-- CreateIndex
CREATE INDEX "analytics_event_route_created_at_idx" ON "analytics_event"("route", "created_at");

-- CreateIndex
CREATE INDEX "analytics_event_name_target_id_idx" ON "analytics_event"("name", "target_id");
