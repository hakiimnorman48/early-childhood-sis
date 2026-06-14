import { scoreToColor, scoreToLabel, scoreToCode } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number;
  showCode?: boolean;
  className?: string;
}

const colorClasses: Record<string, string> = {
  red: "bg-red-100 text-red-700 border-red-200",
  yellow: "bg-yellow-100 text-yellow-700 border-yellow-200",
  green: "bg-green-100 text-green-700 border-green-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
};

export function ScoreBadge({ score, showCode = false, className }: ScoreBadgeProps) {
  const color = scoreToColor(score);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border",
        colorClasses[color],
        className
      )}
    >
      {showCode ? scoreToCode(score) : scoreToLabel(score)}
    </span>
  );
}
