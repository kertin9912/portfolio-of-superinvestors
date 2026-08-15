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
        <svg width="180" height="180" viewBox="0 0 64 64">
          <path
            d="M50 12H18C13.6 12 10 15.6 10 20V30C10 34.4 13.6 38 18 38H41V44H11V53H46C50.4 53 54 49.4 54 45V35C54 30.6 50.4 27 46 27H23V21H50V12Z"
            fill="#ffffff"
          />
          <path d="M0 59H64V64H0Z" fill="#f05143" />
        </svg>
      </div>
    ),
    size,
  );
}
