-- Refine stored team colors to the design-handoff palette (brighter tones that
-- read on the dark base). Data-only; no schema change. Idempotent — rows already
-- holding a refined hex are untouched.
UPDATE "team" SET "color" = '#FF4D57' WHERE lower("color") = '#ef4444';
UPDATE "team" SET "color" = '#4D8BFF' WHERE lower("color") = '#3b82f6';
UPDATE "team" SET "color" = '#2FD06A' WHERE lower("color") = '#22c55e';
UPDATE "team" SET "color" = '#FFCB2B' WHERE lower("color") = '#eab308';
UPDATE "team" SET "color" = '#B06BFF' WHERE lower("color") = '#a855f7';
