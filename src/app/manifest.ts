import type { MetadataRoute } from "next";

/**
 * Web app manifest — this plus HTTPS is all a browser needs to offer "install"
 * (see next/docs progressive-web-apps §6). There is deliberately no service
 * worker: every meaningful action in this app is a server write, so a cache
 * that served stale JS mid-match would cost more than offline reading is worth.
 *
 * Colours match the dark base rather than the volt accent, so the splash screen
 * and status bar blend into the app instead of flashing at launch.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Liga Minggu",
    // Home-screen label; short enough that neither iOS nor Android truncates it.
    short_name: "Liga Minggu",
    description: "Weekly futsal teams, live match scoring, and the season leaderboard.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D0F14",
    theme_color: "#0D0F14",
    categories: ["sports"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops the outer 20% into whatever shape the launcher uses, so
      // the maskable variant keeps the ball well inside the safe zone.
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    // Long-press the installed icon: the two places worth jumping straight to.
    shortcuts: [
      {
        name: "Matchday HQ",
        short_name: "Admin",
        description: "Run a session: check-in, shuffle, live scoring",
        url: "/admin",
      },
      {
        name: "Leaderboard",
        short_name: "Table",
        description: "Season standings",
        url: "/",
      },
    ],
  };
}
