"use client";

/**
 * Central re-export of the Phosphor icons the app uses.
 *
 * `@phosphor-icons/react`'s default (client-side render) icons call
 * `useContext` internally and ship no "use client" directive, so importing
 * them straight into an async Server Component (our Navbar and public pages)
 * would throw "useContext only works in a Client Component". Routing every
 * icon through this one "use client" module draws the client boundary here,
 * so Server Components can render `<SoccerBallIcon />` etc. like plain markup.
 *
 * It also keeps the app's icon vocabulary in one place — swap a glyph here
 * and every page updates.
 */
export {
  // Phosphor deprecated the bare names in favour of `*Icon`; import the new
  // name directly rather than aliasing the deprecated one.
  SoccerBallIcon,
  GithubLogo,
  Trophy,
  Target,
  Fire,
  TrendUp,
  CalendarBlank,
  Medal,
  ArrowLeft,
  ArrowRight,
  ListChecks,
  Users,
  ChartLineUp,
} from "@phosphor-icons/react";
export type { Icon } from "@phosphor-icons/react";
