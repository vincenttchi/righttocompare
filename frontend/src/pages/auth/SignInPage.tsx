import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../context/AuthContext";
import { FirebaseError } from "firebase/app";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";

interface SignInPageProps {
  onSignInSuccess: () => void;
  onNavigateToSignUp: () => void;
}

// --- CONFIGURATIONS ---
const EMAIL_MAX = 254;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

export default function SignInPage({ onSignInSuccess, onNavigateToSignUp }: SignInPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Trimming leading and trailing whitespaces
    const cleanEmail = email.trim();

    // Basic validation
    if (!cleanEmail || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    // Email policy regex (maintains RFC 5321/5322 compliance)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (cleanEmail.length > EMAIL_MAX) {
      toast.error(`Email address cannot exceed ${EMAIL_MAX} characters.`);
      return;
    }

    // Password policy regex (at least 1 lowercase, 1 uppercase, 1 special char, 8<=password_length<=128 characters long maintains NIST password security standards)
    const passwordPattern = `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?& ]{${PASSWORD_MIN},${PASSWORD_MAX}}$`;
    const passwordRegex = new RegExp(passwordPattern);
    if (!passwordRegex.test(password)) {
      toast.error("Invalid email or password.");
      return;
    }

    setIsLoading(true);

    try {
      await signIn(cleanEmail, password);
      toast.success("Welcome back!");
      onSignInSuccess();
    } catch (error) {
      const firebaseError = error as FirebaseError;

      // Handle specific Firebase errors
      switch (firebaseError.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
          toast.error("Invalid email or password");
          break;
        case "auth/too-many-requests":
          toast.error("Too many failed attempts. Please try again later");
          break;
        case "auth/network-request-failed":
          toast.error("Network error. Please check your connection");
          break;
        default:
          toast.error("Failed to sign in. Please try again");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);

    try {
      await signInWithGoogle();
      toast.success("Welcome back!");
      onSignInSuccess();
    } catch (error) {
      const firebaseError = error as FirebaseError;

      if (firebaseError.code === "auth/popup-closed-by-user") {
        toast.info("Sign in cancelled");
      } else {
        toast.error("Failed to sign in with Google");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // NEED TO COME BACK AND LINK PASSWORD RESET TO Firebase Auth
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation checks for email input field
    if (!resetEmail) {
      toast.error("Please enter your email address");
      return;
    }

    if (!resetEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsResetting(true);

    // Pushing user email to Firebase servers to handle sending password reset link
    try {
      await resetPassword(resetEmail);

      // If password reset link successfully sent
      setShowForgotPassword(false);
      setResetEmail("");
      toast.success("If an account exists, a reset link as been sent.");
    } catch (error: any) {
      console.error("Reset password error:", error); // logging error

      // ERROR 1: Email does not exisT
      if (error.code === "auth/user-not-found") {
        toast.error("If an account exists, a reset link as been sent.");

        // ERROR 2: Servers down or some other technical problem
      } else {
        toast.error("Unable to process request. Please try again later.");
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[440px]">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-[#2c3968] dark:text-[#4a7cf6] mb-3">Welcome Back</h1>
          <p className="text-[#666] dark:text-[#a0a8b8]">Sign in to your account to continue</p>
        </div>

        {/* Sign In Form */}
        <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-lg border border-[#e5e5e5] dark:border-[#2d3548] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block mb-2 text-[#1e1e1e] dark:text-white">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                maxLength={EMAIL_MAX}
                value={email}
                autoFocus
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] dark:placeholder:text-[#707070] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block mb-2 text-[#1e1e1e] dark:text-white">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  maxLength={PASSWORD_MAX}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] dark:placeholder:text-[#707070] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all pr-12"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] dark:text-[#a0a8b8] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <button
                type="button"
                className="text-[#2c3968] dark:text-[#4a7cf6] hover:underline transition-colors cursor-pointer"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] text-white py-3.5 rounded-lg hover:shadow-lg hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center cursor-pointer"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e5e5e5] dark:border-[#2d3548]"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white dark:bg-[#161b26] px-4 text-[#999] dark:text-[#707070]">or</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full bg-white dark:bg-[#1a1f2e] border border-[#d9d9d9] dark:border-[#2d3548] text-[#1e1e1e] dark:text-white py-3.5 rounded-lg hover:bg-[#f7f7f7] dark:hover:bg-[#252b3d] hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-[#666] dark:text-[#a0a8b8]">
              Don't have an account?{" "}
              <button
                onClick={onNavigateToSignUp}
                className="text-[#2c3968] dark:text-[#4a7cf6] hover:underline cursor-pointer"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <p className="text-center text-[#999] dark:text-[#707070] mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>

      {/* Password Recovery Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="bg-white dark:bg-[#161b26] border-[#e5e5e5] dark:border-[#2d3548]">
          <DialogHeader>
            <DialogTitle className="text-[#2c3968] dark:text-[#4a7cf6] text-2xl font-bold">Reset Password</DialogTitle>
            <DialogDescription className="text-[#666] dark:text-[#a0a8b8]">
              Enter your email address and we'll send you a secure link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
            <div>
              <label htmlFor="reset-email" className="block mb-2 text-[#1e1e1e] dark:text-white font-medium">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                autoComplete="off"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="Enter your registered email"
                className="w-full px-4 py-3 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] dark:placeholder:text-[#707070] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                disabled={isResetting}
              />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="px-4 py-2 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] text-[#666] dark:text-[#a0a8b8] hover:bg-[#f7f7f7] dark:hover:bg-[#252b3d] transition-colors cursor-pointer"
                disabled={isResetting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isResetting}
                className="px-6 py-2 bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] text-white rounded-lg hover:shadow-lg transition-all font-bold cursor-pointer"
              >
                {isResetting ? "Sending..." : "Send Link"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
