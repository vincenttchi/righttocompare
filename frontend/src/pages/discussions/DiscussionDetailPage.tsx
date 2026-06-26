import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../context/AuthContext";

// Icons
import {
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  MessageCircle,
  Eye,
  Send,
  Image as ImageIcon,
  X,
  Flag,
  CornerDownRight,
  Loader2,
  Trash2,
} from "lucide-react";

// UI Components
import { Button } from "../../components/ui/button";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../../components/ui/radio-group";

// Custom Components & API
import {
  getDiscussionsFromStorage,
  saveDiscussionsToStorage,
  getUserVotesFromStorage,
  saveUserVotesToStorage,
  getRepliesFromStorage,
  saveRepliesToStorage,
  getReplyVotesFromStorage,
  saveReplyVotesToStorage,
  getReportsFromStorage,
  saveReportsToStorage,
  getUserReportsFromStorage,
  saveUserReportsToStorage,
} from "../../utils/storage/discussionStorage";
import { Discussion, Reply, Report } from "../../types/discussionTypes";
import * as discussionApi from "../../api/discussionApi";
import { mapApiDiscussion, mapApiReply } from "../../utils/mappers/discussionDataMappers";
import { SentimentSummary } from "../../types/sentimentTypes";
import { SentimentSummaryCard } from "../../components/reviews/SentimentSummaryCard";

interface DiscussionDetailPageProps {
  discussionId: string;
  onBack: () => void;
}

export default function DiscussionDetailPage({ discussionId, onBack }: DiscussionDetailPageProps) {
  // ------------------------------------------------------------
  // | HOOKS
  // ------------------------------------------------------------
  const { currentUser } = useAuth();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [userVotes, setUserVotes] = useState<Record<string, "up" | "down" | null>>({});
  const [replyVotes, setReplyVotes] = useState<Record<string, "up" | "down" | null>>({});
  const [newReply, setNewReply] = useState("");
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportItemId, setReportItemId] = useState<string>("");
  const [reportItemType, setReportItemType] = useState<"discussion" | "reply">("discussion");
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [userReports, setUserReports] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<Reply | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [usingApi, setUsingApi] = useState(true);

  // ------------------------------------------------------------
  // | DATA SYNCHRONIZATION
  // ------------------------------------------------------------
  /**
   * SYNC: Live Thread Sentiment Tracking
   * Signal: discussion or replies list changes
   * Action: Aggregates tags from the original post and all replies
   * to generate a thread verdict.
   */
  const liveThreadSentiment = useMemo(() => {
    const summary: SentimentSummary = {
      pros: [],
      cons: [],
      totalAnalyzed: replies.length,
    };

    if (!discussion) return summary;

    const prosMap: Record<string, number> = {};
    const consMap: Record<string, number> = {};

    // Combine OP tags and all reply tags into big pool
    const allTags = [...(discussion.sentimentTags || []), ...replies.flatMap((r) => r.sentimentTags || [])];

    allTags.forEach((tag) => {
      const topic = tag.slice(1);
      if (tag.startsWith("+")) {
        prosMap[topic] = (prosMap[topic] || 0) + 1;
      } else if (tag.startsWith("-")) {
        consMap[topic] = (consMap[topic] || 0) + 1;
      }
    });

    summary.pros = Object.entries(prosMap)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);
    summary.cons = Object.entries(consMap)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count);

    return summary;
  }, [discussion, replies]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Try API first
        const [apiDiscussion, apiReplies] = await Promise.all([
          discussionApi.getDiscussion(discussionId),
          discussionApi.getReplies(discussionId),
        ]);

        if (apiDiscussion) {
          setDiscussion(mapApiDiscussion(apiDiscussion));
          setReplies(apiReplies.map(mapApiReply));
          setUsingApi(true);

          // Build vote maps from upvoters/downvoters
          if (currentUser) {
            const dVotes: Record<string, "up" | "down" | null> = {};
            if (apiDiscussion.upvoters.includes(currentUser.uid)) {
              dVotes[discussionId] = "up";
            } else if (apiDiscussion.downvoters.includes(currentUser.uid)) {
              dVotes[discussionId] = "down";
            }
            setUserVotes(dVotes);

            const rVotes: Record<string, "up" | "down" | null> = {};
            apiReplies.forEach((r) => {
              if (r.upvoters.includes(currentUser.uid)) {
                rVotes[r._id] = "up";
              } else if (r.downvoters.includes(currentUser.uid)) {
                rVotes[r._id] = "down";
              }
            });
            setReplyVotes(rVotes);
          }
        } else {
          throw new Error("Discussion not found via API");
        }
      } catch {
        // Fallback to localStorage
        console.warn("API unavailable, falling back to localStorage");
        const loadedDiscussions = getDiscussionsFromStorage();
        const loadedReplies = getRepliesFromStorage();
        const loadedVotes = getUserVotesFromStorage();
        const loadedReplyVotes = getReplyVotesFromStorage();

        const disc = loadedDiscussions.find((d) => d.id === discussionId);
        setDiscussion(disc || null);
        setReplies(loadedReplies);
        setUserVotes(loadedVotes);
        setReplyVotes(loadedReplyVotes);
        setUsingApi(false);

        // Increment view count in localStorage
        if (disc) {
          const updatedDiscussions = loadedDiscussions.map((d) =>
            d.id === discussionId ? { ...d, views: d.views + 1 } : d,
          );
          saveDiscussionsToStorage(updatedDiscussions);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    const loadedUserReports = getUserReportsFromStorage();
    setUserReports(loadedUserReports);
  }, [discussionId, currentUser]);

  // ------------------------------------------------------------
  // | COMPONENT LOGIC
  // ------------------------------------------------------------
  const discussionReplies = replies.filter((r) => r.discussionId === discussionId);
  const topLevelReplies = discussionReplies.filter((r) => !r.parentReplyId);

  const getNestedReplies = (parentId: string): Reply[] => {
    return discussionReplies.filter((r) => r.parentReplyId === parentId);
  };

  // Handle voting on discussion
  const handleVote = async (voteType: "up" | "down") => {
    if (!discussion) return;

    if (usingApi) {
      if (!currentUser) {
        toast.error("Please sign in to vote");
        return;
      }
      try {
        const token = await currentUser.firebaseUser.getIdToken();
        const updated = await discussionApi.voteOnDiscussion(discussionId, voteType, token);
        if (updated) {
          setDiscussion(mapApiDiscussion(updated));
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
      if (currentVote === voteType) newVote = null;

      let upvotes = discussion.upvotes;
      let downvotes = discussion.downvotes;
      if (currentVote === "up") upvotes--;
      if (currentVote === "down") downvotes--;
      if (newVote === "up") upvotes++;
      if (newVote === "down") downvotes++;

      setDiscussion({ ...discussion, upvotes, downvotes });
      const updatedVotes = { ...userVotes, [discussionId]: newVote };
      setUserVotes(updatedVotes);

      const loadedDiscussions = getDiscussionsFromStorage();
      const updatedDiscussions = loadedDiscussions.map((d) =>
        d.id === discussionId ? { ...d, upvotes, downvotes } : d,
      );
      saveDiscussionsToStorage(updatedDiscussions);
      saveUserVotesToStorage(updatedVotes);
    }
  };

  // Handle voting on replies
  const handleReplyVote = async (replyId: string, voteType: "up" | "down") => {
    if (usingApi) {
      if (!currentUser) {
        toast.error("Please sign in to vote");
        return;
      }
      try {
        const token = await currentUser.firebaseUser.getIdToken();
        const updated = await discussionApi.voteOnReply(replyId, voteType, token);
        if (updated) {
          const mapped = mapApiReply(updated);
          setReplies((prev) => prev.map((r) => (r.id === replyId ? mapped : r)));
          if (updated.upvoters.includes(currentUser.uid)) {
            setReplyVotes((prev) => ({ ...prev, [replyId]: "up" }));
          } else if (updated.downvoters.includes(currentUser.uid)) {
            setReplyVotes((prev) => ({ ...prev, [replyId]: "down" }));
          } else {
            setReplyVotes((prev) => ({ ...prev, [replyId]: null }));
          }
        }
      } catch {
        toast.error("Failed to vote");
      }
    } else {
      // localStorage fallback
      const currentVote = replyVotes[replyId];
      let newVote: "up" | "down" | null = voteType;
      if (currentVote === voteType) newVote = null;

      const updatedReplies = replies.map((reply) => {
        if (reply.id === replyId) {
          let upvotes = reply.upvotes;
          let downvotes = reply.downvotes;
          if (currentVote === "up") upvotes--;
          if (currentVote === "down") downvotes--;
          if (newVote === "up") upvotes++;
          if (newVote === "down") downvotes++;
          return { ...reply, upvotes, downvotes };
        }
        return reply;
      });

      const updatedVotes = { ...replyVotes, [replyId]: newVote };
      setReplies(updatedReplies);
      setReplyVotes(updatedVotes);
      saveRepliesToStorage(updatedReplies);
      saveReplyVotesToStorage(updatedVotes);
    }
  };

  // Handle reply image upload
  const handleReplyImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/") && replyImages.length < 4) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setReplyImages((prev) => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    });

    if (replyFileInputRef.current) {
      replyFileInputRef.current.value = "";
    }
  };

  const handleRemoveReplyImage = (index: number) => {
    setReplyImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle submitting a new reply
  const handleSubmitReply = async () => {
    if (!newReply.trim() || !discussion) return;

    if (usingApi) {
      if (!currentUser) {
        toast.error("Please sign in to reply");
        return;
      }

      setIsSubmittingReply(true);
      try {
        const token = await currentUser.firebaseUser.getIdToken();
        const created = await discussionApi.createReply(
          discussionId,
          {
            content: newReply,
            images: replyImages,
            parentReplyId: replyingTo?.id,
          },
          token,
        );

        if (created) {
          const mapped = mapApiReply(created);
          setReplies((prev) => [...prev, mapped]);
          setDiscussion((prev) => (prev ? { ...prev, replies: prev.replies + 1 } : prev));
          toast.success("Reply posted!");
        }
      } catch {
        toast.error("Failed to post reply");
      } finally {
        setIsSubmittingReply(false);
      }
    } else {
      // localStorage fallback
      const reply: Reply = {
        id: `r${Date.now()}`,
        discussionId: discussionId,
        content: newReply,
        author: currentUser?.displayName || "You",
        authorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.displayName || "You"}`,
        timestamp: Date.now(),
        upvotes: 0,
        downvotes: 0,
        images: replyImages.length > 0 ? replyImages : undefined,
        parentReplyId: replyingTo?.id,
      };

      const updatedReplies = [...replies, reply];
      setReplies(updatedReplies);
      saveRepliesToStorage(updatedReplies);

      if (!replyingTo) {
        setDiscussion((prev) => (prev ? { ...prev, replies: prev.replies + 1 } : prev));
        const loadedDiscussions = getDiscussionsFromStorage();
        const updatedDiscussions = loadedDiscussions.map((disc) =>
          disc.id === discussionId ? { ...disc, replies: disc.replies + 1 } : disc,
        );
        saveDiscussionsToStorage(updatedDiscussions);
      }
    }

    setNewReply("");
    setReplyImages([]);
    setReplyingTo(null);
  };

  // Handle deleting a reply
  const handleDeleteReply = async (replyId: string) => {
    if (!currentUser) return;
    if (!window.confirm("Are you sure you want to delete this reply?")) return;

    if (usingApi) {
      try {
        const token = await currentUser.firebaseUser.getIdToken();
        await discussionApi.deleteReply(replyId, token);
        setReplies((prev) => prev.filter((r) => r.id !== replyId));
        setDiscussion((prev) => (prev ? { ...prev, replies: Math.max(0, prev.replies - 1) } : prev));
        toast.success("Reply deleted!");
      } catch {
        toast.error("Failed to delete reply");
      }
    }
  };

  const handleReplyToReply = (reply: Reply) => {
    setReplyingTo(reply);
    window.scrollTo({
      top: document.querySelector("#reply-section")?.getBoundingClientRect().top! + window.scrollY - 100,
      behavior: "smooth",
    });
  };

  const handleCancelReplyTo = () => {
    setReplyingTo(null);
  };

  // Report handling
  const handleOpenReportDialog = (itemId: string, itemType: "discussion" | "reply") => {
    setReportItemId(itemId);
    setReportItemType(itemType);
    setReportReason("");
    setReportDetails("");
    setIsReportDialogOpen(true);
  };

  const handleSubmitReport = () => {
    if (!reportReason) return;

    const report: Report = {
      id: `report_${Date.now()}`,
      itemId: reportItemId,
      itemType: reportItemType,
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

  // Format time ago
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  // Render a reply and its nested replies recursively
  const renderReply = (reply: Reply, depth: number): JSX.Element => {
    const replyVote = replyVotes[reply.id];
    const replyNetScore = reply.upvotes - reply.downvotes;
    const nestedReplies = getNestedReplies(reply.id);
    const isNested = depth > 0;
    const isOwnReply = currentUser && reply.authorId === currentUser.uid;

    // ------------------------------------------------------------
    // | UI SECTION
    // ------------------------------------------------------------
    return (
      <div key={reply.id} className={isNested ? "ml-12 mt-4" : ""}>
        <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden dark:border dark:border-[#2d3548]">
          <div className="flex gap-4 p-6">
            {/* Vote Section */}
            <div className="flex flex-col items-center gap-2 min-w-[50px]">
              <button
                onClick={() => handleReplyVote(reply.id, "up")}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  replyVote === "up"
                    ? "bg-[#2c3968] text-white dark:bg-[#4a7cf6]"
                    : "bg-[#f0f2f5] text-[#666] hover:bg-[#2c3968] hover:text-white dark:bg-[#1a1f2e] dark:text-[#a0a8b8] dark:hover:bg-[#4a7cf6] dark:hover:text-white"
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
              </button>
              <span
                className={`text-sm ${replyNetScore > 0 ? "text-[#2c3968] dark:text-[#4a7cf6]" : replyNetScore < 0 ? "text-red-500" : "text-[#666] dark:text-[#a0a8b8]"}`}
              >
                {replyNetScore > 0 ? "+" : ""}
                {replyNetScore}
              </span>
              <button
                onClick={() => handleReplyVote(reply.id, "down")}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  replyVote === "down"
                    ? "bg-red-500 text-white"
                    : "bg-[#f0f2f5] text-[#666] hover:bg-red-500 hover:text-white dark:bg-[#1a1f2e] dark:text-[#a0a8b8] dark:hover:bg-red-500 dark:hover:text-white"
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>

            {/* Reply Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={reply.authorAvatar}
                  alt={reply.author}
                  className="w-10 h-10 rounded-full bg-[#f0f2f5] dark:bg-[#1a1f2e]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#2c3968] dark:text-[#4a7cf6]">{reply.author}</span>
                    <span className="text-[#999] dark:text-[#6b7280]">•</span>
                    <span className="text-[#999] dark:text-[#6b7280] text-sm">{getTimeAgo(reply.timestamp)}</span>
                    {reply.parentReplyId &&
                      depth === 0 &&
                      (() => {
                        const parentReply = discussionReplies.find((r) => r.id === reply.parentReplyId);
                        if (parentReply) {
                          return (
                            <>
                              <span className="text-[#999] dark:text-[#6b7280]">•</span>
                              <span className="text-[#2c3968] dark:text-[#4a7cf6] text-sm flex items-center gap-1">
                                <CornerDownRight className="w-3 h-3" />
                                replying to {parentReply.author}
                              </span>
                            </>
                          );
                        }
                      })()}
                  </div>
                </div>
              </div>
              <p className="text-[#333] dark:text-[#e0e0e0] whitespace-pre-wrap leading-relaxed mb-3">
                {reply.content}
              </p>

              {/* Reply Images */}
              {reply.images && reply.images.length > 0 && (
                <div
                  className={`grid gap-2 mb-3 ${
                    reply.images.length === 1
                      ? "grid-cols-1"
                      : reply.images.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-2 md:grid-cols-3"
                  }`}
                >
                  {reply.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Reply image ${idx + 1}`}
                      className="w-full h-auto rounded-lg border border-[#e0e0e0] dark:border-[#2d3548] cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(img, "_blank")}
                    />
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReplyToReply(reply)}
                    className="text-[#2c3968] dark:text-[#4a7cf6] hover:bg-[#f0f2f5] dark:hover:bg-[#1a1f2e] text-sm -ml-2"
                  >
                    <CornerDownRight className="w-4 h-4 mr-1.5" />
                    Reply
                  </Button>
                  {nestedReplies.length > 0 && (
                    <span className="text-sm text-[#999] dark:text-[#6b7280]">
                      {nestedReplies.length} {nestedReplies.length === 1 ? "reply" : "replies"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isOwnReply && usingApi && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReply(reply.id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenReportDialog(reply.id, "reply")}
                    disabled={userReports[reply.id]}
                    className={`text-xs ${userReports[reply.id] ? "text-red-400 dark:text-red-400" : "text-[#999] dark:text-[#6b7280] hover:text-red-500 dark:hover:text-red-400"}`}
                  >
                    <Flag className="w-3.5 h-3.5 mr-1" />
                    {userReports[reply.id] ? "Reported" : "Report"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Render nested replies */}
        {nestedReplies.length > 0 && (
          <div className="space-y-4">
            {nestedReplies
              .sort((a, b) => a.timestamp - b.timestamp)
              .map((nestedReply) => renderReply(nestedReply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] dark:bg-[#0f1419] pb-12">
        <div className="max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 pt-8">
          <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-12 text-center">
            <Loader2 className="w-8 h-8 text-[#2c3968] dark:text-[#4a7cf6] mx-auto mb-4 animate-spin" />
            <p className="text-[#666] dark:text-[#a0a8b8]">Loading discussion...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!discussion) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] dark:bg-[#0f1419] pb-12">
        <div className="max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 pt-8">
          <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-12 text-center">
            <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-3">Discussion Not Found</h2>
            <p className="text-[#666] dark:text-[#a0a8b8] mb-6">The discussion you're looking for doesn't exist.</p>
            <Button
              onClick={onBack}
              className="bg-[#2c3968] hover:bg-[#1e2547] dark:bg-[#4a7cf6] dark:hover:bg-[#5b8df7]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Discussions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userVote = userVotes[discussionId];
  const netScore = discussion.upvotes - discussion.downvotes;

  return (
    <div className="min-h-screen bg-[#f7f7f7] dark:bg-[#0f1419] pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#2c3968] via-[#3d4a7a] to-[#2c3968] dark:from-[#1a1f2e] dark:via-[#252b3d] dark:to-[#1a1f2e] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white dark:bg-[#4a7cf6] rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white dark:bg-[#4a7cf6] rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 py-8 relative z-10">
          <Button
            onClick={onBack}
            variant="outline"
            className="mb-6 bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Discussions
          </Button>
        </div>
      </div>

      <div className="max-w-[1200px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 -mt-4">
        {/* Main Discussion */}
        <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-lg overflow-hidden mb-6 dark:border dark:border-[#2d3548]">
          <div className="flex gap-6 p-8">
            {/* Vote Section */}
            <div className="flex flex-col items-center gap-3 min-w-[70px]">
              <button
                onClick={() => handleVote("up")}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  userVote === "up"
                    ? "bg-[#2c3968] text-white shadow-lg dark:bg-[#4a7cf6]"
                    : "bg-[#f0f2f5] text-[#666] hover:bg-[#2c3968] hover:text-white dark:bg-[#1a1f2e] dark:text-[#a0a8b8] dark:hover:bg-[#4a7cf6] dark:hover:text-white"
                }`}
              >
                <ThumbsUp className="w-6 h-6" />
              </button>
              <span
                className={`text-xl ${netScore > 0 ? "text-[#2c3968] dark:text-[#4a7cf6]" : netScore < 0 ? "text-red-500" : "text-[#666] dark:text-[#a0a8b8]"}`}
              >
                {netScore > 0 ? "+" : ""}
                {netScore}
              </span>
              <button
                onClick={() => handleVote("down")}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  userVote === "down"
                    ? "bg-red-500 text-white shadow-lg"
                    : "bg-[#f0f2f5] text-[#666] hover:bg-red-500 hover:text-white dark:bg-[#1a1f2e] dark:text-[#a0a8b8] dark:hover:bg-red-500 dark:hover:text-white"
                }`}
              >
                <ThumbsDown className="w-6 h-6" />
              </button>
            </div>

            {/* Content Section */}
            <div className="flex-1 min-w-0">
              {/* Author Info */}
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={discussion.authorAvatar}
                  alt={discussion.author}
                  className="w-12 h-12 rounded-full bg-[#f0f2f5] dark:bg-[#1a1f2e]"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[#2c3968] dark:text-[#4a7cf6]">{discussion.author}</span>
                    <span className="text-[#999] dark:text-[#6b7280]">•</span>
                    <span className="text-[#999] dark:text-[#6b7280]">{getTimeAgo(discussion.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{discussion.category}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-[#999] dark:text-[#6b7280]">
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    <span>{discussion.replies}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>{discussion.views.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">{discussion.title}</h1>

              {/* Content */}
              <div className="text-[#333] dark:text-[#e0e0e0] mb-4 whitespace-pre-wrap leading-relaxed">
                {discussion.content}
              </div>

              {/* Images */}
              {discussion.images && discussion.images.length > 0 && (
                <div
                  className={`grid gap-3 mb-4 ${
                    discussion.images.length === 1
                      ? "grid-cols-1"
                      : discussion.images.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-2 md:grid-cols-3"
                  }`}
                >
                  {discussion.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Discussion image ${idx + 1}`}
                      className="w-full h-auto rounded-lg border border-[#e0e0e0] dark:border-[#2d3548] cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(img, "_blank")}
                    />
                  ))}
                </div>
              )}

              {/* Tags and Report */}
              <div className="flex items-center justify-between gap-4">
                {discussion.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {discussion.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-[#f0f2f5] dark:bg-[#1a1f2e] text-[#2c3968] dark:text-[#4a7cf6] text-sm rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenReportDialog(discussion.id, "discussion")}
                  disabled={userReports[discussion.id]}
                  className={`ml-auto ${userReports[discussion.id] ? "text-red-400 dark:text-red-400" : "text-[#999] dark:text-[#6b7280] hover:text-red-500 dark:hover:text-red-400"}`}
                >
                  <Flag className="w-4 h-4 mr-1.5" />
                  {userReports[discussion.id] ? "Reported" : "Report"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sentiment Summary Card */}
        <div className="mb-8">
          <SentimentSummaryCard
            data={liveThreadSentiment}
            sourceType="discussions"
            isCollapsible={true}
            defaultExpanded={true}
          />
        </div>

        {/* Reply Section */}
        <div
          id="reply-section"
          className="bg-white dark:bg-[#161b26] rounded-2xl shadow-lg p-8 mb-6 dark:border dark:border-[#2d3548]"
        >
          <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">
            {replyingTo ? `Replying to ${replyingTo.author}` : "Add a Reply"}
          </h3>

          {!currentUser ? (
            <p className="text-[#666] dark:text-[#a0a8b8] text-center py-4">Please sign in to reply.</p>
          ) : (
            <>
              {replyingTo && (
                <div className="mb-4 p-4 bg-[#f0f2f5] dark:bg-[#252b3d] rounded-lg border-l-4 border-[#2c3968] dark:border-[#4a7cf6]">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <img src={replyingTo.authorAvatar} alt={replyingTo.author} className="w-8 h-8 rounded-full" />
                      <span className="text-[#2c3968] dark:text-[#4a7cf6]">{replyingTo.author}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCancelReplyTo} className="h-auto p-1">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[#666] dark:text-[#a0a8b8] text-sm line-clamp-2">{replyingTo.content}</p>
                </div>
              )}

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-[#666] dark:text-[#a0a8b8]">
                    {newReply.length > 0 && newReply.trim().length < 10 && (
                      <span className="text-amber-500">Minimum 10 characters</span>
                    )}
                  </span>
                  <span
                    className={`text-xs ${newReply.length > 2000 ? "text-red-500" : "text-[#999] dark:text-[#6b7280]"}`}
                  >
                    {newReply.length}/2000
                  </span>
                </div>
                <Textarea
                  placeholder={replyingTo ? "Write your reply..." : "Share your thoughts..."}
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value.slice(0, 2000))}
                  className="min-h-[120px] dark:bg-[#1a1f2e] dark:border-[#2d3548] dark:text-white dark:placeholder:text-[#6b7280]"
                />
              </div>

              {/* Image Upload Section */}
              <div className="mb-4">
                <input
                  ref={replyFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleReplyImageUpload}
                  className="hidden"
                  id="reply-image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => replyFileInputRef.current?.click()}
                  disabled={replyImages.length >= 4}
                  size="sm"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Add Images ({replyImages.length}/4)
                </Button>

                {replyImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                    {replyImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Reply upload ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg border border-[#e0e0e0] dark:border-[#2d3548]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveReplyImage(idx)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitReply}
                  disabled={newReply.trim().length < 10 || isSubmittingReply}
                  className="bg-[#2c3968] hover:bg-[#1e2547] dark:bg-[#4a7cf6] dark:hover:bg-[#5b8df7]"
                >
                  {isSubmittingReply ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Post Reply
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Replies List */}
        <div className="space-y-4">
          <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">
            {topLevelReplies.length} {topLevelReplies.length === 1 ? "Reply" : "Replies"}
          </h3>

          {topLevelReplies.length === 0 ? (
            <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-sm p-12 text-center dark:border dark:border-[#2d3548]">
              <MessageCircle className="w-16 h-16 text-[#ccc] dark:text-[#6b7280] mx-auto mb-4" />
              <p className="text-[#666] dark:text-[#a0a8b8]">No replies yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            topLevelReplies
              .sort((a, b) => a.timestamp - b.timestamp)
              .map((reply) => {
                return renderReply(reply, 0);
              })
          )}
        </div>
      </div>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-md dark:bg-[#161b26] dark:border-[#2d3548]">
          <DialogHeader>
            <DialogTitle>Report {reportItemType === "discussion" ? "Discussion" : "Reply"}</DialogTitle>
            <DialogDescription>
              Help us keep the community safe by reporting content that violates our guidelines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Reason for reporting *</Label>
              <RadioGroup value={reportReason} onValueChange={setReportReason} className="mt-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spam" id="spam" />
                  <Label htmlFor="spam" className="cursor-pointer">
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
