import { Smartphone, Cpu, HardDrive, DollarSign } from "lucide-react";
import ReactSlider from "react-slider";

interface CatalogFilterProps {
  // Manufacturer filter
  availableManufacturers: string[];
  selectedManufacturers: string[];
  setSelectedManufacturers: (val: string[]) => void;

  // Numeric Filters
  minPrice: number;
  setMinPrice: (val: number) => void;
  maxPrice: number;
  setMaxPrice: (val: number) => void;
  selectedRAM: number[];
  setSelectedRAM: (ram: number[]) => void;
  selectedStorage: number[];
  setSelectedStorage: (storage: number[]) => void;
  onClearAll: () => void;
}

/**
 * Catalog Filter
 *
 * This component is used on the catalog page for users to narrow down
 * their phone results based on hardware specs, price, and brand.
 *
 * NOTE: RAM and storage use numeric arrays!!
 */
export const CatalogFilters = ({
  availableManufacturers,
  selectedManufacturers,
  setSelectedManufacturers,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  selectedRAM,
  setSelectedRAM,
  selectedStorage,
  setSelectedStorage,
  onClearAll,
}: CatalogFilterProps) => {
  /**
   * Toggles string or number value within a filter array. If value exists exists it is removed; otherwise add it
   * @param value The numeric hardware spec to filter
   * @param currentArray The current array of selected filters
   * @param setter Using react state setter to set new filter array
   */
  const toggleFilter = <T,>(value: T, currentArray: T[], setter: (arr: T[]) => void) => {
    const next = currentArray.includes(value) ? currentArray.filter((v) => v !== value) : [...currentArray, value];
    setter(next);
  };

  return (
    <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm border border-[#e5e5e5] dark:border-[#2d3548] p-8 mb-8 transition-all">
      <div className="flex flex-col space-y-12">
        {/* BRAND SECTION */}
        <div className="space-y-4" style={{ marginBottom: "48px" }}>
          <div className="flex items-center gap-2 text-[#666] dark:text-[#a0a8b8]">
            <Smartphone size={14} className="text-[#2c3968] dark:text-[#4a7cf6]" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Manufacturers</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableManufacturers.map((brand) => (
              <button
                key={brand}
                onClick={() => toggleFilter(brand, selectedManufacturers, setSelectedManufacturers)}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 border ${
                  selectedManufacturers.includes(brand)
                    ? "bg-[#2c3968] dark:bg-[#4a7cf6] text-white border-transparent shadow-md"
                    : "bg-transparent text-[#666] dark:text-[#a0a8b8] border-[#e5e5e5] dark:border-[#2d3548] hover:border-[#2c3968]"
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        {/* HARDWARE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-x-12 gap-y-8">
          {/* PRICE RANGE SECTION */}
          <div className="flex flex-col gap-4 min-w-0" style={{ paddingRight: "40px" }}>
            <div className="flex justify-between items-center text-[#666] dark:text-[#a0a8b8]">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-[#2c3968] dark:text-[#4a7cf6]" />
                <span className="text-[11px] font-bold uppercase tracking-wider">Budget</span>
              </div>

              {/* Text to show ranges*/}
              <span className="font-bold text-[#1e1e1e] dark:text-white" style={{ fontSize: "13px", lineHeight: "1" }}>
                ${minPrice} - ${maxPrice}
              </span>
            </div>

            <div className="pt-4">
              <ReactSlider
                className="horizontal-slider"
                thumbClassName="price-thumb"
                trackClassName="price-track"
                min={0}
                max={2500}
                step={50}
                value={[minPrice, maxPrice]}
                ariaLabel={["Lower thumb", "Upper thumb"]}
                renderThumb={({ key, ...restProps }, state) => (
                  <div key={key} {...restProps} className="price-thumb">
                    <span className="thumb-label">${state.valueNow}</span>
                  </div>
                )}
                pearling
                minDistance={100}
                onChange={(value) => {
                  setMinPrice(value[0]);
                  setMaxPrice(value[1]);
                }}
              />
            </div>
          </div>

          {/* RAM Chips */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#666] dark:text-[#a0a8b8]">
              <Cpu size={14} className="text-[#2c3968] dark:text-[#4a7cf6]" />
              <span className="text-[11px] font-bold uppercase tracking-wider">RAM</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[8, 12, 16, 24].map((size) => (
                <button
                  key={size}
                  onClick={() => toggleFilter(size, selectedRAM, setSelectedRAM)}
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                    selectedRAM.includes(size)
                      ? "bg-[#2c3968] dark:bg-[#4a7cf6] text-white border-transparent shadow-md"
                      : "bg-transparent text-[#666] dark:text-[#a0a8b8] border-[#e5e5e5] dark:border-[#2d3548] hover:border-[#2c3968]"
                  }`}
                >
                  {size}GB
                </button>
              ))}
            </div>
          </div>

          {/* Storage Chips */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#666] dark:text-[#a0a8b8]">
              <HardDrive size={14} className="text-[#2c3968] dark:text-[#4a7cf6]" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Storage</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[128, 256, 512, 1024].map((size) => (
                <button
                  key={size}
                  onClick={() => toggleFilter(size, selectedStorage, setSelectedStorage)}
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                    selectedStorage.includes(size)
                      ? "bg-[#2c3968] dark:bg-[#4a7cf6] text-white border-transparent shadow-md"
                      : "bg-transparent text-[#666] dark:text-[#a0a8b8] border-[#e5e5e5] dark:border-[#2d3548] hover:border-[#2c3968]"
                  }`}
                >
                  {size >= 1024 ? "1TB" : `${size}GB`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
