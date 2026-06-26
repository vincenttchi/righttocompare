import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Loader2 } from "lucide-react";
import { getPhonePage } from "../../api/phoneApi";
import { PhoneCard } from "../../types/phoneTypes";
import { useDarkMode } from "../../context/DarkModeContext";
import { darkModeColors } from "../../config/darkModeConfig";

// --- CONFIGURATION ---
const SEARCH_DEBOUNCE_TIMER_MS = 400;
const SEARCH_RESULT_LIMIT = 5;

interface Props {
  onSelect: (id: string) => void;
}

export function DebouncedPhoneSearch({ onSelect }: Props) {
  const { isDarkMode } = useDarkMode();
  const colors = darkModeColors;

  const [searchTerm, setSearchTerm] = useState("");
  const [lastSelectedName, setLastSelectedName] = useState("");
  const [results, setResults] = useState<PhoneCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const shouldSearch = useRef(true);

  // ------------------------------------------------------------
  // | THEME DERIVATION
  // ------------------------------------------------------------
  const theme = useMemo(
    () => ({
      inputBg: isDarkMode ? colors.background.card.dark : colors.background.card.light,
      dropdownBg: isDarkMode ? colors.background.card.dark : colors.background.card.light,
      itemElevated: isDarkMode ? colors.background.elevated.dark : colors.background.elevated.light,

      borderMain: isDarkMode ? colors.border.default.dark : colors.border.default.light,
      borderSubtle: isDarkMode ? colors.border.subtle.dark : colors.border.subtle.light,

      textPrimary: isDarkMode ? colors.text.primary.dark : colors.text.primary.light,
      textMuted: isDarkMode ? colors.text.secondary.dark : colors.text.secondary.light,

      hoverState: isDarkMode ? colors.interactive.hover.dark : colors.interactive.hover.light,
      activeBadge: isDarkMode ? colors.interactive.active.dark : colors.interactive.active.light,
      brand: isDarkMode ? colors.text.brand.dark : colors.text.brand.light,
    }),
    [isDarkMode, colors],
  );

  // ------------------------------------------------------------
  // | DATA SYNCHRONIZATION
  // ------------------------------------------------------------
  /**
   * SYNC: Phone Search Results
   * Signal: searchTerm change
   * Action: Debounces the input string and fetches matching PhoneCard
   * metadata from the backend. Prevents API execution if the term matches
   * the currently active selection.
   */
  useEffect(() => {
    // Skips if search was just executed or matches current selection
    if (!shouldSearch.current || searchTerm === lastSelectedName) {
      shouldSearch.current = true;
      return;
    }

    if (!searchTerm.trim()) {
      setResults([]);
      setIsOpen(false);
      onSelect("");
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await getPhonePage(1, SEARCH_RESULT_LIMIT, { search: searchTerm });
        setResults(response.phones);
        setIsOpen(true);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, SEARCH_DEBOUNCE_TIMER_MS);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, onSelect, lastSelectedName]);

  /**
   * SYNC: UI Interaction (Click Outside)
   * Signal: document mousedown event
   * Action: Detects if a user clicks outside of the search container
   * and automatically closes the results dropdown to maintain focus.
   */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ------------------------------------------------------------
  // | UI
  // ------------------------------------------------------------
  return (
    <div className="relative w-full max-w-md" ref={dropdownRef}>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          {isSearching ? (
            <Loader2 className="animate-spin text-[#4a7cf6]" size={18} />
          ) : (
            <Search size={18} style={{ color: theme.textMuted }} className="transition-colors duration-300" />
          )}
        </div>
        <input
          type="text"
          placeholder="Search for a phone to analyze..."
          style={{
            backgroundColor: theme.inputBg,
            borderColor: theme.borderMain,
            color: theme.textPrimary,
          }}
          className="w-full border rounded-2xl pl-12 pr-4 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-[#4a7cf6] outline-none transition-all duration-300"
          value={searchTerm}
          onChange={(e) => {
            shouldSearch.current = true;
            setSearchTerm(e.target.value);
          }}
          onFocus={() => searchTerm && results.length > 0 && searchTerm !== lastSelectedName && setIsOpen(true)}
        />
      </div>

      {/* Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          style={{ backgroundColor: theme.dropdownBg, borderColor: theme.borderMain }}
          className="absolute top-full mt-2 w-full border rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="p-2 border-b" style={{ borderColor: theme.borderSubtle }}>
            <span className="text-[10px] font-black uppercase px-2" style={{ color: theme.textMuted }}>
              Top Matches
            </span>
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {results.map((phone) => (
              <button
                key={phone.id}
                onClick={() => {
                  shouldSearch.current = false;
                  setLastSelectedName(phone.name);
                  setResults([]);
                  onSelect(phone.id);
                  setSearchTerm(phone.name);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left transition-colors flex items-center gap-4 group cursor-pointer"
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = theme.hoverState)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {/* PHONE THUMBNAIL */}
                <div
                  style={{ backgroundColor: theme.itemElevated, borderColor: theme.borderSubtle }}
                  className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center border p-1 shadow-inner transition-colors"
                >
                  {phone.images?.main ? (
                    <img
                      src={phone.images.main}
                      alt={phone.name}
                      className="w-full h-full object-contain transition-transform group-hover:scale-110 duration-300"
                    />
                  ) : (
                    <div className="text-[8px] font-black text-gray-400 uppercase text-center leading-tight">
                      No Img
                    </div>
                  )}
                </div>

                {/* PHONE LABELS */}
                <div className="flex flex-col flex-1 min-w-0">
                  <span
                    className="text-sm font-bold truncate group-hover:text-[#4a7cf6] transition-colors"
                    style={{ color: theme.textPrimary }}
                  >
                    {phone.name}
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-tight truncate"
                    style={{ color: theme.textMuted }}
                  >
                    {phone.manufacturer}
                  </span>
                </div>

                <div
                  className="flex-shrink-0 text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-all"
                  style={{
                    backgroundColor: theme.activeBadge,
                    color: theme.brand,
                  }}
                >
                  SELECT
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
