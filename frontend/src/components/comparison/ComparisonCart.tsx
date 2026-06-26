// UI Components
import { Button } from "../ui/button";

// Icons
import { X, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";

// Custom Components
import { PhoneSummary } from "../../types/phoneTypes";

interface ComparisonCartProps {
  phones: PhoneSummary[];
  onRemovePhone: (phoneId: string) => void;
  onCompare: () => void;
  onClose: () => void;
  isMinimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
}

export default function ComparisonCart({
  phones,
  onRemovePhone,
  onCompare,
  onClose,
  isMinimized,
  onMinimizedChange,
}: ComparisonCartProps) {
  const maxPhones = 3;
  const remainingSlots = maxPhones - phones.length;

  if (phones.length === 0) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
        <button
          onClick={() => onMinimizedChange(false)}
          className="bg-white dark:bg-[#161b26] text-[#2c3968] dark:text-[#4a7cf6] rounded-full px-4 py-2.5 md:px-5 md:py-3 shadow-lg hover:shadow-xl border border-[#e0e0e0] dark:border-[#2d3548] hover:border-[#2c3968]/30 dark:hover:border-[#4a7cf6]/30 transition-all duration-300 hover:scale-[1.02] relative group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ChevronUp className="w-5 h-5 text-[#2c3968] dark:text-[#4a7cf6] group-hover:translate-y-[-2px] transition-transform duration-300" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm">Compare Phones</span>
              <span className="text-xs text-[#999] dark:text-[#707070]">{phones.length} selected</span>
            </div>
          </div>
          {phones.length > 0 && (
            <div className="absolute -top-1 -right-1 bg-[#2c3968] dark:bg-[#4a7cf6] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-md">
              {phones.length}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50">
      <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-2xl border border-[#e0e0e0] dark:border-[#2d3548] p-4 md:p-6 w-[340px] sm:w-[400px]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[#2c3968] dark:text-[#4a7cf6]">Compare Phones</h3>
            <p className="text-sm text-[#666] dark:text-[#a0a8b8]">
              {phones.length} of {maxPhones} phones selected
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onMinimizedChange(true)}
              className="text-[#999] dark:text-[#707070] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] transition-colors cursor-pointer"
              title="Minimize"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {phones.map((phone) => (
            <div
              key={phone.id}
              className="flex items-center gap-3 p-3 bg-[#f7f9fc] dark:bg-[#1a1f2e] rounded-lg border border-[#e0e0e0] dark:border-[#2d3548]"
            >
              <img src={phone.images.main} alt={phone.name} className="w-12 h-12 object-contain" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#2c3968] dark:text-[#4a7cf6] truncate">{phone.manufacturer}</p>
                <p className="text-xs text-[#666] dark:text-[#a0a8b8] truncate">{phone.name}</p>
              </div>
              <button
                onClick={() => onRemovePhone(phone.id)}
                className="text-[#999] dark:text-[#707070] hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: remainingSlots }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="flex items-center gap-3 p-3 border-2 border-dashed border-[#e0e0e0] dark:border-[#2d3548] rounded-lg h-[72px]"
            >
              <div className="w-12 h-12 rounded bg-[#f0f0f0] dark:bg-[#252b3d] flex items-center justify-center shrink-0">
                <span className="text-2xl text-[#ccc] dark:text-[#707070]">+</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#999] dark:text-[#707070]">Empty slot</p>
                <p className="text-xs text-[#bbb] dark:text-[#555]">Add a phone to compare</p>
              </div>
              <div className="w-4 shrink-0"></div>
            </div>
          ))}
        </div>

        <Button
          onClick={onCompare}
          className="w-full bg-[#2c3968] text-white hover:bg-[#1f2747] dark:bg-[#4a7cf6] dark:text-white dark:hover:bg-[#5b8df7] shadow-lg transition-all duration-200 cursor-pointer"
        >
          Compare Now
          <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
        </Button>

        {phones.length < maxPhones && (
          <p className="text-xs text-center text-[#999] dark:text-[#707070] mt-2">
            {phones.length === 1
              ? "Add more phones for better comparison"
              : `Add ${maxPhones - phones.length} more phone${maxPhones - phones.length > 1 ? "s" : ""} to compare`}
          </p>
        )}
      </div>
    </div>
  );
}
