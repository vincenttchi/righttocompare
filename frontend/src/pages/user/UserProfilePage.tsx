import { useState, useEffect } from "react";
import { toast } from "sonner@2.0.3";

// Icons
import {
  User,
  Bell,
  Heart,
  Settings,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  MessageCircle,
  ThumbsUp,
  Eye,
} from "lucide-react";

// Custom Components & API
import { formatPrice } from "../../utils/formatter";
import { useAuth } from "../../context/AuthContext";
import { AppUser } from "../../types/userTypes";
import { updateUserProfile } from "../../api/userApi";
import { getDiscussionsByUser } from "../../api/discussionApi";
import { DiscussionResponse } from "../../types/discussionTypes";
import { getPhoneSummaries } from "../../api/phoneApi";
import { PhoneSummary } from "../../types/phoneTypes";

interface UserProfile {
  name: string;
  email: string;
  preferences: {
    preferredBrands: string[];
    budgetRange: {
      min: number;
      max: number;
    };
    priorityFeatures: {
      camera: number;
      battery: number;
      performance: number;
      display: number;
      design: number;
    };
  };
  notifications: {
    priceAlerts: boolean;
    newReleases: boolean;
    deals: boolean;
    featureUpdates: boolean;
  };
  wishlist: string[];
}

const brands = ["Samsung", "Apple", "Google", "OnePlus", "Xiaomi", "Motorola", "Sony", "ASUS", "Oppo", "Vivo"];
const budgetRanges = [
  { label: "Under $300", min: 0, max: 300 },
  { label: "$300 - $500", min: 300, max: 500 },
  { label: "$500 - $800", min: 500, max: 800 },
  { label: "$800 - $1,200", min: 800, max: 1200 },
  { label: "Over $1,200", min: 1200, max: 10000 },
];

const featureLabels = {
  camera: "Camera Quality",
  battery: "Battery Life",
  performance: "Performance",
  display: "Display Quality",
  design: "Design & Build",
};

interface UserProfilePageProps {
  onViewDiscussion?: (discussionId: string) => void;
}

export default function UserProfilePage({ onViewDiscussion }: UserProfilePageProps) {
  const { currentUser, loading: authLoading, updateCurrentUser } = useAuth();
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [wishlistPhones, setWishlistPhones] = useState<PhoneSummary[]>([]);
  const [activeSection, setActiveSection] = useState<string | null>("personal");
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userDiscussions, setUserDiscussions] = useState<DiscussionResponse[]>([]);
  const [isLoadingDiscussions, setIsLoadingDiscussions] = useState(false);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);

  // Update profile when Firebase user changes
  useEffect(() => {
    if (currentUser) {
      setProfile({ ...currentUser }); // Using shallow copy
    }
  }, [currentUser]);

  // Fetch user's discussions when section opens
  useEffect(() => {
    if (activeSection === "discussions" && currentUser && userDiscussions.length === 0) {
      setIsLoadingDiscussions(true);
      getDiscussionsByUser(currentUser.uid)
        .then(setUserDiscussions)
        .finally(() => setIsLoadingDiscussions(false));
    }
  }, [activeSection, currentUser]);

  useEffect(() => {
    if (activeSection !== "wishlist" || !profile) return;

    if (profile.wishlist.length === 0) {
      setWishlistPhones([]);
      return;
    }

    const loadWishlistPhones = async () => {
      setIsLoadingWishlist(true);
      try {
        const phones = await getPhoneSummaries(profile.wishlist);
        setWishlistPhones(phones);
      } catch (error) {
        console.error("Failed to fetch wishlist phones:", error);
        setWishlistPhones([]);
      } finally {
        setIsLoadingWishlist(false);
      }
    };

    loadWishlistPhones();
  }, [activeSection, profile]);

  const getTimeAgo = (dateStr: string) => {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return `${Math.floor(seconds / 604800)}w ago`;
  };

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleBrandToggle = (brand: string) => {
    setProfile((prev) => {
      if (!prev) return null;
      const currentBrands = prev.preferences.preferredBrands;
      const newBrands = currentBrands.includes(brand)
        ? currentBrands.filter((b) => b !== brand)
        : [...currentBrands, brand];

      return {
        ...prev,
        preferences: { ...prev.preferences, preferredBrands: newBrands },
      };
    });
    setHasChanges(true);
  };

  const handleBudgetChange = (min: number, max: number) => {
    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        preferences: { ...prev.preferences, budget: { min, max } },
      };
    });
    setHasChanges(true);
  };

  const handleFeaturePriorityChange = (feature: keyof AppUser["preferences"]["priorityFeatures"], value: number) => {
    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          priorityFeatures: { ...prev.preferences.priorityFeatures, [feature]: value },
        },
      };
    });
    setHasChanges(true);
  };

  const handleNotificationToggle = (key: keyof AppUser["preferences"]["notifications"]) => {
    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          notifications: {
            ...prev.preferences.notifications,
            [key]: !prev.preferences.notifications[key],
          },
        },
      };
    });
    setHasChanges(true);
  };

  const handleChannelToggle = (key: keyof AppUser["preferences"]["notificationChannels"]) => {
    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        preferences: {
          ...prev.preferences,
          notificationChannels: {
            ...prev.preferences.notificationChannels,
            [key]: !prev.preferences.notificationChannels[key],
          },
        },
      };
    });
    setHasChanges(true);
  };

  const handleRemoveFromWishlist = (phoneId: string) => {
    setProfile((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        wishlist: prev.wishlist.filter((id) => id !== phoneId),
      };
    });
    setWishlistPhones((prev) => prev.filter((phone) => phone.id !== phoneId));
    setHasChanges(true);
  };

  const handleNameChange = (name: string) => {
    setProfile((prev) => {
      if (!prev) return null;
      return { ...prev, displayName: name };
    });
    setHasChanges(true);
  };

  const handleSaveProfile = async () => {
    if (!profile || !currentUser) return;
    setIsSaving(true);

    try {
      const token = await currentUser.firebaseUser.getIdToken();
      const uid = currentUser.uid;

      // Updating the user profile
      const updatedUser = await updateUserProfile(uid, token, profile);
      if (!updatedUser) {
        throw new Error("Failed to update user profile");
      }

      updateCurrentUser({
        displayName: updatedUser.displayName ?? profile.displayName,
        preferences: updatedUser.preferences ?? profile.preferences,
        wishlist: updatedUser.wishlist ?? profile.wishlist,
      });

      toast.success("Profile saved!");
      setHasChanges(false);
    } catch (error) {
      console.error(error);
      toast.error("Error saving profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || !profile) {
    return <div className="p-12 text-center">Loading profile...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] bg-gradient-to-b from-gray-50 to-white dark:from-[#0f1419] dark:to-[#161b26]">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2c3968] to-[#4a5a9e] dark:from-[#4a7cf6] dark:to-[#5b8df7] flex items-center justify-center text-white shadow-lg">
              <User size={36} />
            </div>
            <div className="flex-1">
              <h1 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">My Profile</h1>
              <p className="text-gray-600 dark:text-[#a0a8b8]">{profile.email}</p>
            </div>
            {hasChanges && (
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-[#2c3968] to-[#4a5a9e] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white rounded-lg hover:shadow-lg transition-all duration-300 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Save size={18} />
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            )}
          </div>
        </div>

        {/* Display Name Section */}
        <div className="mb-6">
          <div className="bg-white dark:bg-[#161b26] rounded-xl p-6 border border-gray-200 dark:border-[#2d3548] shadow-sm">
            <label className="block mb-2 text-[#2c3968] dark:text-[#4a7cf6]">Display Name</label>
            <input
              type="text"
              value={profile.displayName || ""}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Enter your display name"
              className="w-full px-4 py-3 border border-gray-300 dark:border-[#2d3548] rounded-lg bg-white dark:bg-[#1a1f2e] dark:text-white dark:placeholder:text-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#2c3968] dark:focus:ring-[#4a7cf6]/20 focus:border-transparent dark:focus:border-[#4a7cf6] transition-all"
            />
          </div>
        </div>

        {/* Personal Preferences Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection("personal")}
            className="w-full bg-white dark:bg-[#161b26] rounded-xl p-6 border border-gray-200 dark:border-[#2d3548] shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2c3968] to-[#4a5a9e] dark:from-[#4a7cf6] dark:to-[#5b8df7] flex items-center justify-center text-white">
                <Settings size={24} />
              </div>
              <div className="text-left">
                <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-1">Personal Preferences</h2>
                <p className="text-gray-600 dark:text-[#a0a8b8] text-sm">Customize your phone preferences</p>
              </div>
            </div>
            {activeSection === "personal" ? (
              <ChevronUp className="text-[#2c3968] dark:text-[#4a7cf6]" size={24} />
            ) : (
              <ChevronDown
                className="text-gray-400 dark:text-[#6b7280] group-hover:text-[#2c3968] dark:group-hover:text-[#4a7cf6] transition-colors"
                size={24}
              />
            )}
          </button>

          {activeSection === "personal" && (
            <div className="mt-4 bg-white dark:bg-[#161b26] rounded-xl p-6 border border-gray-200 dark:border-[#2d3548] shadow-sm">
              {/* Preferred Brands */}
              <div className="mb-8">
                <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Preferred Brands</h3>
                <div className="flex flex-wrap gap-3">
                  {brands.map((brand) => (
                    <button
                      key={brand}
                      onClick={() => handleBrandToggle(brand)}
                      className={`px-4 py-2 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                        profile.preferences.preferredBrands.includes(brand)
                          ? "border-[#2c3968] bg-[#2c3968] text-white shadow-md dark:border-[#4a7cf6] dark:bg-[#4a7cf6]"
                          : "border-gray-300 bg-white text-gray-700 hover:border-[#2c3968] hover:bg-gray-50 dark:border-[#2d3548] dark:bg-[#1a1f2e] dark:text-[#a0a8b8] dark:hover:border-[#4a7cf6] dark:hover:bg-[#252b3d]"
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget Range */}
              <div className="mb-8">
                <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Budget Range</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {budgetRanges.map((range) => (
                    <button
                      key={range.label}
                      onClick={() => handleBudgetChange(range.min, range.max)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                        profile.preferences.budget.min === range.min && profile.preferences.budget.max === range.max
                          ? "border-[#2c3968] bg-[#2c3968] text-white shadow-md dark:border-[#4a7cf6] dark:bg-[#4a7cf6]"
                          : "border-gray-300 bg-white text-gray-700 hover:border-[#2c3968] hover:bg-gray-50 dark:border-[#2d3548] dark:bg-[#1a1f2e] dark:text-[#a0a8b8] dark:hover:border-[#4a7cf6] dark:hover:bg-[#252b3d]"
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Features */}
              <div>
                <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Priority Features</h3>
                <p className="text-gray-600 dark:text-[#a0a8b8] text-sm mb-6">
                  Rate the importance of each feature (1-5)
                </p>
                {Object.entries(featureLabels).map(([key, label]) => (
                  <div key={key} className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-gray-700 dark:text-[#d1d5db]">{label}</span>
                      <span className="text-[#2c3968] dark:text-[#4a7cf6] font-semibold px-3 py-1 bg-gray-100 dark:bg-[#1a1f2e] rounded-lg">
                        {profile.preferences.priorityFeatures[key as keyof typeof profile.preferences.priorityFeatures]}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          onClick={() =>
                            handleFeaturePriorityChange(
                              key as keyof UserProfile["preferences"]["priorityFeatures"],
                              value,
                            )
                          }
                          className={`flex-1 py-2 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                            profile.preferences.priorityFeatures[
                              key as keyof typeof profile.preferences.priorityFeatures
                            ] >= value
                              ? "border-[#2c3968] bg-[#2c3968] text-white dark:border-[#4a7cf6] dark:bg-[#4a7cf6]"
                              : "border-gray-300 bg-white text-gray-400 hover:border-[#2c3968] hover:bg-gray-50 dark:border-[#2d3548] dark:bg-[#1a1f2e] dark:text-[#6b7280] dark:hover:border-[#4a7cf6] dark:hover:bg-[#252b3d]"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notification Preferences Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection("notifications")}
            className="w-full bg-white dark:bg-[#161b26] rounded-xl p-6 border border-gray-200 dark:border-[#2d3548] shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2c3968] to-[#4a5a9e] dark:from-[#4a7cf6] dark:to-[#5b8df7] flex items-center justify-center text-white">
                <Bell size={24} />
              </div>
              <div className="text-left">
                <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-1">Notification Preferences</h2>
                <p className="text-gray-600 dark:text-[#a0a8b8] text-sm">Manage your notification settings</p>
              </div>
            </div>
            {activeSection === "notifications" ? (
              <ChevronUp className="text-[#2c3968] dark:text-[#4a7cf6]" size={24} />
            ) : (
              <ChevronDown
                className="text-gray-400 dark:text-[#6b7280] group-hover:text-[#2c3968] dark:group-hover:text-[#4a7cf6] transition-colors"
                size={24}
              />
            )}
          </button>

          {activeSection === "notifications" && (
            <div className="mt-4 bg-white dark:bg-[#161b26] rounded-xl p-6 border border-gray-200 dark:border-[#2d3548] shadow-sm">
              <div className="space-y-4">
                {[
                  { key: "priceAlerts", label: "Price Alerts", description: "Get notified when phone prices drop" },
                  {
                    key: "newReleases",
                    label: "New Phone Releases",
                    description: "Be the first to know about new phones",
                  },
                  { key: "deals", label: "Deal Notifications", description: "Special offers and discounts" },
                  {
                    key: "featureUpdates",
                    label: "Feature Updates",
                    description: "Updates about new website features",
                  },
                ].map(({ key, label, description }) => {
                  const notifKey = key as keyof AppUser["preferences"]["notifications"];
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-[#2d3548] hover:border-[#2c3968] dark:hover:border-[#4a7cf6] transition-colors"
                    >
                      <div>
                        <h4 className="text-gray-800 dark:text-[#d1d5db] mb-1">{label}</h4>
                        <p className="text-gray-600 dark:text-[#a0a8b8] text-sm">{description}</p>
                      </div>
                      <button
                        onClick={() => handleNotificationToggle(notifKey)}
                        className={`relative w-14 h-8 rounded-full transition-all duration-300 cursor-pointer ${
                          profile.preferences.notifications[notifKey]
                            ? "bg-[#2c3968] dark:bg-[#4a7cf6]"
                            : "bg-gray-300 dark:bg-[#2d3548]"
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                            profile.preferences.notifications[notifKey] ? "translate-x-7" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Delivery Channels */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#2d3548]">
                <h3 className="text-[#2c3968] dark:text-[#4a7cf6] mb-4">Delivery Channels</h3>
                <div className="space-y-4">
                  {[
                    { key: "email", label: "Email", description: "Receive notifications via email" },
                    { key: "push", label: "Push", description: "Receive in-app push notifications" },
                  ].map(({ key, label, description }) => {
                    const channelKey = key as keyof AppUser["preferences"]["notificationChannels"];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-[#2d3548] hover:border-[#2c3968] dark:hover:border-[#4a7cf6] transition-colors"
                      >
                        <div>
                          <h4 className="text-gray-800 dark:text-[#d1d5db] mb-1">{label}</h4>
                          <p className="text-gray-600 dark:text-[#a0a8b8] text-sm">{description}</p>
                        </div>
                        <button
                          onClick={() => handleChannelToggle(channelKey)}
                          className={`relative w-14 h-8 rounded-full transition-all duration-300 cursor-pointer ${
                            profile.preferences.notificationChannels[channelKey]
                              ? "bg-[#2c3968] dark:bg-[#4a7cf6]"
                              : "bg-gray-300 dark:bg-[#2d3548]"
                          }`}
                        >
                          <div
                            className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                              profile.preferences.notificationChannels[channelKey] ? "translate-x-7" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* My Discussions Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection("discussions")}
            className="w-full bg-white dark:bg-[#161b26] rounded-xl p-6 border border-gray-200 dark:border-[#2d3548] shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2c3968] to-[#4a5a9e] dark:from-[#4a7cf6] dark:to-[#5b8df7] flex items-center justify-center text-white">
                <MessageCircle size={24} />
              </div>
              <div className="text-left">
                <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-1">My Discussions</h2>
                <p className="text-gray-600 dark:text-[#a0a8b8] text-sm">
                  {userDiscussions.length > 0
                    ? `${userDiscussions.length} ${userDiscussions.length === 1 ? "discussion" : "discussions"} posted`
                    : "View your discussion history"}
                </p>
              </div>
            </div>
            {activeSection === "discussions" ? (
              <ChevronUp className="text-[#2c3968] dark:text-[#4a7cf6]" size={24} />
            ) : (
              <ChevronDown
                className="text-gray-400 dark:text-[#6b7280] group-hover:text-[#2c3968] dark:group-hover:text-[#4a7cf6] transition-colors"
                size={24}
              />
            )}
          </button>

          {activeSection === "discussions" && (
            <div className="mt-4 bg-white dark:bg-[#161b26] rounded-xl p-6 border border-gray-200 dark:border-[#2d3548] shadow-sm">
              {isLoadingDiscussions ? (
                <div className="text-center py-10 text-gray-500 dark:text-[#a0a8b8]">Loading discussions...</div>
              ) : userDiscussions.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="mx-auto text-gray-300 dark:text-[#2d3548] mb-4" size={48} />
                  <p className="text-gray-500 dark:text-[#a0a8b8]">You haven't posted any discussions yet</p>
                  <p className="text-gray-400 dark:text-[#6b7280] text-sm mt-2">
                    Head to the Community tab to start a conversation
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userDiscussions.map((d) => (
                    <div
                      key={d._id}
                      onClick={() => onViewDiscussion?.(d._id)}
                      className={`p-4 border border-gray-200 dark:border-[#2d3548] rounded-lg transition-all duration-200 ${onViewDiscussion ? "cursor-pointer hover:border-[#2c3968] dark:hover:border-[#4a7cf6] hover:shadow-md" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-[#2c3968] dark:text-[#4a7cf6] leading-snug line-clamp-1">{d.title}</h4>
                        <span className="text-xs text-gray-400 dark:text-[#6b7280] whitespace-nowrap flex-shrink-0">
                          {getTimeAgo(d.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-[#a0a8b8] text-sm line-clamp-2 mb-3">{d.content}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-[#6b7280]">
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-[#1a1f2e] rounded-full text-gray-600 dark:text-[#a0a8b8]">
                          {d.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp size={12} />
                          {d.upvotes - d.downvotes > 0 ? "+" : ""}
                          {d.upvotes - d.downvotes}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={12} />
                          {d.replyCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {d.views.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wishlist Section */}
        <div className="mb-6">
          <button
            onClick={() => toggleSection("wishlist")}
            className="w-full bg-white dark:bg-[#161b26] rounded-xl p-6 border border-gray-200 dark:border-[#2d3548] shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2c3968] to-[#4a5a9e] dark:from-[#4a7cf6] dark:to-[#5b8df7] flex items-center justify-center text-white">
                <Heart size={24} />
              </div>
              <div className="text-left">
                <h2 className="text-[#2c3968] dark:text-[#4a7cf6] mb-1">My Wishlist</h2>
                <p className="text-gray-600 dark:text-[#a0a8b8] text-sm">
                  {profile.wishlist.length} {profile.wishlist.length === 1 ? "phone" : "phones"} saved
                </p>
              </div>
            </div>
            {activeSection === "wishlist" ? (
              <ChevronUp className="text-[#2c3968] dark:text-[#4a7cf6]" size={24} />
            ) : (
              <ChevronDown
                className="text-gray-400 dark:text-[#6b7280] group-hover:text-[#2c3968] dark:group-hover:text-[#4a7cf6] transition-colors"
                size={24}
              />
            )}
          </button>

          {activeSection === "wishlist" && (
            <div className="mt-4 bg-white dark:bg-[#161b26] rounded-xl p-6 border border-gray-200 dark:border-[#2d3548] shadow-sm">
              {isLoadingWishlist ? (
                <div className="text-center py-10 text-gray-500">Loading wishlist...</div>
              ) : profile.wishlist.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="mx-auto text-gray-300 dark:text-[#2d3548] mb-4" size={48} />
                  <p className="text-gray-500 dark:text-[#a0a8b8]">Your wishlist is empty</p>
                  <p className="text-gray-400 dark:text-[#6b7280] text-sm mt-2">
                    Add phones to your wishlist from their spec pages
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {wishlistPhones.map((phone) => {
                    return (
                      <div
                        key={phone.id}
                        className="relative group border border-gray-200 rounded-lg p-4 hover:border-[#2c3968] hover:shadow-md transition-all duration-300"
                      >
                        <button
                          onClick={() => handleRemoveFromWishlist(phone.id)}
                          className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all duration-300 shadow-lg z-10"
                        >
                          <X size={16} />
                        </button>
                        <div className="flex gap-4">
                          <div className="w-20 h-20 flex-shrink-0 bg-gray-100 dark:bg-[#1a1f2e] rounded-lg overflow-hidden">
                            <img src={phone.images.main} alt={phone.name} className="w-full h-full object-contain" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-gray-800 dark:text-[#d1d5db] mb-1">{phone.name}</h4>
                            <p className="text-gray-600 dark:text-[#a0a8b8] text-sm mb-2">{phone.manufacturer}</p>
                            <p className="text-[#2c3968] dark:text-[#4a7cf6]">{formatPrice(phone.price)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
