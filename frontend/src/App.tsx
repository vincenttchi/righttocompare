import { useState, useEffect, useCallback, lazy, Suspense, useRef } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner@2.0.3";
import { AuthProvider, useAuth } from "./context/AuthContext";

// UI Components
import { DarkModeProvider } from "./context/DarkModeContext";
import NavigationBar from "./components/common/NavigationBar";
import FooterBar from "./components/common/FooterBar";
import BackToTopButton from "./components/common/BackToTopButton";
import LoadingSpinner from "./components/ui/LoadingSpinner";

// Pages (Lazy Loaded)
const ProtectedRoute = lazy(() => import("./components/auth/ProtectedRoute"));
const PhoneSpecPage = lazy(() => import("./pages/catalog/PhoneSpecPage"));
const PhoneComparisonPage = lazy(() => import("./pages/comparison/PhoneComparisonPage"));
const PhoneCatalogPage = lazy(() => import("./pages/catalog/PhoneCatalogPage"));
const DiscussionsPage = lazy(() => import("./pages/discussions/DiscussionsPage"));
const DiscussionDetailPage = lazy(() => import("./pages/discussions/DiscussionDetailPage"));
const SignInPage = lazy(() => import("./pages/auth/SignInPage"));
const SignUpPage = lazy(() => import("./pages/auth/SignUpPage"));
const UserProfilePage = lazy(() => import("./pages/user/UserProfilePage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const PasswordResetPage = lazy(() => import("./pages/auth/PasswordResetPage"));
const TrendsPage = lazy(() => import("./pages/trends/TrendsPage"));

// UI Component (Lazy Loaded)
const AIChatWidget = lazy(() => import("./components/chat/AIChatWidget"));

type SelectedSpecsState = Record<string, string[]>;
type CatalogFiltersSessionState = {
  selectedManufacturers: string[];
  minPrice: number;
  maxPrice: number;
  selectedRAM: number[];
  selectedStorage: number[];
};

const SPEC_PAGE_FILTERS_SESSION_KEY = "specPageSelectedSpecs";
const COMPARISON_PAGE_FILTERS_SESSION_KEY = "comparisonPageSelectedSpecs";
const CATALOG_FILTERS_SESSION_KEY = "catalogFilters";

// Helper function for getting Recently Viewed phones from localStorage
const getRecentlyViewedFromStorage = (): string[] => {
  try {
    const stored = localStorage.getItem("recentlyViewedPhones");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper function for saving Recently Viewed phones to localStorage
const saveRecentlyViewedToStorage = (phoneIds: string[]) => {
  try {
    localStorage.setItem("recentlyViewedPhones", JSON.stringify(phoneIds));
  } catch {
    // Ignore storage errors
  }
};

// Helper function for getting currently compared phones from localStorage
const getComparisonFromStorage = (): string[] => {
  try {
    const stored = localStorage.getItem("comparisonPhoneIds");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper function for saving currently compared phones to localStorage
const saveComparisonToStorage = (phoneIds: string[]) => {
  try {
    localStorage.setItem("comparisonPhoneIds", JSON.stringify(phoneIds));
  } catch {
    // Ignore storage errors
  }
};

const getSelectedSpecsFromSession = (key: string): SelectedSpecsState | null => {
  try {
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const saveSelectedSpecsToSession = (key: string, selectedSpecs: SelectedSpecsState | null) => {
  try {
    if (!selectedSpecs) {
      sessionStorage.removeItem(key);
      return;
    }

    sessionStorage.setItem(key, JSON.stringify(selectedSpecs));
  } catch {
    // Ignore storage errors
  }
};

const clearSelectedSpecsSessionState = () => {
  try {
    sessionStorage.removeItem(SPEC_PAGE_FILTERS_SESSION_KEY);
    sessionStorage.removeItem(COMPARISON_PAGE_FILTERS_SESSION_KEY);
  } catch {
    // Ignore storage errors
  }
};

const getCatalogFiltersFromSession = (): CatalogFiltersSessionState | null => {
  try {
    const stored = sessionStorage.getItem(CATALOG_FILTERS_SESSION_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const saveCatalogFiltersToSession = (filters: CatalogFiltersSessionState | null) => {
  try {
    if (!filters) {
      sessionStorage.removeItem(CATALOG_FILTERS_SESSION_KEY);
      return;
    }

    sessionStorage.setItem(CATALOG_FILTERS_SESSION_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage errors
  }
};

const clearCatalogFiltersSessionState = () => {
  try {
    sessionStorage.removeItem(CATALOG_FILTERS_SESSION_KEY);
  } catch {
    // Ignore storage errors
  }
};

function AppContent() {
  // ------------------------------------------------------------
  // | HOOKS
  // -----------------------------------------------------------
  const { currentUser, loading: authLoading, signOut } = useAuth();

  // React Router hook
  const navigate = useNavigate();
  const location = useLocation();

  // --- Data States ---
  const [comparisonPhoneIds, setComparisonPhoneIds] = useState<string[]>([]);
  const [recentlyViewedPhones, setRecentlyViewedPhones] = useState<string[]>([]);
  const [currentDiscussionId, setCurrentDiscussionId] = useState<string>("");
  const [sessionSpecPageFilters, setSessionSpecPageFilters] = useState<SelectedSpecsState | null>(null);
  const [sessionComparisonPageFilters, setSessionComparisonPageFilters] = useState<SelectedSpecsState | null>(null);
  const [sessionCatalogFilters, setSessionCatalogFilters] = useState<CatalogFiltersSessionState | null>(null);
  const [sessionStateHydrated, setSessionStateHydrated] = useState(false);
  const hadResolvedGuestSessionRef = useRef(false);

  // ------------------------------------------------------------
  // | DATA SYNCHRONIZATION (REFRESHES)
  // ------------------------------------------------------------

  // Add a phone to recently viewed without navigating
  const addPhoneToRecentlyViewed = useCallback((phoneId: string) => {
    setRecentlyViewedPhones((prev) => {
      const filtered = prev.filter((id) => id !== phoneId);
      const updated = [phoneId, ...filtered].slice(0, 8);
      saveRecentlyViewedToStorage(updated);
      return updated;
    });
  }, []);

  /**
   * APP INITIALIZATION: Runs once on mount to handle fetching recently
   * viewed and comparisons from local storage
   * Action: Fetching recently viewed phones and comparison from local
   * storage
   */
  useEffect(() => {
    // Recently viewed from local storage
    const stored = getRecentlyViewedFromStorage();
    setRecentlyViewedPhones(stored);

    // Comparisons from local storage
    const storedCompare = getComparisonFromStorage();
    if (storedCompare.length > 0) {
      setComparisonPhoneIds(storedCompare);
    }

    setSessionSpecPageFilters(getSelectedSpecsFromSession(SPEC_PAGE_FILTERS_SESSION_KEY));
    setSessionComparisonPageFilters(getSelectedSpecsFromSession(COMPARISON_PAGE_FILTERS_SESSION_KEY));
    setSessionCatalogFilters(getCatalogFiltersFromSession());
    setSessionStateHydrated(true);
  }, []);

  /**
   * PASSWORD RESET DETECTION
   * Signal: Detects Firebase Auth OOB code for password reset in URL
   * Action: Navigates to password reset page
   */
  useEffect(() => {
    // Check if URL contains password reset code
    const urlParams = new URLSearchParams(window.location.search);
    const oobCode = urlParams.get("oobCode");
    const mode = urlParams.get("mode");

    // If there's a password reset code in the URL, navigate to password reset page
    if (oobCode && mode === "resetPassword") {
      navigate({ pathname: "/password-reset", search: window.location.search }, { replace: true });
    }
  }, [navigate]);

  /**
   * PROTECT SIGN-IN/SIGN-UP PAGES FROM AUTHENTICATED USERS
   * Signal: Change to current user, URL path, or call of navigate function
   * Action: On sign-in or sign-up page entry while an authorized user, navigates directly
   * to current user's profile page
   */
  useEffect(() => {
    // Navigates to profile if current user is already authorized user when accessing sign-in or sign-up
    const isAuthPage = location.pathname === "/sign-in" || location.pathname === "/sign-up";
    if (currentUser && isAuthPage) navigate("/profile", { replace: true });
  }, [currentUser, location.pathname, navigate]);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      hadResolvedGuestSessionRef.current = true;
      return;
    }

    if (hadResolvedGuestSessionRef.current) {
      clearSelectedSpecsSessionState();
      clearCatalogFiltersSessionState();
      setSessionSpecPageFilters(null);
      setSessionComparisonPageFilters(null);
      setSessionCatalogFilters(null);
      hadResolvedGuestSessionRef.current = false;
    }
  }, [authLoading, currentUser]);

  /**
   * COMPARISON PERSISTENCE:
   * Signal: Any changes to the comparisonPhoneIds array (i.e. adding new phone)
   * Action: Syncs current comparison ID list to localStorage; keeps compares
   * persistent on refresh
   */
  useEffect(() => {
    saveComparisonToStorage(comparisonPhoneIds);

    // Also save to database for logged-in users
    if (currentUser?.firebaseUser) {
      const saveToDb = async () => {
        try {
          const token = await currentUser.firebaseUser.getIdToken();
          await fetch(`http://localhost:5001/api/users/${currentUser.uid}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ comparisonPhoneIds }),
          });
        } catch (err) {
          console.error("Failed to save comparisons:", err);
        }
      };
      saveToDb();
    }
  }, [comparisonPhoneIds]);

  useEffect(() => {
    if (!sessionStateHydrated) return;
    saveSelectedSpecsToSession(SPEC_PAGE_FILTERS_SESSION_KEY, sessionSpecPageFilters);
  }, [sessionSpecPageFilters, sessionStateHydrated]);

  useEffect(() => {
    if (!sessionStateHydrated) return;
    saveSelectedSpecsToSession(COMPARISON_PAGE_FILTERS_SESSION_KEY, sessionComparisonPageFilters);
  }, [sessionComparisonPageFilters, sessionStateHydrated]);

  useEffect(() => {
    if (!sessionStateHydrated) return;
    saveCatalogFiltersToSession(sessionCatalogFilters);
  }, [sessionCatalogFilters, sessionStateHydrated]);

  // Update compare page URL whenever user adds/removes phones to compare cart
  useEffect(() => {
    if (location.pathname !== "/compare") return;

    if (comparisonPhoneIds.length === 0) {
      navigate("/compare", { replace: true });
    } else {
      const phoneQuery = comparisonPhoneIds.join(",");
      navigate(`/compare?phones=${phoneQuery}`, { replace: true });
    }
  }, [comparisonPhoneIds, location.pathname]);

  // Update compare page URL on page refresh
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const phones = params.get("phones");

    if (phones) {
      setComparisonPhoneIds(phones.split(","));
    }
  }, []);

  // ------------------------------------------------------------
  // | UI FUNCTIONS
  // -----------------------------------------------------------

  const handleRemoveFromComparison = (phoneId: string) => {
    const updatedIds = comparisonPhoneIds.filter((id) => id !== phoneId);
    setComparisonPhoneIds(updatedIds);
  };

  const handleAddToComparison = (phoneId: string) => {
    if (!comparisonPhoneIds.includes(phoneId) && comparisonPhoneIds.length < 3) {
      setComparisonPhoneIds([...comparisonPhoneIds, phoneId]);
      // Also add to recently viewed
      addPhoneToRecentlyViewed(phoneId);
    }
  };

  // ------------------------------------------------------------
  // | NAVIGATION FUNCTIONS
  // ------------------------------------------------------------
  const handleNavigateToPhone = (phoneId: string) => {
    addPhoneToRecentlyViewed(phoneId);
    navigate(`/phones/${phoneId}`);
  };

  const handleNavigateToComparison = () => {
    navigate("/compare");
  };

  const handleDiscussionsClick = () => {
    navigate("/discussions");
  };

  const handleViewDiscussion = (discussionId: string) => {
    setCurrentDiscussionId(discussionId);
    navigate(`/discussions/${discussionId}`);
  };

  const handleSignInClick = () => {
    navigate("/sign-in");
  };

  const handleSignUpClick = () => {
    navigate("/sign-up");
  };

  const handleSignInSuccess = () => {
    navigate("/profile");
  };

  const handleSignUpSuccess = () => {
    navigate("/profile");
  };

  const handleSignOut = async () => {
    await signOut();
    clearSelectedSpecsSessionState();
    clearCatalogFiltersSessionState();
    setSessionSpecPageFilters(null);
    setSessionComparisonPageFilters(null);
    setSessionCatalogFilters(null);
    navigate("/");
  };

  const handleProfileClick = () => {
    navigate("/profile");
  };

  const handleAdminClick = () => {
    navigate("/admin");
  };

  const handleCatalogClick = () => {
    navigate("/");
  };

  const handleLogoClick = () => {
    navigate("/");
  };

  const handleBackToDiscussions = () => {
    navigate("/discussions");
  };

  const handleTrendsClick = () => {
    navigate("/trends");
  };

  // ------------------------------------------------------------
  // | UI SECTION
  // -----------------------------------------------------------
  return (
    <DarkModeProvider>
      <div className="min-h-screen bg-[#f7f7f7] dark:bg-[#0d1117] flex flex-col transition-colors duration-300">
        <Toaster position="top-right" richColors />
        <div className="relative h-[80px] shrink-0">
          <NavigationBar
            isAuthenticated={currentUser !== null}
            user={currentUser}
            onComparisonToolClick={handleNavigateToComparison}
            onDiscussionsClick={handleDiscussionsClick}
            onTrendsClick={handleTrendsClick}
            onSignInClick={handleSignInClick}
            onSignOut={handleSignOut}
            onProfileClick={handleProfileClick}
            onAdminClick={handleAdminClick}
            onCatalogClick={handleCatalogClick}
            onLogoClick={handleLogoClick}
          />
        </div>

        <main className="flex-1">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              {/* Catalog page */}
              <Route
                path="/"
                element={
                  <PhoneCatalogPage
                    onNavigate={handleNavigateToPhone}
                    comparisonPhoneIds={comparisonPhoneIds}
                    onComparisonChange={setComparisonPhoneIds}
                    onNavigateToComparison={handleNavigateToComparison}
                    recentlyViewedPhones={recentlyViewedPhones}
                    sessionCatalogFilters={sessionCatalogFilters}
                    onSessionCatalogFiltersChange={setSessionCatalogFilters}
                    sessionStateHydrated={sessionStateHydrated}
                  />
                }
              />

              {/* Phone detail page */}
              <Route
                path="/phones/:phoneId"
                element={
                  <PhoneSpecPage
                    comparisonPhoneIds={comparisonPhoneIds}
                    onComparisonChange={setComparisonPhoneIds}
                    recentlyViewedPhones={recentlyViewedPhones}
                    onAddToRecentlyViewed={addPhoneToRecentlyViewed}
                    onNavigateToComparison={handleNavigateToComparison}
                    sessionSelectedSpecs={sessionSpecPageFilters}
                    onSessionSelectedSpecsChange={setSessionSpecPageFilters}
                    sessionStateHydrated={sessionStateHydrated}
                  />
                }
              />

              {/* Comparison page */}
              <Route
                path="/compare"
                element={
                  <PhoneComparisonPage
                    phoneIds={comparisonPhoneIds}
                    onRemovePhone={handleRemoveFromComparison}
                    onAddPhone={handleAddToComparison}
                    recentlyViewedPhones={recentlyViewedPhones}
                    onNavigate={handleNavigateToPhone}
                    sessionSelectedSpecs={sessionComparisonPageFilters}
                    onSessionSelectedSpecsChange={setSessionComparisonPageFilters}
                    sessionStateHydrated={sessionStateHydrated}
                  />
                }
              />

              {/* Discussions */}
              <Route
                path="/discussions"
                element={<DiscussionsPage onNavigate={handleNavigateToPhone} onViewDiscussion={handleViewDiscussion} />}
              />
              <Route
                path="/discussions/:discussionId"
                element={<DiscussionDetailPage discussionId={currentDiscussionId} onBack={handleBackToDiscussions} />}
              />

              {/* Auth */}
              <Route
                path="/sign-in"
                element={<SignInPage onSignInSuccess={handleSignInSuccess} onNavigateToSignUp={handleSignUpClick} />}
              />
              <Route
                path="/sign-up"
                element={<SignUpPage onSignUpSuccess={handleSignUpSuccess} onNavigateToSignIn={handleSignInClick} />}
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute onNavigateToSignIn={handleSignInClick}>
                    <UserProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Admin */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute
                    adminOnly
                    onNavigateToCatalog={handleCatalogClick}
                    onNavigateToSignIn={handleSignInClick}
                  >
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Password reset */}
              <Route path="/password-reset" element={<PasswordResetPage onNavigateToSignIn={handleSignInClick} />} />

              {/* Trends Page */}
              <Route
                path="/trends"
                element={
                  <TrendsPage
                    comparisonPhoneIds={comparisonPhoneIds}
                    onCompare={handleAddToComparison}
                    onRemove={handleRemoveFromComparison}
                    onViewDetails={handleNavigateToPhone}
                  />
                }
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        <div className="relative h-[60px] shrink-0 mt-12">
          <FooterBar />
        </div>

        {/* AI Chat Widget */}
        <AIChatWidget onNavigate={handleNavigateToPhone} />

        {/* Back to Top Button */}
        <BackToTopButton />
      </div>
    </DarkModeProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
