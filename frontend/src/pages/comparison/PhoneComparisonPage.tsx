import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../context/AuthContext";

// UI Components
import { Button } from "../../components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover";
import { Checkbox } from "../../components/ui/checkbox";
import { Badge } from "../../components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../components/ui/tooltip";

// Logos
import {
  X,
  Plus,
  ChevronDown,
  Monitor,
  Cpu,
  BarChart3,
  Camera,
  Battery,
  Palette,
  Wifi,
  Mic,
  Radio,
  Smartphone,
  HelpCircle,
  Signal,
  Share2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Check,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Custom Components & APIs
import { formatPrice } from "../../utils/formatter";
import { PhoneCard, PhoneData } from "../../types/phoneTypes";

import { PartialStar } from "../../components/common/PartialStar";
import SpecTableOfContents from "../../components/catalog/SpecTableOfContents";
import RecentlyViewedPhones from "../../components/comparison/RecentlyViewedPhones";
import { ComparisonBar } from "../../components/comparison/ComparisonBar";

import { getPhoneBatch, getPhonePage } from "../../api/phoneApi";
import { logComparison } from "../../api/analyticsApi";

// Category icons mapping
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
  "carrier-compatibility": { icon: Signal },
};

// Tooltips for important/confusing specifications
const specTooltips: Record<string, string> = {
  "Refresh Rate":
    "How many times per second the screen updates. Higher rates (120Hz) make scrolling and animations smoother than standard 60Hz displays.",
  "Peak Brightness":
    "The maximum brightness level the screen can reach, measured in nits. Higher values mean better visibility in direct sunlight.",
  Chipset:
    "The main processor that powers the phone. Think of it as the 'brain' that handles all computing tasks and determines overall performance.",
  CPU: "Central Processing Unit - the main processor core architecture and clock speed. Determines how fast your phone can execute tasks and run applications.",
  GPU: "Graphics Processing Unit - handles graphics rendering for games and visual effects. Better GPUs mean smoother gaming and better visual performance.",
  RAM: "Random Access Memory - temporary storage for running apps. More RAM allows you to run more apps simultaneously without slowdown.",
  "AnTuTu Score":
    "A benchmark score measuring overall phone performance. Higher scores indicate faster, more powerful devices. Scores above 1 million are considered flagship-level.",
  "Geekbench Score":
    "Measures CPU performance in real-world tasks. Single-core scores show performance for everyday tasks, multi-core shows performance under heavy load.",
  Aperture:
    "The opening that lets light into the camera. Lower f-numbers (like f/1.7) mean wider openings, allowing more light for better low-light photos.",
  "Optical Zoom":
    "True zoom using physical lenses, maintaining image quality. Digital zoom just crops and enlarges, reducing quality.",
  OIS: "Optical Image Stabilization - physically stabilizes the camera to reduce blur from hand shake, crucial for sharp photos and stable videos.",
  "IP68 Rating":
    "Water and dust resistance rating. IP68 means dust-tight and can survive submersion in water up to 1.5 meters for 30 minutes.",
  "Wireless Charging":
    "Charges your phone by placing it on a charging pad without cables. Convenient but typically slower than wired charging.",
  NFC: "Near Field Communication - enables contactless payments (like Samsung Pay) and quick pairing with compatible devices by tapping.",
  "Wi-Fi 6E":
    "Latest Wi-Fi standard offering faster speeds and less interference than older Wi-Fi versions. Requires a compatible router to take full advantage.",
  "5G Bands":
    "The specific 5G frequencies your phone supports. More bands mean better 5G connectivity in more locations worldwide.",
  "SAR Value":
    "Specific Absorption Rate - measures radio frequency energy absorbed by the body. Lower values mean less radiation exposure.",
};

interface PhoneComparisonPageProps {
  phoneIds: string[];
  onRemovePhone: (phoneId: string) => void;
  onAddPhone: (phoneId: string) => void;
  onNavigate: (phoneId: string) => void;
  recentlyViewedPhones?: string[];
  sessionSelectedSpecs: Record<string, string[]> | null;
  onSessionSelectedSpecsChange: React.Dispatch<React.SetStateAction<Record<string, string[]> | null>>;
  sessionStateHydrated: boolean;
}

// ------------------------------------------------------------
// | CONFIGURATION CONSTANTS
// ------------------------------------------------------------
const SEARCH_DELAY_LOADING_MS = 150; // The time until loading UI displays on search
const SEARCH_DEBOUNCE_MS = 300; // Time to wait after typing stops before sending search query to server
const SEARCH_RESULT_LIMIT = 10; // Number of phones to show in "Add Phone" dropdown

const COMPARISON_ANALYTICS_LOG_DEBOUNCE_MS = 3000; // Time to wait till the comparison's analytics are updated (view incremented and last compare date updated)

// ------------------------------------------------------------
// | PHONE COMPARISON PAGE DEFINITION
// ------------------------------------------------------------
export default function PhoneComparisonPage({
  phoneIds,
  onRemovePhone,
  onAddPhone,
  onNavigate,
  recentlyViewedPhones,
  sessionSelectedSpecs,
  onSessionSelectedSpecsChange,
  sessionStateHydrated,
}: PhoneComparisonPageProps) {
  // ------------------------------------------------------------
  // | HOOKS
  // ------------------------------------------------------------
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isSyncingSessionFromLocalChange = React.useRef(false);

  // --- Phone Data States ---
  const [phoneDataList, setPhoneDataList] = useState<PhoneData[]>([]);
  const [searchList, setSearchList] = useState<PhoneCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const phones = phoneDataList;

  // --- Search States ---
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // --- UI States ---
  const [stickyHeader, setStickyHeader] = useState(false);
  const [searchOpenIndex, setSearchOpenIndex] = useState<number | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [selectedSpecs, setSelectedSpecs] = useState<Record<string, string[]>>({});
  const [filterVisible, setFilterVisible] = useState(false); // Hidden by default for mobile

  // ------------------------------------------------------------
  // | DATA SYNCHRONIZATION
  // ------------------------------------------------------------
  /**
   * COMPARISON DATA FETCH:
   * Signal: Change in phoneIds array (that contains phones for comparison)
   * Action: Fetches full PhoneData for each phone in phoneIds list
   */
  useEffect(() => {
    const loadPhones = async () => {
      // Handles case of no phones chosen for compare
      if (phoneIds.length === 0) {
        setPhoneDataList([]);
        setIsLoading(false);
        return;
      }

      // Handles phones up for compare
      setIsLoading(true);

      // Attempting to fetch all phones in compare
      try {
        const validPhones = await getPhoneBatch(phoneIds);
        setPhoneDataList(validPhones);
      } catch (error) {
        // Handles failed fetch error
        toast.error("Database connection failed.");
        console.log("Error fetching phones:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPhones();
  }, [phoneIds]);

  /**
   * POPULARITY TRACKING OF COMPARISON:
   * Signal: Change in phoneIds array
   * Action: Logs the comparison being viewed after some set time to account for
   * user possibly still searching for third phone to compare.
   */
  useEffect(() => {
    // Only updates if there are at least 2 phones
    if (phoneIds.length < 2) return;

    // Sets a timer to wait until the analytics of comparison being viewed is updated
    const viewTimer = setTimeout(() => logComparison(phoneIds), COMPARISON_ANALYTICS_LOG_DEBOUNCE_MS);

    // Resets timer on any change in phoneIds array (i.e. adding/removing a phone)
    return () => clearTimeout(viewTimer);
  }, [phoneIds]);

  /**
   * SEARCH LIST FETCH
   * Signal: Initial component mount or when search query changes
   * Action: Fetches list of phones matching search query in dropdown phone cards
   */
  useEffect(() => {
    let loadingTimer: ReturnType<typeof setTimeout>;
    let debounceTimer: ReturnType<typeof setTimeout>;

    // Loads list containing search results
    const loadSearchData = async () => {
      // Setting loading state only after certain duration has passed on backend fetching
      loadingTimer = setTimeout(() => setIsSearching(true), SEARCH_DELAY_LOADING_MS); // reduces UI flicker

      // Attempting to search for phone with query
      try {
        const data = await getPhonePage(1, SEARCH_RESULT_LIMIT, { search: searchQuery });
        setSearchList(data.phones);
        window.scrollTo(0, 0);
      } catch (error) {
        console.log("Search fetch failed", error);
      } finally {
        clearTimeout(loadingTimer);
        setIsSearching(false);
      }
    };

    // Add debounce time to delay the search until user finish typing
    debounceTimer = setTimeout(loadSearchData, SEARCH_DEBOUNCE_MS);

    // Clearing timers for next
    return () => {
      clearTimeout(debounceTimer);
      clearTimeout(loadingTimer);
    };
  }, [searchQuery]);

  /**
   * AVAILABLE PHONE FILTERS:
   * Signal: Changes to the searchList or the chosen phoneIds up on comparison
   * Action: Fetches a subset of phones that CAN be added to compare and
   * filters out already chosen phones
   */
  const availablePhones = useMemo(() => {
    return searchList.filter((phone) => !phoneIds.includes(phone.id));
  }, [searchList, phoneIds]);

  // ------------------------------------------------------------
  // | UI SYNCHRONIZATION
  // ------------------------------------------------------------

  // Show filter by default on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        // lg breakpoint
        setFilterVisible(true);
      } else {
        setFilterVisible(false);
      }
    };

    handleResize(); // Set initial state
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate average ratings for each phone
  const phoneRatings = useMemo(() => {
    return phones.map((phone) => ({
      overall: phone.aggregateRating ?? 0,
      count: phone.totalReviews ?? 0,
    }));
  }, [phones]);

  // Get all unique specification categories
  const allCategories = useMemo(() => {
    const categoriesSet = new Set<string>();
    phones.forEach((phone) => {
      Object.keys(phone.categories).forEach((cat) => categoriesSet.add(cat));
    });
    // Add carrier compatibility as a separate category only if there are phones
    if (phones.length > 0) {
      categoriesSet.add("carrier-compatibility");
    }
    return Array.from(categoriesSet);
  }, [phones]);

  const buildAllSpecsForComparison = useMemo(
    () => () => {
      const allSpecs: Record<string, string[]> = {};
      allCategories.forEach((category) => {
        const specs = new Set<string>();
        if (category === "carrier-compatibility") {
          phones.forEach((phone) => {
            phone.carrierCompatibility?.forEach((carrier) => {
              specs.add(carrier.name);
            });
          });
        } else {
          phones.forEach((phone) => {
            if (phone.categories[category]) {
              Object.keys(phone.categories[category]).forEach((key) => specs.add(key));
            }
          });
        }
        allSpecs[category] = Array.from(specs);
      });
      return allSpecs;
    },
    [allCategories, phones],
  );

  useEffect(() => {
    const handleScroll = () => {
      // 1. Only run logic if loading is done
      if (isLoading) return;

      const shouldSticky = window.scrollY > 300;

      // 2. Only update state if it's actually changing (prevents unnecessary re-renders)
      setStickyHeader((prev) => (prev !== shouldSticky ? shouldSticky : prev));
    };

    // 3. Add passive: true for better scroll performance
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLoading]); // Add isLoading to dependencies

  // Calculate the minimum number of slots to show
  const minSlots = 3;
  const emptySlots = Math.max(minSlots - phones.length, 0);

  // Initialize and reset filters when phones change
  useEffect(() => {
    if (!sessionStateHydrated) return;
    if (phones.length === 0) {
      setSelectedSpecs({});
      return;
    }

    if (isSyncingSessionFromLocalChange.current) {
      isSyncingSessionFromLocalChange.current = false;
      return;
    }

    const allSpecs = buildAllSpecsForComparison();
    const nextSelectedSpecs = Object.fromEntries(
      Object.entries(allSpecs).map(([category, availableSpecs]) => {
        if (sessionSelectedSpecs && Object.prototype.hasOwnProperty.call(sessionSelectedSpecs, category)) {
          const persistedCategorySpecs = sessionSelectedSpecs[category] || [];
          return [category, availableSpecs.filter((spec) => persistedCategorySpecs.includes(spec))];
        }

        const priorityFeatures = currentUser?.preferences.priorityFeatures;
        const priorityScore =
          priorityFeatures && category in priorityFeatures
            ? priorityFeatures[category as keyof typeof priorityFeatures]
            : undefined;

        return [category, priorityScore != null && priorityScore < 3 ? [] : availableSpecs];
      }),
    );

    setSelectedSpecs(nextSelectedSpecs);
  }, [buildAllSpecsForComparison, currentUser, phones.length, sessionSelectedSpecs, sessionStateHydrated]);

  // ------------------------------------------------------------
  // | COMPONENT LOGIC
  // ------------------------------------------------------------

  // Handle share comparison
  const handleShareComparison = () => {
    if (phoneIds.length === 0) {
      toast.error("Add phones to share a comparison");
      return;
    }

    // Build query string with the correct parameter
    const params = new URLSearchParams();
    params.set("phones", phoneIds.join(",")); // <-- use 'phones', not 'compare'

    // Always point to /compare
    const shareUrl = `${window.location.origin}/compare?${params.toString()}`;

    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        toast.success("Comparison link copied to clipboard!");
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
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
    const allSpecs = buildAllSpecsForComparison();
    isSyncingSessionFromLocalChange.current = true;
    onSessionSelectedSpecsChange(allSpecs);
    setSelectedSpecs(allSpecs);
  };

  const clearAllSpecs = () => {
    const emptySpecs: Record<string, string[]> = {};
    allCategories.forEach((category) => {
      emptySpecs[category] = [];
    });
    isSyncingSessionFromLocalChange.current = true;
    onSessionSelectedSpecsChange(emptySpecs);
    setSelectedSpecs(emptySpecs);
  };

  const isCategoryFullySelected = (category: string) => {
    const allSpecsSet = new Set<string>();
    if (category === "carrier-compatibility") {
      phones.forEach((phone) => {
        phone.carrierCompatibility?.forEach((carrier) => {
          allSpecsSet.add(carrier.name);
        });
      });
    } else {
      phones.forEach((phone) => {
        if (phone.categories[category]) {
          Object.keys(phone.categories[category]).forEach((key) => allSpecsSet.add(key));
        }
      });
    }
    const allSpecs = Array.from(allSpecsSet);
    const selected = selectedSpecs[category] || [];
    return allSpecs.length === selected.length && allSpecs.length > 0;
  };

  const isCategoryPartiallySelected = (category: string) => {
    const selected = selectedSpecs[category] || [];
    return selected.length > 0 && !isCategoryFullySelected(category);
  };

  const toggleAllCategorySpecs = (category: string) => {
    const allSpecsSet = new Set<string>();
    if (category === "carrier-compatibility") {
      phones.forEach((phone) => {
        phone.carrierCompatibility?.forEach((carrier) => {
          allSpecsSet.add(carrier.name);
        });
      });
    } else {
      phones.forEach((phone) => {
        if (phone.categories[category]) {
          Object.keys(phone.categories[category]).forEach((key) => allSpecsSet.add(key));
        }
      });
    }
    const allSpecs = Array.from(allSpecsSet);
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

  const handleExportToPdf = () => {
    if (phones.length === 0) {
      toast.error("Add phones to export a comparison");
      return;
    }

    const visibleCategories = allCategories
      .map((category) => {
        if (category === "carrier-compatibility") {
          const carriers = Array.from(
            new Set(phones.flatMap((phone) => phone.carrierCompatibility?.map((carrier) => carrier.name) || [])),
          ).filter((carrier) => (selectedSpecs["carrier-compatibility"] || []).includes(carrier));

          return carriers.length > 0 ? { category, specs: carriers } : null;
        }

        const specKeys = Array.from(
          new Set(phones.flatMap((phone) => Object.keys(phone.categories[category] || {}))),
        ).filter((specKey) => (selectedSpecs[category] || []).includes(specKey));

        return specKeys.length > 0 ? { category, specs: specKeys } : null;
      })
      .filter((entry): entry is { category: string; specs: string[] } => Boolean(entry));

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "letter",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const headerColor: [number, number, number] = [44, 57, 104];
    const bodyTextColor: [number, number, number] = [30, 30, 30];
    const subtleTextColor: [number, number, number] = [95, 107, 133];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...headerColor);
    doc.text("Phone Comparison", 40, 42);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...subtleTextColor);
    doc.text("Export generated from the currently visible comparison specs.", 40, 60);
    doc.text(phones.map((phone) => `${phone.manufacturer} ${phone.name}`).join("  |  "), 40, 76, {
      maxWidth: pageWidth - 80,
    });

    const getLastTableY = () => (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 76;

    const ensureSectionSpace = (requiredHeight = 80) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      const nextY = getLastTableY();

      if (nextY + requiredHeight > pageHeight - 40) {
        doc.addPage();
      }
    };

    const tableHead = [["Specification", ...phones.map((phone) => `${phone.manufacturer} ${phone.name}`)]];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...headerColor);
    doc.text("Quick Overview", 40, 88);

    autoTable(doc, {
      startY: 92,
      head: tableHead,
      body: (phones[0]?.quickSpecs || []).map((spec) => [
        spec.label,
        ...phones.map((phone) => phone.quickSpecs.find((item) => item.label === spec.label)?.value || "N/A"),
      ]),
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 6,
        textColor: bodyTextColor,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [238, 242, 248],
        textColor: headerColor,
        fontStyle: "bold",
      },
      columnStyles: {
        0: {
          cellWidth: 140,
          fillColor: [249, 251, 255],
          textColor: [79, 91, 117],
          fontStyle: "bold",
        },
      },
      margin: { left: 40, right: 40 },
    });

    visibleCategories.forEach(({ category, specs }) => {
      const heading =
        category === "carrier-compatibility"
          ? "Carrier Compatibility"
          : category
              .replace(/([A-Z])/g, " $1")
              .trim()
              .replace(/\b\w/g, (char) => char.toUpperCase());

      ensureSectionSpace();
      const sectionTitleY = getLastTableY() + 22;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...headerColor);
      doc.text(heading, 40, sectionTitleY);

      autoTable(doc, {
        startY: sectionTitleY + 8,
        head: tableHead,
        body: specs.map((specKey) => [
          specKey,
          ...phones.map((phone) => {
            if (category === "carrier-compatibility") {
              const carrierInfo = phone.carrierCompatibility?.find((carrier) => carrier.name === specKey);
              if (!carrierInfo) return "N/A";

              return carrierInfo.notes
                ? `${carrierInfo.compatible ? "Compatible" : "Not Compatible"} - ${carrierInfo.notes}`
                : carrierInfo.compatible
                  ? "Compatible"
                  : "Not Compatible";
            }

            return phone.categories[category]?.[specKey] || "N/A";
          }),
        ]),
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 6,
          textColor: bodyTextColor,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [238, 242, 248],
          textColor: headerColor,
          fontStyle: "bold",
        },
        columnStyles: {
          0: {
            cellWidth: 140,
            fillColor: [249, 251, 255],
            textColor: [79, 91, 117],
            fontStyle: "bold",
          },
        },
        margin: { left: 40, right: 40 },
      });
    });

    const fileName = `comparison-${phones.map((phone) => phone.id).join("-")}.pdf`;
    doc.save(fileName);

    toast.success("PDF downloaded", {
      description: "The comparison PDF has been saved to your browser's default downloads location.",
    });
  };

  // ------------------------------------------------------------
  // | RENDER GUARD
  // ------------------------------------------------------------

  // Setting a load screen while data is still being fetched
  if (isLoading && phoneDataList.length === 0 && phoneIds.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] w-full bg-white/50 dark:bg-[#161b26]/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-[#2c3968]/10 dark:border-[#4a7cf6]/10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2c3968] dark:border-[#4a7cf6] mb-4"></div>
        <h3 className="text-[#2c3968] dark:text-[#4a7cf6] font-semibold text-lg">Synchronizing with database...</h3>
        <p className="text-[#666] dark:text-[#a0a8b8] text-sm">Fetching detailed specifications for your comparison.</p>
      </div>
    );
  }

  // ------------------------------------------------------------
  // | UI SECTION
  // ------------------------------------------------------------
  return (
    <div className="max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-3 sm:px-6 py-4 sm:py-8">
      {/* Sticky Header */}
      <div
        className={`fixed top-[80px] left-0 right-0 bg-white/95 dark:bg-[#161b26]/95 backdrop-blur-md border-b border-border shadow-lg z-50
          ${isLoading ? "" : "transition-all duration-300"} 
          ${stickyHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"}
          `}
      >
        <div className="max-w-[1600px] 2xl:max-w-[1800px] mx-auto px-6">
          <div className="flex items-center gap-4 py-4">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-1.5 h-6 bg-gradient-to-b from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] rounded-full"></div>
              <span className="text-[#2c3968] dark:text-[#4a7cf6] font-bold text-base bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] bg-clip-text text-transparent">
                Currently Comparing
              </span>
            </div>

            {/* Phone cards */}
            <div className="flex items-center gap-3 flex-wrap">
              {phones.map((phone) => (
                <div
                  key={phone.id}
                  className="flex items-center gap-2.5 px-4 py-2 bg-gradient-to-br from-white to-[#f7f9fc] dark:from-[#1a1f2e] dark:to-[#161b26] rounded-xl border-2 border-[#2c3968]/20 dark:border-[#4a7cf6]/20 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <div className="w-10 h-10 bg-white dark:bg-[#161b26] rounded-lg p-1 shadow-sm">
                    <img src={phone.images.main} alt={phone.name} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-sm font-medium text-[#2c3968] dark:text-[#4a7cf6] truncate max-w-[200px]">
                    {phone.manufacturer} {phone.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 lg:gap-6 relative">
        {/* Left Sidebar - Filter */}
        <div
          className={`transition-all duration-300 ${
            filterVisible ? "w-[280px] sm:w-[340px] opacity-100" : "w-0 opacity-0"
          } ${filterVisible ? "fixed lg:sticky left-0 z-40" : ""}`}
          style={{
            top: stickyHeader ? "180px" : "95px",
            height: stickyHeader ? "calc(100vh - 200px)" : "0px",
          }}
        >
          {/* Mobile Overlay */}
          {filterVisible && (
            <div
              className="fixed inset-0 bg-black/50 dark:bg-black/70 lg:hidden z-[59]"
              onClick={() => setFilterVisible(false)}
            />
          )}
          <div
            className={`sticky top-24 ${filterVisible ? "" : "invisible"} ${filterVisible ? "z-[60] lg:z-auto" : ""}`}
          >
            <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-4 sm:p-6 h-screen lg:h-auto overflow-y-auto lg:overflow-visible">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-[#2c3968] dark:text-[#4a7cf6] text-lg sm:text-xl font-semibold">
                    Specification Filter
                  </h2>
                  <button
                    onClick={() => setFilterVisible(false)}
                    className="text-[#2c3968] dark:text-[#4a7cf6] hover:bg-[#2c3968]/10 dark:hover:bg-[#4a7cf6]/10 rounded-lg p-2 transition-colors cursor-pointer"
                    title="Hide filter"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
                <div className="h-1 w-20 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full mb-4"></div>
                <div className="flex gap-2 text-sm">
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

              <div className="space-y-2 lg:max-h-[calc(100vh-250px)] lg:overflow-y-auto">
                {allCategories.map((category) => {
                  const allSpecsSet = new Set<string>();
                  if (category === "carrier-compatibility") {
                    phones.forEach((phone) => {
                      phone.carrierCompatibility?.forEach((carrier) => {
                        allSpecsSet.add(carrier.name);
                      });
                    });
                  } else {
                    phones.forEach((phone) => {
                      if (phone.categories[category]) {
                        Object.keys(phone.categories[category]).forEach((key) => allSpecsSet.add(key));
                      }
                    });
                  }
                  const specs = Array.from(allSpecsSet);
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
                      <div className="border border-[#e0e0e0] dark:border-[#2d3548] rounded-lg hover:border-[#2c3968]/20 dark:hover:border-[#4a7cf6]/20 transition-all duration-200 bg-white dark:bg-[#161b26]">
                        <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#f7f9fc] dark:hover:bg-[#1a1f2e] transition-colors duration-200">
                          <div className="flex items-center gap-2 flex-1">
                            <div className="w-8 h-8 rounded-lg bg-[#f5f7fa] dark:bg-[#4a7cf6]/10 flex items-center justify-center shrink-0">
                              <CategoryIcon className="w-4 h-4 text-[#2c3968] dark:text-[#4a7cf6]" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <CollapsibleTrigger className="flex items-center gap-2 text-left w-full">
                                <span className="capitalize text-[#2c3968] dark:text-[#4a7cf6] text-sm truncate">
                                  {category}
                                </span>
                                {(isFullySelected || isPartiallySelected) && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs px-1.5 py-0 bg-[#2c3968]/10 dark:bg-[#4a7cf6]/10 text-[#2c3968] dark:text-[#4a7cf6] border border-[#2c3968]/20 dark:border-[#4a7cf6]/20 shrink-0"
                                  >
                                    {categorySelectedSpecs.length}/{specs.length}
                                  </Badge>
                                )}
                              </CollapsibleTrigger>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAllCategorySpecs(category);
                              }}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={isFullySelected}
                                className={`border-[#2c3968] dark:border-[#4a7cf6] data-[state=checked]:bg-[#2c3968] dark:data-[state=checked]:bg-[#4a7cf6] data-[state=checked]:text-white transition-colors cursor-pointer ${
                                  isPartiallySelected ? "opacity-50" : ""
                                }`}
                              />
                            </div>

                            <CollapsibleTrigger>
                              <ChevronDown
                                className={`w-4 h-4 transition-all duration-200 ${
                                  openCategories[category]
                                    ? "rotate-180 text-[#2c3968] dark:text-[#4a7cf6]"
                                    : "text-[#999] dark:text-[#6b7280]"
                                }`}
                              />
                            </CollapsibleTrigger>
                          </div>
                        </div>

                        <CollapsibleContent>
                          <div className="border-t border-[#e0e0e0] dark:border-[#2d3548] bg-[#fafbfc] dark:bg-[#1a1f2e] p-2 space-y-1 max-h-[200px] overflow-y-auto">
                            {specs.map((specName) => (
                              <div
                                key={specName}
                                className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-white dark:hover:bg-[#161b26] transition-colors duration-150"
                              >
                                <Checkbox
                                  checked={categorySelectedSpecs.includes(specName)}
                                  onCheckedChange={() => toggleSpec(category, specName)}
                                  id={`${category}-${specName}`}
                                  className="border-[#2c3968] dark:border-[#4a7cf6] data-[state=checked]:bg-[#2c3968] dark:data-[state=checked]:bg-[#4a7cf6] data-[state=checked]:text-white transition-colors cursor-pointer"
                                />
                                <label
                                  htmlFor={`${category}-${specName}`}
                                  className="text-[#1e1e1e] dark:text-white text-sm cursor-pointer flex-1"
                                >
                                  {specName}
                                </label>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Content - Comparison Table */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div id="comparison-header" className="mb-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#2c3968]/5 via-transparent to-[#2c3968]/5 dark:from-[#4a7cf6]/5 dark:to-[#4a7cf6]/5 rounded-3xl"></div>
            <div className="absolute top-0 left-0 w-40 h-40 bg-[#2c3968]/5 dark:bg-[#4a7cf6]/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#2c3968]/5 dark:bg-[#4a7cf6]/5 rounded-full blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-white/80 to-white/40 dark:from-[#1a2341] dark:to-[#161b26] backdrop-blur-sm dark:backdrop-blur-none border-2 border-[#2c3968]/10 dark:border-[#4a7cf6]/10 rounded-3xl p-10 shadow-lg">
              <div className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-3 mb-6">
                  <div className="w-2 h-2 rounded-full bg-[#2c3968] dark:bg-[#4a7cf6] animate-pulse"></div>
                  <span className="text-sm uppercase tracking-wider text-[#2c3968]/70 dark:text-[#4a7cf6]/70 font-medium">
                    Side-by-Side Analysis
                  </span>
                  <div className="w-2 h-2 rounded-full bg-[#2c3968] dark:bg-[#4a7cf6] animate-pulse"></div>
                </div>
                <h1 className="text-5xl text-[#2c3968] dark:text-white mb-4 font-bold tracking-tight">
                  Phone Comparison
                </h1>
                <div className="h-1.5 w-32 bg-gradient-to-r from-transparent via-[#2c3968] dark:via-[#4a7cf6] to-transparent rounded-full mx-auto mb-6"></div>
                <p className="text-lg text-[#666] dark:text-[#a0a8b8] leading-relaxed mb-6">
                  {phones.length === 0
                    ? "Add phones to start comparing specifications, features, and ratings side by side"
                    : `Comparing ${phones.length} ${phones.length === 1 ? "phone" : "phones"} • Detailed specifications, features, and ratings at a glance`}
                </p>
                {phones.length > 0 && (
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      onClick={handleShareComparison}
                      className="w-[190px] bg-[#2c3968] hover:bg-[#1f2747] text-white px-6 py-2 rounded-lg transition-colors duration-200 inline-flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Comparison
                    </Button>
                    <Button
                      onClick={handleExportToPdf}
                      className="w-[190px] bg-[#2c3968] hover:bg-[#1f2747] text-white px-6 py-2 rounded-lg transition-colors duration-200 inline-flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Export to PDF
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Show Filter Button (when hidden) */}
          {!filterVisible && (
            <div className="fixed left-0 top-1/2 -translate-y-1/2 z-50">
              <button
                onClick={() => setFilterVisible(true)}
                className="bg-[#2c3968] dark:bg-[#4a7cf6] hover:bg-[#1f2747] dark:hover:bg-[#5b8df7] text-white rounded-r-lg p-3 shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
                title="Show filter"
              >
                <ChevronRight className="w-5 h-5" />
                <span className="text-sm font-medium whitespace-nowrap">Filters</span>
              </button>
            </div>
          )}

          {/* Comparison Table */}
          <div className="bg-white dark:bg-[#161b26] rounded-lg border border-[#e0e0e0] dark:border-[#2d3548] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-max" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th className="w-[180px] p-0 bg-white dark:bg-[#161b26] sticky left-0 z-10"></th>
                    {phones.map((phone, index) => (
                      <th
                        key={phone.id}
                        className="w-[340px] p-0 bg-white dark:bg-[#161b26] border-l border-[#e0e0e0] dark:border-[#2d3548] align-top"
                      >
                        <div className="p-6 relative">
                          <button
                            onClick={() => onRemovePhone(phone.id)}
                            className="absolute top-4 right-4 text-[#999] dark:text-[#6b7280] hover:text-red-500 dark:hover:text-red-400 transition-colors z-10 cursor-pointer"
                            title="Remove from comparison"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <div className="flex flex-col items-center pt-2">
                            <button
                              onClick={() => onNavigate?.(phone.id)}
                              className="w-32 h-32 mb-4 hover:opacity-75 transition-opacity cursor-pointer"
                              title={`View ${phone.manufacturer} ${phone.name} specs`}
                            >
                              <img src={phone.images.main} alt={phone.name} className="w-full h-full object-contain" />
                            </button>
                            <button
                              onClick={() => onNavigate?.(phone.id)}
                              className="text-center hover:underline transition-all cursor-pointer group"
                              title={`View ${phone.manufacturer} ${phone.name} specs`}
                            >
                              <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-1 group-hover:text-[#1f2747] dark:group-hover:text-[#5b8df7]">
                                {phone.manufacturer}
                              </h3>
                              <p className="text-sm text-[#666] dark:text-[#a0a8b8] mb-2 group-hover:text-[#444] dark:group-hover:text-[#b8c0d0]">
                                {phone.name}
                              </p>
                            </button>
                            <Badge
                              variant="secondary"
                              className="bg-[#2c3968] dark:bg-[#4a7cf6] text-white hover:bg-[#2c3968]/90 dark:hover:bg-[#4a7cf6]/90 mb-2"
                            >
                              {phone.releaseDate}
                            </Badge>
                            <p className="text-[#2c3968] dark:text-[#4a7cf6] mb-3">{formatPrice(phone.price)}</p>

                            {/* Rating */}
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => {
                                  const rating = phoneRatings[phones.indexOf(phone)]?.overall || 0;
                                  const fillPercentage = Math.max(0, Math.min(1, rating - i));
                                  return <PartialStar key={i} fillPercentage={fillPercentage} className="w-4 h-4" />;
                                })}
                              </div>
                              <span className="text-sm text-[#666] dark:text-[#a0a8b8]">
                                {(phoneRatings[phones.indexOf(phone)]?.overall || 0).toFixed(1)}
                              </span>
                            </div>
                            <p className="text-xs text-[#999] dark:text-[#6b7280]">
                              ({phoneRatings[phones.indexOf(phone)]?.count || 0} reviews)
                            </p>
                          </div>
                        </div>
                      </th>
                    ))}

                    {/* Empty slots with search */}
                    {emptySlots > 0 &&
                      Array.from({ length: emptySlots }).map((_, idx) => {
                        return (
                          <th
                            key={`empty-${idx}`}
                            className="w-[340px] p-0 bg-white dark:bg-[#161b26] border-l border-[#e0e0e0] dark:border-[#2d3548] align-top"
                          >
                            <div className="p-6">
                              <div className="flex flex-col items-center justify-center min-h-[380px]">
                                <Popover
                                  open={searchOpenIndex === idx}
                                  onOpenChange={(open) => setSearchOpenIndex(open ? idx : null)}
                                >
                                  <PopoverTrigger asChild>
                                    <button className="w-full flex flex-col items-center justify-center gap-4 p-6 border-2 border-dashed border-[#e0e0e0] dark:border-[#2d3548] rounded-lg hover:border-[#2c3968] dark:hover:border-[#4a7cf6] hover:bg-[#f7f9fc] dark:hover:bg-[#1a1f2e] transition-all group bg-white dark:bg-[#161b26] cursor-pointer">
                                      <div className="w-20 h-20 rounded-full bg-[#f0f0f0] dark:bg-[#1a1f2e] flex items-center justify-center group-hover:bg-[#2c3968] dark:group-hover:bg-[#4a7cf6] transition-colors">
                                        <Plus className="w-10 h-10 text-[#ccc] dark:text-[#6b7280] group-hover:text-white transition-colors" />
                                      </div>
                                      <div className="text-center">
                                        <p className="text-[#2c3968] dark:text-[#4a7cf6] mb-1">Add Phone</p>
                                        <p className="text-xs text-[#999] dark:text-[#6b7280]">Search and compare</p>
                                      </div>
                                    </button>
                                  </PopoverTrigger>
                                  <PopoverContent
                                    className="w-[300px] p-0 bg-white dark:bg-background border-border shadow-2xl"
                                    align="center"
                                  >
                                    <Command className="dark:bg-background" shouldFilter={false}>
                                      <CommandInput
                                        className="dark:text-white"
                                        placeholder="Search phones..."
                                        value={searchQuery}
                                        onValueChange={setSearchQuery}
                                      />
                                      <CommandList className="dark:bg-background border-t border-border">
                                        {/* Search loading indicator */}
                                        {isSearching && (
                                          <div className="absolute top-0 left-0 right-0 h-1 bg-[#2c3968]/10 dark:bg-[#4a7cf6]/10 overflow-hidden z-20">
                                            <div className="h-full bg-[#2c3968] dark:bg-[#4a7cf6] animate-progress-loop w-1/3"></div>
                                          </div>
                                        )}

                                        {/* Search query result display and UI controls*/}
                                        <div className={isSearching ? "opacity-50 pointer-events-none" : "opacity-100"}>
                                          <CommandEmpty>No phones found.</CommandEmpty>

                                          {/* Search result phone card display */}
                                          <CommandGroup>
                                            {availablePhones.map((phone) => (
                                              <CommandItem
                                                key={phone.id}
                                                onSelect={() => {
                                                  if (onAddPhone) {
                                                    onAddPhone(phone.id);
                                                  }
                                                  setSearchOpenIndex(null);
                                                }}
                                                className="cursor-pointer"
                                              >
                                                <div className="flex items-center gap-3 w-full">
                                                  <img
                                                    src={phone.images.main}
                                                    alt={phone.name}
                                                    className="w-10 h-10 object-contain shrink-0"
                                                  />
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-[#2c3968] dark:text-[#4a7cf6] truncate">
                                                      {phone.manufacturer} {phone.name}
                                                    </p>
                                                    <p className="text-xs text-[#666] dark:text-[#a0a8b8]">
                                                      {formatPrice(phone.price)}
                                                    </p>
                                                  </div>
                                                  <Plus className="w-4 h-4 text-[#2c3968] dark:text-[#4a7cf6] shrink-0" />
                                                </div>
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </div>
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          </th>
                        );
                      })}
                  </tr>
                </thead>

                {phones.length > 0 && (
                  <tbody>
                    {/* Quick Specs Section Header */}
                    <tr id="quick-overview">
                      <td className="px-6 py-4 bg-gradient-to-r from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 dark:to-transparent border-l-4 border-[#2c3968] dark:border-[#4a7cf6] border-t-2 border-t-[#e0e0e0] dark:border-t-[#2d3548] sticky left-0 z-10">
                        <h4 className="text-[#2c3968] dark:text-[#4a7cf6]">Quick Overview</h4>
                      </td>
                      {phones.map((phone) => (
                        <td
                          key={phone.id}
                          className="px-6 py-4 bg-gradient-to-r from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 dark:to-transparent border-t-2 border-t-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548]"
                        ></td>
                      ))}
                      {emptySlots > 0 &&
                        Array.from({ length: emptySlots }).map((_, idx) => (
                          <td
                            key={`empty-${idx}`}
                            className="px-6 py-4 bg-gradient-to-r from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 dark:to-transparent border-t-2 border-t-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548]"
                          ></td>
                        ))}
                    </tr>

                    {/* Quick Specs Rows - Always visible */}
                    {phones[0]?.quickSpecs.map((spec, idx) => (
                      <tr key={idx} className="group hover:bg-[#fafbfc] dark:hover:bg-[#1a1f2e] transition-colors">
                        <td className="px-6 py-3 bg-white dark:bg-[#161b26] border-t border-[#e0e0e0] dark:border-[#2d3548] sticky left-0 z-10 group-hover:bg-[#fafbfc] dark:group-hover:bg-[#1a1f2e]">
                          <div className="flex items-center gap-3">
                            <spec.icon className="w-4 h-4 text-[#2c3968] dark:text-[#4a7cf6] flex-shrink-0" />
                            <span className="text-sm text-[#666] dark:text-[#a0a8b8] break-words">{spec.label}</span>
                          </div>
                        </td>
                        {phones.map((phone) => {
                          const phoneSpec = phone.quickSpecs.find((s) => s.label === spec.label);
                          return (
                            <td
                              key={phone.id}
                              className="px-6 py-3 bg-white dark:bg-[#161b26] border-t border-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548] group-hover:bg-[#fafbfc] dark:group-hover:bg-[#1a1f2e]"
                            >
                              <span className="text-sm text-[#2c3968] dark:text-[#4a7cf6] break-words">
                                {phoneSpec?.value || "N/A"}
                              </span>
                            </td>
                          );
                        })}
                        {emptySlots > 0 &&
                          Array.from({ length: emptySlots }).map((_, idx) => (
                            <td
                              key={`empty-${idx}`}
                              className="px-6 py-3 bg-white dark:bg-[#161b26] border-t border-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548] group-hover:bg-[#fafbfc] dark:group-hover:bg-[#1a1f2e]"
                            >
                              <span className="text-sm text-[#999] dark:text-[#6b7280]">-</span>
                            </td>
                          ))}
                      </tr>
                    ))}

                    {/* Full Specifications by Category - Filtered */}
                    {allCategories.map((category) => {
                      // Get all unique spec keys across all phones for this category
                      const allSpecKeys = new Set<string>();
                      phones.forEach((phone) => {
                        if (phone.categories[category]) {
                          Object.keys(phone.categories[category]).forEach((key) => allSpecKeys.add(key));
                        }
                      });

                      // Filter based on selected specs
                      const categorySelectedSpecs = selectedSpecs[category] || [];
                      const filteredSpecKeys = Array.from(allSpecKeys).filter((key) =>
                        categorySelectedSpecs.includes(key),
                      );

                      // Skip category if no specs are selected
                      if (filteredSpecKeys.length === 0) return null;

                      return (
                        <React.Fragment key={category}>
                          {/* Category Header */}
                          <tr id={`spec-${category}`}>
                            <td className="px-6 py-4 bg-gradient-to-r from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 dark:to-transparent border-l-4 border-[#2c3968] dark:border-[#4a7cf6] border-t-2 border-t-[#e0e0e0] dark:border-t-[#2d3548] sticky left-0 z-10">
                              <h4 className="text-[#2c3968] dark:text-[#4a7cf6] capitalize">
                                {category.replace(/([A-Z])/g, " $1").trim()}
                              </h4>
                            </td>
                            {phones.map((phone) => (
                              <td
                                key={phone.id}
                                className="px-6 py-4 bg-gradient-to-r from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 dark:to-transparent border-t-2 border-t-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548]"
                              ></td>
                            ))}
                            {emptySlots > 0 &&
                              Array.from({ length: emptySlots }).map((_, idx) => (
                                <td
                                  key={`empty-header-${idx}`}
                                  className="px-6 py-4 bg-gradient-to-r from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 dark:to-transparent border-t-2 border-t-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548]"
                                ></td>
                              ))}
                          </tr>

                          {/* Category Specs */}
                          {filteredSpecKeys.map((specKey, specIdx) => (
                            <tr
                              key={`${category}-${specKey}`}
                              className="group hover:bg-[#fafbfc] dark:hover:bg-[#1a1f2e] transition-colors"
                            >
                              <td className="px-6 py-3 bg-white dark:bg-[#161b26] border-t border-[#e0e0e0] dark:border-[#2d3548] sticky left-0 z-10 group-hover:bg-[#fafbfc] dark:group-hover:bg-[#1a1f2e]">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-[#666] dark:text-[#a0a8b8] break-words">{specKey}</span>
                                  {specTooltips[specKey] && (
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            className="w-4 h-4 rounded-full bg-[#f5f7fa] dark:bg-[#2d3548] hover:bg-[#2c3968]/10 dark:hover:bg-[#4a7cf6]/10 flex items-center justify-center transition-colors duration-200 flex-shrink-0"
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
                                          <p className="text-sm leading-relaxed">{specTooltips[specKey]}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </td>
                              {phones.map((phone) => {
                                const value = phone.categories[category]?.[specKey];

                                // Logic to decide if this spec should have a bar
                                const numericKeywords = [
                                  "capacity",
                                  "ram",
                                  "storage",
                                  "score",
                                  "size",
                                  "brightness",
                                  "rate",
                                  "density",
                                  "weight",
                                  "price",
                                ];
                                const blacklist = ["dimensions", "resolution", "camera", "video"];
                                const isNumeric =
                                  numericKeywords.some((key) => specKey.toLowerCase().includes(key)) &&
                                  !blacklist.some((key) => specKey.toLowerCase().includes(key));

                                // Identifies if lower = Better (i.e. weight/price)
                                const isLowerBetter =
                                  specKey.toLowerCase().includes("weight") || specKey.toLowerCase().includes("price");

                                return (
                                  <td
                                    key={phone.id}
                                    className="px-6 py-3 bg-white dark:bg-[#161b26] border-t border-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548] group-hover:bg-[#fafbfc] dark:group-hover:bg-[#1a1f2e]"
                                  >
                                    <div className="flex flex-col min-h-[42px] justify-center">
                                      <span className="text-sm text-[#2c3968] dark:text-[#4a7cf6] break-words font-medium">
                                        {value || "N/A"}
                                      </span>

                                      {/* Render the bar if numeric */}
                                      {isNumeric && value && (
                                        <ComparisonBar
                                          value={value}
                                          // Passes this spec value from all 2-3 phones for normalization
                                          allValues={phones.map((p) => p.categories[category]?.[specKey])}
                                          reverse={isLowerBetter}
                                        />
                                      )}
                                    </div>
                                  </td>
                                );
                              })}
                              {emptySlots > 0 &&
                                Array.from({ length: emptySlots }).map((_, idx) => (
                                  <td
                                    key={`empty-spec-${idx}`}
                                    className="px-6 py-3 bg-white dark:bg-[#161b26] border-t border-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548] group-hover:bg-[#fafbfc] dark:group-hover:bg-[#1a1f2e]"
                                  >
                                    <span className="text-sm text-[#999] dark:text-[#6b7280]">-</span>
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                    {/* Carrier Compatibility Section */}
                    {(() => {
                      // Get all unique carriers from all phones
                      const allCarriers = new Set<string>();
                      phones.forEach((phone) => {
                        phone.carrierCompatibility?.forEach((carrier) => {
                          allCarriers.add(carrier.name);
                        });
                      });
                      const carriers = Array.from(allCarriers).sort();

                      // Filter carriers based on selectedSpecs
                      const selectedCarriers = selectedSpecs["carrier-compatibility"] || [];
                      const filteredCarriers = carriers.filter((carrier) => selectedCarriers.includes(carrier));

                      // Skip section if no carriers are selected
                      if (filteredCarriers.length === 0) return null;

                      return (
                        <React.Fragment key="carrier-compatibility">
                          {/* Section Header */}
                          <tr id="spec-carrier-compatibility">
                            <td className="px-6 py-4 bg-gradient-to-r from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 dark:to-transparent border-l-4 border-[#2c3968] dark:border-[#4a7cf6] border-t-2 border-t-[#e0e0e0] dark:border-t-[#2d3548] sticky left-0 z-10">
                              <h4 className="text-[#2c3968] dark:text-[#4a7cf6]">Carrier Compatibility</h4>
                            </td>
                            {phones.map((phone) => (
                              <td
                                key={phone.id}
                                className="px-6 py-4 bg-gradient-to-r from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 dark:to-transparent border-t-2 border-t-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548]"
                              ></td>
                            ))}
                            {emptySlots > 0 &&
                              Array.from({ length: emptySlots }).map((_, idx) => (
                                <td
                                  key={`empty-header-carrier-${idx}`}
                                  className="px-6 py-4 bg-gradient-to-r from-[#2c3968]/5 to-transparent dark:from-[#4a7cf6]/5 dark:to-transparent border-t-2 border-t-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548]"
                                ></td>
                              ))}
                          </tr>

                          {/* Carrier rows */}
                          {filteredCarriers.map((carrierName) => (
                            <tr
                              key={`carrier-${carrierName}`}
                              className="group hover:bg-[#fafbfc] dark:hover:bg-[#1a1f2e] transition-colors"
                            >
                              <td className="px-6 py-3 bg-white dark:bg-[#161b26] border-t border-[#e0e0e0] dark:border-[#2d3548] sticky left-0 z-10 group-hover:bg-[#fafbfc] dark:group-hover:bg-[#1a1f2e]">
                                <span className="text-sm text-[#666] dark:text-[#a0a8b8] break-words">
                                  {carrierName}
                                </span>
                              </td>
                              {phones.map((phone) => {
                                const carrierInfo = phone.carrierCompatibility?.find((c) => c.name === carrierName);
                                return (
                                  <td
                                    key={phone.id}
                                    className="px-6 py-3 bg-white dark:bg-[#161b26] border-t border-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548] group-hover:bg-[#fafbfc] dark:group-hover:bg-[#1a1f2e]"
                                  >
                                    {carrierInfo ? (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          {carrierInfo.compatible ? (
                                            <>
                                              <Check
                                                size={18}
                                                className="text-green-600 dark:text-green-400 shrink-0"
                                              />
                                              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                                Compatible
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <X size={18} className="text-red-600 dark:text-red-400 shrink-0" />
                                              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                                                Incompatible
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {carrierInfo.notes && (
                                          <span className="text-xs text-[#999] dark:text-[#6b7280]">
                                            {carrierInfo.notes}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-sm text-[#999]">N/A</span>
                                    )}
                                  </td>
                                );
                              })}
                              {emptySlots > 0 &&
                                Array.from({ length: emptySlots }).map((_, idx) => (
                                  <td
                                    key={`empty-carrier-${idx}`}
                                    className="px-6 py-3 bg-white dark:bg-[#161b26] border-t border-[#e0e0e0] dark:border-t-[#2d3548] border-l border-[#e0e0e0] dark:border-l-[#2d3548] group-hover:bg-[#fafbfc] dark:group-hover:bg-[#1a1f2e]"
                                  >
                                    <span className="text-sm text-[#999] dark:text-[#6b7280]">-</span>
                                  </td>
                                ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })()}
                  </tbody>
                )}
              </table>
            </div>
          </div>

          {/* Bottom margin for comparison cart */}
          <div className="h-24"></div>
        </div>
      </div>

      {/* Recently Viewed Phones */}
      {onNavigate && (
        <div id="recently-viewed">
          <RecentlyViewedPhones
            currentPhone=""
            onNavigate={(phoneId) => navigate(`/phones/${phoneId}`)}
            recentlyViewedPhones={recentlyViewedPhones}
          />
        </div>
      )}

      {/* Table of Contents */}
      <SpecTableOfContents
        specCategories={allCategories}
        mode="comparison"
        phoneCount={phones.length}
        initialExpanded={false}
      />
    </div>
  );
}
