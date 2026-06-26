import { ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";
import { Shield } from "lucide-react";

// ADD NEW ROUTE PROTECTIONS HERE
interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  adminOnly?: boolean;
  onNavigateToCatalog?: () => void;
  onNavigateToSignIn?: () => void;
}

export default function ProtectedRoute({
  children,
  fallback,
  adminOnly,
  onNavigateToCatalog,
  onNavigateToSignIn,
}: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();

  // ------------------------------------------------------------
  // | RENDER GUARDS
  // ------------------------------------------------------------
  // CASE: Firebase Auth still loading
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#2c3968] border-r-transparent"></div>
          <p className="mt-4 text-[#666]">Loading...</p>
        </div>
      </div>
    );
  }

  // CASE: Admin protected routes (i.e. the admin dashboard) leads to access denied page if not admin
  if (adminOnly && (!currentUser || currentUser.role != "admin")) {
    // Leads to access denied page if trying to access admin dashboard not authenticated
    return (
      // Handles invalid access to admin page (NEED TO POSSIBLY MOVE INTO PROTECTED ROUTE)
      <div className="max-w-[1199px] xl:max-w-[1400px] 2xl:max-w-[1600px] mx-auto px-6 pt-8">
        <div className="bg-white dark:bg-[#160b26] rounded-2xl shadow-sm p-16 text-center flex flex-col items-center border border-[#e5e5e5] dark:border-[#2d3548]">
          <div className="h-17 w-full" />
          <div className="bg-red-51 dark:bg-red-900/20 p-4 rounded-full mt-2 mb-4">
            <Shield size={64} className="text-red-600 dark:text-red-500" />
          </div>

          <h1 className="text-[#2c3968] dark:text-white text-3xl font-bold mb-4">Access Denied</h1>

          <p className="text-[#665] dark:text-[#a0a8b8] max-w-md mx-auto mb-8 text-lg">
            You don't have the administrative privileges required to view the
            <strong> RightToCompare</strong> dashboard.
          </p>

          <button
            onClick={onNavigateToCatalog}
            className="bg-[#2c3968] hover:bg-[#3d4a7a] text-white px-8 py-3 mb-5 rounded-full font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Return to Catalog
          </button>
          <div className="h-17 w-full" />
        </div>
      </div>
    );
  }

  // CASE: Not logged in
  if (!currentUser) {
    // Returns to a specific page (the fallback page)
    if (fallback) return <>{fallback}</>;

    // Returns to a page to show authentication required error page that leads back to sign in
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h2 className="text-[#2c3968] mb-4">Authentication Required</h2>
          <p className="text-[#666] mb-6">You need to sign in to access this page.</p>
          <button
            onClick={onNavigateToSignIn}
            className="bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
