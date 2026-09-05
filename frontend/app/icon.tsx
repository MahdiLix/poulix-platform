import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #4d76ff 0%, #2d5cfe 55%, #1a3fd4 100%)",
        borderRadius: 8,
      }}
    >
      <span
        style={{
          color: "#ffffff",
          fontSize: 15,
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
