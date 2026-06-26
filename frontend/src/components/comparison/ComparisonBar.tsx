import { useMemo } from "react";
import { parseNumericValue } from "../../utils/numberParser";

interface ComparisonBarProps {
  value: string | number;
  allValues: (string | number)[];
  color?: string;
  reverse?: boolean;
}

export function ComparisonBar({ value, allValues, reverse = false }: ComparisonBarProps) {
  // Getting numeric value from the string values (if possible)
  const currentNum = useMemo(() => parseNumericValue(value), [value]);
  const maxNum = useMemo(() => {
    const valuesAsNumbers = allValues.map((v) => parseNumericValue(v));
    return Math.max(...valuesAsNumbers, 1);
  }, [allValues]);

  // Getting percentage of current number against the highest value
  const percentage = (currentNum / maxNum) * 100;
  const finalPercentage = reverse ? 100 - percentage + 20 : percentage;
  if (currentNum === 0) return null;

  return (
    <div className="w-full h-1 bg-[#f0f0f0] rounded-full mt-1">
      <div
        className="h-full bg-[#2c3968] rounded-full transition-all duration-700"
        style={{ width: `${finalPercentage}%` }}
      />
    </div>
  );
}
