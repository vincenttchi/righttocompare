import { useEffect, useMemo, useState } from "react";
import { Info, BarChart2, Activity, Plus, ArrowUpRight, Check } from "lucide-react";
import { useDarkMode } from "../../context/DarkModeContext";
import { darkModeColors } from "../../config/darkModeConfig";

// Custom Components & API
import { getPhoneVibeShift } from "../../api/trendsApi";
import { VibeShiftResponse } from "../../types/trendTypes";
import { MomentumChart } from "./MomentumChart";

interface VibeShiftProps {
  phoneId: string;
  comparisonPhoneIds: string[];
  onCompare: (id: string) => void;
  onRemove: (id: string) => void;
  onViewDetails: (id: string) => void;
}

export function VibeShiftSection({ phoneId, comparisonPhoneIds, onCompare, onRemove, onViewDetails }: VibeShiftProps) {
  const { isDarkMode } = useDarkMode();
  const colors = darkModeColors;

  // ------------------------------------------------------------
  // | HOOKS
  // ------------------------------------------------------------
  const [data, setData] = useState<VibeShiftResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState(12); // Default to 12 months

  // ------------------------------------------------------------
  // | THEME DERIVATION
  // ------------------------------------------------------------
  const theme = useMemo(
    () => ({
      cardBg: isDarkMode ? colors.background.card.dark : colors.background.card.light,
      elevatedBg: isDarkMode ? colors.background.elevated.dark : colors.background.elevated.light,

      borderMain: isDarkMode ? colors.border.default.dark : colors.border.default.light,
      borderSubtle: isDarkMode ? colors.border.subtle.dark : colors.border.subtle.light,

      textPrimary: isDarkMode ? colors.text.primary.dark : colors.text.primary.light,
      textMuted: isDarkMode ? colors.text.secondary.dark : colors.text.secondary.light,
      brand: isDarkMode ? colors.text.brand.dark : colors.text.brand.light,

      // Alpha-blended colors for Glassmorphism effects
      brandAlpha: `${isDarkMode ? colors.text.brand.dark : colors.text.brand.light}1A`, // 10% opacity
      brandBorderAlpha: `${isDarkMode ? colors.text.brand.dark : colors.text.brand.light}80`, // 50% opacity
    }),
    [isDarkMode, colors],
  );

  // ------------------------------------------------------------
  // | DATA SYNCHRONIZATION
  // ------------------------------------------------------------
  useEffect(() => {
    if (!phoneId) return;
    setLoading(true);

    // Pass the timeRange to the API call
    const days = timeRange === 12 ? 365 : timeRange === 24 ? 730 : timeRange * 30; // Converting months to days
    getPhoneVibeShift(phoneId, days)
      .then(setData)
      .finally(() => setLoading(false));
  }, [phoneId, timeRange]);

  // ------------------------------------------------------------
  // | RENDER GUARD PAGES
  // ------------------------------------------------------------
  if (!phoneId)
    return (
      <div
        className="h-[400px] border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-colors duration-500"
        style={{
          borderColor: theme.borderMain,
          color: theme.textMuted,
        }}
      >
        <BarChart2 size={48} className="mb-4 opacity-20" />
        <p className="font-medium italic text-sm">Select a device to analyze its vibe shift</p>
      </div>
    );

  const hasPros = data?.currentVibe.pros && data.currentVibe.pros.length > 0;
  const hasCons = data?.currentVibe.cons && data.currentVibe.cons.length > 0;
  const isMixed = !hasPros && !hasCons && (data?.currentVibe.totalAnalyzed || 0) > 5;
  const isAlreadyInCart = comparisonPhoneIds.includes(phoneId);

  // ------------------------------------------------------------
  // | UI SECTION
  // ------------------------------------------------------------
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* QUICK ACTION BAR */}
      <div
        className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b transition-colors duration-500"
        style={{ borderColor: theme.borderSubtle }}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl" style={{ backgroundColor: theme.brandAlpha, color: theme.brand }}>
            <BarChart2 size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest" style={{ color: theme.textPrimary }}>
              {phoneId.replace(/-/g, " ")}
            </h4>
            <p className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: theme.textMuted }}>
              Deep Dive Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onViewDetails(phoneId)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all duration-300 group active:scale-95 cursor-pointer"
            style={{
              borderColor: theme.borderMain,
              color: theme.textMuted,
            }}
          >
            Full Details{" "}
            <ArrowUpRight
              size={14}
              className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform"
            />
          </button>

          {isAlreadyInCart ? (
            <button
              onClick={() => onRemove(phoneId)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10 text-[11px] font-black uppercase tracking-widest text-emerald-500 transition-all duration-300 active:scale-95 cursor-pointer"
            >
              <Check size={14} strokeWidth={3} /> ALREADY IN COMPARE
            </button>
          ) : (
            <button
              onClick={() => onCompare(phoneId)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 cursor-pointer group shadow-sm hover:shadow-blue-500/10"
              style={{
                backgroundColor: theme.brandAlpha,
                borderColor: theme.brandBorderAlpha,
                color: theme.brand,
              }}
            >
              <Plus size={14} strokeWidth={3} className="group-hover:rotate-90 transition-transform" /> ADD TO COMPARE
            </button>
          )}
        </div>
      </div>

      {/* TIME RANGE PICKER */}
      <div className="flex justify-center">
        <div
          className="inline-flex p-1.5 rounded-2xl border shadow-inner gap-1 mt-4 transition-colors duration-500"
          style={{
            backgroundColor: theme.elevatedBg,
            borderColor: theme.borderMain,
          }}
        >
          {[3, 6, 12, 24].map((m) => (
            <button
              key={m}
              onClick={() => setTimeRange(m)}
              disabled={loading}
              className={`px-6 py-2 rounded-xl text-[11px] font-black transition-all duration-300 uppercase cursor-pointer tracking-tighter ${
                timeRange === m ? "shadow-sm scale-105" : "hover:opacity-80"
              }`}
              style={{
                backgroundColor: timeRange === m ? theme.cardBg : "transparent",
                color: timeRange === m ? theme.brand : theme.textMuted,
                border: timeRange === m ? `1px solid ${theme.borderMain}` : "1px solid transparent",
              }}
            >
              {m === 24 ? "2Y View" : `${m}M View`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 min-h-[450px]">
        {/* CHART COLUMN */}
        <div className="lg:col-span-2 relative">
          {!data && loading ? (
            <div
              className="w-full h-[400px] animate-pulse rounded-[2.5rem] border border-dashed flex items-center justify-center"
              style={{ borderColor: theme.borderMain }}
            >
              <Activity size={32} style={{ color: theme.borderMain }} />
            </div>
          ) : (
            <div className={`transition-opacity duration-500 ${loading ? "opacity-30" : "opacity-100"}`}>
              <MomentumChart
                data={data?.timeline.map((t) => ({ ...t, month: t.date })) || []}
                title="Community Vibe Over Time"
                subtitle="How user opinions have shifted"
                badgeText={`${timeRange}M Timeline`}
              />
            </div>
          )}
        </div>

        {/* PROS/CONS COLUMN */}
        <div className="relative">
          <div
            className="p-8 h-full rounded-[2.5rem] border shadow-[0_20px_50px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-all duration-500"
            style={{ backgroundColor: theme.cardBg, borderColor: theme.borderMain }}
          >
            <div className="h-full flex flex-col justify-between">
              <div>
                <div className="mb-10">
                  <h3
                    className="text-xs font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2"
                    style={{ color: theme.brand }}
                  >
                    <Info size={14} className="opacity-50" /> Current Vibe
                  </h3>
                  <p className="text-[10px] font-medium italic" style={{ color: theme.textMuted }}>
                    What people are saying right now
                  </p>
                </div>

                {isMixed ? (
                  <div className="py-12 px-6 text-center rounded-[2rem] border border-dashed border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-900/10">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2">
                      Mixed Reviews
                    </p>
                    <p className="text-xs text-amber-700/60 italic" style={{ color: theme.textMuted }}>
                      Opinions are currently split.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {/* STRENGTHS */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-8">
                        Top Strengths
                      </p>
                      <div className="space-y-3">
                        {hasPros &&
                          data?.currentVibe.pros.slice(0, 5).map((p) => (
                            <div key={p.topic} className="flex items-center justify-between group/item">
                              <span
                                className="text-[13px] font-black uppercase tracking-tighter group-hover/item:text-emerald-500 transition-colors"
                                style={{ color: theme.textPrimary }}
                              >
                                {p.topic}
                              </span>
                              <div
                                className="h-px flex-1 mx-4 opacity-10"
                                style={{ backgroundColor: theme.textMuted }}
                              />
                              <span className="text-[10px] font-bold" style={{ color: theme.textMuted }}>
                                {p.count} <span className="text-[8px] opacity-50">mentions</span>
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* COMPLAINTS */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] mt-8">
                        Common Complaints
                      </p>
                      <div className="space-y-3">
                        {hasCons &&
                          data?.currentVibe.cons.slice(0, 5).map((c) => (
                            <div key={c.topic} className="flex items-center justify-between group/item">
                              <span
                                className="text-[13px] font-black uppercase tracking-tighter group-hover/item:text-red-500 transition-colors"
                                style={{ color: theme.textPrimary }}
                              >
                                {c.topic}
                              </span>
                              <div
                                className="h-px flex-1 mx-4 opacity-10"
                                style={{ backgroundColor: theme.textMuted }}
                              />
                              <span className="text-[10px] font-bold" style={{ color: theme.textMuted }}>
                                {c.count} <span className="text-[8px] opacity-50">mentions</span>
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-12 pt-6 border-t flex flex-col gap-1" style={{ borderColor: theme.borderSubtle }}>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: theme.textMuted }}>
                  Based on {data?.currentVibe.totalAnalyzed || 0} community reviews
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
