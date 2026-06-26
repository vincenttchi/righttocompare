import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useDarkMode } from "../../context/DarkModeContext";
import { darkModeColors } from "../../config/darkModeConfig";
import { useMemo } from "react";

interface MomentumChartProps {
  data: { month: string; avgRating: number; count?: number }[];
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

/**
 *  Floating tooltip UI on the Rechart chart
 */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const insightCount = payload[0].payload.count;
    return (
      <div className="bg-white/80 dark:bg-[#161b22]/90 backdrop-blur-md border border-gray-100 dark:border-gray-800 p-4 rounded-xl shadow-2xl transition-all duration-300">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-black text-[#2c3968] dark:text-white">{payload[0].value.toFixed(2)}</p>
          <p className="text-[10px] font-bold text-emerald-500 uppercase">Avg Vibe</p>
        </div>
        {insightCount !== undefined && insightCount > 0 && (
          <p className="text-[10px] text-gray-400 mt-1 italic font-medium">
            Based on {payload[0].payload.count} insights
          </p>
        )}
      </div>
    );
  }
  return null;
};

/**
 * This is the platform-wide sentiment of the phone market to show
 * people's sentiment over phones over a period of time.
 */
export function MomentumChart({
  data,
  title = "Market Momentum",
  subtitle = "Community sentiment trajectory",
  badgeText = "Platform-Wide",
}: MomentumChartProps) {
  const { isDarkMode } = useDarkMode();
  const colors = darkModeColors;

  // ------------------------------------------------------------
  // | THEME DERIVATION
  // ------------------------------------------------------------
  const theme = useMemo(
    () => ({
      cardBg: isDarkMode ? colors.background.card.dark : colors.background.card.light,
      border: isDarkMode ? colors.border.default.dark : colors.border.default.light,
      textPrimary: isDarkMode ? colors.text.primary.dark : colors.text.primary.light,
      textMuted: isDarkMode ? colors.text.secondary.dark : colors.text.secondary.light,
      brand: isDarkMode ? colors.text.brand.dark : colors.text.brand.light,
      badgeBg: isDarkMode ? `${colors.text.brand.dark}1A` : "#f0f4ff", // 10% opacity blue
    }),
    [isDarkMode, colors],
  );

  // ------------------------------------------------------------
  // | UI SECTION
  // ------------------------------------------------------------
  return (
    <div
      className="h-[400px] w-full p-8 rounded-[2.5rem] border shadow-[0_20px_50px_rgba(0,0,0,0.02)] transition-all duration-500"
      style={{
        backgroundColor: theme.cardBg,
        borderColor: theme.border,
      }}
    >
      <div className="flex items-center justify-between mb-10">
        <div>
          <h3
            className="text-xs font-black uppercase tracking-[0.2em] mb-1 transition-colors duration-500"
            style={{ color: theme.brand }}
          >
            {title}
          </h3>
          <p className="text-[10px] font-medium" style={{ color: theme.textMuted }}>
            {subtitle}
          </p>
        </div>
        <span
          className="text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-tighter transition-all duration-500"
          style={{
            backgroundColor: theme.badgeBg,
            color: theme.brand,
            borderColor: isDarkMode ? `${theme.brand}33` : "#e0e7ff",
          }}
        >
          {badgeText}
        </span>
      </div>

      <ResponsiveContainer width="99%" aspect={3}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
          <defs>
            {/* Gradient Fill - Perfectly synced with dark mode brand blue */}
            <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={theme.brand} stopOpacity={0.15} />
              <stop offset="95%" stopColor={theme.brand} stopOpacity={0} />
            </linearGradient>

            {/* Neon Shadow Filter */}
            <filter id="shadow" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
              <feOffset in="blur" dx="0" dy="4" result="offsetBlur" />
              <feFlood floodColor={theme.brand} floodOpacity="0.3" result="offsetColor" />
              <feComposite in="offsetColor" in2="offsetBlur" operator="in" result="offsetBlur" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines synced with teammate's border color */}
          <CartesianGrid vertical={false} stroke={theme.border} strokeOpacity={0.4} strokeWidth={1} />

          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 800, fill: theme.textMuted }}
            dy={15}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[0, 5]}
            ticks={[0, 2.5, 5]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 800, fill: theme.textMuted }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: theme.brand, strokeWidth: 1, strokeDasharray: "4 4" }}
          />

          <Area
            type="monotone"
            dataKey="avgRating"
            stroke={theme.brand}
            strokeWidth={4}
            strokeLinecap="round"
            fillOpacity={1}
            fill="url(#colorRating)"
            filter="url(#shadow)"
            animationDuration={1500}
            activeDot={{
              r: 6,
              fill: theme.brand,
              stroke: theme.cardBg, // Ensures dot pops against background
              strokeWidth: 3,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
