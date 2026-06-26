import { Star } from "lucide-react";

interface PartialStarProps {
  fillPercentage: number; // 0 to 1
  className?: string;
  fillColor?: string;
  strokeColor?: string;
}

export function PartialStar({ 
  fillPercentage, 
  className = "w-5 h-5",
  fillColor = "#2c3968",
  strokeColor = "#2c3968"
}: PartialStarProps) {
  // Clamp fillPercentage between 0 and 1
  const clampedFill = Math.max(0, Math.min(1, fillPercentage));
  
  return (
    <div className="relative inline-block" style={{ width: '20px', height: '20px' }}>
      {/* Empty star background */}
      <Star
        className={className}
        fill="none"
        stroke={strokeColor}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      {/* Filled star with clip */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: `${clampedFill * 100}%`,
          overflow: 'hidden'
        }}
      >
        <Star
          className={className}
          fill={fillColor}
          stroke={strokeColor}
        />
      </div>
    </div>
  );
}
