/**
 * What changed in the app, in plain language, for the people who play in it.
 *
 * Static data rather than a table with an admin editor: an entry is written in
 * the same commit that ships the change, so the two can't drift apart and
 * there's nothing to migrate. Git already records *what* changed; this records
 * what it means for a Sunday.
 *
 * Write for a player, not a developer — "your rating moved and here's why"
 * beats a list of renamed functions. Changes that move numbers people have
 * already seen are the entries that matter most.
 *
 * Newest first.
 */

export type ChangeKind = "added" | "changed" | "fixed";

export type ChangelogEntry = {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  title: string;
  /** One-line framing shown under the title. Optional. */
  summary?: string;
  items: { kind: ChangeKind; text: string }[];
};

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: "2026-08-23",
    title: "MVP is just for fun now",
    summary:
      "The first round of changes from your feedback after launch. One of them moves everybody's rating, so it's worth a read.",
    items: [
      {
        kind: "changed",
        text: "There's no man of the match any more. Instead, one player of the day is picked for the whole session, at the end of the night.",
      },
      {
        kind: "changed",
        text: "MVP awards no longer count toward your rating at all. They used to be 20% of it — the single biggest ingredient — which meant the rating was partly a popularity vote and there was a reason to farm them. Your rating is now built purely from what you do on the pitch, so every number on the leaderboard has shifted.",
      },
      {
        kind: "changed",
        text: "Goals + assists is now the heaviest part of the rating, ahead of win rate and points.",
      },
      {
        kind: "added",
        text: "Matches played sits right next to the rating on the leaderboard, so you can tell a 90 built over a season from a 90 built in two games.",
      },
      {
        kind: "added",
        text: "A column beside the rank shows how many places you moved since last matchday — and it follows whichever tab you're sorting by, so switch to Goals and it's your movement up the scoring charts.",
      },
      {
        kind: "added",
        text: "Every session page now has a top-three podium for goals and assists, plus a table of what everyone did that night — matches, goals, assists, clean sheets and results, so you can find your own row even on a quiet week.",
      },
      {
        kind: "added",
        text: "Your profile has a rating graph and a goals-per-matchday chart, plus how much your rating moved since last week.",
      },
      { kind: "added", text: "A Most Improved award on the season awards page." },
      {
        kind: "added",
        text: "Players can be swapped in and out mid-session. Each match now records who was actually on the pitch, so if you come on for match 4 you're credited with matches 4 onward and nothing before — subbing no longer quietly rewrites the results of games that already finished.",
      },
      {
        kind: "fixed",
        text: "Adding a player now suggests people who already exist while you type, and says so if the name is already taken — including by someone who's been deactivated. That's what was creating duplicate players.",
      },
      { kind: "added", text: "The admin player list is searchable, with deactivated players tucked away." },
    ],
  },
];
