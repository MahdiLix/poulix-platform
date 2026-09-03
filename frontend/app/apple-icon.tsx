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
          "linear-gradient(180deg, #1554c0 0%, #0e3d9a 50%, #082056 100%)",
        borderRadius: 36,
      }}
    >
      <span
        style={{
          color: "#ffffff",
          fontSize: 96,
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
