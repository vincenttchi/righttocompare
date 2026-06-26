import { Camera, Battery, Palette, Cpu, DollarSign } from "lucide-react";
import { StarRating } from "./StarRating";
import { useDarkMode } from "../../context/DarkModeContext";

export interface CategoryRatings {
  camera: number;
  battery: number;
  design: number;
  performance: number;
  value: number;
}

interface MultiRatingInputProps {
  value: CategoryRatings;
  onChange: (ratings: CategoryRatings) => void;
  readonly?: boolean;
  showAverage?: boolean;
  compact?: boolean;
}

const categories = [
  { key: "camera" as const, label: "Camera", icon: Camera },
  { key: "battery" as const, label: "Battery", icon: Battery },
  { key: "design" as const, label: "Design", icon: Palette },
  { key: "performance" as const, label: "Performance", icon: Cpu },
  { key: "value" as const, label: "Value", icon: DollarSign },
];

export function MultiRatingInput({
  value,
  onChange,
  readonly = false,
  showAverage = true,
  compact = false,
}: MultiRatingInputProps) {
  const { isDarkMode } = useDarkMode();

  const handleCategoryChange = (category: keyof CategoryRatings, rating: number) => {
    onChange({
      ...value,
      [category]: rating,
    });
  };

  const calculateAverage = () => {
    const total = value.camera + value.battery + value.design + value.performance + value.value;
    return total / 5;
  };

  const average = calculateAverage();
  const hasAllRatings = Object.values(value).every((r) => r > 0);

  return (
    <div className={`space-y-${compact ? "2" : "3"}`}>
      {categories.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className={`flex items-center ${compact ? "gap-2" : "gap-3"} ${compact ? "justify-between" : ""}`}
        >
          <div className={`flex items-center ${compact ? "gap-1.5 min-w-[100px]" : "gap-2 min-w-[130px]"}`}>
            <Icon
              className={`${compact ? "w-4 h-4" : "w-5 h-5"} ${isDarkMode ? "text-[#4a7cf6]" : "text-[#2c3968]"}`}
            />
            <span
              className={`${compact ? "text-sm" : "text-base"} ${isDarkMode ? "text-[#e0e4eb]" : "text-[#2c3968]"}`}
            >
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <StarRating
              value={value[key]}
              onChange={readonly ? undefined : (rating) => handleCategoryChange(key, rating)}
              readonly={readonly}
              size={compact ? "sm" : "md"}
            />
            <span
              className={`${compact ? "text-xs min-w-[24px]" : "text-sm min-w-[28px]"} text-right ${
                isDarkMode ? "text-[#a0a8b8]" : "text-[#666]"
              }`}
            >
              {value[key] > 0 ? value[key] : "-"}/5
            </span>
          </div>
        </div>
      ))}

      {showAverage && hasAllRatings && (
        <div
          className={`pt-${compact ? "2" : "3"} mt-${compact ? "2" : "3"} border-t ${
            isDarkMode ? "border-[#2d3748]" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`font-medium ${compact ? "text-sm" : "text-base"} ${
                isDarkMode ? "text-[#e0e4eb]" : "text-[#2c3968]"
              }`}
            >
              Overall Average
            </span>
            <div className="flex items-center gap-2">
              <StarRating value={average} readonly size={compact ? "sm" : "md"} />
              <span
                className={`font-semibold ${compact ? "text-sm" : "text-base"} ${
                  isDarkMode ? "text-[#4a7cf6]" : "text-[#2c3968]"
                }`}
              >
                {average.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
