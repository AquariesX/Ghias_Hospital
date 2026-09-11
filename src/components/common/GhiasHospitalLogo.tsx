"use client";

import React from "react";

interface GhiasHospitalLogoProps {
  className?: string;
  size?: number;
}

export default function GhiasHospitalLogo({
  className = "",
  size = 72,
}: GhiasHospitalLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      aria-label="Ghias Hospital Emblem"
    >
      {/* Outer circular border */}
      <circle
        cx="50"
        cy="50"
        r="47"
        stroke="#1e293b"
        strokeWidth="1.8"
        fill="#ffffff"
      />

      {/* Inner thin circular decorative ring */}
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke="#334155"
        strokeWidth="0.8"
        strokeDasharray="2 1.5"
        fill="none"
      />

      {/* Crescent moon shape */}
      <path
        d="M 50 14 A 36 36 0 1 0 74 76 A 31 31 0 1 1 50 14 Z"
        fill="#1e293b"
      />

      {/* Urdu Calligraphy 'غیاث' centered inside the crescent */}
      <text
        x="53"
        y="55"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#0f172a"
        style={{
          fontFamily: "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Urdu Typesetting', serif",
          fontSize: "20px",
          fontWeight: 700,
        }}
      >
        غیاث
      </text>
    </svg>
  );
}
