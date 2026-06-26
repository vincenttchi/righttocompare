import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { MultiRatingInput, CategoryRatings } from "../common/MultiRatingInput";
import { useDarkMode } from "../../context/DarkModeContext";

interface ReviewFormProps {
  onSubmit: (data: { title: string; review: string; categoryRatings: CategoryRatings }) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const initialCategoryRatings: CategoryRatings = {
  camera: 0,
  battery: 0,
  design: 0,
  performance: 0,
  value: 0,
};

export function ReviewForm({ onSubmit, onCancel, isSubmitting = false }: ReviewFormProps) {
  const { isDarkMode } = useDarkMode();
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [categoryRatings, setCategoryRatings] = useState<CategoryRatings>(initialCategoryRatings);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    } else if (title.length > 100) {
      newErrors.title = "Title must be less than 100 characters";
    }

    if (!review.trim()) {
      newErrors.review = "Review is required";
    } else if (review.length < 20) {
      newErrors.review = "Review must be at least 20 characters";
    } else if (review.length > 2000) {
      newErrors.review = "Review must be less than 2000 characters";
    }

    const hasAllRatings = Object.values(categoryRatings).every((r) => r > 0);
    if (!hasAllRatings) {
      newErrors.ratings = "Please rate all categories";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    await onSubmit({
      title: title.trim(),
      review: review.trim(),
      categoryRatings,
    });
  };

  const handleCancel = () => {
    if (title || review || Object.values(categoryRatings).some((r) => r > 0)) {
      if (!window.confirm("Are you sure you want to cancel? Your review will not be saved.")) {
        return;
      }
    }
    onCancel();
  };

  const allRatingsGiven = Object.values(categoryRatings).every((r) => r > 0);
  const isFormValid = title.length >= 5 && review.length >= 20 && allRatingsGiven;

  return (
    <div
      className={`p-6 rounded-xl border ${
        isDarkMode ? "bg-[#161b22] border-[#2d3748]" : "bg-[#f8f9fa] border-gray-200"
      }`}
    >
      <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? "text-[#e0e4eb]" : "text-[#2c3968]"}`}>
        Write Your Review
      </h3>

      <div className="space-y-5">
        {/* Category Ratings */}
        <div>
          <Label className={`text-sm font-medium mb-3 block ${isDarkMode ? "text-[#e0e4eb]" : "text-[#2c3968]"}`}>
            Rate Your Experience
          </Label>
          <MultiRatingInput value={categoryRatings} onChange={setCategoryRatings} showAverage={true} />
          {errors.ratings && <p className="text-red-500 text-sm mt-2">{errors.ratings}</p>}
        </div>

        {/* Title Input */}
        <div>
          <Label
            htmlFor="review-title"
            className={`text-sm font-medium mb-2 block ${isDarkMode ? "text-[#e0e4eb]" : "text-[#2c3968]"}`}
          >
            Review Title
          </Label>
          <Input
            id="review-title"
            placeholder="Summarize your experience (5-100 characters)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            className={`${
              isDarkMode
                ? "bg-[#0d1117] border-[#2d3748] text-[#e0e4eb] placeholder:text-[#6b7280]"
                : "bg-white border-gray-300 text-[#2c3968]"
            } ${errors.title ? "border-red-500" : ""}`}
          />
          <div className="flex justify-between mt-1">
            {errors.title && <p className="text-red-500 text-xs">{errors.title}</p>}
            <p className={`text-xs ml-auto ${isDarkMode ? "text-[#6b7280]" : "text-gray-500"}`}>{title.length}/100</p>
          </div>
        </div>

        {/* Review Text */}
        <div>
          <Label
            htmlFor="review-text"
            className={`text-sm font-medium mb-2 block ${isDarkMode ? "text-[#e0e4eb]" : "text-[#2c3968]"}`}
          >
            Your Review
          </Label>
          <Textarea
            id="review-text"
            placeholder="Share your detailed experience with this phone (20-2000 characters)"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            maxLength={2000}
            rows={5}
            className={`resize-none ${
              isDarkMode
                ? "bg-[#0d1117] border-[#2d3748] text-[#e0e4eb] placeholder:text-[#6b7280]"
                : "bg-white border-gray-300 text-[#2c3968]"
            } ${errors.review ? "border-red-500" : ""}`}
          />
          <div className="flex justify-between mt-1">
            {errors.review && <p className="text-red-500 text-xs">{errors.review}</p>}
            <p className={`text-xs ml-auto ${isDarkMode ? "text-[#6b7280]" : "text-gray-500"}`}>{review.length}/2000</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            className={`flex-1 cursor-pointer ${
              isDarkMode ? "bg-[#4a7cf6] hover:bg-[#3b6ce6] text-white" : "bg-[#2c3968] hover:bg-[#1e2a4a] text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Review"
            )}
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            disabled={isSubmitting}
            className={`cursor-pointer ${
              isDarkMode
                ? "border-[#2d3748] text-[#e0e4eb] hover:bg-[#2d3748]"
                : "border-gray-300 text-[#2c3968] hover:bg-gray-100"
            }`}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
