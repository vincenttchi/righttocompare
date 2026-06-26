import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";

// Custom Components & API
import { DebouncedPhoneSearch } from "../../components/trends/DebouncedPhoneSearch";
import { MomentumChart } from "../../components/trends/MomentumChart";
import { BrandRadar } from "../../components/trends/BrandRadar";
import { SentimentTicker } from "../../components/trends/SentimentTicker";
import { VibeShiftSection } from "../../components/trends/VibeShiftSection";
import ComparisonCart from "../../components/comparison/ComparisonCart";
import { getGlobalTrends, getTickerData } from "../../api/trendsApi";
import { GlobalTrendsResponse, TickerData } from "../../types/trendTypes";
import { PhoneSummary } from "../../types/phoneTypes";
import { getPhoneSummaries } from "../../api/phoneApi";
import { useDarkMode } from "../../context/DarkModeContext";
import { darkModeColors } from "../../config/darkModeConfig";

interface TrendsPageProps {
  comparisonPhoneIds: string[];
  onCompare: (id: string) => void;
  onRemove: (id: string) => void;
  onViewDetails: (id: string) => void;
}

export default function TrendsPage({ comparisonPhoneIds, onCompare, onRemove, onViewDetails }: TrendsPageProps) {
  const navigate = useNavigate();
  const { isDarkMode } = useDarkMode();
  const colors = darkModeColors;

  // ------------------------------------------------------------
  // | HOOKS
  // ------------------------------------------------------------
  const [data, setData] = useState<GlobalTrendsResponse | null>(null);
  const [ticker, setTicker] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(12); // Default to 12 months
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>("");

  // --- COMPARISON CART STATES ---
  const [comparisonData, setComparisonData] = useState<PhoneSummary[]>([]);
  const [isCartMinimized, setIsCartMinimized] = useState(true);

  // ------------------------------------------------------------
  // | THEME DERIVATION
  // ------------------------------------------------------------
  const theme = useMemo(
    () => ({
      pageBg: isDarkMode ? colors.background.primary.dark : colors.background.primary.light,
      cardBg: isDarkMode ? colors.background.card.dark : colors.background.card.light,
      sectionBg: isDarkMode ? colors.background.primary.dark : "#ffffff",

      textPrimary: isDarkMode ? colors.text.primary.dark : colors.text.primary.light,
      textMuted: isDarkMode ? colors.text.secondary.dark : colors.text.secondary.light,
      brand: isDarkMode ? colors.text.brand.dark : colors.text.brand.light,

      borderMain: isDarkMode ? colors.border.default.dark : colors.border.default.light,
      borderSubtle: isDarkMode ? colors.border.subtle.dark : colors.border.subtle.light,
    }),
    [isDarkMode, colors],
  );

  // ------------------------------------------------------------
  // | DATA SYNCHRONIZATION
  // ------------------------------------------------------------

  // Memoize the phone selection handler
  const handlePhoneSelect = useCallback((id: string) => {
    setSelectedPhoneId(id);
  }, []); // Empty dependency array means this reference is static

  // Memoized search component for phone sentiment history section
  const MemoizedSearch = useMemo(
    () => <DebouncedPhoneSearch onSelect={(id) => setSelectedPhoneId(id)} />,
    [handlePhoneSelect],
  );
  // Derive the full phone objects for the cart
  const comparisonPhones = useMemo<PhoneSummary[]>(() => {
    return (comparisonPhoneIds || []).map((id) => {
      const cached = comparisonData.find((p) => p.id === id);
      if (cached) return cached;
      return { id, name: "Loading...", manufacturer: "", images: { main: "" }, price: "---" };
    });
  }, [comparisonPhoneIds, comparisonData]);
  /**
   * SYNC: Global Market Intelligence
   * Signal: timeRange change
   * Action: Fetches both the global momentum trajectory and the 30-day
   * sentiment ticker in parallel to initialize the dashboard.
   */
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const [trendsResult, tickerResult] = await Promise.all([getGlobalTrends(timeRange), getTickerData(30)]);

        setData(trendsResult);
        setTicker(tickerResult);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [timeRange]);

  /**
   * SYNC: Comparison Cart Metadata Cache
   * Signal: comparisonPhoneIds list changes
   * Action: Identifies phone IDs in the comparison cart that are missing
   * from the local metadata cache and fetches their summaries (names, images)
   * to ensure the UI remains populated.
   */
  useEffect(() => {
    const syncCart = async () => {
      // Find IDs that aren't in our local metadata cache yet
      const missingIds = (comparisonPhoneIds || []).filter((id) => !comparisonData.find((p) => p.id === id));

      if (missingIds.length === 0) return;

      try {
        const newItems = await getPhoneSummaries(missingIds);
        setComparisonData((prev) => {
          const combined = [...prev, ...newItems];
          // Ensure uniqueness by ID
          return Array.from(new Map(combined.map((item) => [item.id, item])).values());
        });
      } catch (error) {
        console.error("Failed to sync comparison cart:", error);
      }
    };
    syncCart();
  }, [comparisonPhoneIds]);
  // ------------------------------------------------------------
  // | RENDER GUARD PAGES
  // ------------------------------------------------------------
  if (loading && !data)
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: theme.pageBg }}>
        <div
          className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
          style={{ borderColor: theme.brand }}
        ></div>
      </div>
    );

  if (!data)
    return (
      <div className="p-20 text-center font-bold" style={{ color: theme.textPrimary }}>
        Failed to load market data.
      </div>
    );

  // ------------------------------------------------------------
  // | COMPONENT LOGIC
  // ------------------------------------------------------------
  const handleAddAndPop = (id: string) => {
    onCompare(id);
    setIsCartMinimized(false);
  };

  // ------------------------------------------------------------
  // | UI SECTION
  // ------------------------------------------------------------
  return (
    <div
      className="flex flex-col min-h-screen transition-colors duration-500"
      style={{ backgroundColor: theme.pageBg }}
    >
      <SentimentTicker items={ticker} />

      {/* GLOBAL MARKET TRENDS */}
      <div className="relative">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 blur-[120px] pointer-events-none opacity-20"
          style={{ backgroundColor: theme.brand }}
        />

        <div className="max-w-7xl mx-auto px-8 pt-16 pb-24 w-full">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-8 mt-4">
            <div className="space-y-2">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2"
                style={{ backgroundColor: `${theme.brand}1A`, color: theme.brand }}
              >
                <Activity size={12} /> Live Market Feed
              </div>
              <h1
                className="text-5xl font-black tracking-tighter uppercase italic"
                style={{ color: theme.textPrimary }}
              >
                Market <span style={{ color: theme.brand }}>Intelligence</span>
              </h1>
              <p className="font-medium max-w-md leading-tight" style={{ color: theme.textMuted }}>
                Real-time community sentiment and brand trajectory analysis.
              </p>
            </div>

            {/* TIME RANGE SELECTOR */}
            <div
              className="flex backdrop-blur-md p-1 rounded-2xl border shadow-xl gap-1 mb-4 mt-4"
              style={{
                backgroundColor: isDarkMode ? colors.background.card.dark : "#ffffffCC",
                borderColor: theme.borderMain,
              }}
            >
              {[3, 6, 12, 24].map((m) => (
                <button
                  key={m}
                  onClick={() => setTimeRange(m)}
                  className={`px-6 py-2.5 rounded-xl text-[12px] font-black transition-all duration-300 cursor-pointer ${
                    timeRange === m ? "shadow-lg scale-105" : "hover:opacity-70"
                  }`}
                  style={{
                    backgroundColor:
                      timeRange === m
                        ? isDarkMode
                          ? colors.background.elevated.dark
                          : colors.text.brand.light
                        : "transparent",
                    color: timeRange === m ? "#ffffff" : theme.textMuted,
                  }}
                >
                  {m === 24 ? "2Y" : `${m}M`}
                </button>
              ))}
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div
              className="lg:col-span-2 rounded-[2.5rem] p-2 border shadow-sm transition-all duration-500"
              style={{ backgroundColor: theme.cardBg, borderColor: theme.borderMain }}
            >
              <MomentumChart data={data.momentum} />
            </div>
            <div className="lg:col-span-1">
              <BrandRadar brands={data.brandRadar} />
            </div>
          </div>
        </div>
      </div>

      {/* DEVICE DEEP DIVE SECTION */}
      <section
        className="flex-1 border-t shadow-[0_-20px_40px_rgba(0,0,0,0.02)] transition-all duration-500"
        style={{ backgroundColor: theme.sectionBg, borderColor: theme.borderSubtle }}
      >
        <div className="max-w-7xl mx-auto px-8 py-24 mt-4 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 mb-16">
            <div className="max-w-xl">
              <h2
                className="text-3xl font-black tracking-tighter uppercase italic mb-4"
                style={{ color: theme.textPrimary }}
              >
                Device <span style={{ color: theme.textMuted }}>Deep Dive</span>
              </h2>
              <p className="text-sm font-medium leading-relaxed" style={{ color: theme.textMuted }}>
                Enter a specific model to extract granular sentiment shifts and feature mentions.
              </p>
            </div>
            <div className="w-full max-w-md">{MemoizedSearch}</div>
          </div>

          <div className="min-h-[600px] w-full relative">
            {selectedPhoneId ? (
              <VibeShiftSection
                phoneId={selectedPhoneId}
                comparisonPhoneIds={comparisonPhoneIds}
                onCompare={handleAddAndPop}
                onRemove={onRemove}
                onViewDetails={onViewDetails}
              />
            ) : (
              <div
                className="h-[500px] border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center group hover:border-opacity-100 transition-all duration-500"
                style={{
                  backgroundColor: isDarkMode ? `${colors.background.card.dark}80` : "#f8fafc",
                  borderColor: theme.borderMain,
                  color: theme.textMuted,
                }}
              >
                <div
                  className="p-6 rounded-[2rem] shadow-xl mb-6 group-hover:scale-110 transition-transform duration-500"
                  style={{ backgroundColor: theme.cardBg }}
                >
                  <div className="opacity-40" style={{ color: theme.brand }}>
                    <Activity size={40} />
                  </div>
                </div>
                <p className="text-xl font-black tracking-tight uppercase italic" style={{ color: theme.textPrimary }}>
                  Start Your Deep Dive
                </p>
                <p className="text-sm mt-2 font-medium opacity-60 max-w-xs text-center leading-relaxed italic">
                  Select a device above to view community feedback and trend data.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <ComparisonCart
        phones={comparisonPhones}
        onRemovePhone={onRemove}
        onCompare={() => navigate("/compare")}
        onClose={() => setIsCartMinimized(true)}
        isMinimized={isCartMinimized}
        onMinimizedChange={setIsCartMinimized}
      />
    </div>
  );
}
