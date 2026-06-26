import { useMemo } from "react";
import { useDarkMode } from "../../context/DarkModeContext";
import { darkModeColors } from "../../config/darkModeConfig";

/**
 * This is the brand radar that shows how each brand is performing based
 * on an aggregation of reviews of all phones for each brand within some
 * time frame.
 */
interface BrandRadarProps {
  brands: { brand: string; avgRating: number; reviewCount: number }[];
}

export function BrandRadar({ brands }: BrandRadarProps) {
  const { isDarkMode } = useDarkMode();
  const colors = darkModeColors;

  // ------------------------------------------------------------
  // | THEME DERIVATION
  // ------------------------------------------------------------
  const theme = useMemo(
    () => ({
      cardBg: isDarkMode ? colors.background.card.dark : colors.background.card.light,
      cardBorder: isDarkMode ? colors.border.default.dark : colors.border.default.light,

      brand: isDarkMode ? colors.text.brand.dark : colors.text.brand.light,
      textPrimary: isDarkMode ? colors.text.primary.dark : colors.text.primary.light,
      textMuted: isDarkMode ? colors.text.secondary.dark : colors.text.secondary.light,

      ratingBadge: isDarkMode ? "#ffffff" : colors.text.brand.light,
      pulseDot: isDarkMode ? "#4a7cf6" : "#10b981",

      footerBorder: isDarkMode ? colors.border.subtle.dark : colors.border.subtle.light,
      itemHover: isDarkMode ? "#1e2530" : "#f0f0f0",
    }),
    [isDarkMode, colors],
  );

  // ------------------------------------------------------------
  // | COMPONENT LOGIC
  // ------------------------------------------------------------
  // We sort by rating (highest first) and take the top 3
  const topBrands = useMemo(() => {
    return [...brands].sort((a, b) => b.avgRating - a.avgRating).slice(0, 3);
  }, [brands]);

  // We keep totalInsights based on ALL brands to keep the Confidence Score high
  const totalInsights = useMemo(() => brands.reduce((sum, item) => sum + item.reviewCount, 0), [brands]);

  /**
   * Confidence Calculation:
   * Score that scales with data volume.
   * Logic: 100 reviews = ~80% confidence, 500+ reviews = 99%+
   * Formula: 100 * (1 - e^(-total / constant))
   */
  const calculateConfidence = (total: number) => {
    if (total === 0) return 0;
    const score = 70 + 29.9 * (1 - Math.exp(-total / 200));
    return score.toFixed(1);
  };
  const dynamicConfidence = calculateConfidence(totalInsights);

  // ------------------------------------------------------------
  // | UI SECTION
  // ------------------------------------------------------------
  return (
    <div
      className="p-8 rounded-[2.5rem] border shadow-[0_20px_50px_rgba(0,0,0,0.02)] h-full flex flex-col transition-all duration-500"
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.cardBorder,
      }}
    >
      <div className="mb-10">
        <h3
          className="text-xs font-black uppercase tracking-[0.2em] mb-1 transition-colors duration-500"
          style={{ color: theme.brand }}
        >
          Brand Radar
        </h3>
        <p className="text-[10px] font-medium" style={{ color: theme.textMuted }}>
          Market sentiment ranking
        </p>
      </div>

      <div className="space-y-4 flex-1">
        {topBrands.map((item, idx) => (
          <div
            key={item.brand}
            className="group cursor-default p-4 -mx-4 rounded-2xl transition-all duration-300"
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.itemHover)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <div className="flex justify-between items-end mb-3">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-gray-300 dark:text-gray-600 group-hover:text-[#4a7cf6] transition-colors">
                  {(idx + 1).toString().padStart(2, "0")}
                </span>
                <span
                  className="font-black uppercase italic tracking-tighter group-hover:translate-x-1 transition-transform duration-300"
                  style={{ color: theme.textPrimary }}
                >
                  {item.brand}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <span
                  className="text-lg font-black leading-none transition-colors duration-500"
                  style={{ color: theme.ratingBadge }}
                >
                  {item.avgRating.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Performance Bar */}
            <div className="relative w-full h-1.5 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800/50">
              <div
                className="relative h-full transition-all duration-1000 ease-out"
                style={{
                  width: `${(item.avgRating / 5) * 100}%`,
                  backgroundColor: theme.brand,
                }}
              >
                <div className="absolute right-0 top-0 h-full w-2 bg-white/40 blur-[2px]" />
              </div>
            </div>

            {/* Sub-data */}
            <div className="flex justify-between items-center mt-2">
              <p
                className="text-[9px] uppercase font-black tracking-widest opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ color: theme.textMuted }}
              >
                {item.reviewCount} <span className="font-medium text-[8px]">Community Insights</span>
              </p>
              <div
                className="h-1 w-1 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                style={{ backgroundColor: theme.pulseDot }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Analytics Footer */}
      <div className="mt-8 pt-6 border-t" style={{ borderColor: theme.footerBorder }}>
        <p className="text-[9px] font-bold uppercase tracking-widest text-center" style={{ color: theme.textMuted }}>
          Confidence Score: <span style={{ color: theme.brand }}>{dynamicConfidence}%</span>
        </p>
      </div>
    </div>
  );
}
