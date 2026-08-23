/**
 * What changed in the app, in plain language, for the people who play in it.
 *
 * Static data rather than a table with an admin editor: an entry is written in
 * the same commit that ships the change, so the two can't drift apart and
 * there's nothing to migrate. Git already records *what* changed; this records
 * what it means for a matchday.
 *
 * Two rules, both learned by getting them wrong:
 *
 * - **One line per item.** A paragraph explaining the reasoning reads as an
 *   essay and gets skipped, taking the actual change with it. If the reasoning
 *   matters, it belongs in `heads_up`.
 * - **Anything that moves a number a player already knew goes in `heads_up`.**
 *   That is the only part of this page anyone *needs* to read, and it should
 *   not have to be found among a dozen feature bullets.
 *
 * Newest first.
 */

export type ChangeKind = "added" | "changed" | "fixed";

export type ChangelogEntry = {
  /** ISO date, `YYYY-MM-DD`. */
  date: string;
  title: string;
  /** One-line framing shown under the title. */
  summary?: string;
  /**
   * Changes to figures players have already seen — a shifted rating, a stat
   * that now counts differently. Called out above everything else.
   */
  headsUp?: { title: string; text: string }[];
  items: { kind: ChangeKind; text: string }[];
};

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    date: "2026-08-23",
    title: "MVP is just for fun now",
    summary: "First round of changes from your feedback after launch.",
    headsUp: [
      {
        title: "Every rating has shifted",
        text: "MVP awards used to be 20% of your rating — the single biggest ingredient. That made the rating partly a popularity vote and gave people a reason to farm MVPs. It's now built purely from what you do on the pitch, with goals + assists carrying the most weight.",
      },
      {
        title: "Clean sheets are the keeper's now",
        text: "Crediting the whole team meant an outfielder collected them as fast as the person actually stopping the shots. Unless you go in goal, your clean-sheet total has dropped to zero.",
      },
    ],
    items: [
      { kind: "changed", text: "One player of the day per session, instead of a man of the match for every game." },
      { kind: "changed", text: "MVP awards don't affect your rating at all." },
      { kind: "changed", text: "Goals + assists is now the heaviest part of the rating." },
      { kind: "added", text: "Matches played sits next to your rating, so a 90 off two games reads differently from a 90 off a season." },
      { kind: "added", text: "A column beside the rank shows how many places you moved since last matchday — and it follows whichever tab you're sorting by." },
      { kind: "added", text: "Session pages split into Matches and Statistics, with a top-three podium and a table of what everyone did." },
      { kind: "added", text: "Player profiles split into Overview and Progress, with a rating graph and goals per matchday." },
      { kind: "added", text: "A Most Improved award on the season awards page." },
      { kind: "added", text: "Players can be subbed in and out mid-session, and only get credit for the matches they actually played." },
      { kind: "added", text: "Player names are links almost everywhere — tap one to see their season." },
      { kind: "changed", text: "The sessions list is a clean list of dates again; each row expands for that matchday's leaders." },
      { kind: "fixed", text: "Adding a player now warns you if the name already exists — including someone who's been deactivated. That's what was creating duplicates." },
      { kind: "fixed", text: "The admin player list is searchable." },
    ],
  },
];
