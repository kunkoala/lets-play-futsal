import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { LiveBanner } from "@/components/LiveBanner";

/**
 * Every public page reads live rows — standings, sessions, profiles, awards —
 * so there is nothing here worth prerendering, and prerendering it would mean
 * querying the database during `next build`, where none is running. Declared on
 * the layout so it covers the whole segment rather than page by page.
 *
 * `/demo` and `/login` are deliberately left out: neither touches the database,
 * so both can stay static.
 */
export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // Full-height column so the footer sits at the bottom of the viewport on
    // short pages instead of floating mid-screen. The wrapper sets no overflow,
    // so the viewport stays the scroll container and the sticky navbar still works.
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      {/* Banner + nav stick together as one unit — see the comment in
          Navbar.tsx for why Navbar no longer sticks on its own. */}
      <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <LiveBanner />
        <Navbar />
      </div>
      <main style={{ flex: 1 }}>{children}</main>
      <SiteFooter />
    </div>
  );
}
