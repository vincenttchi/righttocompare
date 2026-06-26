import { useState, useEffect, useMemo } from "react";
import { Signal, ChevronDown, Check, X, HelpCircle, Info } from "lucide-react";

interface CarrierInfo {
  name: string;
  compatible: boolean;
  notes?: string;
}

interface NetworkBands {
  bands2G?: string[];
  bands3G?: string[];
  bands4G?: string[];
  bands5G?: string[];
}

interface CarrierCompatibilityCheckerProps {
  carrierCompatibility: CarrierInfo[];
  phoneName: string;
  userCarrier?: string;
  onCarrierChange?: (carrier: string) => void;
  networkBands?: NetworkBands;
}

// US carrier band requirements for compatibility matching
const CARRIER_BANDS: Record<string, { 
  name: string; 
  bands4G: string[]; 
  bands5G: string[];
  keyBands: string[];
  description: string;
}> = {
  "Verizon": {
    name: "Verizon",
    bands4G: ["2", "4", "5", "13", "66"],
    bands5G: ["n2", "n5", "n66", "n77", "n260", "n261"],
    keyBands: ["13", "n77"],
    description: "Requires Band 13 (4G) or n77 (5G C-Band) for best coverage",
  },
  "AT&T": {
    name: "AT&T",
    bands4G: ["2", "4", "5", "12", "14", "17", "29", "30", "66"],
    bands5G: ["n2", "n5", "n77", "n260"],
    keyBands: ["12", "17", "n77"],
    description: "Requires Band 12/17 (4G) or n77 (5G C-Band) for best coverage",
  },
  "T-Mobile": {
    name: "T-Mobile",
    bands4G: ["2", "4", "5", "12", "25", "26", "41", "66", "71"],
    bands5G: ["n25", "n41", "n71", "n77", "n258", "n260", "n261"],
    keyBands: ["71", "n41", "n71"],
    description: "Requires Band 71 (4G) or n41/n71 (5G) for best coverage",
  },
  "US Cellular": {
    name: "US Cellular",
    bands4G: ["2", "4", "5", "12"],
    bands5G: ["n71", "n77"],
    keyBands: ["5", "12"],
    description: "Requires Band 5 or 12 (4G) for coverage",
  },
  "Mint Mobile": {
    name: "Mint Mobile",
    bands4G: ["2", "4", "5", "12", "25", "26", "41", "66", "71"],
    bands5G: ["n25", "n41", "n71", "n77"],
    keyBands: ["71", "n41", "n71"],
    description: "Uses T-Mobile network — same band requirements",
  },
  "Cricket Wireless": {
    name: "Cricket Wireless",
    bands4G: ["2", "4", "5", "12", "14", "17", "29", "30", "66"],
    bands5G: ["n2", "n5", "n77"],
    keyBands: ["12", "17"],
    description: "Uses AT&T network — same band requirements",
  },
};

// Compares phone bands against carrier bands to determine compatibility
const matchBands = (phoneBands: NetworkBands, carrierName: string): { 
  compatible: boolean; 
  matchedBands: string[]; 
  missingKeyBands: string[];
  matchPercentage: number;
  notes: string;
} => {
  const carrier = CARRIER_BANDS[carrierName];
  if (!carrier) {
    return { compatible: false, matchedBands: [], missingKeyBands: [], matchPercentage: 0, notes: "Carrier data not available" };
  }

  const allPhoneBands = [
    ...(phoneBands.bands4G || []),
    ...(phoneBands.bands5G || []),
  ].map((b) => b.toLowerCase().trim());

  const allCarrierBands = [
    ...carrier.bands4G,
    ...carrier.bands5G,
  ].map((b) => b.toLowerCase().trim());

  // Find matching bands
  const matchedBands = allCarrierBands.filter((band) => allPhoneBands.includes(band));

  // Check key bands
  const keyBandsLower = carrier.keyBands.map((b) => b.toLowerCase().trim());
  const matchedKeyBands = keyBandsLower.filter((band) => allPhoneBands.includes(band));
  const missingKeyBands = carrier.keyBands.filter((band) => !allPhoneBands.includes(band.toLowerCase().trim()));

  // Calculate match percentage
  const matchPercentage = allCarrierBands.length > 0 
    ? Math.round((matchedBands.length / allCarrierBands.length) * 100) 
    : 0;

  // Determine compatibility — compatible if at least one key band matches
  const compatible = matchedKeyBands.length > 0;

  // Generate notes
  let notes = "";
  if (compatible) {
    const has5G = (phoneBands.bands5G || []).some((b) =>
      carrier.bands5G.map((cb) => cb.toLowerCase()).includes(b.toLowerCase())
    );
    notes = has5G
      ? `Full 5G support — ${matchedBands.length}/${allCarrierBands.length} bands matched`
      : `4G LTE compatible — ${matchedBands.length}/${allCarrierBands.length} bands matched`;
  } else {
    notes = `Missing key bands: ${missingKeyBands.join(", ")}`;
  }

  return { compatible, matchedBands, missingKeyBands, matchPercentage, notes };
};

export default function CarrierCompatibilityChecker({
  carrierCompatibility,
  phoneName,
  userCarrier,
  onCarrierChange,
  networkBands,
}: CarrierCompatibilityCheckerProps) {
  const [selectedCarrier, setSelectedCarrier] = useState<string>(userCarrier || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showBandDetails, setShowBandDetails] = useState(false);

  // Sync with user preference when it loads
  useEffect(() => {
    if (userCarrier) {
      setSelectedCarrier(userCarrier);
    }
  }, [userCarrier]);

  // Determine if we can do real band matching
  const hasBandData = networkBands && (
    (networkBands.bands4G && networkBands.bands4G.length > 0) ||
    (networkBands.bands5G && networkBands.bands5G.length > 0)
  );

  // Generate compatibility data from band matching if available
  const bandMatchResults = useMemo(() => {
    if (!hasBandData || !networkBands) return null;

    const results: Record<string, ReturnType<typeof matchBands>> = {};
    Object.keys(CARRIER_BANDS).forEach((carrierName) => {
      results[carrierName] = matchBands(networkBands, carrierName);
    });
    return results;
  }, [networkBands, hasBandData]);

  // Get the effective carrier data — band matching overrides stored data
  const getCarrierCompatibility = (carrierName: string): { compatible: boolean; notes: string } => {
    // Use band matching if available
    if (bandMatchResults && bandMatchResults[carrierName]) {
      return {
        compatible: bandMatchResults[carrierName].compatible,
        notes: bandMatchResults[carrierName].notes,
      };
    }

    // Fall back to stored data
    const stored = carrierCompatibility.find((c) => c.name.toLowerCase() === carrierName.toLowerCase());
    if (stored) {
      return { compatible: stored.compatible, notes: stored.notes || "" };
    }

    return { compatible: false, notes: "No compatibility data available" };
  };

  // Handle carrier selection
  const handleSelectCarrier = (carrier: string) => {
    setSelectedCarrier(carrier);
    setIsDropdownOpen(false);
    if (onCarrierChange) {
      onCarrierChange(carrier);
    }
  };

  // Build carrier list — combine known carriers with any extras from stored data
  const allCarrierNames = useMemo(() => {
    const known = Object.keys(CARRIER_BANDS);
    const extras = carrierCompatibility
      .filter((c) => !known.some((k) => k.toLowerCase() === c.name.toLowerCase()))
      .map((c) => c.name);
    return [...known, ...extras];
  }, [carrierCompatibility]);

  // No carrier data at all
  if ((!carrierCompatibility || carrierCompatibility.length === 0) && !hasBandData) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Signal className="w-12 h-12 text-[#ccc] dark:text-[#444] mb-4" />
          <p className="text-[#666] dark:text-[#a0a8b8]">No carrier compatibility data available for this phone.</p>
        </div>
      </div>
    );
  }

  // Get selected carrier result
  const selectedResult = selectedCarrier ? getCarrierCompatibility(selectedCarrier) : null;
  const selectedBandMatch = bandMatchResults && selectedCarrier ? bandMatchResults[selectedCarrier] : null;

  // Count compatible carriers
  const compatibleCount = allCarrierNames.filter((name) => getCarrierCompatibility(name).compatible).length;

  return (
    <div className="space-y-6">
      {/* Band Matching Indicator */}
      {hasBandData && (
        <div className="flex items-center gap-2 px-3 py-2 bg-[#2c3968]/5 dark:bg-[#4a7cf6]/10 rounded-lg">
          <Info className="w-4 h-4 text-[#2c3968] dark:text-[#4a7cf6]" />
          <p className="text-xs text-[#2c3968] dark:text-[#4a7cf6]">
            Compatibility determined by matching phone network bands against carrier requirements
          </p>
        </div>
      )}

      {/* Carrier Selector */}
      <div className="bg-gradient-to-br from-[#2c3968] to-[#3d4b7d] dark:from-[#1a1f2e] dark:to-[#252b3d] rounded-xl p-6 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Signal className="w-5 h-5" />
          <p className="text-sm opacity-90">Check Your Carrier</p>
        </div>
        <p className="text-xs opacity-75 mb-4">Select your carrier to see if {phoneName} is compatible</p>

        {/* Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-left"
          >
            <span className={selectedCarrier ? "text-white" : "text-white/60"}>
              {selectedCarrier || "Select your carrier..."}
            </span>
            <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-[#161b26] rounded-xl shadow-lg border border-[#e5e5e5] dark:border-[#2d3548] z-50 max-h-60 overflow-y-auto">
              {allCarrierNames.map((carrier) => {
                const result = getCarrierCompatibility(carrier);
                return (
                  <button
                    key={carrier}
                    onClick={() => handleSelectCarrier(carrier)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#f7f7f7] dark:hover:bg-[#1a1f2e] transition-colors text-sm ${
                      selectedCarrier === carrier ? "bg-[#2c3968]/5 dark:bg-[#4a7cf6]/10" : ""
                    }`}
                  >
                    <span className="text-[#1e1e1e] dark:text-white">{carrier}</span>
                    <div className="flex items-center gap-2">
                      {result.compatible ? (
                        <span className="text-xs text-green-600 dark:text-green-400">Compatible</span>
                      ) : (
                        <span className="text-xs text-red-600 dark:text-red-400">Not Compatible</span>
                      )}
                      {selectedCarrier === carrier && (
                        <Check className="w-4 h-4 text-[#2c3968] dark:text-[#4a7cf6]" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Selected Carrier Result */}
      {selectedCarrier && selectedResult && (
        <div
          className={`rounded-xl p-6 border-2 ${
            selectedResult.compatible
              ? "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20"
              : "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center ${
                selectedResult.compatible
                  ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400"
                  : "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
              }`}
            >
              {selectedResult.compatible ? <Check className="w-7 h-7" /> : <X className="w-7 h-7" />}
            </div>
            <div className="flex-1">
              <h3
                className={`text-lg font-medium ${
                  selectedResult.compatible
                    ? "text-green-700 dark:text-green-400"
                    : "text-red-700 dark:text-red-400"
                }`}
              >
                {selectedResult.compatible ? "Compatible" : "Not Compatible"} with {selectedCarrier}
              </h3>
              {selectedResult.notes && (
                <p className="text-sm text-[#666] dark:text-[#a0a8b8] mt-1">{selectedResult.notes}</p>
              )}
            </div>
          </div>

          {/* Band Match Details (only shown when band data exists) */}
          {selectedBandMatch && (
            <div className="mt-4">
              {/* Match percentage bar */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[#666] dark:text-[#a0a8b8]">Band Coverage</span>
                <span className="text-xs font-medium text-[#2c3968] dark:text-[#4a7cf6]">
                  {selectedBandMatch.matchPercentage}%
                </span>
              </div>
              <div className="w-full h-2 bg-[#e0e0e0] dark:bg-[#2d3548] rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    selectedBandMatch.matchPercentage >= 70
                      ? "bg-green-500"
                      : selectedBandMatch.matchPercentage >= 40
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${selectedBandMatch.matchPercentage}%` }}
                />
              </div>

              {/* Toggle band details */}
              <button
                onClick={() => setShowBandDetails(!showBandDetails)}
                className="text-xs text-[#2c3968] dark:text-[#4a7cf6] hover:underline flex items-center gap-1"
              >
                {showBandDetails ? "Hide" : "Show"} band details
                <ChevronDown className={`w-3 h-3 transition-transform ${showBandDetails ? "rotate-180" : ""}`} />
              </button>

              {showBandDetails && (
                <div className="mt-3 p-3 bg-white/50 dark:bg-[#1a1f2e] rounded-lg text-xs space-y-2">
                  <div>
                    <span className="text-[#666] dark:text-[#a0a8b8]">Matched bands: </span>
                    <span className="text-green-600 dark:text-green-400">
                      {selectedBandMatch.matchedBands.length > 0
                        ? selectedBandMatch.matchedBands.join(", ")
                        : "None"}
                    </span>
                  </div>
                  {selectedBandMatch.missingKeyBands.length > 0 && (
                    <div>
                      <span className="text-[#666] dark:text-[#a0a8b8]">Missing key bands: </span>
                      <span className="text-red-600 dark:text-red-400">
                        {selectedBandMatch.missingKeyBands.join(", ")}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[#666] dark:text-[#a0a8b8]">
                      {CARRIER_BANDS[selectedCarrier]?.description || ""}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Compatibility Overview */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-[#666] dark:text-[#a0a8b8]">
          All carriers ({compatibleCount}/{allCarrierNames.length} compatible)
        </p>
        {hasBandData && (
          <span className="text-xs text-[#999] dark:text-[#707070]">Based on band matching</span>
        )}
      </div>

      {/* All Carriers List */}
      <div className="space-y-3">
        {allCarrierNames.map((carrierName, idx) => {
          const result = getCarrierCompatibility(carrierName);
          return (
            <div
              key={idx}
              className={`group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${
                selectedCarrier.toLowerCase() === carrierName.toLowerCase()
                  ? result.compatible
                    ? "border-green-500 dark:border-green-400 bg-green-50/50 dark:bg-green-900/10 ring-2 ring-green-500/20"
                    : "border-red-500 dark:border-red-400 bg-red-50/50 dark:bg-red-900/10 ring-2 ring-red-500/20"
                  : "border-[#e0e0e0] dark:border-[#2d3548] hover:border-[#2c3968]/20 bg-white dark:bg-[#1a1f2e] hover:bg-gradient-to-r hover:from-[#f7f9fc] hover:to-white"
              }`}
              onClick={() => handleSelectCarrier(carrierName)}
              style={{ cursor: "pointer" }}
            >
              <div className="flex items-center gap-4 flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    result.compatible
                      ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                      : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                  }`}
                >
                  {result.compatible ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-[#1e1e1e] dark:text-white">{carrierName}</p>
                  {result.notes && (
                    <p className="text-sm text-[#999] dark:text-[#707070] mt-0.5">{result.notes}</p>
                  )}
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs ${
                  result.compatible
                    ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                }`}
              >
                {result.compatible ? "Supported" : "Not Supported"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="flex items-start gap-3 p-4 bg-[#f7f9fc] dark:bg-[#1a1f2e] rounded-xl border border-[#2c3968]/10 dark:border-[#4a7cf6]/10">
        <div className="w-5 h-5 rounded-full bg-[#2c3968]/10 dark:bg-[#4a7cf6]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <HelpCircle className="w-3 h-3 text-[#2c3968] dark:text-[#4a7cf6]" />
        </div>
        <p className="text-sm text-[#666] dark:text-[#a0a8b8]">
          {hasBandData
            ? "Compatibility is determined by matching this phone's supported network bands against each carrier's required bands. Results may vary by region."
            : "Compatibility may vary by model variant and region. Verify with your carrier before purchase."}
        </p>
      </div>
    </div>
  );
}