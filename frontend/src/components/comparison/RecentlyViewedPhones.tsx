import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getPhoneSummaries } from "../../api/phoneApi";
import { PhoneSummary } from "../../types/phoneTypes";

interface RecentPhoneCard {
  id: string;
  name: string;
  image: string;
  phoneId: string;
}

interface RecentlyViewedPhonesProps {
  currentPhone: string;
  onNavigate: (phoneId: string) => void;
  recentlyViewedPhones?: string[];
}

const phoneNames: Record<string, string> = {
  "galaxy-s24-ultra": "Galaxy S24 Ultra",
  "galaxy-s25": "Galaxy S25",
  "iphone-16": "iPhone 16",
  "pixel-10": "Pixel 10",
};

export default function RecentlyViewedPhones({
  currentPhone,
  onNavigate,
  recentlyViewedPhones,
}: RecentlyViewedPhonesProps) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [recentPhones, setRecentPhones] = useState<RecentPhoneCard[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const recentPhoneIds = useMemo(() => {
    if (!recentlyViewedPhones || recentlyViewedPhones.length === 0) {
      return [];
    }

    return recentlyViewedPhones
      .filter((phoneId): phoneId is string => typeof phoneId === "string" && phoneId.trim().length > 0)
      .slice(0, 8);
  }, [recentlyViewedPhones]);

  useEffect(() => {
    let isActive = true;

    const loadRecentPhones = async () => {
      if (recentPhoneIds.length === 0) {
        if (isActive) setRecentPhones([]);
        return;
      }

      try {
        setLoading(true);
        const summaries = await getPhoneSummaries(recentPhoneIds);
        if (!isActive) return;

        const phoneMap = new Map<string, PhoneSummary>(summaries.map((phone) => [phone.id, phone]));
        const backendPhones: RecentPhoneCard[] = recentPhoneIds
          .map((phoneId) => {
            const phone = phoneMap.get(phoneId);
            if (!phone?.images?.main) return null;

            return {
              id: phone.id,
              name: phone.name,
              image: phone.images.main,
              phoneId: phone.id,
            };
          })
          .filter((phone): phone is RecentPhoneCard => phone !== null);

        setRecentPhones(backendPhones);
      } catch (error) {
        console.error("Failed to load recently viewed phones from API:", error);
        if (isActive) setRecentPhones([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadRecentPhones();

    return () => {
      isActive = false;
    };
  }, [recentPhoneIds]);

  // Check if content is scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (scrollContainerRef.current) {
        const isScrollable = scrollContainerRef.current.scrollWidth > scrollContainerRef.current.clientWidth;
        setCanScroll(isScrollable);
      }
    };

    checkScrollable();
    window.addEventListener("resize", checkScrollable);

    return () => window.removeEventListener("resize", checkScrollable);
  }, [recentPhones]);

  useEffect(() => {
    setScrollPosition(0);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: "auto" });
    }
  }, [recentPhones]);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 200; // Adjust scroll amount as needed
    const newPosition =
      direction === "left" ? Math.max(0, scrollPosition - scrollAmount) : scrollPosition + scrollAmount;

    scrollContainerRef.current.scrollTo({
      left: newPosition,
      behavior: "smooth",
    });

    setScrollPosition(newPosition);
  };

  const showLeftArrow = canScroll && scrollPosition > 0;
  const showRightArrow =
    canScroll && scrollContainerRef.current
      ? scrollPosition < scrollContainerRef.current.scrollWidth - scrollContainerRef.current.clientWidth - 1
      : false;
  return (
    <div className="px-6 py-12">
      <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-6 md:p-10 transition-colors duration-300">
        {/* Title */}
        <div className="mb-8">
          <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Recently Viewed</h2>
          <div className="h-1 w-20 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full"></div>
        </div>

        {/* Container with refined border and enhanced background */}
        <div className="relative border-2 border-[#e0e0e0] dark:border-[#2d3548] rounded-[40px] px-4 md:px-8 lg:px-16 py-8 md:py-12 bg-gradient-to-br from-[#f5f7fa] via-[#fafbfc] to-[#f0f2f5] dark:from-[#1a1f2e] dark:via-[#1e2530] dark:to-[#1a1f2e] shadow-inner overflow-hidden transition-colors duration-300">
          {/* Decorative subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-30 pointer-events-none rounded-[40px]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(44, 57, 104, 0.05) 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          ></div>

          {/* Left Arrow */}
          {showLeftArrow && (
            <button
              onClick={() => handleScroll("left")}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-[#252b3d] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-[#2c3968]/10 dark:border-[#4a7cf6]/10 hover:border-[#2c3968]/30 dark:hover:border-[#4a7cf6]/30"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6 text-[#2c3968] dark:text-[#4a7cf6]" />
            </button>
          )}

          {/* Scrollable Container */}
          <div
            ref={scrollContainerRef}
            className="relative flex items-start gap-4 md:gap-6 lg:gap-8 overflow-x-auto scrollbar-hide scroll-smooth px-2 md:px-4 py-8 md:py-10"
            onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            {recentPhones.map((phone, index) => (
              <div
                key={phone.id}
                className="group flex flex-col items-center min-w-[120px] sm:min-w-[140px] md:min-w-[150px] w-[120px] sm:w-[140px] md:w-[150px] cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:z-10"
                style={{
                  position: "relative",
                  zIndex: phone.phoneId === currentPhone ? 999 : recentPhones.length - index,
                  opacity: phone.phoneId === currentPhone ? 1 : Math.max(0.55, 1 - index * 0.1),
                }}
                onClick={() => {
                  if (phone.phoneId === currentPhone) {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    onNavigate(phone.phoneId);
                  }
                }}
              >
                {/* Phone Card */}
                <div className="bg-white dark:bg-[#252b3d] rounded-2xl p-3 md:p-5 shadow-md group-hover:shadow-xl transition-all duration-300 w-full border border-transparent group-hover:border-[#2c3968]/10 dark:group-hover:border-[#4a7cf6]/10 h-full flex flex-col">
                  {/* Badge for current or most recent phone */}
                  {phone.phoneId === currentPhone ? (
                    <div className="absolute -top-2 md:-top-3 -right-2 md:-right-3 bg-[#2c3968] dark:bg-[#4a7cf6] text-white px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs z-10 shadow-md">
                      Current
                    </div>
                  ) : (
                    index === 0 &&
                    phone.phoneId !== currentPhone && (
                      <div className="absolute -top-2 md:-top-3 -right-2 md:-right-3 bg-[#2c3968] dark:bg-[#4a7cf6] text-white px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs z-10 shadow-md">
                        Latest
                      </div>
                    )
                  )}

                  {/* Phone Image */}
                  <div className="w-full h-[100px] sm:h-[120px] md:h-[140px] mb-3 md:mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#1a1f2e] dark:to-[#1e2530] flex items-center justify-center">
                    <img
                      src={phone.image}
                      alt={phone.name}
                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  {/* Phone Name */}
                  <p className="text-center text-[#2c3968] dark:text-[#4a7cf6] text-xs md:text-sm transition-colors duration-300 group-hover:text-[#1e2547] dark:group-hover:text-[#5b8df7] mt-auto h-[35px] md:h-[40px] flex items-center justify-center leading-tight">
                    {phone.name}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Right Arrow */}
          {showRightArrow && (
            <button
              onClick={() => handleScroll("right")}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-white dark:bg-[#252b3d] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 border-2 border-[#2c3968]/10 dark:border-[#4a7cf6]/10 hover:border-[#2c3968]/30 dark:hover:border-[#4a7cf6]/30"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6 text-[#2c3968] dark:text-[#4a7cf6]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
