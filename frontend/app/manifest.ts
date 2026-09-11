import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Poulix Wallet",
    short_name: "Poulix",
    description:
      "Poulix is a personal digital wallet for deposits, transfers, goals, and more.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#1d4ed8",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "48x48",
        type: "image/x-icon",
      },
      {
        src: "/poulix-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/poulix-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
