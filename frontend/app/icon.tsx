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
        background: "#1d4ed8",
        borderRadius: 8,
      }}
    >
      <span
        style={{
          color: "#ffffff",
          fontSize: 20,
          fontWeight: 800,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        P
      </span>
    </div>,
    size,
  );
}
