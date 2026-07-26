import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";
import { DemoBanner } from "@/components/DemoBanner";

export const metadata: Metadata = {
  title: "Demo · Liga Minggu",
  description: "The app running on a made-up season, for demonstration.",
  // Sample standings have no business turning up in a search for the club.
  robots: { index: false, follow: false },
};

/**
 * Mirror of the public layout for the generated demo season. Every link inside
 * is prefixed with /demo, so browsing the demo never silently drops you into
 * real data — the only way out is the banner's explicit link.
 */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      {/* Same sticky-wrapper pattern as (public)/layout.tsx, now that Navbar
          no longer sticks on its own — see the comment in Navbar.tsx. */}
      <div style={{ position: "sticky", top: 0, zIndex: 100 }}>
        <DemoBanner />
        <Navbar basePath="/demo" />
      </div>
      <main style={{ flex: 1 }}>{children}</main>
      <SiteFooter basePath="/demo" />
    </div>
  );
}
