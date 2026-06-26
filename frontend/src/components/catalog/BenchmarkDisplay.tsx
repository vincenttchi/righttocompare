interface BenchmarkDisplayProps {
  benchmarks: Record<string, string | number>;
  phoneName: string;
}

// Benchmark definitions with max scores for scaling
const benchmarkConfig = [
  {
    label: "GeekBench Single-Core",
    keys: ["GeekBench Single-Core", "GeekBench 6 Single-Core", "Geekbench Single-Core"],
    max: 2800,
  },
  {
    label: "GeekBench Multi-Core",
    keys: ["GeekBench Multi-Core", "GeekBench 6 Multi-Core", "Geekbench Multi-Core", "GeekBench"],
    max: 8000,
  },
  {
    label: "AnTuTu Score",
    keys: ["AnTuTu Score", "AnTuTu v10", "AnTuTu v11", "AnTuTu"],
    max: 2000000,
  },
];

const getScoreRating = (percentage: number): { label: string; color: string } => {
  if (percentage >= 80) return { label: "Excellent", color: "#10b981" };
  if (percentage >= 60) return { label: "Great", color: "#3b82f6" };
  if (percentage >= 40) return { label: "Good", color: "#f59e0b" };
  return { label: "Average", color: "#9ca3af" };
};

const parseScore = (scoreStr: string | number): number => {
  if (typeof scoreStr === "number") return scoreStr;
  return parseInt(scoreStr.replace(/[^0-9]/g, "")) || 0;
};

export default function BenchmarkDisplay({ benchmarks, phoneName }: BenchmarkDisplayProps) {
  if (!benchmarks || Object.keys(benchmarks).length === 0) return null;

  // Match benchmark data to config, handling different key name formats
  const matched = benchmarkConfig
    .map((config) => {
      const foundKey = config.keys.find((k) => benchmarks[k] !== undefined);
      if (!foundKey) return null;
      const value = benchmarks[foundKey];
      const score = parseScore(value);
      if (score === 0) return null;
      return { label: config.label, value, score, max: config.max };
    })
    .filter(Boolean) as { label: string; value: string; score: number; max: number }[];

  if (matched.length === 0) return null;

  return (
    <div className="space-y-4">
      {matched.map((item) => {
        const percentage = Math.min((item.score / item.max) * 100, 100);
        const rating = getScoreRating(percentage);

        return (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-[#1e1e1e] dark:text-white">{item.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#2c3968] dark:text-[#4a7cf6]">
                  {item.score.toLocaleString()}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${rating.color}15`, color: rating.color }}
                >
                  {rating.label}
                </span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-[#f0f0f0] dark:bg-[#252b3d] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${percentage}%`, backgroundColor: rating.color }}
              />
            </div>
          </div>
        );
      })}

      <p className="text-xs text-[#999] dark:text-[#707070] mt-4">Scores benchmarked by GeekBench and AnTuTu.</p>
    </div>
  );
}
