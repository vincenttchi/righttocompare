import { useState } from "react";

// Icons
import {
  TrendingUp,
  TrendingDown,
  Info,
  Sparkles,
  RotateCcw,
  Search,
  MessageCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// UI Components
import { Button } from "../ui/button";

// Custom Components
import { SentimentSummary } from "../../types/sentimentTypes";
import { SentimentPill } from "./SentimentPill";
import { useDarkMode } from "../../context/DarkModeContext";

interface SentimentSummaryCardProp {
  data: SentimentSummary | null;
  isLoading?: boolean;
  sourceType?: string; // "reviews", "discussions", "posts"
  activeFilters?: string[];
  onPillClick?: (tag: string) => void;
  matchedCount?: number;
  isCollapsible?: boolean;
  defaultExpanded?: boolean;
}

/**
 * Text based on pros/cons list
 * @param pros
 * @param cons
 * @param sourceType
 * @returns
 */
const generateVerdict = (pros: string[], cons: string[], sourceType: string): string => {
  const proCount = pros.length;
  const conCount = cons.length;
  if (proCount === 0 && conCount === 0) return "";

  const topPro = pros[0] || "";
  const topCon = cons[0] || "";
  const proList = pros.slice(0, 3).join(", ");
  const conList = cons.slice(0, 3).join(", ");

  // --- Contextual Templates ---
  const templates: Record<string, any> = {
    community: {
      heavyPros: `The community is buzzing! People are loving the ${proList}, with almost no major complaints popping up yet.`,
      balanced: `The feed is a mixed bag today. While ${proList} are getting high praise, there's a lot of chatter regarding ${conList}.`,
      niche: `One major highlight today is the ${topPro}, though it's being overshadowed by growing concerns about ${conList}.`,
      heavyCons: `The current mood is skeptical. Most of the talk is centered on issues with ${conList}, despite some small wins for ${topPro || "features"}.`,
      default: `Everyone is currently weighing the ${proList} against ${conList}. The ${topPro} is the main topic of the hour.`,
    },
    discussions: {
      heavyPros: `Users in this thread are in broad agreement. Aside from a few mentions of ${topCon || "minor details"}, the ${proList} are the clear highlights.`,
      balanced: `This thread is split. You've got half the users praising the ${proList}, while the other half is pushing back on ${conList}.`,
      niche: `The debate here is highly specific. People are focused on ${topPro}, but they're warning that ${conList} might be dealbreakers.`,
      heavyCons: `The consensus here is largely critical. The discussion is dominated by frustrations over ${conList}, leaving little room for the ${topPro}.`,
      default: `This thread is still finding its footing, with users bouncing between the ${proList} and the ${conList}.`,
    },
    reviews: {
      heavyPros: `The verdict is overwhelmingly positive. The ${proList} make this device an absolute standout in its class.`,
      balanced: `It's a case of trade-offs. You're getting top-tier ${proList}, but you'll have to stomach shortcomings with the ${conList}.`,
      niche: `This is a niche pick. The ${topPro} is the main draw, but concerns over ${conList} prevent a blanket recommendation.`,
      heavyCons: `Proceed with caution. The feedback is dominated by concerns over ${conList}, making the value proposition hard to justify.`,
      default: `The word is in: users are navigating the balance between the ${proList} and the ${conList}.`,
    },
  };

  const t = templates[sourceType] || templates.reviews;

  if (proCount >= 3 && conCount <= 1) return t.heavyPros;
  if (proCount >= 2 && conCount >= 2) return t.balanced;
  if (proCount === 1 && conCount >= 2) return t.niche;
  if (conCount > proCount) return t.heavyCons;
  return t.default;
};

export function SentimentSummaryCard({
  data,
  isLoading,
  sourceType = "reviews",
  activeFilters = [],
  onPillClick,
  matchedCount = 0,
  isCollapsible = false,
  defaultExpanded = true,
}: SentimentSummaryCardProp) {
  const { isDarkMode } = useDarkMode();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const hasData =
    data && ((data.pros && data.pros.length > 0) || (data.cons && data.cons.length > 0) || activeFilters.length > 0);

  // Render guard if loading
  if (isLoading && !data) {
    return (
      <div
        className={`mb-8 p-6 rounded-2xl border animate-pulse ${
          isDarkMode ? "bg-[#161b22] border-[#2d3748]" : "bg-white border-gray-100 shadow-sm"
        }`}
      >
        <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          </div>
          <div className="space-y-3">
            <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }
  if (!hasData) return null;

  // Configuration for the card based on type (i.e. review/discussions)
  const cardConfig = {
    community: {
      title: "Community Buzz",
      icon: <TrendingUp size={14} />,
      analyzedAs: "discussions",
      verdictTitle: "Trending Opinion",
    },
    discussions: {
      title: "Thread Pulse",
      icon: <MessageCircle size={14} />,
      analyzedAs: "replies",
      verdictTitle: "Thread Consensus",
    },
    reviews: {
      title: "Expert Verdict",
      icon: <Sparkles size={14} />,
      analyzedAs: "reviews",
      verdictTitle: "The Verdict",
    },
  }[sourceType] || {
    title: "Sentiment Summary",
    icon: <Info size={14} />,
    analyzedAs: "items",
    verdictTitle: "Verdict",
  };

  const renderBoldVerdict = (text: string) => {
    if (!text) return null;

    // Combines all topics into one list
    const allTopics = [...proNames, ...conNames];
    if (allTopics.length === 0) return text;

    // Creates a regex pattern for bolding the phone feature names
    const pattern = new RegExp(`(${allTopics.join("|")})`, "gi");
    const parts = text.split(pattern);

    // Creating features bolded in HTML w/ CSS or just the text itself
    return parts.map((part, i) => {
      const isTopic = allTopics.includes(part.toLowerCase());
      return isTopic ? (
        <strong key={i} className={`font-extrabold ${isDarkMode ? "text-white" : "text-black"}`}>
          {part}
        </strong>
      ) : (
        part
      );
    });
  };

  // Render guard if loading
  if (isLoading) {
    return (
      <div
        className={`mb-8 p-6 rounded-2xl border animate-pulse ${
          isDarkMode ? "bg-[#161b26] border-[#2d3548]" : "bg-white border-gray-100 shadow-sm"
        }`}
      >
        <div className="h-4 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          </div>
          <div className="space-y-3">
            <div className="h-8 w-full bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  // Handles case if there is no analysis data
  if (!data || data.totalAnalyzed === 0) return null;
  // Handles undefined data
  const pros = data.pros || [];
  const cons = data.cons || [];

  // Handles filtering out chosen tags from choosable list
  const visiblePros = data.pros.filter((p) => {
    const currentTag = `+${p.topic}`.toLowerCase();
    // Check if this tag exists in activeFilters
    return !activeFilters.some((active) => active.toLowerCase() === currentTag);
  });

  const visibleCons = data.cons.filter((c) => {
    const currentTag = `-${c.topic}`.toLowerCase();
    return !activeFilters.some((active) => active.toLowerCase() === currentTag);
  });
  // Handles case if there is data to analyze for sentiment
  const proNames = pros.map((p) => p.topic.toLowerCase());
  const conNames = cons.map((c) => c.topic.toLowerCase());
  const rawVerdict = generateVerdict(proNames, conNames, sourceType);

  // Rendering UI
  return (
    <div
      className={`mb-8 rounded-2xl border transition-all duration-300 ${
        isDarkMode ? "bg-[#161b26] border-[#2d3548]" : "bg-white border-[#2c3968]/5 shadow-sm"
      } ${isCollapsible && !isExpanded ? "p-4" : "p-6"}`}
    >
      {/* --- 1. THE HEADER (ALWAYS VISIBLE) --- */}
      <div
        className={`flex items-center justify-between ${isCollapsible ? "cursor-pointer group" : ""}`}
        onClick={isCollapsible ? () => setIsExpanded(!isExpanded) : undefined}
      >
        <div className="flex flex-col">
          <h3
            className={`text-sm font-bold uppercase tracking-widest ${isDarkMode ? "text-[#4a7cf6]" : "text-[#2c3968]"}`}
          >
            {cardConfig.title}
          </h3>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium italic mt-1">
            <Info size={12} />
            Analyzed from {data.totalAnalyzed} {cardConfig.analyzedAs}
          </div>
        </div>

        {isCollapsible && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </Button>
        )}
      </div>

      {(isExpanded || !isCollapsible) && (
        <div className="mt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Active Filter Bar (hidden on discussion thread page) */}
          {sourceType !== "discussions" && (
            <div
              className={`flex items-center px-4 py-3 mb-6 rounded-xl transition-all duration-300 min-h-[58px] ${
                activeFilters.length > 0
                  ? isDarkMode
                    ? "bg-[#1a1f2e] border-dashed border-2 border-[#2d3548]"
                    : "bg-gray-50 border-dashed border-2 border-gray-200"
                  : "border-2 border-transparent bg-transparent"
              }`}
            >
              {activeFilters.length > 0 ? (
                <div className="flex flex-wrap items-center justify-between w-full gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase opacity-50">Filtered By:</span>
                    <div className="flex flex-wrap gap-2">
                      {activeFilters.map((tag) => (
                        <SentimentPill key={tag} tag={tag as any} isActive={true} onClick={onPillClick} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold py-1 px-2 rounded bg-[#2c3968]/10 text-[#2c3968] dark:bg-[#4a7cf6]/20 dark:text-[#4a7cf6]">
                      {matchedCount} Matches
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => activeFilters.forEach((f) => onPillClick?.(f))}
                      className="text-[10px] uppercase font-bold text-red-500"
                    >
                      <RotateCcw size={12} className="mr-1" /> Reset
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase opacity-20 tracking-widest">
                  <Search size={14} />
                  <span>Select sentiments below to filter</span>
                </div>
              )}
            </div>
          )}

          {/* Verdict */}
          {rawVerdict && (
            <div
              className={`p-5 rounded-xl border-l-4 ${
                isDarkMode
                  ? "bg-[#1a1f2e] border-[#4a7cf6] text-[#a0a8b8]"
                  : "bg-[#f0f4ff] border-[#2c3968] text-[#2c3968]"
              } ${sourceType !== "discussions" ? "mb-8" : ""}`} // Add margin only if grid follows
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={isDarkMode ? "text-[#4a7cf6]" : "text-[#2c3968]"}>{cardConfig.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                  {cardConfig.verdictTitle}
                </span>
              </div>
              <p className="text-sm leading-relaxed italic">"{renderBoldVerdict(rawVerdict)}"</p>
            </div>
          )}

          {/* Pros and Cons Pills (hidden on discussion thread page) */}
          {sourceType !== "discussions" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <TrendingUp size={16} />
                  <span className="text-xs font-bold uppercase">Community Loves</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {visiblePros.length > 0 ? (
                    visiblePros.map((p, idx) => (
                      <SentimentPill key={`pro-${idx}`} tag={`+${p.topic}`} count={p.count} onClick={onPillClick} />
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">No more pros to select.</p>
                  )}
                </div>
              </div>

              <div
                className={`space-y-4 pt-6 md:pt-0 md:pl-8 md:border-l ${isDarkMode ? "border-[#2d3548]" : "border-gray-100"}`}
              >
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                  <TrendingDown size={16} />
                  <span className="text-xs font-bold uppercase">Pain Points</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleCons.length > 0 ? (
                    visibleCons.map((c, idx) => (
                      <SentimentPill key={`con-${idx}`} tag={`-${c.topic}`} count={c.count} onClick={onPillClick} />
                    ))
                  ) : (
                    <p className="text-[10px] text-gray-400 italic">No more pain points to select.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
