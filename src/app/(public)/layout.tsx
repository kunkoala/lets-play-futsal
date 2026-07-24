import { Navbar } from "@/components/Navbar";
import { SiteFooter } from "@/components/SiteFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // Full-height column so the footer sits at the bottom of the viewport on
    // short pages instead of floating mid-screen. The wrapper sets no overflow,
    // so the viewport stays the scroll container and the sticky navbar still works.
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <SiteFooter />
    </div>
  );
}
