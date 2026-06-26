import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User, LogOut, UserCircle, Shield, Moon, Mailbox } from "lucide-react";
import svgPaths from "./icons/darkmodeIcon";
import { useDarkMode } from "../../context/DarkModeContext";
import { AppUser } from "../../types/userTypes";
import { getMyNotifications, markAllNotificationsRead, AppNotification } from "../../api/notificationApi";

function LogoButton({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${className} cursor-pointer hover:opacity-80 transition-opacity`}
      data-name="Logo Button"
    >
      <div className="absolute aspect-[664/146] left-[18.04%] right-0 top-0" data-name="RightToCompare_name_slogan">
        <img
          alt="RightToCompare Name and Slogan"
          src="/name_slogan.webp"
          className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full"
          fetchpriority="high"
        />
      </div>
      <div className="absolute aspect-[70/70] left-0 right-[81.96%] top-0" data-name="RightToCompare_icon">
        <img
          alt="RightToCompare Icon"
          src="/icon.webp"
          className="absolute inset-0 max-w-none object-50%-50% object-cover pointer-events-none size-full"
          fetchpriority="high"
        />
      </div>
    </button>
  );
}

function NavigationBarLinks({
  onComparisonToolClick,
  onDiscussionsClick,
  onTrendsClick,
  isAuthenticated,
  user,
  onSignInClick,
  onSignOut,
  onProfileClick,
  onAdminClick,
  onCatalogClick,
}: {
  onComparisonToolClick?: () => void;
  onDiscussionsClick?: () => void;
  onTrendsClick?: () => void;
  isAuthenticated: boolean;
  user: AppUser | null;
  onSignInClick?: () => void;
  onSignOut?: () => void;
  onProfileClick?: () => void;
  onAdminClick?: () => void;
  onCatalogClick?: () => void;
}) {
  const location = useLocation();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMailbox, setShowMailbox] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mailboxRef = useRef<HTMLDivElement>(null);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  const fetchNotifications = useCallback(
    async (options?: { markRead?: boolean }) => {
      if (!user?.firebaseUser) return null;

      try {
        const token = await user.firebaseUser.getIdToken();
        const data = await getMyNotifications(token, options);

        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);

        return data;
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        return null;
      }
    },
    [user],
  );

  useEffect(() => {
    if (isAuthenticated && user?.firebaseUser) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, user, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setShowDropdown(false);
      }

      if (mailboxRef.current && !mailboxRef.current.contains(target)) {
        setShowMailbox(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getDisplayName = () => {
    if (!user) return "";
    return user.displayName || user.email?.split("@")[0] || "User";
  };

  const displayName = getDisplayName();

  const handleNavInteraction = (path: string, originalCallback?: () => void) => {
    if (location.pathname === path) {
      window.location.href = path;
    } else {
      originalCallback?.();
    }
  };

  return (
    <div className="content-stretch flex gap-[20px] items-center relative shrink-0" data-name="Navigation Bar Links">
      <button
        onClick={toggleDarkMode}
        className="overflow-clip relative shrink-0 size-[32px] hover:opacity-70 transition-opacity cursor-pointer"
        data-name="Dark Mode/Light Mode"
        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <div className="absolute inset-[4.167%]" data-name="Icon">
          {isDarkMode ? (
            <div
              className="absolute inset-[-6.818%]"
              style={{ "--stroke-0": "rgba(255, 255, 255, 1)" } as React.CSSProperties}
            >
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 34 34">
                <path
                  d={svgPaths.p39896bf0}
                  id="Icon"
                  stroke="var(--stroke-0, #FFFFFF)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                />
              </svg>
            </div>
          ) : (
            <Moon className="w-full h-full text-[#1e1e1e]" strokeWidth={2.5} />
          )}
        </div>
      </button>

      <div className="relative" ref={mailboxRef}>
        <button
          onClick={async () => {
            const nextOpen = !showMailbox;
            setShowMailbox(nextOpen);

            if (nextOpen) {
              await fetchNotifications({ markRead: true });
            }
          }}
          className="relative overflow-clip shrink-0 size-[32px] hover:opacity-70 transition-opacity cursor-pointer"
          data-name="Price Alert Mailbox"
          title="Price alerts for wishlisted phones"
        >
          <Mailbox className="w-full h-full text-[#1e1e1e] dark:text-white" strokeWidth={2.2} />

          {isAuthenticated && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-[18px] h-[18px] flex items-center justify-center font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {showMailbox && (
          <div className="absolute right-0 top-full mt-3 bg-white dark:bg-[#1a1f2e] rounded-xl shadow-xl border border-[#e5e5e5] dark:border-[#2d3548] min-w-[320px] max-w-[360px] z-[9999] overflow-visible">
            <div className="px-4 py-3 border-b border-[#e5e5e5] dark:border-[#2d3548] flex items-center justify-between">
              <p className="font-bold text-[#1e1e1e] dark:text-white">Price Alerts</p>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onMouseDown={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    console.log("Mark all read mouse down");

                    if (!user?.firebaseUser) return;

                    try {
                      const token = await user.firebaseUser.getIdToken();
                      await markAllNotificationsRead(token);

                      setNotifications((prev) =>
                        prev.map((notification) => ({
                          ...notification,
                          isRead: true,
                        })),
                      );

                      setUnreadCount(0);
                    } catch (error) {
                      console.error("Failed to mark all notifications as read:", error);
                    }
                  }}
                  className="text-xs text-[#2c3968] dark:text-[#4a7cf6] hover:underline cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {!isAuthenticated ? (
                <div className="p-4 text-sm text-[#666] dark:text-[#a0a0a0]">Sign in to view price alerts.</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-sm text-[#666] dark:text-[#a0a0a0]">No price alerts yet.</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`px-4 py-3 border-b border-[#f0f0f0] dark:border-[#2d3548] ${
                      notification.isRead ? "bg-white dark:bg-[#1a1f2e]" : "bg-[#f7f9ff] dark:bg-[#20283a]"
                    }`}
                  >
                    <p className="font-bold text-sm text-[#1e1e1e] dark:text-white">{notification.title}</p>
                    <p className="text-sm text-[#666] dark:text-[#a0a0a0] mt-1">{notification.message}</p>
                    <p className="text-xs text-[#999] mt-2">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div
        className="content-start flex flex-wrap gap-[8px] items-center relative shrink-0"
        data-name="Navigation Bar Pill List"
      >
        <button
          onClick={() => handleNavInteraction("/", onCatalogClick)}
          className="box-border content-stretch flex gap-[8px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0 hover:bg-[#f0f0f0] dark:hover:bg-[#1e2530] transition-colors cursor-pointer"
          data-name="Catalog"
        >
          <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#1e1e1e] dark:text-white text-[0px] text-nowrap">
            <p className="font-['Inter:Bold',sans-serif] font-bold leading-none text-[16px] whitespace-pre">Catalog</p>
          </div>
        </button>

        <button
          onClick={() => handleNavInteraction("/trends", onTrendsClick)}
          className="box-border content-stretch flex gap-[8px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0 hover:bg-[#f0f0f0] dark:hover:bg-[#1e2530] transition-colors cursor-pointer"
          data-name="Trends"
        >
          <div className="flex flex-col font-['Inter:Bold',sans-serif] font-bold justify-center leading-none text-[16px] text-[#1e1e1e] dark:text-white whitespace-pre">
            Trends
          </div>
        </button>

        <button
          onClick={() => handleNavInteraction("/compare", onComparisonToolClick)}
          className="box-border content-stretch flex gap-[8px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0 hover:bg-[#f0f0f0] dark:hover:bg-[#1e2530] transition-colors cursor-pointer"
          data-name="Comparison Tool"
        >
          <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#1e1e1e] dark:text-white text-[0px] text-nowrap">
            <p className="font-['Inter:Bold',sans-serif] font-bold leading-none text-[16px] whitespace-pre">
              Comparison Tool
            </p>
          </div>
        </button>

        <button
          onClick={() => handleNavInteraction("/discussions", onDiscussionsClick)}
          className="box-border content-stretch hidden lg:flex gap-[8px] items-center justify-center p-[8px] relative rounded-[8px] shrink-0 hover:bg-[#f0f0f0] dark:hover:bg-[#1e2530] transition-colors cursor-pointer"
          data-name="Discussions"
        >
          <div className="flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#1e1e1e] dark:text-white text-[0px] text-nowrap">
            <p className="font-['Inter:Bold',sans-serif] font-bold leading-none text-[16px] whitespace-pre">
              Discussions
            </p>
          </div>
        </button>

        {isAuthenticated && user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] box-border flex gap-[10px] items-center justify-center px-[16px] md:px-[20px] py-[12px] relative rounded-[100px] shrink-0 hover:shadow-lg transition-all cursor-pointer"
              data-name="Profile Button"
            >
              <div className="bg-white rounded-full p-1.5">
                <User size={18} className="text-[#2c3968]" />
              </div>
              <div className="hidden md:flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center items-center not-italic relative shrink-0 text-white text-nowrap">
                <p className="font-['Inter:Bold',sans-serif] font-bold leading-none text-[14px] md:text-[16px] whitespace-pre">
                  {displayName.split(" ")[0]}
                </p>
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 bg-white dark:bg-[#1a1f2e] rounded-xl shadow-xl border border-[#e5e5e5] dark:border-[#2d3548] py-2 min-w-[200px] z-[1000]">
                <div className="px-4 py-3 border-b border-[#e5e5e5] dark:border-[#2d3548]">
                  <p className="font-['Inter:Bold',sans-serif] text-[#1e1e1e] dark:text-white">{displayName}</p>
                  <p className="text-[#666] dark:text-[#a0a0a0] text-[14px]">{user.email}</p>
                </div>

                <button
                  onClick={() => {
                    onProfileClick?.();
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#f7f7f7] dark:hover:bg-[#252b3d] transition-colors text-left"
                >
                  <UserCircle size={18} className="text-[#666] dark:text-[#a0a0a0]" />
                  <span className="text-[#1e1e1e] dark:text-white">Profile</span>
                </button>

                {user.role === "admin" && (
                  <button
                    onClick={() => {
                      onAdminClick?.();
                      setShowDropdown(false);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#f7f7f7] dark:hover:bg-[#252b3d] transition-colors text-left"
                  >
                    <Shield size={18} className="text-[#666] dark:text-[#a0a0a0]" />
                    <span className="text-[#1e1e1e] dark:text-white">Admin Dashboard</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onSignOut?.();
                    setShowDropdown(false);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#f7f7f7] dark:hover:bg-[#252b3d] transition-colors text-left"
                >
                  <LogOut size={18} className="text-[#666] dark:text-[#a0a0a0]" />
                  <span className="text-[#1e1e1e] dark:text-white">Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => handleNavInteraction("/sign-in", onSignInClick)}
            className="bg-[#2c3968] box-border flex items-center justify-center px-[16px] md:px-[24px] py-[12px] relative rounded-[100px] shrink-0 hover:bg-[#3d4a7a] transition-colors cursor-pointer"
            data-name="Navigation Pill"
          >
            <p className="font-['Inter:Bold',sans-serif] font-bold leading-none text-[14px] md:text-[16px] text-white whitespace-nowrap">
              Sign In
            </p>
          </button>
        )}
      </div>
    </div>
  );
}

function NavigationBarLayout({
  onComparisonToolClick,
  onDiscussionsClick,
  onTrendsClick,
  isAuthenticated,
  user,
  onSignInClick,
  onSignOut,
  onProfileClick,
  onAdminClick,
  onCatalogClick,
  onLogoClick,
}: {
  onComparisonToolClick?: () => void;
  onDiscussionsClick?: () => void;
  onTrendsClick?: () => void;
  isAuthenticated: boolean;
  user: AppUser | null;
  onSignInClick?: () => void;
  onSignOut?: () => void;
  onProfileClick?: () => void;
  onAdminClick?: () => void;
  onCatalogClick?: () => void;
  onLogoClick?: () => void;
}) {
  const navigate = useNavigate();

  return (
    <div
      className="absolute content-stretch flex h-[80px] items-center justify-between left-0 right-0 top-1/2 translate-y-[-50%] w-full max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 gap-2 md:gap-4"
      data-name="Navigation Bar Layout"
    >
      <LogoButton
        className="h-[50px] md:h-[70px] relative shrink-0 w-[250px] md:w-[388px]"
        onClick={() => {
          if (window.location.pathname === "/") {
            window.location.href = "/";
          } else {
            navigate("/");
          }
        }}
      />
      <div className="relative shrink-0 w-full max-w-[300px] md:max-w-[400px] hidden sm:block" />
      <NavigationBarLinks
        onComparisonToolClick={onComparisonToolClick}
        onDiscussionsClick={onDiscussionsClick}
        onTrendsClick={onTrendsClick}
        isAuthenticated={isAuthenticated}
        user={user}
        onSignInClick={onSignInClick}
        onSignOut={onSignOut}
        onProfileClick={onProfileClick}
        onAdminClick={onAdminClick}
        onCatalogClick={onCatalogClick}
      />
    </div>
  );
}

export default function NavigationBar({
  onComparisonToolClick,
  onDiscussionsClick,
  onTrendsClick,
  isAuthenticated,
  user,
  onSignInClick,
  onSignOut,
  onProfileClick,
  onAdminClick,
  onCatalogClick,
  onLogoClick,
}: {
  onComparisonToolClick?: () => void;
  onDiscussionsClick?: () => void;
  onTrendsClick?: () => void;
  isAuthenticated: boolean;
  user: AppUser | null;
  onSignInClick?: () => void;
  onSignOut?: () => void;
  onProfileClick?: () => void;
  onAdminClick?: () => void;
  onCatalogClick?: () => void;
  onLogoClick?: () => void;
}) {
  return (
    <div
      className="bg-white dark:bg-[#161b26] border-b border-[#e5e5e5] dark:border-[#2d3548] overflow-visible fixed left-0 right-0 top-0 h-[80px] z-[999] transition-colors duration-300"
      data-name="Navigation Bar"
    >
      <NavigationBarLayout
        onComparisonToolClick={onComparisonToolClick}
        onDiscussionsClick={onDiscussionsClick}
        onTrendsClick={onTrendsClick}
        isAuthenticated={isAuthenticated}
        user={user}
        onSignInClick={onSignInClick}
        onSignOut={onSignOut}
        onProfileClick={onProfileClick}
        onAdminClick={onAdminClick}
        onCatalogClick={onCatalogClick}
        onLogoClick={onLogoClick}
      />
    </div>
  );
}
