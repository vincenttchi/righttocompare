import { useDarkMode } from "../../context/DarkModeContext";
import { darkModeColors } from "../../config/darkModeConfig";
import { TickerData } from "../../types/trendTypes";
import { TrendingUp, TrendingDown, Flame, AlertCircle } from "lucide-react";
import { useMemo } from "react";

export function SentimentTicker({ items }: { items: TickerData[] }) {
  const { isDarkMode } = useDarkMode();
  const colors = darkModeColors;

  // ------------------------------------------------------------
  // | THEME DERIVATION
  // ------------------------------------------------------------
  const theme = useMemo(
    () => ({
      containerBg: isDarkMode ? colors.background.primary.dark : colors.background.primary.light,
      containerBorder: isDarkMode ? colors.border.default.dark : colors.border.default.light,
      pillBg: isDarkMode ? colors.background.card.dark : colors.background.card.light,
      velocityText: isDarkMode ? colors.text.primary.dark : colors.text.primary.light,
    }),
    [isDarkMode, colors],
  );

  if (items.length === 0) return null;

  return (
    <div
      className="w-full border-b py-3 overflow-hidden whitespace-nowrap relative z-10 transition-colors duration-500"
      style={{
        backgroundColor: theme.containerBg,
        borderColor: theme.containerBorder,
      }}
    >
      <div className="flex items-center gap-12 animate-marquee-infinite hover:pause w-max">
        {[...items, ...items, ...items, ...items].map((item, idx) => {
          const isPos = item.tag.startsWith("+");
          const label = item.tag.slice(1);

          return (
            <div
              key={idx}
              className="flex items-center gap-4 px-4 py-1 rounded-full border transition-all duration-300 hover:scale-105 shadow-sm"
              style={{
                backgroundColor: theme.pillBg,
                borderColor: theme.containerBorder,
              }}
            >
              <span
                className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest ${
                  isPos ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {isPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {label}
              </span>

              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-black tabular-nums transition-colors duration-500"
                  style={{ color: theme.velocityText }}
                >
                  {item.velocity}
                </span>

                {/* Semantic Icons */}
                {item.velocity > 20 ? (
                  <Flame size={12} className="text-orange-500 fill-orange-500 animate-pulse" />
                ) : !isPos && item.velocity > 10 ? (
                  <AlertCircle size={12} className="text-red-400" />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
