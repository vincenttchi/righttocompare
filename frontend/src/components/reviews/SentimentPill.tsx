import { useDarkMode } from "../../context/DarkModeContext";
import { SentimentTag } from "../../types/sentimentTypes";
import { ChevronUp, ChevronDown, X } from "lucide-react";

interface SentimentPillProps {
  tag: SentimentTag;
  count?: number;
  isActive?: boolean;
  onClick?: (topic: string) => void;
  readOnly?: boolean;
}

export function SentimentPill({ tag, count, isActive, onClick, readOnly = false }: SentimentPillProps) {
  const { isDarkMode } = useDarkMode();

  // Parse the tag to determine if positive/negative and removes the sign to prep for labeling
  const isPositive = tag.startsWith("+");
  const label = tag.slice(1);

  // Setting size/gaps on pill
  const sizeClass = readOnly
    ? "px-1.5 py-0.5 text-[10px] gap-1 leading-none" // Compact for cards
    : "px-2.5 py-1 text-[10px] gap-1.5 font-bold "; // Standard for sentiment summary

  // Remove scaling and hover-states if readOnly
  const interactionClass = readOnly
    ? "cursor-default border-opacity-50"
    : `cursor-pointer transition-all ${
        isActive
          ? isDarkMode
            ? "ring-1 ring-[#4a7cf6] scale-105"
            : "ring-1 ring-[#2c3968] scale-105"
          : "opacity-80 hover:opacity-100 hover:scale-[1.02] active:scale-95 shadow-sm"
      }`;

  // Remove hover backgrounds if readOnly
  const colorClasses = isPositive
    ? isDarkMode
      ? `bg-green-900/20 text-green-400 border-green-900/30 ${!readOnly ? "hover:bg-green-900/30" : ""}`
      : `bg-green-50 text-green-700 border-green-200 ${!readOnly ? "hover:bg-green-100" : ""}`
    : isDarkMode
      ? `bg-red-900/20 text-red-400 border-red-900/30 ${!readOnly ? "hover:bg-red-900/30" : ""}`
      : `bg-red-50 text-red-700 border-red-200 ${!readOnly ? "hover:bg-red-100" : ""}`;

  // Use div for readOnly rather than button
  const Component = readOnly ? "div" : "button";

  return (
    <Component
      onClick={!readOnly ? () => onClick?.(tag) : undefined}
      className={`inline-flex items-center rounded-md border uppercase select-none ${sizeClass} ${interactionClass} ${colorClasses}`}
    >
      {/* Up/down icon render */}
      {isActive ? (
        <X size={readOnly ? 8 : 10} strokeWidth={3} />
      ) : isPositive ? (
        <ChevronUp size={readOnly ? 8 : 10} strokeWidth={readOnly ? 4 : 2} />
      ) : (
        <ChevronDown size={readOnly ? 8 : 10} strokeWidth={readOnly ? 4 : 2} />
      )}

      <span>{label}</span>

      {/* Displaying count if button/or nothing in readOnly */}
      {!isActive && !readOnly && count !== undefined && (
        <span className="ml-1 pl-1.5 border-l opacity-70">{count}</span>
      )}
    </Component>
  );
}
