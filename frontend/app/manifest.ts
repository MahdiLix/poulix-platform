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
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
