import type { MetadataRoute } from "next";

/**
 * Web app manifest – mainly for "Add to Home Screen" on iPhone:
 * the icon always opens "/" (without it, iOS opens whatever page was showing when the icon was
 * added – e.g. /login, which looked like being signed out every time).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Amigo – העוזר האישי שלי",
    short_name: "Amigo",
    description: "Amigo – personal assistant for mail, schedule and tasks",
    start_url: "/",
    scope: "/",
    display: "standalone",
    dir: "rtl",
    lang: "he",
    background_color: "#F5ECDE",
    theme_color: "#6B1029",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
