"use client";

import { scoreToColor, scoreToLabel } from "@/lib/utils";

interface ProgressCircleProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
}

const sizeMap = {
  sm: { svg: 56, r: 22, stroke: 5, text: "text-sm", sub: "text-[10px]" },
  md: { svg: 80, r: 32, stroke: 6, text: "text-lg", sub: "text-xs" },
  lg: { svg: 100, r: 40, stroke: 7, text: "text-2xl", sub: "text-sm" },
};

const colorMap: Record<string, { stroke: string; fill: string; bg: string }> = {
  red: { stroke: "#ef4444", fill: "#fef2f2", bg: "bg-red-50" },
  yellow: { stroke: "#f59e0b", fill: "#fffbeb", bg: "bg-yellow-50" },
  green: { stroke: "#22c55e", fill: "#f0fdf4", bg: "bg-green-50" },
  blue: { stroke: "#3b82f6", fill: "#eff6ff", bg: "bg-blue-50" },
};

export function ProgressCircle({
  score,
  size = "md",
  showLabel = false,
  label,
}: ProgressCircleProps) {
  const color = scoreToColor(score);
  const { svg, r, stroke, text, sub } = sizeMap[size];
  const c = colorMap[color];
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const dash = pct * circumference;
  const center = svg / 2;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={svg} height={svg} className="rotate-[-90deg]">
        <circle
          cx={center}
          cy={center}
          r={r}
          fill={c.fill}
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="transparent"
          stroke={c.stroke}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        className="flex flex-col items-center"
        style={{ marginTop: -(svg / 2 + 4) }}
      >
        <span className={`${text} font-bold leading-none`} style={{ color: c.stroke }}>
          {score.toFixed(1)}
        </span>
        <span className={`${sub} text-gray-400 leading-tight`}>
          {scoreToLabel(score)}
        </span>
      </div>
      {showLabel && label && (
        <span className="text-xs text-center text-gray-600 max-w-[80px] leading-tight mt-1">
          {label}
        </span>
      )}
    </div>
  );
}
