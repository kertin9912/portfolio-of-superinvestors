import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#050505",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <svg width="140" height="140" viewBox="0 0 64 64">
          <path
            d="M11 44L24 31L35 38L51 19"
            fill="none"
            stroke="#ffcd1e"
            strokeWidth="6"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
          <circle cx="51" cy="19" r="6" fill="#f05143" />
          <path d="M11 52H53" stroke="#ffffff" strokeWidth="3" />
        </svg>
      </div>
    ),
    size,
  );
}
