import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import { toast } from "sonner@2.0.3";
import CarrierCompatibilityChecker from "../../components/catalog/CarrierCompatibilityChecker.tsx";

// UI Components
import { Card, CardContent, CardHeader } from "../../components/ui/card.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { Separator } from "../../components/ui/separator.tsx";
import { Checkbox } from "../../components/ui/checkbox.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Label } from "../../components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog.tsx";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination.tsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip.tsx";

// Icons & Charts
import {
  Smartphone,
  Camera,
  Cpu,
  Battery,
  ChevronDown,
  X,
  Monitor,
  Wifi,
  Mic,
  Radio,
  BarChart3,
  Palette,
  Heart,
  Bell,
  Plus,
  Check,
  HelpCircle,
  DollarSign,
  PenSquare,
  TrendingDown,
  TrendingUp,
  Search,
  BookOpen,
  Lightbulb,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// Custom Component & APIs
import { formatPrice } from "../../utils/formatter.ts";
import { PartialStar } from "../../components/common/PartialStar.tsx";
import RecentlyViewedPhones from "../../components/comparison/RecentlyViewedPhones.tsx";
import SpecTableOfContents from "../../components/catalog/SpecTableOfContents.tsx";
import ComparisonCart from "../../components/comparison/ComparisonCart.tsx";
import { specTooltips, specGlossary } from "../../data/specGlossary.ts";
import { CategoryRatings } from "../../components/common/MultiRatingInput.tsx";
import { SentimentSummaryCard } from "../../components/reviews/SentimentSummaryCard.tsx";
import { ReviewForm } from "../../components/reviews/ReviewForm.tsx";
import { ReviewCard } from "../../components/reviews/ReviewCard.tsx";
import { ReviewData } from "../../types/reviewTypes.ts";
import { getPhoneReviews, submitReview, voteOnReview, deleteReview } from "../../api/reviewApi.ts";
import { PhoneSummary, PhoneData } from "../../types/phoneTypes.ts";
import { getPhoneById, getPhoneSummaries } from "../../api/phoneApi.ts";
import BenchmarkDisplay from "../../components/catalog/BenchmarkDisplay.tsx";
import { updateUserProfile } from "../../api/userApi.ts";

// Category icons mapping - minimalistic uniform color scheme
const categoryConfig: Record<string, { icon: any }> = {
  display: { icon: Monitor },
  performance: { icon: Cpu },
  benchmarks: { icon: BarChart3 },
  camera: { icon: Camera },
  battery: { icon: Battery },
  design: { icon: Palette },
  connectivity: { icon: Wifi },
  audio: { icon: Mic },
  sensors: { icon: Radio },
};

// ------------------------------------------------------------
// | CONFIGURATIONS
// ------------------------------------------------------------
const REVIEW_FETCH_FILTER_DEBOUNCE_MS = 300;

const retailerLogoData: Record<string, string> = {
  Amazon:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <rect width="120" height="40" rx="10" fill="#111111"/>
      <text x="18" y="21" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#ffffff">amazon</text>
      <path d="M26 27c18 10 46 8 64-2" fill="none" stroke="#ff9900" stroke-width="3.2" stroke-linecap="round"/>
      <path d="M87 22l5 4-6 1" fill="none" stroke="#ff9900" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `),
  "Best Buy":
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <rect width="120" height="40" rx="10" fill="#0046be"/>
      <path d="M18 8h72l14 12-14 12H18z" fill="#ffde00"/>
      <circle cx="87" cy="20" r="2.2" fill="#0046be"/>
      <text x="30" y="18" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="#111111">BEST</text>
      <text x="30" y="29" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" fill="#111111">BUY</text>
    </svg>
  `),
  Walmart:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <rect width="120" height="40" rx="10" fill="#0071ce"/>
      <text x="14" y="24" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" fill="#ffffff">Walmart</text>
      <g transform="translate(95 20)" stroke="#ffc220" stroke-width="3" stroke-linecap="round">
        <path d="M0-8V-3"/><path d="M0 3V8"/><path d="M-8 0h5"/><path d="M3 0h5"/>
        <path d="M-5.5-5.5l3.5 3.5"/><path d="M2 2l3.5 3.5"/><path d="M-5.5 5.5l3.5-3.5"/><path d="M2-2l3.5-3.5"/>
      </g>
    </svg>
  `),
  Target:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="40" viewBox="0 0 120 40">
      <rect width="120" height="40" rx="10" fill="#ffffff"/>
      <circle cx="24" cy="20" r="11" fill="none" stroke="#cc0000" stroke-width="5"/>
      <circle cx="24" cy="20" r="4.5" fill="#cc0000"/>
      <text x="42" y="25" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" fill="#cc0000">Target</text>
    </svg>
  `),
};

const accessoryLabels = ["Case", "Screen Protector", "Charger", "Earbuds", "Power Bank"];

// Phone Spec Page interface
interface PhoneSpecPageProps {
  comparisonPhoneIds: string[];
  onComparisonChange: (phoneIds: string[]) => void;
  recentlyViewedPhones: string[];
  onAddToRecentlyViewed: (phoneId: string) => void;
  onNavigateToComparison: () => void;
  sessionSelectedSpecs: Record<string, string[]> | null;
  onSessionSelectedSpecsChange: React.Dispatch<React.SetStateAction<Record<string, string[]> | null>>;
  sessionStateHydrated: boolean;
}

interface PriceHistoryPoint {
  month: string;
  price: number;
  recordedAt: string;
}

interface PriceSummary {
  phoneId: string;
  currency: string;
  latestPrice: number | null;
  oldestPrice: number | null;
  changeAmount: number | null;
  changePercent: number | null;
  lowestPrice: number | null;
  lowestPriceMonth: string | null;
  latestRecordedAt: string | null;
}

const API_BASE_URL = "http://localhost:5001/api";

export default function PhoneSpecPage({
  comparisonPhoneIds,
  onComparisonChange,
  recentlyViewedPhones,
  onAddToRecentlyViewed,
  onNavigateToComparison,
  sessionSelectedSpecs,
  onSessionSelectedSpecsChange,
  sessionStateHydrated,
}: PhoneSpecPageProps) {
  // ------------------------------------------------------------
  // | HOOKS
  // ------------------------------------------------------------
  // Routing & User Authentication
  const { phoneId } = useParams<{ phoneId: string }>();
  const navigate = useNavigate();
  const { currentUser, updateCurrentUser } = useAuth();
  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const hasAddedToHistory = useRef<string | null>(null); // Tracking if a phone has already been added to recently viewed
  const isSyncingSessionFromLocalChange = useRef(false);

  // -- Phone Specification States --
  const [phoneData, setPhoneData] = useState<PhoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({});
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // -- UI Toggle States --
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [isKeySpecsOpen, setIsKeySpecsOpen] = useState(true);
  const [isFullSpecsOpen, setIsFullSpecsOpen] = useState(true);
  const [isCarrierCompatOpen, setIsCarrierCompatOpen] = useState(true);
  const [isReviewsOpen, setIsReviewsOpen] = useState(true);
  const [isPriceTrackingOpen, setIsPriceTrackingOpen] = useState(true);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isPriceAlertOpen, setIsPriceAlertOpen] = useState(false);
  const [isShopDialogOpen, setIsShopDialogOpen] = useState(false);
  const [priceAlertEmail, setPriceAlertEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState("");

  // -- Spec Tooltip Glossary States --
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const [glossarySearch, setGlossarySearch] = useState("");
  const [glossaryCategory, setGlossaryCategory] = useState<string>("all");

  // -- Review States --
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "helpful">("newest");
  const [activeSentiment, setActiveSentiment] = useState<string[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [priceSummary, setPriceSummary] = useState<PriceSummary | null>(null);
  const [isLoadingPriceData, setIsLoadingPriceData] = useState(false);

  // -- Comparison Cart States --
  const [comparisonData, setComparisonData] = useState<PhoneSummary[]>([]);
  const [showComparisonCart, setShowComparisonCart] = useState(false);
  const [isCartMinimized, setIsCartMinimized] = useState(false);

  // -- Derived States --
  // Spec Sheet category labels
  const categories = useMemo(() => {
    return phoneData ? Object.keys(phoneData.categories) : [];
  }, [phoneData]);

  const buildAllSpecsForPhone = useCallback((data: PhoneData) => {
    const allSpecs: Record<string, string[]> = {};
    Object.keys(data.categories).forEach((categoryName) => {
      const categoryData = data.categories[categoryName as keyof typeof data.categories];
      allSpecs[categoryName] = Object.keys(categoryData);
    });
    return allSpecs;
  }, []);

  const buildInitialSpecsForPhone = useCallback(
    (data: PhoneData, persistedSpecs: Record<string, string[]> | null) => {
      const allSpecs = buildAllSpecsForPhone(data);

      return Object.fromEntries(
        Object.entries(allSpecs).map(([category, availableSpecs]) => {
          if (persistedSpecs && Object.prototype.hasOwnProperty.call(persistedSpecs, category)) {
            const persistedCategorySpecs = persistedSpecs[category] || [];
            return [category, availableSpecs.filter((spec) => persistedCategorySpecs.includes(spec))];
          }

          const priorityScore =
            currentUser?.preferences.priorityFeatures[
              category as keyof typeof currentUser.preferences.priorityFeatures
            ];
          return [category, priorityScore != null && priorityScore < 3 ? [] : availableSpecs];
        }),
      );
    },
    [buildAllSpecsForPhone, currentUser],
  );

  // Comparison cart items to be fetched
  const comparisonPhones = useMemo<PhoneSummary[]>(() => {
    // Handles case of no phone IDs needed to compare
    if (!comparisonPhoneIds || !phoneData) return [];

    // Fetching phone data necessary for phones in comparison cart
    return comparisonPhoneIds.map((id) => {
      // If ID matches current phone on page just use current data
      if (id === phoneData?.id) {
        return {
          id: phoneData.id,
          name: phoneData.name,
          manufacturer: phoneData.manufacturer,
          images: { main: phoneData.images.main },
          price: phoneData.price,
        };
      }

      // Use fetched comparison data from local storage
      const cached = comparisonData.find((p) => p.id === id);
      if (cached) return cached;

      // Loading state for comparison cart item
      return {
        id,
        name: "Loading",
        manufacturer: "",
        images: { main: "" },
        price: "---",
      };
    });
  }, [comparisonPhoneIds, phoneData, comparisonData]);

  // ------------------------------------------------------------
  // | DATA SYNCHRONIZATION
  // ------------------------------------------------------------

  /**
   * SYNC: Phone Reviews
   * Signal: On function call
   * Action: Fetches reviews and review metadata from backend (i.e. total reviews, aggregate rating)
   */
  const fetchReviews = useCallback(async (targetPhoneId: string, page: number = 1, sort: any, filters: string[]) => {
    setIsLoadingReviews(true);
    try {
      const response = await getPhoneReviews(targetPhoneId, page, 3, { sortBy: sort, sentiments: filters });
      if (response) {
        setReviews(response.reviews);
        setFilteredTotal(response.totalReviews);
        setTotalPages(response.totalPages);

        // Syncing UI to update phone stats whenever phone reviews are fetched
        setPhoneData((prev) =>
          prev
            ? {
                ...prev,
                totalReviews: response.totalReviews,
                aggregateRating: response.aggregateRating,
                categoryAverages: response.categoryAverages,
                sentimentSummary: response.sentimentSummary || prev.sentimentSummary,
              }
            : null,
        );
      }
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
    } finally {
      setIsLoadingReviews(false);
    }
  }, []);

  /**
   * SYNC: Phone Review Page
   * Signal: phoneId, current page, sort style, sentiment filters changes or on
   * call of fetch reviews
   * Action: Fetches the review sentiment summary from backend on current phone
   */
  useEffect(() => {
    if (!phoneId || loading) return;

    // Creating timer until request is sent to backend
    const timer = setTimeout(() => {
      fetchReviews(phoneId, currentPage, sortBy, activeSentiment);
    }, REVIEW_FETCH_FILTER_DEBOUNCE_MS); // Change debounce timer at CONFIGURATION at top
    return () => clearTimeout(timer);
  }, [phoneId, currentPage, sortBy, activeSentiment, fetchReviews, loading]);

  /**
   * SYNC: Phone Specifications
   * Signal: phoneId change
   * Action: Fetches full phone specification data from the backend.
   */
  useEffect(() => {
    if (!sessionStateHydrated) return;
    const initPage = async () => {
      if (!phoneId) return; // Short circuit to no phone found

      setLoading(true);
      try {
        // Attempting to fetch phone from backend
        const data = await getPhoneById(phoneId);
        if (!data) throw new Error("Phone not found");
        setPhoneData(data);

        // Initializing labels for each category of phone spec
        setSelectedSpecs(buildInitialSpecsForPhone(data, sessionSelectedSpecs));

        // Adding fetched phone to recently viewed if it has not already been added
        if (onAddToRecentlyViewed && hasAddedToHistory.current !== phoneId) {
          onAddToRecentlyViewed(phoneId);
          hasAddedToHistory.current = phoneId; // Tracks if phone as already been added
        }
      } catch (error) {
        console.error("Error fetching phone:", error);
      } finally {
        setLoading(false);
      }
    };
    initPage();

    // Resets history on component unmount
    return () => {
      if (hasAddedToHistory.current !== phoneId) {
        hasAddedToHistory.current = null;
      }
    };
  }, [buildInitialSpecsForPhone, onAddToRecentlyViewed, phoneId, sessionStateHydrated]);

  useEffect(() => {
    if (!sessionStateHydrated) return;
    if (!phoneData) return;
    if (isSyncingSessionFromLocalChange.current) {
      isSyncingSessionFromLocalChange.current = false;
      return;
    }
    setSelectedSpecs(buildInitialSpecsForPhone(phoneData, sessionSelectedSpecs));
  }, [buildInitialSpecsForPhone, phoneData, sessionSelectedSpecs, sessionStateHydrated]);

  useEffect(() => {
    if (!phoneData || !currentUser) {
      setIsWishlisted(false);
      return;
    }

    setIsWishlisted(currentUser.wishlist.includes(phoneData.id));
  }, [phoneData, currentUser]);

  useEffect(() => {
    const fetchPriceTrackingData = async () => {
      if (!phoneId) return;

      setIsLoadingPriceData(true);

      try {
        const [historyResponse, summaryResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/phones/${phoneId}/price-history`),
          fetch(`${API_BASE_URL}/phones/${phoneId}/price-summary`),
        ]);

        if (!historyResponse.ok) {
          throw new Error("Failed to fetch price history");
        }

        if (!summaryResponse.ok) {
          throw new Error("Failed to fetch price summary");
        }

        const historyData = await historyResponse.json();
        const summaryData = await summaryResponse.json();

        setPriceHistory(Array.isArray(historyData) ? historyData : []);
        setPriceSummary(summaryData);
      } catch (error) {
        console.error("Failed to fetch price tracking data:", error);
        setPriceHistory([]);
        setPriceSummary(null);
      } finally {
        setIsLoadingPriceData(false);
      }
    };

    fetchPriceTrackingData();
  }, [phoneId]);

  useEffect(() => {
    if (!currentUser?.wishlist || !phoneData?.id) {
      setIsWishlisted(false);
      return;
    }

    setIsWishlisted(currentUser.wishlist.includes(phoneData.id));
  }, [currentUser, phoneData?.id]);

  /**
   * SYNC: Comparison Cart Metadata Cache
   * Signal: comparisonPhoneIds list or phoneId changes
   * Action: Fetches PhoneSummary data from backend for phones that are missing
   * from the local comparisonData cache/state and fetches their metadata in parallel.
   */
  useEffect(() => {
    const syncCart = async () => {
      // Finds phones that are not the current phone and does not already exist in comparison cart cache
      const missingIds = comparisonPhoneIds.filter((id) => id !== phoneId && !comparisonData.find((p) => p.id === id));

      // Handles case of no phones needed to search
      if (missingIds.length === 0) return;

      // Fetching missing phones from comparison cart
      try {
        const newItems = await getPhoneSummaries(missingIds);
        setComparisonData((prev) => {
          const combined = [...prev, ...newItems];
          return Array.from(new Map(combined.map((item) => [item.id, item])).values()); // Removes duplicates
        });
      } catch (error) {
        console.error("Failed to sync comparison cart:", error);
      }
    };
    syncCart();
  }, [comparisonPhoneIds, phoneId]);

  // ------------------------------------------------------------
  // | RENDER GUARD PAGES
  // ------------------------------------------------------------

  // Loading cases
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-[#2c3968] dark:text-[#4a7cf6]" size={48} />
        <p className="text-[#666] dark:text-[#a0a8b8]">Fetching phone details...</p>
      </div>
    );
  }

  // Failed phone fetch phases
  if (!phoneData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl mb-6">
          <X size={48} className="text-red-600 dark:text-red-500 mx-auto" />
        </div>
        <h2 className="text-[#2c3968] dark:text-white text-2xl font-bold mb-2">Phone Not Found</h2>
        <p className="text-[#666] dark:text-[#a0a8b8] mb-8 max-w-md">
          We couldn't retrieve the specifications for this device.
        </p>
        <Button
          onClick={() => navigate("/")}
          className="bg-[#2c3968] hover:bg-[#3d4b7a] text-white px-8 py-2 rounded-full cursor-pointer"
        >
          Return to Catalog
        </Button>
      </div>
    );
  }

  // ------------------------------------------------------------
  // | COMPONENT LOGIC
  // ------------------------------------------------------------

  // -- REVIEW SENTIMENT --
  // Handles filtering via sentiment pills
  const handleSentimentClick = (tag: string) => {
    setIsLoadingReviews(true);

    setActiveSentiment((prev) => {
      const isAlreadySelected = prev.includes(tag);
      const nextSentiments = isAlreadySelected ? prev.filter((t) => t !== tag) : [...prev, tag];

      // The useEffect watcher will see these changes and trigger fetchReviews
      setCurrentPage(1);
      return nextSentiments;
    });
  };

  // -- REVIEWS --
  const overallRating = phoneData.aggregateRating;
  const ratingsCount = phoneData.totalReviews;

  // Handle page change
  const handlePageChange = (page: number) => {
    // Just update the state; the watcher handles the rest
    setCurrentPage(page);

    // Scroll to top of reviews on page change
    reviewsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLeaveReviewClick = () => {
    // Ensure reviews section is expanded
    setIsReviewsOpen(true);
    // Show the review form
    setShowReviewForm(true);
    // Scroll to the reviews section after a brief delay to allow the section to expand
    setTimeout(() => {
      reviewsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const getRetailerUrl = (retailer: "Amazon" | "Best Buy" | "Walmart" | "Target") => {
    const encodedPhoneName = encodeURIComponent(phoneData.name);

    const retailerUrls = {
      Amazon: `https://www.amazon.com/s?k=${encodedPhoneName}`,
      "Best Buy": `https://www.bestbuy.com/site/searchpage.jsp?st=${encodedPhoneName}`,
      Walmart: `https://www.walmart.com/search?q=${encodedPhoneName}`,
      Target: `https://www.target.com/s?searchTerm=${encodedPhoneName}`,
    };

    return retailerUrls[retailer];
  };

  const openSearchWindow = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleBuyPhoneFromRetailer = (retailer: "Amazon" | "Best Buy" | "Walmart" | "Target") => {
    openSearchWindow(getRetailerUrl(retailer));
    toast.success(`Opening ${retailer}`, {
      description: `Searching ${retailer} for ${phoneData.name}`,
      duration: 3000,
    });
  };

  const handleBuyAccessory = (accessory: string) => {
    const accessoryUrl = `https://www.amazon.com/s?k=${encodeURIComponent(`${phoneData.name} ${accessory}`)}`;

    openSearchWindow(accessoryUrl);
    toast.success(`Opening ${accessory}`, {
      description: `Searching Amazon for ${phoneData.name} ${accessory}`,
      duration: 3000,
    });
  };

  // Handle voting on reviews via API
  const handleVoteOnReview = async (reviewId: string, voteType: "helpful" | "notHelpful") => {
    if (!currentUser?.firebaseUser) {
      toast.error("Please sign in to vote on reviews");
      return;
    }

    setIsVoting(true);
    try {
      const token = await currentUser.firebaseUser.getIdToken();
      const updatedReview = await voteOnReview(phoneData!.id, reviewId, voteType, token);
      if (updatedReview) {
        setReviews((prev) => prev.map((r) => (r._id === reviewId ? updatedReview : r)));

        // Fetches for reviews if a review was liked and the sort method is based on most helpful
        if (sortBy === "helpful") fetchReviews(phoneId!, currentPage, sortBy, activeSentiment);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to vote on review");
    } finally {
      setIsVoting(false);
    }
  };

  // Handle submitting a new review
  const handleSubmitReview = async (data: { title: string; review: string; categoryRatings: CategoryRatings }) => {
    if (!currentUser?.firebaseUser) {
      toast.error("Please sign in to submit a review");
      return;
    }

    setIsSubmittingReview(true);
    try {
      const token = await currentUser.firebaseUser.getIdToken();
      const result = await submitReview(phoneData!.id, data, token);

      if (result && result.review) {
        setPhoneData((prev) => (prev ? { ...prev, ...result.meta } : null));

        // Getting the newly added review from metadata
        const newReview = result.review;
        setReviews((prev) => [newReview, ...prev]);

        // Reset list to page 1 to show the new review
        setCurrentPage(1);
        setActiveSentiment([]); // Clear filters to ensure the new review is visible
        setShowReviewForm(false);
        toast.success("Review submitted successfully!");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle deleting a review
  const handleDeleteReview = async (reviewId: string) => {
    if (!currentUser?.firebaseUser) return;

    try {
      const token = await currentUser.firebaseUser.getIdToken();
      const result = await deleteReview(phoneData!.id, reviewId, token);

      if (result) {
        // Syncing phone stats and removing phone from local list
        setPhoneData((prev) => (prev ? { ...prev, ...result.meta } : null));
        setReviews((prev) => prev.filter((r) => r._id !== reviewId));
        toast.success("Review deleted successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to delete review");
    }
  };

  // -- PRICE HISTORY --
  const currentPrice =
    priceSummary?.latestPrice ?? parseFloat(String(phoneData.price).replace("$", "").replace(",", ""));

  const oldestPrice = priceSummary?.oldestPrice ?? null;
  const priceChange = priceSummary?.changeAmount ?? 0;
  const priceChangePercent =
    priceSummary?.changePercent !== null && priceSummary?.changePercent !== undefined
      ? priceSummary.changePercent.toFixed(1)
      : "0.0";

  const lowestPrice = priceSummary?.lowestPrice ?? null;
  const lowestPriceMonth = priceSummary?.lowestPriceMonth ?? "N/A";

  const latestRecordedAt = priceSummary?.latestRecordedAt
    ? new Date(priceSummary.latestRecordedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No price history yet";

  // Handle canceling the review form
  const handleCancelReview = () => {
    setShowReviewForm(false);
  };

  const toggleSpec = (category: string, specName: string) => {
    setSelectedSpecs((prev) => {
      const categorySpecs = prev[category] || [];
      const newCategorySpecs = categorySpecs.includes(specName)
        ? categorySpecs.filter((s) => s !== specName)
        : [...categorySpecs, specName];
      const nextSpecs = { ...prev, [category]: newCategorySpecs };
      isSyncingSessionFromLocalChange.current = true;
      onSessionSelectedSpecsChange(nextSpecs);
      return nextSpecs;
    });
  };

  const toggleCategoryOpen = (category: string) => {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const selectAllSpecs = () => {
    const allSpecs = buildAllSpecsForPhone(phoneData);
    isSyncingSessionFromLocalChange.current = true;
    onSessionSelectedSpecsChange(allSpecs);
    setSelectedSpecs(allSpecs);
  };

  const clearAllSpecs = () => {
    const emptySpecs: Record<string, string[]> = {};
    categories.forEach((category) => {
      emptySpecs[category] = [];
    });
    isSyncingSessionFromLocalChange.current = true;
    onSessionSelectedSpecsChange(emptySpecs);
    setSelectedSpecs(emptySpecs);
  };

  const isCategoryFullySelected = (category: string) => {
    const allSpecs = Object.keys(phoneData.categories[category as keyof typeof phoneData.categories]);
    const selected = selectedSpecs[category] || [];
    return allSpecs.length === selected.length && allSpecs.length > 0;
  };

  const isCategoryPartiallySelected = (category: string) => {
    const selected = selectedSpecs[category] || [];
    return selected.length > 0 && !isCategoryFullySelected(category);
  };

  const toggleAllCategorySpecs = (category: string) => {
    const allSpecs = Object.keys(phoneData.categories[category as keyof typeof phoneData.categories]);
    const isFullySelected = isCategoryFullySelected(category);
    setSelectedSpecs((prev) => {
      const nextSpecs = {
        ...prev,
        [category]: isFullySelected ? [] : allSpecs,
      };
      isSyncingSessionFromLocalChange.current = true;
      onSessionSelectedSpecsChange(nextSpecs);
      return nextSpecs;
    });
  };

  // -- WISHLIST --
  const handleWishlistToggle = async () => {
    if (!currentUser?.firebaseUser) {
      toast.error("Please sign in to update your wishlist");
      return;
    }

    const newWishlist = isWishlisted
      ? currentUser.wishlist.filter((id) => id !== phoneData.id)
      : [...currentUser.wishlist, phoneData.id];

    try {
      const token = await currentUser.firebaseUser.getIdToken();
      const updatedUser = await updateUserProfile(currentUser.uid, token, { wishlist: newWishlist });

      if (!updatedUser) {
        throw new Error("Failed to update wishlist");
      }

      updateCurrentUser({ wishlist: updatedUser.wishlist ?? newWishlist });
      setIsWishlisted(!isWishlisted);
      toast.success(`${phoneData.name} ${isWishlisted ? "removed from" : "added to"} wishlist!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update wishlist");
    }
  };

  // -- PRICE ALERT --
  const handleSetPriceAlert = () => {
    if (!priceAlertEmail || !targetPrice) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(priceAlertEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    // Validate price format
    const priceValue = parseFloat(targetPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    toast.success(`Price alert set! We'll notify you at ${priceAlertEmail} when the price drops to $${priceValue}`);
    setIsPriceAlertOpen(false);
    setPriceAlertEmail("");
    setTargetPrice("");
  };

  // -- COMPARISON CART --
  const handleAddToComparison = () => {
    // Handles phone data failed to load case
    if (!phoneData) return;

    // Checks if phone already in cart
    if (comparisonPhoneIds.includes(phoneData.id)) {
      toast.error("Already in comparison", {
        description: "This phone is already added to your cart",
        duration: 3000,
      });
      return;
    }

    // Check if cart is full
    if (comparisonPhoneIds.length >= 3) {
      toast.error("Comparison cart full", {
        description: "You can compare up to 3 phones at once",
        duration: 3000,
      });
      return;
    }

    // Adding current phone to comparison phones
    const updatedIds = [...comparisonPhoneIds, phoneData.id];
    onComparisonChange(updatedIds);

    // UI Feedback on comparison add
    setShowComparisonCart(true);
    if (onAddToRecentlyViewed) {
      onAddToRecentlyViewed(phoneData.id);
    }

    toast.success("Added to comparison", {
      description: `${phoneData.name} is ready to compare`,
      duration: 3000,
    });
  };

  const handleRemoveFromComparison = (phoneId: string) => {
    const updatedIds = comparisonPhoneIds.filter((id) => id !== phoneId);
    onComparisonChange(updatedIds);
    toast.success("Removed from comparison", {
      description: "Phone has been removed from your cart",
      duration: 2500,
    });
  };

  const handleCompare = () => {
    if (onNavigateToComparison) {
      onNavigateToComparison();
    } else {
      toast.success("Opening comparison", {
        description: `Comparing ${comparisonPhones.length} phones...`,
        duration: 2500,
      });
    }
  };

  const handleCloseComparisonCart = () => {
    // The cart will automatically hide when there are no phones/closing minimizes the cart
    setShowComparisonCart(false);
  };

  // Saves the user's carrier preference to their profile in the database
  const handleCarrierChange = async (carrier: string) => {
    // Save to localStorage so it works immediately
    localStorage.setItem("preferredCarrier", carrier);

    // Save to database for logged-in users
    if (!currentUser?.firebaseUser) return;
    try {
      const token = await currentUser.firebaseUser.getIdToken();
      await fetch(`http://localhost:5001/api/users/${currentUser.uid}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferredCarrier: carrier }),
      });
    } catch (err) {
      console.error("Failed to save carrier preference:", err);
    }
  };

  // ------------------------------------------------------------
  // | UI SECTION
  // ------------------------------------------------------------
  return (
    <>
      <SpecTableOfContents specCategories={categories} initialExpanded={false} />
      <div className="max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 py-8">
        {/* 1. Phone Image & Overview */}
        <div id="overview" className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-8 mb-8">
          <div className="text-center mb-8">
            <p className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">{phoneData.manufacturer}</p>
            <h1 className="dark:text-white mb-3">{phoneData.name}</h1>
            <div className="flex items-center justify-center gap-4">
              <Badge
                variant="secondary"
                className="bg-[#2c3968] dark:bg-[#4a7cf6] text-white hover:bg-[#2c3968]/90 dark:hover:bg-[#4a7cf6]/90"
              >
                {phoneData.releaseDate}
              </Badge>
              <span className="text-[#2c3968] dark:text-[#4a7cf6]">{formatPrice(phoneData.price)}</span>
            </div>
          </div>

          <div className="mb-8">
            {/* Wrapper for centered phone image with comparison button */}
            <div className="flex justify-center">
              <div className="relative inline-block">
                {/* Phone Image - Centered */}
                <div className="w-[700px]">
                  <img
                    src={phoneData.images.main}
                    alt={phoneData.name}
                    className="w-full h-auto"
                    loading="eager"
                    fetchpriority="high"
                  />
                </div>

                {/* Browse Phone Catalog Section - Dashed Rectangle - Positioned to the right */}
                <div
                  className="hidden xl:flex absolute top-1/2 -translate-y-1/2 left-full flex-col items-center justify-center border-2 border-dashed border-[#2c3968]/30 dark:border-[#4a7cf6]/30 bg-gradient-to-br from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 w-52 group/catalog hover:border-[#2c3968]/50 dark:hover:border-[#4a7cf6]/50 transition-all duration-300 min-h-[400px] z-10 cursor-pointer"
                  style={{ left: "calc(100% + 40px" }}
                  onClick={() => navigate("/")}
                >
                  {/* Decorative Corner Accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-4 border-l-4 border-[#2c3968] dark:border-[#4a7cf6] rounded-tl-sm"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-4 border-r-4 border-[#2c3968] dark:border-[#4a7cf6] rounded-tr-sm"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-4 border-l-4 border-[#2c3968] dark:border-[#4a7cf6] rounded-bl-sm"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-4 border-r-4 border-[#2c3968] dark:border-[#4a7cf6] rounded-br-sm"></div>

                  {/* Label */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                    <span className="text-xs text-[#2c3968]/70 dark:text-[#4a7cf6]/70 tracking-wide">CATALOG</span>
                  </div>

                  {/* Browse Button */}
                  <button
                    className="group relative bg-white dark:bg-[#161b26] border-2 border-[#2c3968] dark:border-[#4a7cf6] text-[#2c3968] dark:text-[#4a7cf6] rounded-xl px-6 py-4 shadow-lg hover:bg-[#2c3968] dark:hover:bg-[#4a7cf6] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
                    title="Browse Phone Catalog"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="relative">
                        <Smartphone className="w-7 h-7 transition-transform group-hover:scale-110 duration-300" />
                      </div>
                      <span className="text-xs uppercase tracking-wider">Browse</span>
                    </div>

                    {/* Pulse Animation on Hover */}
                    <div className="absolute inset-0 rounded-xl bg-[#2c3968] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>

                    {/* Tooltip on hover */}
                    <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      <div className="bg-[#1e1e1e] text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg">
                        Browse phone catalog
                        <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-[#1e1e1e]"></div>
                      </div>
                    </div>
                  </button>

                  {/* Bottom Label */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
                    <span className="text-[10px] text-[#2c3968]/50 dark:text-[#4a7cf6]/50 tracking-wide">
                      ALL PHONES
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Score */}
          <div className="flex justify-center">
            <div className="inline-block">
              <div className="flex items-center gap-3 justify-center">
                <div className="flex items-baseline">
                  <span className="text-[#2c3968] dark:text-[#4a7cf6]">{overallRating}</span>
                </div>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => {
                    const fillPercentage = Math.max(0, Math.min(1, overallRating - i));
                    return (
                      <PartialStar key={i} fillPercentage={fillPercentage} fillColor="#2c3968" strokeColor="#2c3968" />
                    );
                  })}
                </div>
                <span className="text-[#666] dark:text-[#a0a8b8]">
                  ({ratingsCount} {ratingsCount === 1 ? "Rating" : "Ratings"})
                </span>
              </div>
              <div className="text-center mt-2">
                <button
                  onClick={handleLeaveReviewClick}
                  className="text-[#2c3968] dark:text-[#4a7cf6] hover:underline cursor-pointer"
                >
                  Leave a Review
                </button>
              </div>

              {/* Action Buttons - Top Row */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-4 w-full sm:w-auto px-4 sm:px-0">
                <Button
                  variant="outline"
                  className={`border-2 cursor-pointer ${isWishlisted ? "bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white border-[#2c3968] dark:border-[#4a7cf6] hover:from-[#243059] hover:to-[#354368] dark:hover:from-[#3d6be5] dark:hover:to-[#4a7cf6] shadow-lg hover:shadow-xl" : "border-[#2c3968] dark:border-[#4a7cf6] text-[#2c3968] dark:text-[#4a7cf6] bg-white dark:bg-[#161b26] hover:bg-gradient-to-r hover:from-[#2c3968]/5 hover:to-[#2c3968]/10 dark:hover:from-[#4a7cf6]/5 dark:hover:to-[#4a7cf6]/10 shadow-md hover:shadow-lg"} w-full sm:w-auto transition-all duration-300 hover:scale-105 group`}
                  onClick={handleWishlistToggle}
                >
                  <Heart
                    className={`w-4 h-4 mr-2 transition-transform group-hover:scale-110 ${isWishlisted ? "fill-current" : ""}`}
                  />
                  <span className="hidden sm:inline">{isWishlisted ? "In Wishlist" : "Add to Wishlist"}</span>
                  <span className="sm:hidden">{isWishlisted ? "Wishlist" : "Wishlist"}</span>
                </Button>

                <Dialog open={isPriceAlertOpen} onOpenChange={setIsPriceAlertOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-2 border-[#2c3968] dark:border-[#4a7cf6] text-[#2c3968] dark:text-[#4a7cf6] bg-white dark:bg-[#161b26] hover:bg-gradient-to-r hover:from-[#2c3968]/5 hover:to-[#2c3968]/10 dark:hover:from-[#4a7cf6]/5 dark:hover:to-[#4a7cf6]/10 shadow-md hover:shadow-lg w-full sm:w-auto transition-all duration-300 hover:scale-105 group cursor-pointer"
                    >
                      <Bell className="w-4 h-4 mr-2 transition-transform group-hover:scale-110 group-hover:rotate-12" />
                      <span className="hidden sm:inline">Set Price Alert</span>
                      <span className="sm:hidden">Price Alert</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] dark:bg-[#161b26] dark:border-[#2d3548]">
                    <DialogHeader>
                      <DialogTitle className="text-[#2c3968] dark:text-[#4a7cf6]">Set Price Alert</DialogTitle>
                      <DialogDescription className="dark:text-[#a0a8b8]">
                        Get notified when the {phoneData.name} drops to your target price.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="dark:text-white">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          className="dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:placeholder:text-[#6b7280]"
                          value={priceAlertEmail}
                          onChange={(e) => setPriceAlertEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="targetPrice" className="dark:text-white">
                          Target Price (USD)
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666] dark:text-[#a0a8b8]">
                            $
                          </span>
                          <Input
                            id="targetPrice"
                            type="number"
                            placeholder="999"
                            className="pl-7 dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:placeholder:text-[#6b7280]"
                            value={targetPrice}
                            onChange={(e) => setTargetPrice(e.target.value)}
                          />
                        </div>
                        <p className="text-sm text-[#666] dark:text-[#a0a8b8]">Current price: {phoneData.price}</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        className="cursor-pointer"
                        variant="outline"
                        onClick={() => setIsPriceAlertOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="bg-[#2c3968] hover:bg-[#2c3968]/90 cursor-pointer"
                        onClick={handleSetPriceAlert}
                      >
                        Set Alert
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Add to Compare and Shop Actions */}
              <div className="flex flex-col items-center gap-3 mt-3 w-full px-4 sm:px-0">
                <Button
                  className={
                    comparisonPhones.some((phone) => phone.id === phoneData.id)
                      ? "bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700 shadow-lg w-full sm:w-auto transition-all duration-300 cursor-default cursor-pointer"
                      : "bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white hover:from-[#243059] hover:to-[#354368] dark:hover:from-[#3d6be5] dark:hover:to-[#4a7cf6] shadow-lg hover:shadow-xl w-full sm:w-auto transition-all duration-300 hover:scale-105 group cursor-pointer"
                  }
                  onClick={handleAddToComparison}
                  disabled={comparisonPhones.some((phone) => phone.id === phoneData.id)}
                >
                  {comparisonPhones.some((phone) => phone.id === phoneData.id) ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Already in Compare
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90" />
                      Add to Compare
                    </>
                  )}
                </Button>

                <Dialog open={isShopDialogOpen} onOpenChange={setIsShopDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="bg-white dark:bg-[#161b26] text-[#2c3968] dark:text-[#dbe7ff] border border-[#2c3968]/20 dark:border-[#4a7cf6]/30 hover:bg-[#f7f9fc] dark:hover:bg-[#1c2433] shadow-md w-full sm:w-auto"
                      variant="outline"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Shop Now
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-[min(92vw,48rem)] rounded-2xl border-[#2c3968]/15 p-5 sm:p-6">
                    <DialogHeader>
                      <DialogTitle className="text-[#2c3968]">Shop for {phoneData.name}</DialogTitle>
                      <DialogDescription>
                        Pick a retailer to shop for the phone, or jump straight to common accessories on Amazon.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 md:grid-cols-2">
                      <section className="rounded-2xl border border-[#2c3968]/10 bg-[#f7f9fc] p-4">
                        <div className="mb-4">
                          <h3 className="text-base font-semibold text-[#2c3968]">Buy the Phone</h3>
                          <p className="text-sm text-[#666]">Search this model at major retailers.</p>
                        </div>
                        <div className="flex flex-col gap-3">
                          {(["Amazon", "Best Buy", "Walmart", "Target"] as const).map((retailer) => (
                            <div
                              key={retailer}
                              className="rounded-xl border border-[#2c3968]/10 bg-white p-4 shadow-sm"
                            >
                              <div className="flex flex-col items-center gap-3">
                                <div className="flex min-h-14 items-center justify-center rounded-lg border border-[#e6ebf5] bg-white px-3 py-2">
                                  <img
                                    src={retailerLogoData[retailer]}
                                    alt={`${retailer} logo`}
                                    className="h-10 w-auto object-contain"
                                  />
                                </div>
                                <Button
                                  className="min-w-[150px] bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] text-white hover:from-[#243059] hover:to-[#354368]"
                                  onClick={() => handleBuyPhoneFromRetailer(retailer)}
                                >
                                  Shop Now
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section className="rounded-2xl border border-[#2c3968]/10 bg-white p-4">
                        <div className="mb-4">
                          <h3 className="text-base font-semibold text-[#2c3968]">Buy Accessories</h3>
                          <p className="text-sm text-[#666]">
                            Open Amazon searches for accessories that fit this phone.
                          </p>
                        </div>
                        <div className="flex flex-col gap-3">
                          {accessoryLabels.map((accessory) => (
                            <Button
                              key={accessory}
                              className="w-[180px] justify-center self-start bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] text-white hover:from-[#243059] hover:to-[#354368]"
                              onClick={() => handleBuyAccessory(accessory)}
                            >
                              {accessory}
                            </Button>
                          ))}
                        </div>
                      </section>
                    </div>
                    <DialogFooter className="mt-4 sm:justify-start">
                      <p className="text-xs text-[#666]">Each button opens one search in a new tab.</p>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Mobile Browse Phones Section - Shows below XL screens */}
              <div className="xl:hidden flex justify-center mt-6 px-4">
                <div
                  className="relative flex flex-col items-center justify-center border-2 border-dashed border-[#2c3968]/30 dark:border-[#4a7cf6]/30 bg-gradient-to-br from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 w-full max-w-md py-6 px-4 group/catalog hover:border-[#2c3968]/50 dark:hover:border-[#4a7cf6]/50 transition-all duration-300 rounded-lg cursor-pointer"
                  onClick={() => navigate("/")}
                >
                  {/* Decorative Corner Accents */}
                  <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-3 border-l-3 border-[#2c3968] dark:border-[#4a7cf6] rounded-tl-sm"></div>
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-3 border-r-3 border-[#2c3968] dark:border-[#4a7cf6] rounded-tr-sm"></div>
                  <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-3 border-l-3 border-[#2c3968] dark:border-[#4a7cf6] rounded-bl-sm"></div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-3 border-r-3 border-[#2c3968] dark:border-[#4a7cf6] rounded-br-sm"></div>

                  {/* Top Label */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs text-[#2c3968]/70 dark:text-[#4a7cf6]/70 tracking-wide">
                      BROWSE PHONE CATALOG
                    </span>
                  </div>

                  {/* Browse Button */}
                  <button
                    className="group relative bg-white dark:bg-[#161b26] border-2 border-[#2c3968] dark:border-[#4a7cf6] text-[#2c3968] dark:text-[#4a7cf6] rounded-xl px-8 py-3 shadow-lg hover:bg-[#2c3968] dark:hover:bg-[#4a7cf6] hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
                    title="Browse Phone Catalog"
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-6 h-6 transition-transform group-hover:scale-110 duration-300" />
                      <span className="text-sm uppercase tracking-wider">Browse Phones</span>
                    </div>

                    {/* Pulse Animation on Hover */}
                    <div className="absolute inset-0 rounded-xl bg-[#2c3968] opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Key Specifications */}
        <Collapsible open={isKeySpecsOpen} onOpenChange={setIsKeySpecsOpen}>
          <div id="key-specs" className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-8 mb-8">
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Key Specifications</h2>
                  <div className="h-1 w-20 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full"></div>
                </div>
                <CollapsibleTrigger className="ml-2">
                  <ChevronDown
                    className={`w-6 h-6 text-[#2c3968] dark:text-[#4a7cf6] transition-transform ${
                      isKeySpecsOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 xl:gap-5">
                {phoneData.quickSpecs.map((spec, idx) => (
                  <div
                    key={idx}
                    className="border border-[#e0e0e0] dark:border-[#2d3548] rounded-lg p-4 min-w-0 dark:bg-[#1a1f2e]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <spec.icon className="w-4 h-4 text-[#2c3968] dark:text-[#4a7cf6] flex-shrink-0" />
                      <p className="text-[#666] dark:text-[#a0a8b8] truncate flex-1">{spec.label}</p>
                      {specGlossary[spec.label] && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="w-4 h-4 rounded-full bg-[#f5f7fa] dark:bg-[#2d3548] hover:bg-[#2c3968]/10 flex items-center justify-center transition-colors flex-shrink-0"
                              >
                                <HelpCircle className="w-3 h-3 text-[#2c3968] dark:text-[#4a7cf6]" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="max-w-xs bg-white dark:bg-[#161b26] text-[#1e1e1e] dark:text-white border-2 border-[#2c3968]/20 dark:border-[#4a7cf6]/20 shadow-xl px-4 py-3 rounded-xl"
                              sideOffset={8}
                            >
                              <p className="text-sm font-medium text-[#2c3968] dark:text-[#4a7cf6] mb-1">
                                {spec.label}
                              </p>
                              <p className="text-sm leading-relaxed mb-2">{specGlossary[spec.label].definition}</p>
                              <div className="flex items-start gap-1.5 bg-[#fffbeb] dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg px-2.5 py-1.5">
                                <Lightbulb className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                  {specGlossary[spec.label].tip}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-[#1e1e1e] dark:text-white">{spec.value}</p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* 3. Price Tracking */}
        <Collapsible open={isPriceTrackingOpen} onOpenChange={setIsPriceTrackingOpen}>
          <div id="price-tracking" className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-8 mb-8">
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Price Tracking</h2>
                  <div className="h-1 w-20 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full"></div>
                </div>
                <CollapsibleTrigger className="ml-2">
                  <ChevronDown
                    className={`w-6 h-6 text-[#2c3968] dark:text-[#4a7cf6] transition-transform ${
                      isPriceTrackingOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent>
              <div className="space-y-6">
                {/* Current Price and Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] rounded-xl p-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <p className="text-sm opacity-90">Current Price</p>
                    </div>
                    <p className="text-3xl mb-1">{currentPrice ? `$${currentPrice.toLocaleString()}` : "No data"}</p>
                    <p className="text-xs opacity-75">As of {latestRecordedAt}</p>
                  </div>

                  <div
                    className={`border-2 ${priceChange < 0 ? "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20" : "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"} rounded-xl p-6`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {priceChange < 0 ? (
                        <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                      )}
                      <p className="text-sm text-[#666] dark:text-[#a0a8b8]">6-Month Change</p>
                    </div>
                    <p
                      className={`text-3xl mb-1 ${priceChange < 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                    >
                      {priceChange < 0 ? "-" : "+"}
                      {Math.abs(priceChange).toFixed(0)}
                    </p>
                    <p className="text-xs text-[#666] dark:text-[#a0a8b8]">
                      {priceChange < 0 ? "" : "+"}
                      {priceChangePercent}% from {oldestPrice ? `$${oldestPrice.toLocaleString()}` : "N/A"}
                    </p>
                  </div>

                  <div className="border-2 border-[#2c3968]/20 dark:border-[#4a7cf6]/30 bg-[#2c3968]/5 dark:bg-[#4a7cf6]/10 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-[#2c3968] dark:text-[#4a7cf6]" />
                      <p className="text-sm text-[#666] dark:text-[#a0a8b8]">Lowest Price</p>
                    </div>
                    <p className="text-3xl text-[#2c3968] dark:text-[#4a7cf6] mb-1">
                      {lowestPrice ? `$${lowestPrice.toLocaleString()}` : "No data"}
                    </p>
                    <p className="text-xs text-[#666] dark:text-[#a0a8b8]">In {lowestPriceMonth}</p>
                  </div>
                </div>

                {/* Price Chart */}
                <div className="border border-[#e0e0e0] dark:border-[#2d3548] rounded-xl p-6 dark:bg-[#1a1f2e]">
                  <h3 className="text-lg text-[#2c3968] dark:text-[#4a7cf6] mb-4">Price History (Last 6 Months)</h3>
                  {isLoadingPriceData ? (
                    <div className="h-[300px] flex items-center justify-center text-[#666] dark:text-[#a0a8b8]">
                      <Loader2 className="animate-spin mr-2" size={24} />
                      Loading price history...
                    </div>
                  ) : priceHistory.length === 0 ? (
                    <div className="h-[300px] flex items-center justify-center text-[#666] dark:text-[#a0a8b8] text-center">
                      No price history available yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={priceHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="month" stroke="#666" style={{ fontSize: "12px" }} />
                        <YAxis stroke="#666" style={{ fontSize: "12px" }} tickFormatter={(value) => `$${value}`} />
                        <RechartsTooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "2px solid #2c3968",
                            borderRadius: "8px",
                            padding: "8px 12px",
                          }}
                          formatter={(value: any) => [`$${value}`, "Price"]}
                          labelStyle={{ color: "#2c3968", fontWeight: "bold" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke="#2c3968"
                          strokeWidth={3}
                          dot={{ fill: "#2c3968", r: 5 }}
                          activeDot={{ r: 7, fill: "#2c3968" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  <p className="text-xs text-[#666] dark:text-[#a0a8b8] mt-4 text-center">
                    ?? Tip: Set a price alert above to get notified when the price drops to your target
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* 4. Specification Filter */}
        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <div id="filter-specs" className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-8 mb-8">
            <div className="flex items-start justify-between mb-6 gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div>
                  <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Filter Specifications</h2>
                  <div className="h-1 w-20 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full"></div>
                </div>
                <CollapsibleTrigger className="ml-2">
                  <ChevronDown
                    className={`w-6 h-6 text-[#2c3968] dark:text-[#4a7cf6] transition-transform ${
                      isFilterOpen ? "rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllSpecs}
                  className="text-[#2c3968] dark:text-[#4a7cf6] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-[#666] dark:text-[#a0a8b8]">|</span>
                <button
                  onClick={clearAllSpecs}
                  className="text-[#2c3968] dark:text-[#4a7cf6] hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>
            <CollapsibleContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => {
                  const specs = Object.keys(phoneData.categories[category as keyof typeof phoneData.categories]);
                  const categorySelectedSpecs = selectedSpecs[category] || [];
                  const config = categoryConfig[category] || { icon: Smartphone };
                  const CategoryIcon = config.icon;
                  const isFullySelected = isCategoryFullySelected(category);
                  const isPartiallySelected = isCategoryPartiallySelected(category);

                  return (
                    <Collapsible
                      key={category}
                      open={openCategories[category]}
                      onOpenChange={() => toggleCategoryOpen(category)}
                    >
                      <div className="group border border-[#e0e0e0] dark:border-[#2d3548] rounded-lg hover:border-[#2c3968]/20 dark:hover:border-[#4a7cf6]/20 transition-all duration-200 bg-white dark:bg-[#161b26] relative">
                        <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#f7f9fc] dark:hover:bg-[#1a1f2e] transition-colors duration-200">
                          <div className="flex items-center gap-3 flex-1">
                            {/* Category Icon - minimalistic */}
                            <div className="w-9 h-9 rounded-lg bg-[#f5f7fa] dark:bg-[#4a7cf6]/10 flex items-center justify-center">
                              <CategoryIcon className="w-4 h-4 text-[#2c3968] dark:text-[#4a7cf6]" />
                            </div>

                            <div className="flex-1">
                              <CollapsibleTrigger className="flex items-center gap-2 text-left w-full">
                                <span className="capitalize text-[#2c3968] dark:text-[#4a7cf6]">{category}</span>
                                {(isFullySelected || isPartiallySelected) && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs px-2 py-0.5 bg-[#2c3968]/10 dark:bg-[#4a7cf6]/20 text-[#2c3968] dark:text-[#4a7cf6] border border-[#2c3968]/20 dark:border-[#4a7cf6]/30 shadow-none"
                                  >
                                    {categorySelectedSpecs.length}/{specs.length}
                                  </Badge>
                                )}
                              </CollapsibleTrigger>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Checkbox */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAllCategorySpecs(category);
                              }}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={isFullySelected}
                                className={`h-5 w-5 rounded-md border-2 transition-all border-[#2c3968] data-[state=checked]:bg-[#2c3968] data-[state=checked]:text-white dark:border-[#4a7cf6] dark:bg-[#1a1f2e] dark:data-[state=checked]:bg-[#4a7cf6] ${isPartiallySelected ? "opacity-50" : ""}`}
                              />
                            </div>

                            <CollapsibleTrigger>
                              <ChevronDown
                                className={`w-5 h-5 transition-all duration-200 ${
                                  openCategories[category]
                                    ? "rotate-180 text-[#2c3968] dark:text-[#4a7cf6]"
                                    : "text-[#999] dark:text-[#6b7280]"
                                }`}
                              />
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="absolute top-full left-0 right-0 z-50 border border-[#e0e0e0] dark:border-[#2d3548] rounded-lg bg-white dark:bg-[#161b26] shadow-lg mt-1">
                            <div className="bg-[#fafbfc] dark:bg-[#1a1f2e] p-4 space-y-1 max-h-[300px] overflow-y-auto">
                              {specs.map((specName) => (
                                <div
                                  key={specName}
                                  className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-white dark:hover:bg-[#161b26] transition-colors duration-150"
                                >
                                  <Checkbox
                                    checked={categorySelectedSpecs.includes(specName)}
                                    onCheckedChange={() => toggleSpec(category, specName)}
                                    id={`${category}-${specName}`}
                                    className="h-4 w-4 rounded border-2 border-[#2c3968] data-[state=checked]:bg-[#2c3968] data-[state=checked]:text-white dark:border-[#4a7cf6] dark:bg-[#0d1117] dark:data-[state=checked]:bg-[#4a7cf6]"
                                  />
                                  <label
                                    htmlFor={`${category}-${specName}`}
                                    className="text-[#1e1e1e] dark:text-white cursor-pointer flex-1 flex items-center gap-1.5"
                                  >
                                    {specName}
                                    {specTooltips[specName] && (
                                      <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              className="w-4 h-4 rounded-full bg-[#f5f7fa] dark:bg-[#2d3548] hover:bg-[#2c3968]/10 dark:hover:bg-[#4a7cf6]/10 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                                              onClick={(e) => e.preventDefault()}
                                            >
                                              <HelpCircle className="w-3 h-3 text-[#2c3968] dark:text-[#4a7cf6]" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent
                                            side="right"
                                            className="max-w-sm bg-white dark:bg-[#161b26] text-[#1e1e1e] dark:text-white border-2 border-[#2c3968]/20 dark:border-[#4a7cf6]/20 shadow-xl px-4 py-3 rounded-xl"
                                            sideOffset={8}
                                          >
                                            <p className="text-sm leading-relaxed">{specTooltips[specName]}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )}
                                  </label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* 5. Full Specifications */}
        <Collapsible open={isFullSpecsOpen} onOpenChange={setIsFullSpecsOpen}>
          <Card id="full-specs" className="shadow-sm dark:bg-[#161b26] dark:border-[#2d3548]">
            <CardHeader>
              <div className="mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Full Specifications</h2>
                      <div className="h-1 w-20 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full"></div>
                    </div>
                    <CollapsibleTrigger className="ml-2">
                      <ChevronDown
                        className={`w-6 h-6 text-[#2c3968] dark:text-[#4a7cf6] transition-transform ${isFullSpecsOpen ? "rotate-180" : ""}`}
                      />
                    </CollapsibleTrigger>
                  </div>
                  {/* Glossary Modal Trigger */}
                  <Dialog
                    open={isGlossaryOpen}
                    onOpenChange={(open) => {
                      setIsGlossaryOpen(open);
                      if (!open) {
                        setGlossarySearch("");
                        setGlossaryCategory("all");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 border-[#2c3968]/30 dark:border-[#4a7cf6]/30 text-[#2c3968] dark:text-[#4a7cf6] hover:bg-[#2c3968] dark:hover:bg-[#4a7cf6] hover:text-white transition-colors cursor-pointer"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span className="hidden sm:inline">Spec Glossary</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0 gap-0 dark:bg-[#161b26] dark:border-[#2d3548]">
                      <DialogHeader className="p-6 pb-4 border-b border-[#e0e0e0] dark:border-[#2d3548] flex-shrink-0">
                        <DialogTitle className="text-[#2c3968] dark:text-[#4a7cf6] text-xl flex items-center gap-2">
                          <BookOpen className="w-5 h-5" />
                          Specification Glossary
                        </DialogTitle>
                        <DialogDescription className="text-[#666] dark:text-[#a0a8b8]">
                          Hover over any <HelpCircle className="w-3 h-3 inline text-[#2c3968] dark:text-[#4a7cf6]" />{" "}
                          icon on the page for quick definitions. Use this glossary to browse all{" "}
                          {Object.keys(specGlossary).length} terms with buying tips.
                        </DialogDescription>
                        {/* Search + Category Filter */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-3">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999] dark:text-[#6b7280]" />
                            <input
                              type="text"
                              placeholder="Search specifications..."
                              value={glossarySearch}
                              onChange={(e) => setGlossarySearch(e.target.value)}
                              className="w-full pl-9 pr-4 py-2 border border-[#e0e0e0] dark:border-[#2d3548] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2c3968]/30 dark:focus:ring-[#4a7cf6]/20 focus:border-[#2c3968] dark:focus:border-[#4a7cf6] dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280]"
                            />
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {["all", ...Array.from(new Set(Object.values(specGlossary).map((e) => e.category)))].map(
                              (cat) => (
                                <button
                                  key={cat}
                                  onClick={() => setGlossaryCategory(cat)}
                                  className={`px-3 py-1.5 rounded-lg text-xs capitalize font-medium transition-colors cursor-pointer ${
                                    glossaryCategory === cat
                                      ? "bg-[#2c3968] dark:bg-[#4a7cf6] text-white"
                                      : "bg-[#f5f7fa] dark:bg-[#1a1f2e] text-[#666] dark:text-[#a0a8b8] hover:bg-[#2c3968]/10 dark:hover:bg-[#4a7cf6]/10 hover:text-[#2c3968] dark:hover:text-[#4a7cf6]"
                                  }`}
                                >
                                  {cat === "all" ? "All" : cat}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      </DialogHeader>
                      {/* Scrollable entries */}
                      <div className="overflow-y-auto flex-1 p-6">
                        {(() => {
                          const filtered = Object.entries(specGlossary).filter(([name, entry]) => {
                            const matchesSearch =
                              !glossarySearch.trim() ||
                              name.toLowerCase().includes(glossarySearch.toLowerCase()) ||
                              entry.definition.toLowerCase().includes(glossarySearch.toLowerCase());
                            const matchesCategory = glossaryCategory === "all" || entry.category === glossaryCategory;
                            return matchesSearch && matchesCategory;
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="text-center py-12 text-[#666] dark:text-[#a0a8b8]">
                                <Search className="w-8 h-8 mx-auto mb-3 text-[#ccc] dark:text-[#6b7280]" />
                                <p>No matching terms found.</p>
                              </div>
                            );
                          }

                          // Group by category
                          const grouped: Record<string, [string, (typeof specGlossary)[string]][]> = {};
                          filtered.forEach(([name, entry]) => {
                            if (!grouped[entry.category]) grouped[entry.category] = [];
                            grouped[entry.category].push([name, entry]);
                          });

                          return (
                            <div className="space-y-8">
                              {Object.entries(grouped).map(([cat, entries]) => (
                                <div key={cat}>
                                  <h3 className="text-sm font-semibold text-[#2c3968] dark:text-[#4a7cf6] capitalize mb-3 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full" />
                                    {cat}
                                    <span className="text-xs text-[#999] dark:text-[#6b7280] font-normal">
                                      ({entries.length})
                                    </span>
                                  </h3>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {entries.map(([name, entry]) => (
                                      <div
                                        key={name}
                                        className="border border-[#e0e0e0] dark:border-[#2d3548] rounded-xl p-4 hover:border-[#2c3968]/30 dark:hover:border-[#4a7cf6]/30 hover:bg-[#f7f9fc] dark:hover:bg-[#1a1f2e] transition-all"
                                      >
                                        <p className="font-medium text-[#1e1e1e] dark:text-white mb-1.5">{name}</p>
                                        <p className="text-sm text-[#666] dark:text-[#a0a8b8] leading-relaxed mb-2">
                                          {entry.definition}
                                        </p>
                                        <div className="flex items-start gap-1.5 bg-[#fffbeb] dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg px-3 py-2">
                                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                            {entry.tip}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                {Object.values(selectedSpecs).every((specs) => specs.length === 0) ? (
                  <div className="text-center py-12">
                    <p className="text-[#666] dark:text-[#a0a8b8]">
                      No specifications selected. Please select at least one specification to view.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(phoneData.categories)
                      .filter(([category]) => {
                        const categorySelectedSpecs = selectedSpecs[category] || [];
                        return categorySelectedSpecs.length > 0;
                      })
                      .map(([category, specs], categoryIdx) => {
                        const categorySelectedSpecs = selectedSpecs[category] || [];
                        const filteredSpecs = Object.entries(specs).filter(([key]) =>
                          categorySelectedSpecs.includes(key),
                        );

                        if (filteredSpecs.length === 0) return null;

                        return (
                          <div key={category}>
                            {/* Category Header */}
                            <div
                              id={`spec-${category}`}
                              className="bg-gradient-to-r from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 dark:to-transparent border-l-4 border-[#2c3968] dark:border-[#4a7cf6] px-6 py-4 -mx-6 mb-6"
                            >
                              <h3 className="text-2xl text-[#2c3968] dark:text-[#4a7cf6] capitalize font-medium">
                                {category}
                              </h3>
                            </div>

                            {/* Specifications List */}
                            <div className="space-y-4">
                              {filteredSpecs.map(([key, value], idx) => (
                                <div key={idx}>
                                  <div className="grid md:grid-cols-3 gap-4 py-3">
                                    <div className="md:col-span-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-[#666] dark:text-[#a0a8b8]">{key}</p>
                                        {specGlossary[key] && (
                                          <TooltipProvider delayDuration={200}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <button
                                                  className="w-4 h-4 rounded-full bg-[#f5f7fa] dark:bg-[#2d3548] hover:bg-[#2c3968]/10 dark:hover:bg-[#4a7cf6]/10 flex items-center justify-center transition-colors duration-200 flex-shrink-0 cursor-pointer"
                                                  type="button"
                                                >
                                                  <HelpCircle className="w-3 h-3 text-[#2c3968] dark:text-[#4a7cf6]" />
                                                </button>
                                              </TooltipTrigger>
                                              <TooltipContent
                                                side="right"
                                                className="max-w-sm bg-white dark:bg-[#161b26] text-[#1e1e1e] dark:text-white border-2 border-[#2c3968]/20 dark:border-[#4a7cf6]/20 shadow-xl px-4 py-3 rounded-xl"
                                                sideOffset={8}
                                              >
                                                <p className="text-sm leading-relaxed mb-2">
                                                  {specGlossary[key].definition}
                                                </p>
                                                <div className="flex items-start gap-1.5 bg-[#fffbeb] dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-lg px-2.5 py-1.5 mt-2">
                                                  <Lightbulb className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                                                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                                                    {specGlossary[key].tip}
                                                  </p>
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </div>
                                    </div>
                                    <div className="md:col-span-2">
                                      <p className="text-[#1e1e1e] dark:text-white">{value}</p>
                                    </div>
                                  </div>
                                  {idx < filteredSpecs.length - 1 && (
                                    <Separator className="bg-[#e0e0e0] dark:bg-[#2d3548]" />
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Category Separator */}
                            {categoryIdx <
                              Object.entries(phoneData.categories).filter(([category]) => {
                                const categorySelectedSpecs = selectedSpecs[category] || [];
                                return categorySelectedSpecs.length > 0;
                              }).length -
                                1 && <div className="mt-8" />}
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* 5. Carrier Compatibility */}
        <Collapsible open={isCarrierCompatOpen} onOpenChange={setIsCarrierCompatOpen}>
          <div id="carrier-compat" className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-8 mb-8 mt-8">
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Carrier Compatibility</h2>
                  <div className="h-1 w-20 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full"></div>
                </div>
                <CollapsibleTrigger className="ml-2">
                  <ChevronDown
                    className={`w-6 h-6 text-[#2c3968] dark:text-[#4a7cf6] transition-transform ${isCarrierCompatOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent>
              <CarrierCompatibilityChecker
                carrierCompatibility={phoneData.carrierCompatibility}
                phoneName={phoneData.name}
                userCarrier={currentUser?.preferredCarrier || localStorage.getItem("preferredCarrier") || ""}
                onCarrierChange={handleCarrierChange}
                networkBands={
                  phoneData.categories?.connectivity
                    ? {
                        bands4G: String(phoneData.categories.connectivity["4G Bands"] || "")
                          .split(",")
                          .map((b: string) => b.trim())
                          .filter(Boolean),
                        bands5G: String(phoneData.categories.connectivity["5G Bands"] || "")
                          .split(",")
                          .map((b: string) => b.trim())
                          .filter(Boolean),
                      }
                    : undefined
                }
              />
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* 6. Performance Benchmarks */}
        <Collapsible open={true}>
          <div id="benchmarks" className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-8 mb-8 mt-8">
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Performance Benchmarks</h2>
                  <div className="h-1 w-20 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full"></div>
                </div>
              </div>
            </div>
            <BenchmarkDisplay benchmarks={phoneData.categories?.benchmarks || {}} phoneName={phoneData.name} />
          </div>
        </Collapsible>

        {/* 7. Reviews Section */}
        <Collapsible open={isReviewsOpen} onOpenChange={setIsReviewsOpen}>
          <div
            id="reviews"
            ref={reviewsSectionRef}
            className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-8 mb-8 mt-8"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">User Reviews</h2>
                  <div className="h-1 w-20 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full"></div>
                </div>
                <CollapsibleTrigger className="ml-2">
                  <ChevronDown
                    className={`w-6 h-6 text-[#2c3968] dark:text-[#4a7cf6] transition-transform ${isReviewsOpen ? "rotate-180" : ""}`}
                  />
                </CollapsibleTrigger>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                {/* Sorting Control */}
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="text-sm bg-transparent dark:text-white border-b-2 border-[#2c3968]/20 dark:border-[#4a7cf6]/20 focus:border-[#2c3968] dark:focus:border-[#4a7cf6] outline-none py-1 cursor-pointer transition-colors"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="helpful">Most Helpful</option>
                </select>

                {!showReviewForm && (
                  <Button
                    className="bg-gradient-to-r from-[#2c3968] to-[#3d4b7f] text-white dark:from-[#4a7cf6] dark:to-[#5b8df7] dark:text-white hover:from-[#243059] hover:to-[#354368] dark:hover:from-[#3d6be5] dark:hover:to-[#4a7cf6] shadow-md hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setShowReviewForm(true)}
                  >
                    <PenSquare className="w-4 h-4 mr-2" />
                    Write a Review
                  </Button>
                )}
              </div>
            </div>

            <CollapsibleContent>
              {/* Sentiment Summary (Pros/Cons + Filtering) */}
              <SentimentSummaryCard
                data={phoneData.sentimentSummary}
                isLoading={isLoadingReviews}
                activeFilters={activeSentiment}
                onPillClick={handleSentimentClick}
                isCollapsible={true}
                defaultExpanded={true}
                matchedCount={filteredTotal}
              />

              {/* Global Community Statistics */}
              <div className="mb-8 bg-gradient-to-br from-[#f7f9fc] to-white dark:from-[#1a1f2e] dark:to-[#161b26] border-2 border-[#2c3968]/10 dark:border-[#4a7cf6]/10 rounded-2xl p-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Overall Score */}
                  <div className="lg:col-span-1 flex flex-col items-center justify-center bg-white dark:bg-[#161b26] rounded-xl p-6 shadow-sm border border-[#2c3968]/10 dark:border-[#4a7cf6]/10">
                    <p className="text-sm text-[#666] dark:text-[#a0a8b8] mb-2 uppercase tracking-tighter font-bold opacity-60">
                      Overall Rating
                    </p>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-5xl text-[#2c3968] dark:text-[#4a7cf6] font-bold">{overallRating}</span>
                      <span className="text-xl text-[#666] dark:text-[#a0a8b8]">/5</span>
                    </div>
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => {
                        const fillPercentage = Math.max(0, Math.min(1, overallRating - i));
                        return (
                          <PartialStar
                            key={i}
                            fillPercentage={fillPercentage}
                            fillColor="#2c3968"
                            strokeColor="#2c3968"
                            size={24}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs text-[#666] dark:text-[#a0a8b8] text-center">
                      Based on <strong>{ratingsCount}</strong> community insights
                    </p>
                  </div>

                  {/* Direct mapping of Denormalized Category Averages */}
                  <div className="lg:col-span-2">
                    <p className="text-sm text-[#666] dark:text-[#a0a8b8] mb-4 uppercase tracking-tighter font-bold opacity-60">
                      Community Consensus
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { name: "Camera", key: "camera", icon: Camera },
                        { name: "Battery", key: "battery", icon: Battery },
                        { name: "Design", key: "design", icon: Palette },
                        { name: "Performance", key: "performance", icon: Cpu },
                        { name: "Value", key: "value", icon: DollarSign },
                      ].map((cat) => {
                        // Accessing data directly from phoneData without recalculating!
                        const avg = phoneData.categoryAverages?.[cat.key as keyof CategoryRatings] || 0;
                        return (
                          <div
                            key={cat.key}
                            className="bg-white dark:bg-[#161b26] rounded-lg p-4 border border-[#e0e0e0] dark:border-[#2d3548] hover:border-[#2c3968]/30 dark:hover:border-[#4a7cf6]/30 transition-colors shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <cat.icon className="w-4 h-4 text-[#2c3968] dark:text-[#4a7cf6]" />
                                <span className="text-sm font-medium">{cat.name}</span>
                              </div>
                              <span className="text-sm font-bold text-[#2c3968] dark:text-[#4a7cf6]">
                                {avg.toFixed(1)}
                              </span>
                            </div>
                            <div className="w-full bg-[#e0e0e0] dark:bg-[#2d3548] rounded-full h-2 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-[#2c3968] to-[#3d4b7f] dark:from-[#4a7cf6] dark:to-[#5b8df7] transition-all duration-700"
                                style={{ width: `${(avg / 5) * 100}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <div className="mb-6">
                  {!currentUser ? (
                    <div className="bg-[#f7f7f7] dark:bg-[#1a1f2e] border-2 border-[#2c3968] dark:border-[#4a7cf6] rounded-lg p-6 text-center">
                      <p className="text-[#666] dark:text-[#a0a8b8] mb-4">Please sign in to write a review</p>
                      <Button
                        className="bg-[#2c3968] text-white hover:bg-[#1e2547] dark:bg-[#4a7cf6] dark:text-white dark:hover:bg-[#5b8df7] shadow-md transition-all cursor-pointer"
                        onClick={() => navigate("/sign-in")}
                      >
                        Sign In
                      </Button>
                    </div>
                  ) : (
                    <ReviewForm
                      onSubmit={handleSubmitReview}
                      onCancel={handleCancelReview}
                      isSubmitting={isSubmittingReview}
                    />
                  )}
                </div>
              )}

              {/* Existing Reviews */}
              <div className="relative min-h-[400px]">
                {isLoadingReviews && (
                  <div className="absolute inset-0 flex flex-col items-center justify-start pt-20 z-10 pointer-events-none">
                    <div className="flex items-center gap-3 bg-white/90 dark:bg-[#161b26]/90 px-6 py-3 rounded-full shadow-xl border border-[#2c3968]/10 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                      <Loader2 className="animate-spin text-[#2c3968] dark:text-[#4a7cf6]" size={20} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#2c3968] dark:text-[#4a7cf6]">
                        Updating Results...
                      </span>
                    </div>
                  </div>
                )}

                {/* Dims old reviews while new ones are being loaded */}
                <div
                  className={`space-y-6 transition-all duration-500 ${
                    isLoadingReviews ? "opacity-25 grayscale-[30%] pointer-events-none scale-[0.99]" : "opacity-100"
                  }`}
                >
                  {reviews.length === 0 && !isLoadingReviews ? (
                    <div className="text-center py-20 bg-gray-50/50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                      <p className="text-sm font-medium text-gray-500 italic">
                        No reviews match your selected filters. Try clearing some sentiments!
                      </p>
                    </div>
                  ) : (
                    reviews.map((review) => (
                      <ReviewCard
                        key={review._id}
                        review={review}
                        currentUserId={currentUser?.uid}
                        onVote={handleVoteOnReview}
                        onDelete={handleDeleteReview}
                        isVoting={isVoting}
                      />
                    ))
                  )}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {[...Array(totalPages)].map((_, index) => {
                        const pageNumber = index + 1;

                        // Show first page, last page, current page, and pages around current page
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                onClick={() => handlePageChange(pageNumber)}
                                isActive={currentPage === pageNumber}
                                className="cursor-pointer"
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                          className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CollapsibleContent>
          </div>
        </Collapsible>
      </div>

      {/* Recently Viewed Phones */}
      <div id="recently-viewed" className="max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto">
        <RecentlyViewedPhones
          currentPhone={phoneData.id}
          onNavigate={(phoneId) => navigate(`/phones/${phoneId}`)}
          recentlyViewedPhones={recentlyViewedPhones}
        />
      </div>

      {/* Comparison Cart */}
      <ComparisonCart
        phones={comparisonPhones}
        onRemovePhone={handleRemoveFromComparison}
        onCompare={handleCompare}
        onClose={handleCloseComparisonCart}
        isMinimized={isCartMinimized}
        onMinimizedChange={setIsCartMinimized}
      />
    </>
  );
}
