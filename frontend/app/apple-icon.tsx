import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(180deg, #4d76ff 0%, #2d5cfe 50%, #1a3fd4 100%)",
        borderRadius: 40,
      }}
    >
      <span
        style={{
          color: "#ffffff",
          fontSize: 72,
          fontWeight: 800,
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.04em",
        }}
      >
        Px
      </span>
    </div>,
    size,
  );
}
