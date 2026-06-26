import { useState, useEffect, useRef } from "react";
import {
  Monitor,
  Zap,
  Filter,
  List,
  Star,
  History,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Cpu,
  BarChart3,
  Camera,
  Battery,
  Palette,
  Wifi,
  Mic,
  Radio,
  Signal,
  DollarSign,
  TableOfContents,
  ArrowUp,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";

interface TOCSection {
  id: string;
  label: string;
  icon: any;
  subSections?: TOCSubSection[];
}

interface TOCSubSection {
  id: string;
  label: string;
}

interface SpecTableOfContentsProps {
  specCategories?: string[];
  mode?: "phone-spec" | "comparison";
  phoneCount?: number; // Number of phones selected in comparison mode
  initialExpanded?: boolean;
}

// Helper function to get icon for category
const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, any> = {
    display: Monitor,
    performance: Cpu,
    benchmarks: BarChart3,
    camera: Camera,
    battery: Battery,
    design: Palette,
    connectivity: Wifi,
    audio: Mic,
    sensors: Radio,
    "carrier-compatibility": Signal,
  };
  return iconMap[category] || List;
};

export default function SpecTableOfContents({
  specCategories = [],
  mode = "phone-spec",
  phoneCount = 0,
  initialExpanded = true,
}: SpecTableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>(mode === "comparison" ? "comparison-header" : "overview");
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);
  const [isFullSpecsPopoverOpen, setIsFullSpecsPopoverOpen] = useState<boolean>(false);
  const [isFullSpecsPopoverOpenCollapsed, setIsFullSpecsPopoverOpenCollapsed] = useState<boolean>(false);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Build sections based on mode
  const sections: TOCSection[] =
    mode === "comparison"
      ? [
          { id: "comparison-header", label: "Phones", icon: Smartphone },
          // Only show Quick Overview if phones are selected
          ...(phoneCount > 0 ? [{ id: "quick-overview", label: "Quick Overview", icon: Zap }] : []),
          // Flatten spec categories for comparison mode
          ...specCategories.map((category) => ({
            id: `spec-${category}`,
            label: category.charAt(0).toUpperCase() + category.slice(1),
            icon: getCategoryIcon(category),
          })),
          { id: "recently-viewed", label: "Recently Viewed", icon: History },
        ]
      : [
          { id: "overview", label: "Overview", icon: Monitor },
          { id: "key-specs", label: "Key Specs", icon: Zap },
          { id: "price-tracking", label: "Price Tracking", icon: DollarSign },
          { id: "filter-specs", label: "Filter Specs", icon: Filter },
          {
            id: "full-specs",
            label: "Full Specs",
            icon: List,
            subSections: specCategories.map((category) => ({
              id: `spec-${category}`,
              label: category.charAt(0).toUpperCase() + category.slice(1),
            })),
          },
          { id: "carrier-compat", label: "Carrier Compatibility", icon: Signal },
          { id: "reviews", label: "Reviews", icon: Star },
          { id: "recently-viewed", label: "Recently Viewed", icon: History },
        ];

  useEffect(() => {
    const handleScroll = () => {
      // Ignore scroll events during programmatic scrolling
      if (isScrollingRef.current) {
        return;
      }

      const scrollPosition = window.scrollY + 200; // Offset for better UX
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Check if we're near the top of the page
      if (window.scrollY < 150) {
        // If near top, always highlight the first section
        if (sections.length > 0) {
          setActiveSection(sections[0].id);
        }
        return;
      }

      // Check if we're near the bottom of the page
      if (scrollPosition + windowHeight >= documentHeight - 100) {
        // If near bottom, always highlight the last section
        if (sections.length > 0) {
          setActiveSection(sections[sections.length - 1].id);
        }
        return;
      }

      // Find which section is currently in view
      let foundSection = false;
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i].id);
        if (section) {
          const sectionTop = section.offsetTop;

          // Check if we've scrolled past the top of this section
          if (scrollPosition >= sectionTop) {
            setActiveSection(sections[i].id);
            foundSection = true;
            break;
          }
        }
      }

      // If no section found, default to first section
      if (!foundSection && sections.length > 0) {
        setActiveSection(sections[0].id);
      }

      // Show back-to-top after scrolling past first section
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener("scroll", handleScroll);
  }, [sections, mode, phoneCount]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Offset for spacing
      const elementPosition = element.offsetTop - offset;
      const currentPosition = window.scrollY;
      const distance = Math.abs(elementPosition - currentPosition);

      // Calculate timeout based on distance (smooth scroll typically takes 300-1000ms)
      // Using a formula: base 500ms + additional time based on distance
      const scrollDuration = Math.min(1500, 500 + (distance / 1000) * 300);

      // Immediately set the active section when clicking
      setActiveSection(id);

      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set flag to ignore scroll events during smooth scrolling
      isScrollingRef.current = true;

      window.scrollTo({
        top: elementPosition,
        behavior: "smooth",
      });

      // Clear the flag after smooth scroll completes
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        scrollTimeoutRef.current = null;
      }, scrollDuration);
    }
  };

  return (
    <>
      <div
        style={{ position: "fixed", top: "96px", right: "16px", zIndex: 9999, width: isExpanded ? "240px" : "56px" }}
        className="transition-all duration-300 hidden lg:block"
      >
        <div className="bg-white dark:bg-[#161b26] rounded-2xl border-2 border-[#2c3968]/20 dark:border-[#4a7cf6]/20 shadow-lg overflow-hidden">
          {isExpanded ? (
            <>
              <div className="p-5">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#2c3968]/10 dark:border-[#4a7cf6]/10">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-[#2c3968] to-[#3d4b7f] dark:from-[#4a7cf6] dark:to-[#5b8df7] rounded-full"></div>
                    <h3 className="text-[#2c3968] dark:text-[#4a7cf6]">On This Page</h3>
                  </div>
                  {/* Toggle Button */}
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-8 h-8 bg-[#2c3968] dark:bg-[#4a7cf6] text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center hover:bg-[#3d4b7f] dark:hover:bg-[#5b8df7] cursor-pointer"
                    title="Collapse"
                  >
                    <ChevronRight className="w-7 h-7 stroke-[4]" />
                  </button>
                </div>
                <nav className="space-y-1.5">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;
                    const hasSubSections = section.subSections && section.subSections.length > 0;

                    return (
                      <div key={section.id}>
                        {hasSubSections ? (
                          <Popover open={isFullSpecsPopoverOpen} onOpenChange={setIsFullSpecsPopoverOpen}>
                            <div
                              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-300 ${
                                isActive
                                  ? "bg-gradient-to-r from-[#2c3968] to-[#3d4b7f] text-white shadow-md scale-[1.02]"
                                  : "text-[#666] hover:bg-gradient-to-r hover:from-[#f5f7fa] hover:to-white hover:text-[#2c3968] hover:shadow-sm hover:scale-[1.01]"
                              }`}
                            >
                              <button
                                onClick={() => scrollToSection(section.id)}
                                className="flex items-center gap-3 flex-1 cursor-pointer"
                              >
                                <div
                                  className={`p-1.5 rounded-lg transition-all duration-300 ${
                                    isActive
                                      ? "bg-white/20"
                                      : "bg-[#2c3968]/5 dark:bg-[#4a7cf6]/10 group-hover:bg-[#2c3968]/10 dark:group-hover:bg-[#4a7cf6]/15"
                                  }`}
                                >
                                  <Icon
                                    className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-[#2c3968]/60 dark:text-[#4a7cf6]/60 group-hover:text-[#2c3968] dark:group-hover:text-[#4a7cf6]"}`}
                                  />
                                </div>
                                <span className="text-sm flex-1">{section.label}</span>
                              </button>
                              <PopoverTrigger asChild>
                                <button
                                  className={`p-1 hover:bg-white/10 rounded transition-colors cursor-pointer ${isActive ? "text-white" : "text-[#2c3968]/60 dark:text-[#4a7cf6]/60"}`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                              </PopoverTrigger>
                            </div>
                            <PopoverContent
                              side="right"
                              align="start"
                              className="w-48 p-2 ml-2 dark:bg-[#161b26] dark:border-[#2d3548]"
                              onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                              <div className="space-y-1">
                                {/* Full Specs option */}
                                <button
                                  onClick={() => {
                                    scrollToSection(section.id);
                                    setIsFullSpecsPopoverOpen(false);
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200 hover:bg-[#f5f7fa] dark:hover:bg-[#1a1f2e] text-[#2c3968] dark:text-[#4a7cf6] cursor-pointer"
                                >
                                  <List className="w-3.5 h-3.5" />
                                  <span className="text-sm">All Specifications</span>
                                </button>

                                <div className="h-px bg-[#e0e0e0] dark:bg-[#2d3548] my-1" />

                                {/* Subsections */}
                                {section.subSections?.map((subSection) => {
                                  const isSubActive = activeSection === subSection.id;
                                  return (
                                    <button
                                      key={subSection.id}
                                      onClick={() => {
                                        scrollToSection(subSection.id);
                                        setIsFullSpecsPopoverOpen(false);
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200 cursor-pointer${
                                        isSubActive
                                          ? "bg-[#2c3968]/10 dark:bg-[#4a7cf6]/10 text-[#2c3968] dark:text-[#4a7cf6]"
                                          : "text-[#666] dark:text-[#a0a8b8] hover:bg-[#f5f7fa] dark:hover:bg-[#1a1f2e] hover:text-[#2c3968] dark:hover:text-[#4a7cf6]"
                                      }`}
                                    >
                                      <div
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          isSubActive
                                            ? "bg-[#2c3968] dark:bg-[#4a7cf6]"
                                            : "bg-[#999]/40 dark:bg-[#6b7280]/40"
                                        }`}
                                      />
                                      <span className="text-xs capitalize">{subSection.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <button
                            onClick={() => scrollToSection(section.id)}
                            className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-300 cursor-pointer ${
                              isActive
                                ? "bg-gradient-to-r from-[#2c3968] to-[#3d4b7f] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-md scale-[1.02]"
                                : "text-[#666] dark:text-[#a0a8b8] hover:bg-gradient-to-r hover:from-[#f5f7fa] hover:to-white dark:hover:from-[#1a1f2e] dark:hover:to-[#161b26] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] hover:shadow-sm hover:scale-[1.01]"
                            }`}
                          >
                            <div
                              className={`p-1.5 rounded-lg transition-all duration-300 ${
                                isActive
                                  ? "bg-white/20"
                                  : "bg-[#2c3968]/5 dark:bg-[#4a7cf6]/10 group-hover:bg-[#2c3968]/10 dark:group-hover:bg-[#4a7cf6]/15"
                              }`}
                            >
                              <Icon
                                className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-[#2c3968]/60 dark:text-[#4a7cf6]/60 group-hover:text-[#2c3968] dark:group-hover:text-[#4a7cf6]"}`}
                              />
                            </div>
                            <span className="text-sm flex-1">{section.label}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>

              {/* Progress indicator */}
              <div className="pb-4 px-7">
                <div className="relative h-2 bg-gradient-to-r from-[#e0e0e0] to-[#f0f0f0] dark:from-[#2d3548] dark:to-[#1a1f2e] rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-[#2c3968] to-[#3d4b7f] dark:from-[#4a7cf6] dark:to-[#5b8df7] transition-all duration-500 ease-out rounded-full shadow-sm"
                    style={{
                      width: `${((sections.findIndex((s) => s.id === activeSection) + 1) / sections.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-xs text-[#999] dark:text-[#6b7280]">
                    {sections.findIndex((s) => s.id === activeSection) + 1} / {sections.length}
                  </span>
                  <span className="text-xs text-[#999] dark:text-[#6b7280]">
                    {Math.round(((sections.findIndex((s) => s.id === activeSection) + 1) / sections.length) * 100)}%
                  </span>
                </div>
              </div>

              {/* Back to Top button */}
              {showBackToTop && (
                <div className="px-5 pb-5">
                  <button
                    onClick={scrollToTop}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm text-[#2c3968] dark:text-[#4a7cf6] bg-[#2c3968]/5 dark:bg-[#4a7cf6]/10 hover:bg-[#2c3968]/10 dark:hover:bg-[#4a7cf6]/15 transition-colors duration-200 border border-[#2c3968]/10 dark:border-[#4a7cf6]/10 cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    Back to Top
                  </button>
                </div>
              )}
            </>
          ) : (
            // Collapsed view - show icons only
            <div className="p-3">
              {/* Toggle Button - Collapsed State */}
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full h-10 bg-[#2c3968] dark:bg-[#4a7cf6] text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center hover:bg-[#3d4b7f] dark:hover:bg-[#5b8df7] mb-4 cursor-pointer"
                title="Expand"
              >
                <ChevronLeft className="w-7 h-7 stroke-[4]" />
              </button>

              <div className="flex flex-col items-center gap-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  const hasSubSections = section.subSections && section.subSections.length > 0;

                  return (
                    <div key={section.id} className="w-full flex flex-col items-center gap-1">
                      {hasSubSections ? (
                        <Popover
                          open={isFullSpecsPopoverOpenCollapsed}
                          onOpenChange={setIsFullSpecsPopoverOpenCollapsed}
                        >
                          <div className="relative">
                            <button
                              onClick={() => scrollToSection(section.id)}
                              className={`group w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 cursor-pointer ${
                                isActive
                                  ? "bg-gradient-to-r from-[#2c3968] to-[#3d4b7f] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-md scale-110"
                                  : "text-[#2c3968]/60 dark:text-[#4a7cf6]/60 hover:bg-gradient-to-r hover:from-[#f5f7fa] hover:to-white dark:hover:from-[#1a1f2e] dark:hover:to-[#161b26] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] hover:shadow-sm hover:scale-105"
                              }`}
                              title={section.label}
                            >
                              <Icon className="w-4 h-4 flex-shrink-0" />
                            </button>
                            <PopoverTrigger asChild>
                              <button
                                className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                                  isActive
                                    ? "bg-white text-[#2c3968] dark:bg-[#161b26] dark:text-[#4a7cf6]"
                                    : "bg-[#2c3968] dark:bg-[#4a7cf6] text-white hover:bg-[#3d4b7f] dark:hover:bg-[#5b8df7]"
                                }`}
                                title="Show subsections"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ChevronDown className="w-2.5 h-2.5" />
                              </button>
                            </PopoverTrigger>
                          </div>
                          <PopoverContent
                            side="right"
                            align="start"
                            className="w-48 p-2 ml-2 dark:bg-[#161b26] dark:border-[#2d3548]"
                            onOpenAutoFocus={(e) => e.preventDefault()}
                          >
                            <div className="space-y-1">
                              {/* Full Specs option */}
                              <button
                                onClick={() => {
                                  scrollToSection(section.id);
                                  setIsFullSpecsPopoverOpenCollapsed(false);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200 hover:bg-[#f5f7fa] dark:hover:bg-[#1a1f2e] text-[#2c3968] dark:text-[#4a7cf6] cursor-pointer"
                              >
                                <List className="w-3.5 h-3.5" />
                                <span className="text-sm">All Specifications</span>
                              </button>

                              <div className="h-px bg-[#e0e0e0] dark:bg-[#2d3548] my-1" />

                              {/* Subsections */}
                              {section.subSections?.map((subSection) => {
                                const isSubActive = activeSection === subSection.id;
                                return (
                                  <button
                                    key={subSection.id}
                                    onClick={() => {
                                      scrollToSection(subSection.id);
                                      setIsFullSpecsPopoverOpenCollapsed(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-200 cursor-pointer ${
                                      isSubActive
                                        ? "bg-[#2c3968]/10 text-[#2c3968]"
                                        : "text-[#666] hover:bg-[#f5f7fa] hover:text-[#2c3968]"
                                    }`}
                                  >
                                    <div
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isSubActive
                                          ? "bg-[#2c3968] dark:bg-[#4a7cf6]"
                                          : "bg-[#999]/40 dark:bg-[#6b7280]/40"
                                      }`}
                                    />
                                    <span className="text-xs capitalize">{subSection.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <button
                          onClick={() => scrollToSection(section.id)}
                          className={`group w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 cursor-pointer ${
                            isActive
                              ? "bg-gradient-to-r from-[#2c3968] to-[#3d4b7f] text-white shadow-md scale-110"
                              : "text-[#2c3968]/60 hover:bg-gradient-to-r hover:from-[#f5f7fa] hover:to-white hover:text-[#2c3968] hover:shadow-sm hover:scale-105"
                          }`}
                          title={section.label}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Back to Top - collapsed */}
              {showBackToTop && (
                <div className="mt-2">
                  <button
                    onClick={scrollToTop}
                    className="w-10 h-10 flex items-center justify-center rounded-xl text-[#2c3968]/60 dark:text-[#4a7cf6]/60 hover:bg-[#f5f7fa] dark:hover:bg-[#1a1f2e] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] transition-all duration-300 hover:scale-105 cursor-pointer"
                    title="Back to Top"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile floating TOC button — visible only below xl */}
      <div className="lg:hidden fixed bottom-6 left-4 z-40">
        <Sheet open={isMobileSheetOpen} onOpenChange={setIsMobileSheetOpen}>
          <SheetTrigger asChild>
            <button
              className="w-12 h-12 bg-[#2c3968] dark:bg-[#4a7cf6] text-white rounded-full shadow-xl hover:shadow-2xl hover:bg-[#3d4b7f] dark:hover:bg-[#5b8df7] transition-all duration-300 hover:scale-110 flex items-center justify-center cursor-pointer"
              title="Table of Contents"
            >
              <TableOfContents className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-0 flex flex-col dark:bg-[#161b26] dark:border-[#2d3548]">
            <SheetHeader className="p-5 pb-3 border-b border-[#e0e0e0] dark:border-[#2d3548]">
              <SheetTitle className="text-[#2c3968] dark:text-[#4a7cf6] flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-[#2c3968] to-[#3d4b7f] dark:from-[#4a7cf6] dark:to-[#5b8df7] rounded-full" />
                On This Page
              </SheetTitle>
            </SheetHeader>

            {/* Progress bar */}
            <div className="px-5 py-3 border-b border-[#e0e0e0] dark:border-[#2d3548]">
              <div className="relative h-1.5 bg-[#e0e0e0] dark:bg-[#2d3548] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2c3968] to-[#3d4b7f] dark:from-[#4a7cf6] dark:to-[#5b8df7] transition-all duration-500 rounded-full"
                  style={{
                    width: `${((sections.findIndex((s) => s.id === activeSection) + 1) / sections.length) * 100}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-[#999] dark:text-[#6b7280]">
                  {sections.findIndex((s) => s.id === activeSection) + 1} / {sections.length}
                </span>
                <span className="text-xs text-[#999] dark:text-[#6b7280]">
                  {Math.round(((sections.findIndex((s) => s.id === activeSection) + 1) / sections.length) * 100)}%
                </span>
              </div>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const hasSubSections = section.subSections && section.subSections.length > 0;
                return (
                  <div key={section.id}>
                    <button
                      onClick={() => {
                        scrollToSection(section.id);
                        setIsMobileSheetOpen(false);
                      }}
                      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-[#2c3968] to-[#3d4b7f] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white shadow-md"
                          : "text-[#666] dark:text-[#a0a8b8] hover:bg-[#f5f7fa] dark:hover:bg-[#1a1f2e] hover:text-[#2c3968] dark:hover:text-[#4a7cf6]"
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg ${isActive ? "bg-white/20" : "bg-[#2c3968]/5 dark:bg-[#4a7cf6]/10 group-hover:bg-[#2c3968]/10 dark:group-hover:bg-[#4a7cf6]/15"}`}
                      >
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-white" : "text-[#2c3968]/60 dark:text-[#4a7cf6]/60 group-hover:text-[#2c3968] dark:group-hover:text-[#4a7cf6]"}`}
                        />
                      </div>
                      <span className="text-sm flex-1">{section.label}</span>
                    </button>
                    {hasSubSections && (
                      <div className="ml-9 mt-1 space-y-0.5">
                        {section.subSections?.map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => {
                              scrollToSection(sub.id);
                              setIsMobileSheetOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                              activeSection === sub.id
                                ? "text-[#2c3968] dark:text-[#4a7cf6] bg-[#2c3968]/10 dark:bg-[#4a7cf6]/10"
                                : "text-[#999] dark:text-[#6b7280] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] hover:bg-[#f5f7fa] dark:hover:bg-[#1a1f2e]"
                            }`}
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeSection === sub.id ? "bg-[#2c3968] dark:bg-[#4a7cf6]" : "bg-[#ccc] dark:bg-[#6b7280]"}`}
                            />
                            <span className="capitalize">{sub.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Back to top */}
            {showBackToTop && (
              <div className="p-4 border-t border-[#e0e0e0] dark:border-[#2d3548]">
                <button
                  onClick={() => {
                    scrollToTop();
                    setIsMobileSheetOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm text-[#2c3968] dark:text-[#4a7cf6] bg-[#2c3968]/5 dark:bg-[#4a7cf6]/10 hover:bg-[#2c3968]/10 dark:hover:bg-[#4a7cf6]/15 transition-colors border border-[#2c3968]/10 dark:border-[#4a7cf6]/10 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  Back to Top
                </button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
