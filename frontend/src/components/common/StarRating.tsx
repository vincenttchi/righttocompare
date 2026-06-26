import { Star } from "lucide-react";
import { useState } from "react";
import { PartialStar } from "./PartialStar";
import { useDarkMode } from "../../context/DarkModeContext";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  maxStars?: number;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

const containerSizes = {
  sm: { width: "16px", height: "16px" },
  md: { width: "20px", height: "20px" },
  lg: { width: "24px", height: "24px" },
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  showValue = false,
  maxStars = 5,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const { isDarkMode } = useDarkMode();

  const fillColor = isDarkMode ? "#4a7cf6" : "#2c3968";
  const strokeColor = isDarkMode ? "#4a7cf6" : "#2c3968";
  const emptyStrokeColor = isDarkMode ? "#4a5568" : "#d1d5db";

  const displayValue = hoverValue !== null ? hoverValue : value;

  const handleClick = (starIndex: number) => {
    if (!readonly && onChange) {
      onChange(starIndex);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (!readonly) {
      setHoverValue(starIndex);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: maxStars }, (_, i) => {
          const starIndex = i + 1;
          const fillPercentage = Math.max(0, Math.min(1, displayValue - i));

          if (readonly) {
            return (
              <PartialStar
                key={i}
                fillPercentage={fillPercentage}
                className={sizeClasses[size]}
                fillColor={fillColor}
                strokeColor={fillPercentage > 0 ? strokeColor : emptyStrokeColor}
              />
            );
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(starIndex)}
              onMouseEnter={() => handleMouseEnter(starIndex)}
              onMouseLeave={handleMouseLeave}
              className={`cursor-pointer transition-transform hover:scale-110 ${readonly ? "cursor-default" : ""}`}
              style={containerSizes[size]}
            >
              <Star
                className={sizeClasses[size]}
                fill={starIndex <= displayValue ? fillColor : "none"}
                stroke={starIndex <= displayValue ? strokeColor : emptyStrokeColor}
              />
            </button>
          );
        })}
      </div>
      {showValue && (
        <span
          className={`ml-1 font-medium ${
            isDarkMode ? "text-[#e0e4eb]" : "text-[#2c3968]"
          } ${size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"}`}
        >
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
