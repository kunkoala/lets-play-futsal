import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "@/theme";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";

// Archivo + Archivo Expanded per the design handoff (§Typography). Loaded via
// Google Fonts rather than next/font because this Next build's bundled font
// list ships Archivo but not the Expanded display face. The CSS vars
// (--font-archivo / --font-archivo-expanded) are declared in globals.css.
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Expanded:wght@600;700;800;900&display=swap";

export const metadata: Metadata = {
  title: "Liga Minggu",
  description: "Weekly futsal team manager and season leaderboard.",
  applicationName: "Liga Minggu",
  // iOS ignores most of the manifest but honours these: run without Safari
  // chrome once added to the home screen, which is the point of installing it
  // on the courtside iPad.
  appleWebApp: {
    capable: true,
    title: "Liga Minggu",
    // The app paints its own dark background, so let it run under the status bar.
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // Matches the manifest and the navbar, so the browser/status bar blends in
  // rather than framing the app in a lighter strip.
  themeColor: "#0D0F14",
  // Extends the dark background into the safe areas on notched iPhones.
  viewportFit: "cover",
  // Deliberately not disabling zoom — the live console is thumb-driven, but
  // pinch-to-zoom is an accessibility feature and costs nothing to keep.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Dark-only app: set the Mantine scheme statically so there's no client
    // color-scheme script to hydrate (and no flash), and force it in the provider.
    <html
      lang="en"
      className="h-full antialiased"
      data-mantine-color-scheme="dark"
      suppressHydrationWarning
    >
      <head>
        {/* Next emits the standardised `mobile-web-app-capable`; iOS before
            16.4 only understands this Apple-prefixed spelling, and the
            courtside iPad is exactly where running without Safari chrome
            matters. Harmless duplication on anything newer. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Design is dark-only (courtside). Force dark rather than following OS. */}
        <MantineProvider theme={theme} forceColorScheme="dark">
          <Notifications />
          {/* Renders nothing; reports page views and impressions for the
              /admin/analytics dashboard. Skips /admin and /login itself. */}
          <AnalyticsTracker />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
