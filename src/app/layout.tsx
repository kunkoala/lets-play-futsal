import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

import type { Metadata } from "next";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { theme } from "@/theme";

// Archivo + Archivo Expanded per the design handoff (§Typography). Loaded via
// Google Fonts rather than next/font because this Next build's bundled font
// list ships Archivo but not the Expanded display face. The CSS vars
// (--font-archivo / --font-archivo-expanded) are declared in globals.css.
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Expanded:wght@600;700;800;900&display=swap";

export const metadata: Metadata = {
  title: "Let's Play Futsal",
  description: "Weekly futsal team manager and season leaderboard.",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Design is dark-only (courtside). Force dark rather than following OS. */}
        <MantineProvider theme={theme} forceColorScheme="dark">
          <Notifications />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
