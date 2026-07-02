import { CategoryRatings } from "../components/common/MultiRatingInput";
import { ReviewFilterOptions, ReviewData, ReviewsResponse, ReviewActionResponse } from "../types/reviewTypes";
import { SentimentSummary } from "../types/sentimentTypes";
import { mapJsonToSentimentSummary } from "../utils/mappers/sentimentMappers";

const API_URL = "http://localhost:5001/api/phones"; // CHANGE LATER ON PRODUCTION

/**
 * Fetches reviews for a phone with pagination.
 * @param phoneId The phone ID (e.g., "galaxy-s24-ultra")
 * @param page Page number (default: 1)
 * @param limit Reviews per page (default: 10)
 * @param options Filter and sort options (sentiments array, sortBy string)
 * @returns Reviews data with pagination info
 */
export const getPhoneReviews = async (
  phoneId: string,
  page: number = 1,
  limit: number = 10,
  options: ReviewFilterOptions = {},
): Promise<ReviewsResponse | null> => {
  try {
    // Destructuring options JSON
    const { sentiments = [], sortBy = "newest" } = options;

    // Creating query string
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sortBy: sortBy,
    });

    // Maps sentiment tag labels to string for query
    if (sentiments.length > 0) queryParams.append("sentiment", sentiments.join(","));

    const response = await fetch(`${API_URL}/${phoneId}/reviews?${queryParams.toString()}`);

    // Handles error case
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Failed to fetch reviews");
    return await response.json();
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return null;
  }
};

/**
 * Submits a new review for a phone.
 * @param phoneId The phone ID
 * @param reviewData The review data (title, review text, category ratings)
 * @param token Firebase auth token
 * @returns The created review, or null if failed
 */
export const submitReview = async (
  phoneId: string,
  reviewData: {
    title: string;
    review: string;
    categoryRatings: CategoryRatings;
  },
  token: string,
): Promise<ReviewActionResponse | null> => {
  try {
    const response = await fetch(`${API_URL}/${phoneId}/reviews`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reviewData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to submit review");
    }

    return await response.json();
  } catch (error) {
    console.error("Error submitting review:", error);
    throw error;
  }
};

/**
 * Votes on a review (helpful or not helpful).
 * @param phoneId The phone ID
 * @param reviewId The review ID
 * @param voteType 'helpful' or 'notHelpful'
 * @param token Firebase auth token
 * @returns The updated review, or null if failed
 */
export const voteOnReview = async (
  phoneId: string,
  reviewId: string,
  voteType: "helpful" | "notHelpful",
  token: string,
): Promise<ReviewData | null> => {
  try {
    const response = await fetch(`${API_URL}/${phoneId}/reviews/${reviewId}/vote`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ voteType }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to vote on review");
    }

    return await response.json();
  } catch (error) {
    console.error("Error voting on review:", error);
    throw error;
  }
};

/**
 * Deletes a review (user can only delete their own).
 * @param phoneId The phone ID
 * @param reviewId The review ID
 * @param token Firebase auth token
 * @returns True if deleted successfully
 */
export const deleteReview = async (
  phoneId: string,
  reviewId: string,
  token: string,
): Promise<ReviewActionResponse | null> => {
  try {
    const response = await fetch(`${API_URL}/${phoneId}/reviews/${reviewId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete review");
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting review:", error);
    throw error;
  }
};

/**
 * Fetches the aggregate sentiment summary for a phone's review.
 * @param phoneId The phone ID
 * @returns Sentiment summary data mapped to SentimentSummary type
 */
export const getPhoneReviewSentiment = async (phoneId: string): Promise<SentimentSummary | null> => {
  try {
    // Attempting to fetch for review sentiment on specified phone
    const response = await fetch(`${API_URL}/${phoneId}/reviews/sentiment`);

    // Handling failed fetches
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Failed to fetch review sentiment summary");

    // Mapping sentiment to SentimentSummary class
    const data = await response.json();
    return mapJsonToSentimentSummary(data);
  } catch (error) {
    console.error("Error fetching review sentiment summary:", error);
    return null;
  }
};
