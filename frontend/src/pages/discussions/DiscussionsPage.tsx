import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../context/AuthContext";

// Icons
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Eye,
  Plus,
  TrendingUp,
  Clock,
  Flame,
  Search,
  Image as ImageIcon,
  X,
  Flag,
  CornerDownRight,
  Loader2,
  Trash2,
} from "lucide-react";

// UI Components
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

// Custom Components & API
import {
  getDiscussionsFromStorage,
  saveDiscussionsToStorage,
  getUserVotesFromStorage,
  saveUserVotesToStorage,
  getReportsFromStorage,
  saveReportsToStorage,
  getUserReportsFromStorage,
  saveUserReportsToStorage,
} from "../../utils/storage/discussionStorage";
import { Discussion, Report } from "../../types/discussionTypes";
import * as discussionApi from "../../api/discussionApi";
import { mapApiDiscussion } from "../../utils/mappers/discussionDataMappers";
import { SentimentSummary } from "../../types/sentimentTypes";
import { SentimentPill } from "../../components/reviews/SentimentPill";
import { SentimentSummaryCard } from "../../components/reviews/SentimentSummaryCard";

type FilterType = "recent" | "trending" | "popular";

const DISCUSSION_CATEGORIES = ["Discussion", "Question", "Review", "Comparison", "Help", "News", "Other"] as const;

interface DiscussionsPageProps {
  onNavigate?: (phoneId: string) => void;
  onViewDiscussion?: (discussionId: string) => void;
}

export default function DiscussionsPage({ onNavigate, onViewDiscussion }: DiscussionsPageProps) {
  // ------------------------------------------------------------
  // | HOOKS
  // ------------------------------------------------------------
  const { currentUser } = useAuth();

  // Discussion Interaction
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, "up" | "down" | null>>({});

  // -- Searching & Filtering --
  const [filter, setFilter] = useState<FilterType>("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSentimentFilters, setActiveSentimentFilters] = useState<string[]>([]);

  // -- Post Creation --
  const [isCreating, setIsCreating] = useState(false);
  const [usingApi, setUsingApi] = useState(true);
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    category: "Discussion",
    tags: "",
  });
  const [newPostImages, setNewPostImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -- Reporting --
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportItemId, setReportItemId] = useState<string>("");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [userReports, setUserReports] = useState<Record<string, boolean>>({});

  // -- Discussion Sentiment --
  const [communitySentiment, setCommunitySentiment] = useState<SentimentSummary | null>(null);

  // ------------------------------------------------------------
  // | DATA SYNCHRONIZATION
  // ------------------------------------------------------------
  // Fetch discussions from API with localStorage fallback
  const fetchDiscussions = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await discussionApi.getDiscussions(
        1,
        100,
        filter,
        searchQuery || undefined,
        selectedCategories.length > 0 ? selectedCategories : undefined,
        activeSentimentFilters,
      );

      if (result && result.discussions.length >= 0) {
        const mapped = result.discussions.map(mapApiDiscussion);
        setDiscussions(mapped);
        setUsingApi(true);

        // Build user votes from upvoters/downvoters arrays
        if (currentUser) {
          const votes: Record<string, "up" | "down" | null> = {};
          mapped.forEach((d) => {
            if (d.upvoters?.includes(currentUser.uid)) {
              votes[d.id] = "up";
            } else if (d.downvoters?.includes(currentUser.uid)) {
              votes[d.id] = "down";
            }
          });
          setUserVotes(votes);
        }
      } else {
        throw new Error("API returned null");
      }
    } catch {
      // Fallback to localStorage
      console.warn("API unavailable, falling back to localStorage");
      const loadedDiscussions = getDiscussionsFromStorage();
      const loadedVotes = getUserVotesFromStorage();
      setDiscussions(loadedDiscussions);
      setUserVotes(loadedVotes);
      setUsingApi(false);
    } finally {
      setIsLoading(false);
    }
  }, [filter, searchQuery, selectedCategories, activeSentimentFilters, currentUser]);

  // Determines the available sentiment tags to filter by as discussions are filtered
  const liveSentiment = useMemo(() => {
    const summary: SentimentSummary = {
      pros: [],
      cons: [],
      totalAnalyzed: discussions.length,
    };

    if (discussions.length === 0) return summary;

    const prosMap: Record<string, number> = {};
    const consMap: Record<string, number> = {};

    discussions.forEach((disc) => {
      disc.sentimentTags?.forEach((tag) => {
        const topic = tag.slice(1);
        if (tag.startsWith("+")) {
          prosMap[topic] = (prosMap[topic] || 0) + 1;
        } else if (tag.startsWith("-")) {
          consMap[topic] = (consMap[topic] || 0) + 1;
        }
      });
    });

    summary.pros = Object.entries(prosMap)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
    summary.cons = Object.entries(consMap)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    return summary;
  }, [discussions]);

  // Load discussions on mount and when filters change
  useEffect(() => {
    fetchDiscussions();
  }, [fetchDiscussions]);

  // Load reports from localStorage (reports stay local for now)
  useEffect(() => {
    const loadedUserReports = getUserReportsFromStorage();
    setUserReports(loadedUserReports);
  }, []);

  // Fetching community sentiment
  useEffect(() => {
    discussionApi.getCommunitySentiment().then(setCommunitySentiment);
  }, []);

  // ------------------------------------------------------------
  // | COMPONENT LOGIC
  // ------------------------------------------------------------
  // Get all unique categories from discussions
  const allCategories = Array.from(new Set(discussions.map((d) => d.category))).sort();

  // Handle voting
  const handleVote = async (discussionId: string, voteType: "up" | "down") => {
    if (usingApi) {
      if (!currentUser) {
        toast.error("Please sign in to vote");
        return;
      }
      try {
        const token = await currentUser.firebaseUser.getIdToken();
        const updated = await discussionApi.voteOnDiscussion(discussionId, voteType, token);
        if (updated) {
          const mapped = mapApiDiscussion(updated);
          setDiscussions((prev) => prev.map((d) => (d.id === discussionId ? mapped : d)));
          // Update local vote tracking
          if (updated.upvoters.includes(currentUser.uid)) {
            setUserVotes((prev) => ({ ...prev, [discussionId]: "up" }));
          } else if (updated.downvoters.includes(currentUser.uid)) {
            setUserVotes((prev) => ({ ...prev, [discussionId]: "down" }));
          } else {
            setUserVotes((prev) => ({ ...prev, [discussionId]: null }));
          }
        }
      } catch {
        toast.error("Failed to vote");
      }
    } else {
      // localStorage fallback
      const currentVote = userVotes[discussionId];
      let newVote: "up" | "down" | null = voteType;

      if (currentVote === voteType) {
        newVote = null;
      }

      const updatedDiscussions = discussions.map((disc) => {
        if (disc.id === discussionId) {
          let upvotes = disc.upvotes;
          let downvotes = disc.downvotes;
          if (currentVote === "up") upvotes--;
          if (currentVote === "down") downvotes--;
          if (newVote === "up") upvotes++;
          if (newVote === "down") downvotes++;
          return { ...disc, upvotes, downvotes };
        }
        return disc;
      });

      const updatedVotes = { ...userVotes, [discussionId]: newVote };
      setDiscussions(updatedDiscussions);
      setUserVotes(updatedVotes);
      saveDiscussionsToStorage(updatedDiscussions);
      saveUserVotesToStorage(updatedVotes);
    }
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/") && newPostImages.length < 4) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setNewPostImages((prev) => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    setNewPostImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle creating new post
  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;

    if (usingApi) {
      if (!currentUser) {
        toast.error("Please sign in to create a discussion");
        return;
      }

      setIsCreating(true);
      try {
        const token = await currentUser.firebaseUser.getIdToken();
        const created = await discussionApi.createDiscussion(
          {
            title: newPost.title,
            content: newPost.content,
            category: newPost.category,
            tags: newPost.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag),
            images: newPostImages,
          },
          token,
        );

        if (created) {
          const mapped = mapApiDiscussion(created);
          setDiscussions((prev) => [mapped, ...prev]);
          toast.success("Discussion created successfully!");
        }
      } catch {
        toast.error("Failed to create discussion");
      } finally {
        setIsCreating(false);
      }
    } else {
      // localStorage fallback
      const newDiscussion: Discussion = {
        id: Date.now().toString(),
        title: newPost.title,
        content: newPost.content,
        author: currentUser?.displayName || "You",
        authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.displayName || "You"}`,
        timestamp: Date.now(),
        category: newPost.category,
        tags: newPost.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        upvotes: 0,
        downvotes: 0,
        replies: 0,
        views: 0,
        images: newPostImages.length > 0 ? newPostImages : undefined,
        sentimentTags: [],
      };

      const updatedDiscussions = [newDiscussion, ...discussions];
      setDiscussions(updatedDiscussions);
      saveDiscussionsToStorage(updatedDiscussions);
    }

    setNewPost({ title: "", content: "", category: "Discussion", tags: "" });
    setNewPostImages([]);
    setIsCreateDialogOpen(false);
  };

  // Handle deleting a discussion
  const handleDeleteDiscussion = async (discussionId: string) => {
    if (!currentUser) return;
    if (!window.confirm("Are you sure you want to delete this discussion?")) return;

    if (usingApi) {
      try {
        const token = await currentUser.firebaseUser.getIdToken();
        await discussionApi.deleteDiscussion(discussionId, token);
        setDiscussions((prev) => prev.filter((d) => d.id !== discussionId));
        toast.success("Discussion deleted successfully!");
      } catch {
        toast.error("Failed to delete discussion");
      }
    }
  };

  // Handle opening report dialog
  const handleOpenReportDialog = (itemId: string) => {
    setReportItemId(itemId);
    setReportReason("");
    setReportDetails("");
    setIsReportDialogOpen(true);
  };

  // Handle submitting report
  const handleSubmitReport = () => {
    if (!reportReason) return;

    const report: Report = {
      id: `report_${Date.now()}`,
      itemId: reportItemId,
      itemType: "discussion",
      reason: reportReason,
      details: reportDetails || undefined,
      reportedBy: currentUser?.displayName || "You",
      timestamp: Date.now(),
    };

    const reports = getReportsFromStorage();
    const updatedReports = [...reports, report];
    saveReportsToStorage(updatedReports);

    const updatedUserReports = { ...userReports, [reportItemId]: true };
    setUserReports(updatedUserReports);
    saveUserReportsToStorage(updatedUserReports);

    setIsReportDialogOpen(false);
    setReportReason("");
    setReportDetails("");
    toast.success("Report submitted. Thank you!");
  };

  // Handles filtering discussions by sentiment
  const handleSentimentFilter = (tag: string) => {
    setActiveSentimentFilters((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  // Toggle category filter
  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  };

  // Filter and sort discussions (only needed for localStorage fallback - API handles this)
  const getFilteredDiscussions = () => {
    if (usingApi) return discussions; // API already handles filtering/sorting

    let filtered = [...discussions];

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((disc) => selectedCategories.includes(disc.category));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (disc) =>
          disc.title.toLowerCase().includes(query) ||
          disc.content.toLowerCase().includes(query) ||
          disc.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    // Filtering by sentiment tags
    if (activeSentimentFilters.length > 0) {
      filtered = filtered.filter((disc) => {
        return activeSentimentFilters.every((filterTag) => disc.sentimentTags.includes(filterTag));
      });
    }

    // Sorting methods
    switch (filter) {
      case "recent":
        return filtered.sort((a, b) => b.timestamp - a.timestamp);
      case "trending":
        return filtered.sort((a, b) => {
          const aScore =
            (a.upvotes - a.downvotes) * 2 +
            a.replies * 1.5 +
            a.views * 0.1 -
            (Date.now() - a.timestamp) / (1000 * 60 * 60 * 24);
          const bScore =
            (b.upvotes - b.downvotes) * 2 +
            b.replies * 1.5 +
            b.views * 0.1 -
            (Date.now() - b.timestamp) / (1000 * 60 * 60 * 24);
          return bScore - aScore;
        });
      case "popular":
        return filtered.sort((a, b) => {
          const aScore = (a.upvotes - a.downvotes) * 3 + a.replies * 2 + a.views * 0.2;
          const bScore = (b.upvotes - b.downvotes) * 3 + b.replies * 2 + b.views * 0.2;
          return bScore - aScore;
        });
      default:
        return filtered;
    }
  };

  const filteredDiscussions = getFilteredDiscussions();

  // Format time ago
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  // ------------------------------------------------------------
  // | UI SECTION
  // ------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-[#0f1419] pb-12">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-[#2c3968] via-[#3d4a7a] to-[#2c3968] dark:from-[#1a1f2e] dark:via-[#252b3d] dark:to-[#1a1f2e] relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white dark:bg-[#4a7cf6] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white dark:bg-[#4a7cf6] rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 py-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-white mb-3">Community Discussions</h1>
              <p className="text-white/80 text-lg">
                Share your thoughts, ask questions, and connect with the community
              </p>
            </div>

            <Dialog
              open={isCreateDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  setNewPost({ title: "", content: "", category: "Discussion", tags: "" });
                  setNewPostImages([]);
                }
                setIsCreateDialogOpen(open);
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-white dark:bg-[#4a7cf6] text-[#2c3968] dark:text-white hover:bg-white/90 dark:hover:bg-[#5b8df7] shadow-lg self-start md:self-auto cursor-pointer">
                  <Plus className="w-5 h-5 mr-2" />
                  New Discussion
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl dark:bg-[#161b26] dark:border-[#2d3548]">
                <DialogHeader>
                  <DialogTitle>Create New Discussion</DialogTitle>
                  <DialogDescription>Start a new conversation with the community</DialogDescription>
                </DialogHeader>
                {!currentUser ? (
                  <p className="text-center text-[#666] dark:text-[#a0a8b8] py-8">
                    Please sign in to create a discussion.
                  </p>
                ) : (
                  <div className="space-y-4 mt-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label htmlFor="title">Title</Label>
                        <span
                          className={`text-xs ${newPost.title.length > 100 ? "text-red-500" : newPost.title.length < 5 && newPost.title.length > 0 ? "text-amber-500" : "text-[#999] dark:text-[#6b7280]"}`}
                        >
                          {newPost.title.length}/100
                        </span>
                      </div>
                      <Input
                        id="title"
                        placeholder="What's on your mind?"
                        value={newPost.title}
                        onChange={(e) => setNewPost({ ...newPost, title: e.target.value.slice(0, 100) })}
                        className="dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:placeholder:text-[#6b7280]"
                      />
                      {newPost.title.length > 0 && newPost.title.length < 5 && (
                        <p className="text-xs text-amber-500 mt-1">Title must be at least 5 characters</p>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <Label htmlFor="content">Content</Label>
                        <span
                          className={`text-xs ${newPost.content.length > 5000 ? "text-red-500" : "text-[#999] dark:text-[#6b7280]"}`}
                        >
                          {newPost.content.length}/5000
                        </span>
                      </div>
                      <Textarea
                        id="content"
                        placeholder="Share your thoughts, questions, or insights..."
                        value={newPost.content}
                        onChange={(e) => setNewPost({ ...newPost, content: e.target.value.slice(0, 5000) })}
                        className="min-h-[150px] dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:placeholder:text-[#6b7280]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category" className="mb-1.5 block">
                        Category
                      </Label>
                      <Select
                        value={newPost.category}
                        onValueChange={(value) => setNewPost({ ...newPost, category: value })}
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-[#161b26] dark:border-[#2d3548]">
                          {DISCUSSION_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tags">Tags (comma separated)</Label>
                      <Input
                        id="tags"
                        placeholder="e.g., Samsung, Camera, Battery"
                        value={newPost.tags}
                        onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                        className="mt-1.5 dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:placeholder:text-[#6b7280]"
                      />
                    </div>
                    <div>
                      <Label>Images (up to 4)</Label>
                      <div className="mt-1.5 space-y-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={newPostImages.length >= 4}
                          className="w-full cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4 mr-2" />
                          Upload Images ({newPostImages.length}/4)
                        </Button>
                        {newPostImages.length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            {newPostImages.map((img, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={img}
                                  alt={`Upload ${idx + 1}`}
                                  className="w-full h-32 object-cover rounded-lg border border-[#e0e0e0] dark:border-[#2d3548]"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(idx)}
                                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:hover:bg-[#252b3d] cursor-pointer"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreatePost}
                        disabled={
                          !newPost.title.trim() || newPost.title.length < 5 || !newPost.content.trim() || isCreating
                        }
                        className="bg-[#2c3968] hover:bg-[#1e2547] dark:bg-[#4a7cf6] dark:hover:bg-[#5b8df7] cursor-pointer"
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Create Discussion"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 -mt-8 relative z-20">
        <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-lg p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            {/* Filter Buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === "trending" ? "default" : "outline"}
                onClick={() => setFilter("trending")}
                className={
                  filter === "trending"
                    ? "bg-[#2c3968] text-white hover:bg-[#1f2747] dark:bg-[#4a7cf6] dark:text-white dark:hover:bg-[#5b8df7] cursor-pointer"
                    : "dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:hover:bg-[#252b3d] cursor-pointer"
                }
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Trending
              </Button>
              <Button
                variant={filter === "recent" ? "default" : "outline"}
                onClick={() => setFilter("recent")}
                className={
                  filter === "recent"
                    ? "bg-[#2c3968] text-white hover:bg-[#1f2747] dark:bg-[#4a7cf6] dark:text-white dark:hover:bg-[#5b8df7] cursor-pointer"
                    : "dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:hover:bg-[#252b3d] cursor-pointer"
                }
              >
                <Clock className="w-4 h-4 mr-2" />
                Recent
              </Button>
              <Button
                variant={filter === "popular" ? "default" : "outline"}
                onClick={() => setFilter("popular")}
                className={
                  filter === "popular"
                    ? "bg-[#2c3968] text-white hover:bg-[#1f2747] dark:bg-[#4a7cf6] dark:text-white dark:hover:bg-[#5b8df7] cursor-pointer"
                    : "dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:hover:bg-[#252b3d] cursor-pointer"
                }
              >
                <Flame className="w-4 h-4 mr-2" />
                Popular
              </Button>
            </div>

            {/* Search */}
            <div className="relative md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999] dark:text-[#6b7280]" />
              <Input
                placeholder="Search discussions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:placeholder:text-[#6b7280]"
              />
            </div>
          </div>

          {/* Category Filters */}
          {allCategories.length > 0 && (
            <div className="border-t border-[#e0e0e0] dark:border-[#2d3548] pt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-[#666] dark:text-[#a0a8b8]">Categories:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategories([])}
                  className={
                    selectedCategories.length === 0
                      ? "bg-[#2c3968] text-white hover:bg-[#1e2547] hover:text-white dark:bg-[#4a7cf6] dark:hover:bg-[#5b8df7] cursor-pointer"
                      : "dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:hover:bg-[#252b3d] cursor-pointer"
                  }
                >
                  All
                </Button>
                {allCategories.map((category) => (
                  <Button
                    key={category}
                    variant="outline"
                    size="sm"
                    onClick={() => toggleCategory(category)}
                    className={
                      selectedCategories.includes(category)
                        ? "bg-[#2c3968] text-white hover:bg-[#1e2547] hover:text-white dark:bg-[#4a7cf6] dark:hover:bg-[#5b8df7] cursor-pointer"
                        : "dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:hover:bg-[#252b3d] cursor-pointer"
                    }
                  >
                    {category}
                    <span className="ml-2 text-xs opacity-70">
                      ({discussions.filter((d) => d.category === category).length})
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Community Sentiment Summary */}
      <div className="max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 mt-8">
        <SentimentSummaryCard
          data={liveSentiment}
          isLoading={isLoading && discussions.length === 0}
          sourceType="community"
          activeFilters={activeSentimentFilters}
          onPillClick={handleSentimentFilter}
          isCollapsible={true}
          defaultExpanded={true}
          matchedCount={filteredDiscussions.length}
        />
      </div>

      {/* Discussion List */}
      <div className="max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 mt-8">
        <div className="relative">
          {/* Progress Bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 z-40 overflow-hidden">
            <div
              className={`h-full bg-[#2c3968] dark:bg-[#4a7cf6] transition-all duration-500 ${isLoading ? "w-1/2 animate-infinite-loading" : "w-0 opacity-0"}`}
            />
          </div>
          <div
            className={`space-y-4 transition-all duration-300 ${isLoading ? "opacity-60 grayscale-[20%] pointer-events-none" : "opacity-100"}`}
          >
            {/* INITIAL LOAD ONLY: Show skeleton if we have nothing in discussions list*/}
            {isLoading && discussions.length === 0 ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 w-full bg-white dark:bg-[#161b26] animate-pulse rounded-2xl border border-gray-100 dark:border-[#2d3548]"
                  />
                ))}
              </div>
            ) : filteredDiscussions.length === 0 ? (
              <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-12 text-center border-2 border-dashed border-gray-200 dark:border-[#2d3548]">
                <MessageCircle className="w-12 h-12 text-[#ccc] dark:text-[#6b7280] mx-auto mb-4" />
                <p className="text-[#666] dark:text-[#a0a8b8] font-medium">
                  No discussions match your current filters.
                </p>
              </div>
            ) : (
              filteredDiscussions.map((discussion) => {
                const userVote = userVotes[discussion.id];
                const netScore = discussion.upvotes - discussion.downvotes;
                const isOwnDiscussion = currentUser && discussion.authorId === currentUser.uid;
                const sortedTags = [...(discussion.sentimentTags || [])].sort((a, b) => {
                  if (a.startsWith("+") && b.startsWith("-")) return -1;
                  if (a.startsWith("-") && b.startsWith("+")) return 1;
                  return a.localeCompare(b); // Alphabetical within groups
                });

                return (
                  <div
                    key={discussion.id}
                    className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-transparent dark:border-[#2d3548] hover:border-[#2c3968]/10 dark:hover:border-[#4a7cf6]/30"
                  >
                    <div className="flex gap-4 p-6">
                      {/* Vote Section */}
                      <div className="flex flex-col items-center gap-2 min-w-[60px]">
                        <button
                          onClick={() => handleVote(discussion.id, "up")}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            userVote === "up"
                              ? "bg-[#2c3968] text-white dark:bg-[#4a7cf6] cursor-pointer"
                              : "bg-[#f0f2f5] dark:bg-[#1e2530] text-[#666] dark:text-[#a0a8b8] hover:bg-[#2c3968] dark:hover:bg-[#4a7cf6] hover:text-white cursor-pointer"
                          }`}
                        >
                          <ThumbsUp className="w-5 h-5" />
                        </button>
                        <span
                          className={`font-semibold ${netScore > 0 ? "text-[#2c3968] dark:text-[#4a7cf6]" : netScore < 0 ? "text-red-500" : "text-[#666] dark:text-[#a0a8b8]"}`}
                        >
                          {netScore > 0 ? "+" : ""}
                          {netScore}
                        </span>
                        <button
                          onClick={() => handleVote(discussion.id, "down")}
                          className={`p-2 rounded-lg transition-all duration-200 ${
                            userVote === "down"
                              ? "bg-red-500 text-white cursor-pointer"
                              : "bg-[#f0f2f5] text-[#666] hover:bg-red-500 hover:text-white dark:bg-[#1a1f2e] dark:text-[#a0a8b8] dark:hover:bg-red-500 dark:hover:text-white cursor-pointer"
                          }`}
                        >
                          <ThumbsDown className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <img
                            src={discussion.authorAvatar}
                            alt={discussion.author}
                            className="w-10 h-10 rounded-full bg-[#f0f2f5] dark:bg-[#1a1f2e]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[#2c3968] dark:text-[#4a7cf6]">{discussion.author}</span>
                              <span className="text-[#999] dark:text-[#6b7280]">•</span>
                              <span className="text-[#999] dark:text-[#6b7280] text-sm">
                                {getTimeAgo(discussion.timestamp)}
                              </span>
                              <Badge variant="outline" className="ml-auto">
                                {discussion.category}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Title */}
                        <h3
                          className="text-[#2c3968] dark:text-[#4a7cf6] mb-2 cursor-pointer hover:text-[#1e2547] dark:hover:text-[#5b8df7] transition-colors"
                          onClick={() => onViewDiscussion?.(discussion.id)}
                        >
                          {discussion.title}
                        </h3>

                        {/* Content Preview */}
                        <p className="text-[#666] dark:text-[#a0a8b8] mb-3 line-clamp-2">{discussion.content}</p>

                        {/* Sentiment Specific Tags */}
                        {sortedTags && sortedTags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {sortedTags.map((tag, idx) => (
                              <SentimentPill key={`sent-${idx}`} tag={tag} readOnly={true} />
                            ))}
                          </div>
                        )}

                        {/* Tags */}
                        {discussion.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {discussion.tags.map((tag, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 bg-[#f0f2f5] dark:bg-[#1a1f2e] text-[#2c3968] dark:text-[#4a7cf6] text-xs rounded-full hover:bg-[#2c3968] hover:text-white dark:hover:bg-[#4a7cf6] dark:hover:text-white transition-colors cursor-pointer"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Stats and Actions */}
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-4 text-sm text-[#999] dark:text-[#6b7280]">
                            <div className="flex items-center gap-1.5">
                              <MessageCircle className="w-4 h-4" />
                              <span>{discussion.replies} replies</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Eye className="w-4 h-4" />
                              <span>{discussion.views.toLocaleString()} views</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDiscussion?.(discussion.id);
                              }}
                              className="text-[#2c3968] dark:text-[#4a7cf6] hover:bg-[#2c3968] hover:text-white dark:hover:bg-[#4a7cf6] border-[#2c3968]/20 dark:border-[#4a7cf6]/20 cursor-pointer"
                            >
                              <CornerDownRight className="w-4 h-4 mr-1.5" />
                              Reply
                            </Button>
                            {isOwnDiscussion && usingApi && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteDiscussion(discussion.id);
                                }}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                Delete
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenReportDialog(discussion.id);
                              }}
                              disabled={userReports[discussion.id]}
                              className={`text-xs cursor-pointer ${userReports[discussion.id] ? "text-red-400 dark:text-red-400" : "text-[#999] dark:text-[#6b7280] hover:text-red-500 dark:hover:text-red-400"}`}
                            >
                              <Flag className="w-3.5 h-3.5 mr-1" />
                              {userReports[discussion.id] ? "Reported" : "Report"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-md dark:bg-[#161b26] dark:border-[#2d3548]">
          <DialogHeader>
            <DialogTitle>Report Discussion</DialogTitle>
            <DialogDescription>
              Help us keep the community safe by reporting content that violates our guidelines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Reason for reporting *</Label>
              <RadioGroup value={reportReason} onValueChange={setReportReason} className="mt-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="spam"
                    id="spam"
                    className="border-[#2c3968] dark:border-[#4a7cf6] text-[#2c3968] dark:text-[#4a7cf6]"
                  />
                  <Label htmlFor="spam" className="cursor-pointer dark:text-[#d1d5db]">
                    Spam or misleading
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="harassment" id="harassment" />
                  <Label htmlFor="harassment" className="cursor-pointer">
                    Harassment or hate speech
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inappropriate" id="inappropriate" />
                  <Label htmlFor="inappropriate" className="cursor-pointer">
                    Inappropriate content
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="misinformation" id="misinformation" />
                  <Label htmlFor="misinformation" className="cursor-pointer">
                    Misinformation
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="cursor-pointer">
                    Other
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="details">Additional details (optional)</Label>
              <Textarea
                id="details"
                placeholder="Provide more context about why you're reporting this..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                className="mt-1.5 min-h-[100px] dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:placeholder:text-[#6b7280]"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsReportDialogOpen(false)}
                className="dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:hover:bg-[#252b3d]"
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitReport} disabled={!reportReason} className="bg-red-500 hover:bg-red-600">
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
