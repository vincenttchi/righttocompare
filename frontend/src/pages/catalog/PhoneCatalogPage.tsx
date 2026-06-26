import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../context/AuthContext";

// UI Components
import { Badge } from "../../components/ui/badge";

// Icons
import { Search, Grid3x3, List, ChevronDown, Plus, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

// Custom Components & APIs
import { formatPrice } from "../../utils/formatter";
import { PhoneCard, PhoneSummary } from "../../types/phoneTypes";
import { getPhonePage, getHotPhonePage, getManufacturers, getPhoneSummaries } from "../../api/phoneApi";
import { getPopularComparisons } from "../../api/analyticsApi";
import { PopularComparison } from "../../types/analyticsTypes";
import ComparisonCart from "../../components/comparison/ComparisonCart";
import RecentlyViewedPhones from "../../components/comparison/RecentlyViewedPhones";
import { CatalogFilters } from "../../components/catalog/CatalogFilters";

interface PhoneCatalogPageProps {
  onNavigate: (phoneId: string) => void;
  comparisonPhoneIds?: string[];
  onComparisonChange?: (phoneIds: string[]) => void;
  onNavigateToComparison?: () => void;
  recentlyViewedPhones?: string[];
  sessionCatalogFilters: {
    selectedManufacturers: string[];
    minPrice: number;
    maxPrice: number;
    selectedRAM: number[];
    selectedStorage: number[];
  } | null;
  onSessionCatalogFiltersChange: React.Dispatch<
    React.SetStateAction<{
      selectedManufacturers: string[];
      minPrice: number;
      maxPrice: number;
      selectedRAM: number[];
      selectedStorage: number[];
    } | null>
  >;
  sessionStateHydrated: boolean;
}

// ------------------------------------------------------------
// | CONFIGURATION CONSTANTS
// ------------------------------------------------------------
const SEARCH_DELAY_LOADING_MS = 150; // The time until loading UI displays on search
const SEARCH_DEBOUNCE_MS = 300; // Time to wait after typing stops before sending search query to server
const CATALOG_DEFAULT_MIN_PRICE = 0;
const CATALOG_DEFAULT_MAX_PRICE = 2000;
const CATALOG_ALLOWED_RAM = [8, 12, 16, 24];
const CATALOG_ALLOWED_STORAGE = [128, 256, 512, 1024];

// ------------------------------------------------------------
// | PHONE CATALOG PAGE DEFINITION
// ------------------------------------------------------------
export default function PhoneCatalogPage({
  onNavigate,
  comparisonPhoneIds = [],
  onComparisonChange,
  onNavigateToComparison,
  recentlyViewedPhones = [],
  sessionCatalogFilters,
  onSessionCatalogFiltersChange,
  sessionStateHydrated,
}: PhoneCatalogPageProps) {
  // ------------------------------------------------------------
  // | HOOKS
  // ------------------------------------------------------------
  const { currentUser } = useAuth();
  // --- Phone Data States ---
  const [allPhones, setAllPhones] = useState<PhoneCard[]>([]);
  const [popularComparisons, setPopularComparisons] = useState<PopularComparison[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Pagination States ---
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const itemsPerPage = 24;
  const lastPageRef = useRef(currentPage);

  // --- Filter States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "name_desc" | "price" | "price_asc" | "release" | "oldest" | "rating">(
    "name",
  );
  const [availableManufacturers, setAvailableManufacturers] = useState<string[]>([]);
  const [selectedManufacturers, setSelectedManufacturers] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [selectedRAM, setSelectedRAM] = useState<number[]>([]);
  const [selectedStorage, setSelectedStorage] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // --- Comparison States ---
  const [isCartMinimized, setIsCartMinimized] = useState(false);
  const [comparisonData, setComparisonData] = useState<PhoneSummary[]>([]);

  // --- UI States ---
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"catalog" | "hot" | "popular">("catalog");
  const isSyncingSessionFromLocalChange = useRef(false);
  const hasInitializedCatalogFilters = useRef(false);

  const normalizedCatalogSessionFilters = useMemo(() => {
    const normalizedManufacturers = (sessionCatalogFilters?.selectedManufacturers || []).filter((brand) =>
      availableManufacturers.includes(brand),
    );
    const normalizedMinPrice = Math.max(
      CATALOG_DEFAULT_MIN_PRICE,
      sessionCatalogFilters?.minPrice ?? CATALOG_DEFAULT_MIN_PRICE,
    );
    const normalizedMaxPrice = Math.min(
      CATALOG_DEFAULT_MAX_PRICE,
      Math.max(normalizedMinPrice, sessionCatalogFilters?.maxPrice ?? CATALOG_DEFAULT_MAX_PRICE),
    );

    return {
      selectedManufacturers: normalizedManufacturers,
      minPrice: normalizedMinPrice,
      maxPrice: normalizedMaxPrice,
      selectedRAM: (sessionCatalogFilters?.selectedRAM || []).filter((value) => CATALOG_ALLOWED_RAM.includes(value)),
      selectedStorage: (sessionCatalogFilters?.selectedStorage || []).filter((value) =>
        CATALOG_ALLOWED_STORAGE.includes(value),
      ),
    };
  }, [availableManufacturers, sessionCatalogFilters]);

  const buildInitialCatalogFilters = useMemo(
    () => () => {
      if (sessionCatalogFilters) {
        return normalizedCatalogSessionFilters;
      }

      const preferredBrands = (currentUser?.preferences.preferredBrands || []).filter((brand) =>
        availableManufacturers.includes(brand),
      );
      const preferredBudgetMin = Math.max(
        CATALOG_DEFAULT_MIN_PRICE,
        currentUser?.preferences.budget.min ?? CATALOG_DEFAULT_MIN_PRICE,
      );
      const preferredBudgetMax = Math.min(
        CATALOG_DEFAULT_MAX_PRICE,
        Math.max(preferredBudgetMin, currentUser?.preferences.budget.max ?? CATALOG_DEFAULT_MAX_PRICE),
      );

      return {
        selectedManufacturers: preferredBrands,
        minPrice: preferredBudgetMin,
        maxPrice: preferredBudgetMax,
        selectedRAM: [],
        selectedStorage: [],
      };
    },
    [availableManufacturers, currentUser, normalizedCatalogSessionFilters, sessionCatalogFilters],
  );

  // ------------------------------------------------------------
  // | DATA SYNCHRONIZATION
  // ------------------------------------------------------------

  /**
   * INITIAL COMPONENT MOUNT/REFRESH:
   * Signal: On catalog page component mount or refresh
   * Action: Fetches for all unique manufacturers in the database
   */
  useEffect(() => {
    const loadManufacturers = async () => {
      try {
        setAvailableManufacturers(await getManufacturers());
      } catch (error) {
        console.error("Failed to load manufacturers");
      }
    };
    loadManufacturers();
  }, []);

  useEffect(() => {
    if (!sessionStateHydrated) return;
    if (availableManufacturers.length === 0) return;
    if (isSyncingSessionFromLocalChange.current) {
      isSyncingSessionFromLocalChange.current = false;
      return;
    }

    const initialFilters = buildInitialCatalogFilters();
    setSelectedManufacturers(initialFilters.selectedManufacturers);
    setMinPrice(initialFilters.minPrice);
    setMaxPrice(initialFilters.maxPrice);
    setSelectedRAM(initialFilters.selectedRAM);
    setSelectedStorage(initialFilters.selectedStorage);
    hasInitializedCatalogFilters.current = true;
  }, [availableManufacturers.length, buildInitialCatalogFilters, sessionStateHydrated]);

  /**
   * ON FILTER CHANGE CATALOG PAGE SYNC:
   * Signal: On search query, filter, sort, or active tab changes
   * Action: Resets current page to 1
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedManufacturers, sortBy, activeTab, maxPrice, minPrice, selectedRAM, selectedStorage]);

  /**
   * PHONE CATALOG PAGE SYNC:
   * Signal: Catalog page mount or when currentPage value changes
   * Action: Fetches the phone catalog of the current page and
   * pagination metadata for pagination system on home page
   */
  useEffect(() => {
    let loadingTimer: ReturnType<typeof setTimeout>;
    let debounceTimer: ReturnType<typeof setTimeout>;

    const fetchPhones = async () => {
      try {
        // Setting loading state only after certain duration has passed on backend fetching
        loadingTimer = setTimeout(() => setLoading(true), SEARCH_DELAY_LOADING_MS); // reduces UI flicker

        if (activeTab === "popular") {
          const comparisons = await getPopularComparisons(30, 100);
          const validComparisons = comparisons.filter((comparison) => comparison.phones.length >= 2);
          setPopularComparisons(validComparisons);
          setAllPhones([]);
          setTotalItems(comparisons.length);
          setTotalPages(0);
          setHasNextPage(false);
          setHasPrevPage(false);
          setError(null);
          return;
        }

        // Building options object to query DB for phones
        const options = {
          search: searchQuery,
          manufacturer: selectedManufacturers,
          sortBy:
            sortBy === "release"
              ? "newest"
              : sortBy === "oldest"
                ? "oldest"
                : sortBy === "price"
                  ? "price_desc"
                  : sortBy === "price_asc"
                    ? "price_asc"
                    : sortBy === "name_desc"
                      ? "name_desc"
                      : sortBy === "rating"
                        ? "rating_desc"
                        : "name_asc",
          minPrice: minPrice,
          maxPrice: maxPrice,
          ram: selectedRAM,
          storage: selectedStorage,
        };
        const { phones, pagination } =
          activeTab === "hot"
            ? await getHotPhonePage(currentPage, itemsPerPage, options)
            : await getPhonePage(currentPage, itemsPerPage, options);

        // Mounting phone card catalog page for use
        setAllPhones(phones);
        setPopularComparisons([]);

        // Setting all pagination metadata values
        setTotalItems(pagination.totalItems);
        setTotalPages(pagination.totalPages);
        setHasNextPage(pagination.hasNextPage);
        setHasPrevPage(pagination.hasPrevPage);
        setError(null);

        // Scrolls to top on page mount/refresh/new pagination page
        if (currentPage !== lastPageRef.current) {
          window.scrollTo({ top: 0, behavior: "smooth" });
          lastPageRef.current = currentPage; // Syncs the reference
        }
      } catch (error) {
        setError("Failed to fetch phones");
      } finally {
        clearTimeout(loadingTimer);
        setLoading(false);
      }
    };

    // Add debounce time to delay the search until user finish typing
    debounceTimer = setTimeout(fetchPhones, SEARCH_DEBOUNCE_MS);

    // Clearing timers for next
    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(loadingTimer);
    };
  }, [
    currentPage,
    searchQuery,
    selectedManufacturers,
    sortBy,
    activeTab,
    maxPrice,
    minPrice,
    selectedRAM,
    selectedStorage,
  ]);

  /**
   * SYNC: Comparison Cart Refreshes
   * Signal: Component mount or change in number of phones in comparisonPhoneIds list
   * Action: Fetches phone details if IDs exist but local cache is empty
   */
  useEffect(() => {
    const syncCart = async () => {
      // Checks syncing is needed by comparing phone IDs passed by controller with cached comparison phone data
      const missingIds = comparisonPhoneIds.filter((id) => !comparisonData.find((phone) => phone.id === id));

      // Handles case if no missing IDs in comparisonData cache
      if (missingIds.length === 0) return;

      // Handles case if syncing needed of missing phones from comparisonData cache
      try {
        // Handles re-fetching phone summaries that should be in comparison cart into the comparison data
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
  }, [comparisonPhoneIds.length]);

  // ------------------------------------------------------------
  // | HOME PAGE LOGIC
  // ------------------------------------------------------------

  // Helper function to clear all filters on catalog filter
  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedManufacturers([]);
    setMinPrice(CATALOG_DEFAULT_MIN_PRICE);
    setMaxPrice(CATALOG_DEFAULT_MAX_PRICE);
    setSelectedRAM([]);
    setSelectedStorage([]);
    setSortBy("name");
  };

  useEffect(() => {
    if (!sessionStateHydrated) return;
    if (!hasInitializedCatalogFilters.current) return;
    isSyncingSessionFromLocalChange.current = true;
    onSessionCatalogFiltersChange({
      selectedManufacturers,
      minPrice,
      maxPrice,
      selectedRAM,
      selectedStorage,
    });
  }, [
    maxPrice,
    minPrice,
    onSessionCatalogFiltersChange,
    selectedManufacturers,
    selectedRAM,
    selectedStorage,
    sessionStateHydrated,
  ]);

  const handleAddToComparison = (phoneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = allPhones.find((p) => p.id === phoneId);
    if (!phone) return;

    // Handles case if phone is already in comparison cart
    if (comparisonPhoneIds.includes(phoneId)) return;

    // Check if comparison cart is full (max 3 phones)
    if (comparisonPhoneIds.length >= 3) {
      toast.error("Comparison cart full", {
        description: "You can compare up to 3 phones at once. Remove a phone to add another.",
        duration: 3000,
      });
      return;
    }

    // Locally caching the phone data in the comparison cart into React state
    setComparisonData((prev) => [...prev, phone]);
    const newComparisonIds = [...comparisonPhoneIds, phoneId];
    onComparisonChange?.(newComparisonIds);

    toast.success("Added to comparison", {
      description: `${phone.name} is ready to compare`,
      duration: 3000,
    });
  };

  const isPhoneInComparison = (phoneId: string) => {
    return comparisonPhoneIds.includes(phoneId);
  };

  const handlePopularComparisonClick = (comparison: PopularComparison) => {
    const nextIds = comparison.phones.map((phone) => phone.id).slice(0, 3);
    if (nextIds.length < 2) {
      toast.error("Comparison unavailable", {
        description: "This comparison needs at least 2 phones to open.",
        duration: 3000,
      });
      return;
    }

    setComparisonData((prev) => {
      const combined = [...prev, ...comparison.phones];
      return Array.from(new Map(combined.map((item) => [item.id, item])).values());
    });
    onComparisonChange?.(nextIds);
    onNavigateToComparison?.();
  };

  const getHotSignalBadges = (phone: PhoneCard) => {
    if (activeTab !== "hot" || !phone.hotSignals) return null;

    const badges: React.ReactNode[] = [];

    if (phone.hotSignals.isNewRelease) {
      badges.push(
        <Badge key="new" variant="secondary" className="bg-[#ef4444] text-white hover:bg-[#ef4444]/90">
          New This Year
        </Badge>,
      );
    }

    if (phone.hotSignals.hasPriceDrop && phone.hotSignals.percentDrop != null) {
      badges.push(
        <Badge key="drop" variant="secondary" className="bg-[#10b981] text-white hover:bg-[#10b981]/90">
          {Math.round(phone.hotSignals.percentDrop)}% Off Launch
        </Badge>,
      );
    }

    return badges;
  };

  /**
   * Generates an array of page numbers for pagination UI
   *  The pattern is: [1, ..., current-1, current, current+1, ..., totalPages]
   * @returns An array containing numbers (or string - the "...") for page buttons
   */
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const pageRange = 2;

    // Iterates through all possible page values
    for (let i = 1; i <= totalPages; i++) {
      // Getting pages to show in pagination
      const isFirstPage = i === 1;
      const isLastPage = i === totalPages;

      // Getting the pages within window length of current page
      const isWithinWindow = i >= currentPage - pageRange && i <= currentPage + pageRange;

      // Determining which page number to push into list
      if (isFirstPage || isLastPage || isWithinWindow) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("..."); // Only pushes "..." if previous item is not "..." or the (first, last, current, or neighbors)
      }
    }
    return pages;
  };

  // ------------------------------------------------------------
  // | RENDER GUARDS
  // ------------------------------------------------------------
  // Handle loading and error views
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-[#2c3968] dark:text-[#4a7cf6]" size={48} />
        <p className="text-[#666] dark:text-[#a0a8b8]">Fetching live catalog...</p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // | UI SECTION
  // ------------------------------------------------------------
  return (
    <>
      <div className="max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Phone Catalog</h1>
          <p className="text-[#666] dark:text-[#a0a8b8] mb-6">Browse our collection of {totalItems} smartphones</p>

          {/* Tab Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setActiveTab("catalog")}
              className={`px-6 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === "catalog"
                  ? "bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-lg"
                  : "bg-white dark:bg-[#161b26] text-[#1e1e1e] dark:text-white border border-[#e5e5e5] dark:border-[#2d3548] hover:border-[#2c3968] dark:hover:border-[#4a7cf6]"
              }`}
            >
              Catalog
            </button>
            <button
              onClick={() => setActiveTab("hot")}
              className={`px-6 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === "hot"
                  ? "bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-lg"
                  : "bg-white dark:bg-[#161b26] text-[#1e1e1e] dark:text-white border border-[#e5e5e5] dark:border-[#2d3548] hover:border-[#2c3968] dark:hover:border-[#4a7cf6]"
              }`}
            >
              Hot
            </button>
            <button
              onClick={() => setActiveTab("popular")}
              className={`px-6 py-3 rounded-lg transition-all duration-200 cursor-pointer ${
                activeTab === "popular"
                  ? "bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-lg"
                  : "bg-white dark:bg-[#161b26] text-[#1e1e1e] dark:text-white border border-[#e5e5e5] dark:border-[#2d3548] hover:border-[#2c3968] dark:hover:border-[#4a7cf6]"
              }`}
            >
              Popular Compare
            </button>
          </div>
        </div>

        {/* Controls */}
        {activeTab !== "popular" && (
          <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 w-full lg:max-w-md">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999] dark:text-[#707070]"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search phones..."
                  maxLength={100}
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] dark:placeholder:text-[#707070] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                />
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                {/* Toggle Filters Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-4 py-3 rounded-lg border text-sm font-bold transition-all cursor-pointer ${
                    showFilters
                      ? "bg-[#2c3968] dark:bg-[#4a7cf6] text-white border-transparent shadow-md"
                      : "border-[#d9d9d9] dark:border-[#2d3548] text-[#2c3968] dark:text-[#4a7cf6] hover:bg-gray-50 dark:hover:bg-[#252b3d]"
                  }`}
                >
                  {showFilters ? "Hide Filters" : "Filters"}
                </button>

                {/* Sort By */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="appearance-none pl-4 pr-10 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] text-[#1e1e1e] dark:text-white focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all cursor-pointer"
                  >
                    <option value="name">Name: A → Z</option>
                    <option value="name_desc">Name: Z → A</option>
                    <option value="price_asc">Price: Low → High</option>
                    <option value="price">Price: High → Low</option>
                    <option value="release">Release: Newest</option>
                    <option value="oldest">Release: Oldest</option>
                    <option value="rating">Top Rated</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] dark:text-[#a0a8b8] pointer-events-none"
                    size={20}
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex gap-2 bg-[#f7f7f7] dark:bg-[#1a1f2e] rounded-lg p-1">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-md transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-white dark:bg-[#252b3d] text-[#2c3968] dark:text-[#4a7cf6] shadow-sm"
                        : "text-[#666] dark:text-[#a0a8b8] hover:text-[#2c3968] dark:hover:text-[#4a7cf6]"
                    }`}
                  >
                    <Grid3x3 size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-md transition-all cursor-pointer ${
                      viewMode === "list"
                        ? "bg-white dark:bg-[#252b3d] text-[#2c3968] dark:text-[#4a7cf6] shadow-sm"
                        : "text-[#666] dark:text-[#a0a8b8] hover:text-[#2c3968] dark:hover:text-[#4a7cf6]"
                    }`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters */}
            {(searchQuery ||
              selectedManufacturers.length > 0 ||
              selectedRAM.length > 0 ||
              selectedStorage.length > 0 ||
              maxPrice < 2000) && (
              <div className="mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#2d3548]">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-[12px] font-bold text-[#999] dark:text-[#707070] uppercase tracking-wider mr-2">
                    Active filters:
                  </span>

                  {/* Search Query Badge */}
                  {searchQuery && (
                    <span className="px-3 py-1 bg-[#2c3968]/10 dark:bg-[#4a7cf6]/10 text-[#2c3968] dark:text-[#4a7cf6] rounded-full text-xs font-medium">
                      "{searchQuery}"
                    </span>
                  )}

                  {/* Manufacturer Badges */}
                  {selectedManufacturers.length > 0 && (
                    <span className="px-3 py-1 bg-[#2c3968]/10 dark:bg-[#4a7cf6]/10 text-[#2c3968] dark:text-[#4a7cf6] rounded-full text-xs font-medium">
                      Brands: {selectedManufacturers.join(", ")}
                    </span>
                  )}

                  {/* RAM Badges */}
                  {selectedRAM.length > 0 && (
                    <span className="px-3 py-1 bg-[#2c3968]/10 dark:bg-[#4a7cf6]/10 text-[#2c3968] dark:text-[#4a7cf6] rounded-full text-xs font-medium">
                      RAM: {selectedRAM.map((r) => `${r}GB`).join(", ")}
                    </span>
                  )}

                  {/* Storage Badges */}
                  {selectedStorage.length > 0 && (
                    <span className="px-3 py-1 bg-[#2c3968]/10 dark:bg-[#4a7cf6]/10 text-[#2c3968] dark:text-[#4a7cf6] rounded-full text-xs font-medium">
                      Storage: {selectedStorage.map((s) => (s >= 1024 ? "1TB" : `${s}GB`)).join(", ")}
                    </span>
                  )}

                  {/* Price Badge */}
                  {(minPrice > 0 || maxPrice < 2000) && (
                    <span className="px-3 py-1 bg-[#2c3968]/10 dark:bg-[#4a7cf6]/10 text-[#2c3968] dark:text-[#4a7cf6] rounded-full text-xs font-medium tabular-nums">
                      Price: ${minPrice} - ${maxPrice}
                    </span>
                  )}

                  {/* The Global Reset */}
                  <button
                    onClick={handleClearAll}
                    className="ml-2 text-xs font-bold text-[#666] dark:text-[#a0a8b8] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] transition-colors underline underline-offset-4 cursor-pointer"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ADVANCED FILTER DRAWER */}
        {activeTab !== "popular" && showFilters && (
          <CatalogFilters
            availableManufacturers={availableManufacturers}
            selectedManufacturers={selectedManufacturers}
            setSelectedManufacturers={setSelectedManufacturers}
            minPrice={minPrice}
            setMinPrice={setMinPrice}
            maxPrice={maxPrice}
            setMaxPrice={setMaxPrice}
            selectedRAM={selectedRAM}
            setSelectedRAM={setSelectedRAM}
            selectedStorage={selectedStorage}
            setSelectedStorage={setSelectedStorage}
            onClearAll={handleClearAll}
          />
        )}

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-[#666] dark:text-[#a0a8b8]">
            {activeTab === "popular"
              ? `Showing ${popularComparisons.length} popular ${popularComparisons.length === 1 ? "comparison" : "comparisons"}`
              : `Showing ${allPhones.length} ${allPhones.length === 1 ? "phone" : "phones"}`}
          </p>
        </div>

        {/* Phone Grid/List */}
        {activeTab === "popular" ? (
          popularComparisons.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {popularComparisons.map((comparison, index) => (
                <button
                  key={`${comparison.phones.map((phone) => phone.id).join("-")}-${index}`}
                  onClick={() => handlePopularComparisonClick(comparison)}
                  className="w-full bg-white dark:bg-[#161b26] rounded-2xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6 text-left hover:shadow-lg hover:scale-[1.01] transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[#999] dark:text-[#707070] text-sm uppercase tracking-wide">Popular Compare</p>
                      <h3 className="text-[#1e1e1e] dark:text-white">Compare {comparison.phones.length} phones</h3>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-[#2c3968] dark:bg-[#4a7cf6] text-white hover:bg-[#2c3968]/90 dark:hover:bg-[#4a7cf6]/90"
                    >
                      Open Comparison
                    </Badge>
                  </div>

                  <div className="flex items-stretch gap-3 flex-wrap">
                    {comparison.phones.map((phone) => (
                      <div
                        key={phone.id}
                        className="flex-1 min-w-[160px] bg-[#f7f7f7] dark:bg-[#1a1f2e] rounded-xl border border-[#e5e5e5] dark:border-[#2d3548] p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                            <img src={phone.images.main} alt={phone.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#999] dark:text-[#707070] text-xs truncate">{phone.manufacturer}</p>
                            <p className="text-[#1e1e1e] dark:text-white text-sm leading-snug line-clamp-2">
                              {phone.name}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-20 h-20 bg-[#f7f7f7] dark:bg-[#1a1f2e] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="text-[#999] dark:text-[#707070]" size={32} />
                </div>
                <h3 className="text-[#1e1e1e] dark:text-white mb-2">No popular comparisons yet</h3>
                <p className="text-[#666] dark:text-[#a0a8b8]">
                  Once users compare phones, the most viewed combinations will appear here.
                </p>
              </div>
            </div>
          )
        ) : allPhones.length > 0 ? (
          viewMode === "grid" ? (
            // GRID VIEW
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allPhones.map((phone, index) => (
                <div
                  key={phone.id}
                  onClick={() => onNavigate(phone.id)}
                  className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-200 text-left group cursor-pointer"
                >
                  {/* Phone Image */}
                  <div className="aspect-square bg-gradient-to-br from-[#f7f7f7] to-[#e5e5e5] dark:from-[#1a1f2e] dark:to-[#252b3d] flex items-center justify-center p-8">
                    <img
                      src={phone.images.main}
                      alt={phone.name}
                      loading={index < 4 ? "eager" : "lazy"}
                      fetchpriority={index < 4 ? "high" : "low"}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  {/* Phone Info */}
                  <div className="p-5">
                    <div className="mb-3">
                      <p className="text-[#999] dark:text-[#707070] mb-1">{phone.manufacturer}</p>
                      <h3 className="text-[#1e1e1e] dark:text-white mb-2">{phone.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="secondary"
                          className="bg-[#2c3968] dark:bg-[#4a7cf6] text-white hover:bg-[#2c3968]/90 dark:hover:bg-[#4a7cf6]/90"
                        >
                          {phone.releaseDate}
                        </Badge>
                        {getHotSignalBadges(phone)}
                      </div>
                      <p className="text-[#2c3968] dark:text-[#4a7cf6]">{formatPrice(phone.price)}</p>
                      {activeTab === "hot" && phone.hotSignals?.hasPriceDrop && (
                        <p className="text-[13px] text-[#10b981] dark:text-[#34d399]">
                          Launch price ${phone.hotSignals.originalPrice?.toLocaleString()} to current $
                          {phone.hotSignals.latestPrice?.toLocaleString()}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      {phone.quickSpecs.slice(0, 3).map((spec, index) => (
                        <div key={index} className="flex items-center gap-2 text-[#666] dark:text-[#a0a8b8]">
                          <spec.icon size={16} className="shrink-0" />
                          <span className="text-[14px] truncate">{spec.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-[#e5e5e5] dark:border-[#2d3548]">
                      {isPhoneInComparison(phone.id) ? (
                        <div className="flex items-center justify-center gap-2 text-[#10b981] dark:text-[#34d399]">
                          <Check size={16} />
                          <span className="text-[14px]">Already in Compare</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleAddToComparison(phone.id, e)}
                          className="w-full py-2 px-3 bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group/btn hover:scale-105 cursor-pointer"
                        >
                          <Plus size={16} className="transition-transform group-hover/btn:rotate-90" />
                          <span className="text-[14px]">Add to Compare</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // LIST VIEW
            <div className="space-y-4">
              {allPhones.map((phone, index) => (
                <div
                  key={phone.id}
                  onClick={() => onNavigate(phone.id)}
                  className="w-full bg-white dark:bg-[#161b26] rounded-2xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-6 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 text-left group cursor-pointer"
                >
                  <div className="flex gap-6 items-center">
                    {/* Phone Image */}
                    <div className="w-32 h-32 bg-gradient-to-br from-[#f7f7f7] to-[#e5e5e5] dark:from-[#1a1f2e] dark:to-[#252b3d] rounded-xl flex items-center justify-center p-4 shrink-0">
                      <img
                        src={phone.images.main}
                        alt={phone.name}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>

                    {/* Phone Info */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-3">
                        <p className="text-[#999] dark:text-[#707070] mb-1">{phone.manufacturer}</p>
                        <h3 className="text-[#1e1e1e] dark:text-white mb-2">{phone.name}</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            variant="secondary"
                            className="bg-[#2c3968] dark:bg-[#4a7cf6] text-white hover:bg-[#2c3968]/90 dark:hover:bg-[#4a7cf6]/90"
                          >
                            {phone.releaseDate}
                          </Badge>
                          {getHotSignalBadges(phone)}
                        </div>
                        <p className="text-[#2c3968] dark:text-[#4a7cf6]">{formatPrice(phone.price)}</p>
                        {activeTab === "hot" && phone.hotSignals?.hasPriceDrop && (
                          <p className="text-[13px] text-[#10b981] dark:text-[#34d399]">
                            Launch price ${phone.hotSignals.originalPrice?.toLocaleString()} to current $
                            {phone.hotSignals.latestPrice?.toLocaleString()}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {phone.quickSpecs.map((spec, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <spec.icon size={16} className="shrink-0 mt-0.5 text-[#666] dark:text-[#a0a8b8]" />
                            <div className="min-w-0">
                              <p className="text-[#999] dark:text-[#707070] text-[12px]">{spec.label}</p>
                              <p className="text-[#1e1e1e] dark:text-white text-[14px] truncate">{spec.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* View Button */}
                    <div className="hidden lg:block shrink-0">
                      {isPhoneInComparison(phone.id) ? (
                        <div className="flex items-center gap-2 px-6 py-3 bg-[#10b981]/10 dark:bg-[#34d399]/10 text-[#10b981] dark:text-[#34d399] rounded-lg border border-[#10b981]/20 dark:border-[#34d399]/20">
                          <Check size={18} />
                          <span className="text-[14px] whitespace-nowrap">Already in Compare</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleAddToComparison(phone.id, e)}
                          className="px-6 py-3 bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white rounded-lg hover:shadow-lg transition-all duration-200 flex items-center gap-2 group/btn hover:scale-105 cursor-pointer"
                        >
                          <Plus size={18} className="transition-transform group-hover/btn:rotate-90" />
                          <span className="whitespace-nowrap">Add to Compare</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-[#f7f7f7] dark:bg-[#1a1f2e] rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-[#999] dark:text-[#707070]" size={32} />
              </div>
              <h3 className="text-[#1e1e1e] dark:text-white mb-2">No phones found</h3>
              <p className="text-[#666] dark:text-[#a0a8b8] mb-6">
                We couldn't find any phones matching your search criteria. Try adjusting your filters.
              </p>
              <button
                onClick={handleClearAll}
                className="px-6 py-3 bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] text-white rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex flex-wrap items-center justify-center gap-2 pb-8">
            {/* Previous Arrow */}
            <button
              disabled={!hasPrevPage}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              className="p-2 rounded-lg border border-[#e5e5e5] dark:border-[#2d3548] text-[#2c3968] dark:text-[#4a7cf6] disabled:opacity-30 hover:bg-[#f7f9fc] transition-all cursor-pointer"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Numeric Pages */}
            <div className="flex items-center gap-2">
              {getPageNumbers().map((pageNum, idx) => (
                <button
                  key={idx}
                  disabled={pageNum === "..."}
                  onClick={() => typeof pageNum === "number" && setCurrentPage(pageNum)}
                  className={`min-w-[40px] h-[40px] rounded-lg border transition-all text-sm font-medium cursor-pointer ${
                    pageNum === currentPage
                      ? "bg-[#2c3968] text-white border-[#2c3968] shadow-md"
                      : pageNum === "..."
                        ? "border-transparent cursor-default text-[#999]"
                        : "border-[#e5e5e5] dark:border-[#2d3548] text-[#666] dark:text-[#a0a8b8] hover:border-[#2c3968] dark:hover:border-[#4a7cf6] hover:text-[#2c3968]"
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            {/* Next Arrow */}
            <button
              disabled={!hasNextPage}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              className="p-2 rounded-lg border border-[#e5e5e5] dark:border-[#2d3548] text-[#2c3968] dark:text-[#4a7cf6] disabled:opacity-30 hover:bg-[#f7f9fc] transition-all cursor-pointer"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

        {/* Comparison Cart - Only show if there are phones in cart */}
        {comparisonPhoneIds.length > 0 && (
          <ComparisonCart
            phones={comparisonPhoneIds.map((id) => {
              // Attempts to find phone in catalog page or comparison cache before fetching
              const cachedPhone = allPhones.find((p) => p.id === id) || comparisonData.find((p) => p.id === id);
              return {
                id: id,
                name: cachedPhone?.name || "Loading",
                manufacturer: cachedPhone?.manufacturer || "",
                images: { main: cachedPhone?.images?.main || "" },
                price: cachedPhone?.price || "---",
              };
            })}
            onRemovePhone={(phoneId) => {
              setComparisonData((prev) => prev.filter((p) => p.id !== phoneId));
              onComparisonChange?.(comparisonPhoneIds.filter((id) => id !== phoneId));
            }}
            onCompare={() => onNavigateToComparison?.()}
            isMinimized={isCartMinimized}
            onMinimizedChange={setIsCartMinimized}
            onClose={() => setIsCartMinimized(true)}
          />
        )}
      </div>

      {/* Recently Viewed Phones */}
      <div className="max-w-[1400px] 2xl:max-w-[1600px] mx-auto">
        <RecentlyViewedPhones currentPhone="" onNavigate={onNavigate} recentlyViewedPhones={recentlyViewedPhones} />
      </div>
    </>
  );
}
