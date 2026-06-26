import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../context/AuthContext";
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";

interface PasswordResetPageProps {
  onNavigateToSignIn: () => void;
}

// --- CONFIGURATIONS ---
const SUCCESSFUL_PASSWORD_RESET_REDIRECT_MS = 3000;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

export default function PasswordResetPage({ onNavigateToSignIn }: PasswordResetPageProps) {
  // Functions from AuthContext
  const { confirmThePassword, verifyTheResetCode } = useAuth();
  const [searchParams] = useSearchParams();

  const [oobCode, setOobCode] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [codeValid, setCodeValid] = useState(false);

  // Extract oobCode from URL on component mount
  useEffect(() => {
    const code = searchParams.get("oobCode");

    if (!code) {
      setError("Invalid or missing reset code. Please request a new password reset link.");
      setLoading(false);
      return;
    }

    setOobCode(code);
    verifyResetCode(code);
  }, [searchParams]);

  const verifyResetCode = async (code: string) => {
    try {
      // Verify the password reset code is valid and get the email
      const userEmail = await verifyTheResetCode(code);
      setEmail(userEmail);
      setCodeValid(true);
      setLoading(false);
    } catch (err: any) {
      // Password resetcode expired error
      console.error("Error verifying reset code:", err);
      if (err.code === "auth/expired-action-code") {
        setError("This password reset link has expired. Please request a new one.");
      } else if (err.code === "auth/invalid-action-code") {
        setError("This password reset link is invalid. Please request a new one.");
      } else {
        setError("An error occurred while verifying your reset link. Please try again.");
      }
      setCodeValid(false);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Password policy regex (at least 1 lowercase, 1 uppercase, 1 special char, 8<=password_length<=128 characters long maintains NIST password security standards)
    const passwordPattern = `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?& ]{${PASSWORD_MIN},${PASSWORD_MAX}}$`;
    const passwordRegex = new RegExp(passwordPattern);
    if (!passwordRegex.test(newPassword)) {
      toast.error("Invalid email or password.");
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);

    try {
      // Reset the password
      await confirmThePassword(oobCode, newPassword);
      setSuccess(true);

      // Redirect to sign in after 3 seconds
      setTimeout(() => {
        onNavigateToSignIn();
      }, SUCCESSFUL_PASSWORD_RESET_REDIRECT_MS);
    } catch (err: any) {
      console.error("Error resetting password:", err);
      if (err.code === "auth/weak-password") {
        setError("Password is too weak. Please choose a stronger password.");
      } else if (err.code === "auth/expired-action-code") {
        setError("This password reset link has expired. Please request a new one.");
      } else {
        setError("Failed to reset password. Please try again.");
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-white to-[#e5e5e5] dark:from-[#0a0e1a] dark:via-[#161b26] dark:to-[#1a1f2e] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#2c3968] dark:border-[#4a7cf6] border-t-transparent mb-4"></div>
          <p className="text-[#666] dark:text-[#a0a8b8]">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-white to-[#e5e5e5] dark:from-[#0a0e1a] dark:via-[#161b26] dark:to-[#1a1f2e] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#161b26] rounded-2xl shadow-xl border border-[#e5e5e5] dark:border-[#2d3548] p-8 text-center">
          <div className="w-16 h-16 bg-[#10b981]/10 dark:bg-[#34d399]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="text-[#10b981] dark:text-[#34d399]" size={32} />
          </div>
          <h2 className="text-[#1e1e1e] dark:text-white mb-2">Password Reset Successful!</h2>
          <p className="text-[#666] dark:text-[#a0a8b8] mb-6">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <p className="text-[#999] dark:text-[#707070] text-sm">Redirecting to sign in page in 3 seconds...</p>
          <button
            onClick={onNavigateToSignIn}
            className="mt-4 text-[#2c3968] dark:text-[#4a7cf6] hover:underline cursor-pointer"
          >
            Go to Sign In now
          </button>
        </div>
      </div>
    );
  }

  if (!codeValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-white to-[#e5e5e5] dark:from-[#0a0e1a] dark:via-[#161b26] dark:to-[#1a1f2e] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-[#161b26] rounded-2xl shadow-xl border border-[#e5e5e5] dark:border-[#2d3548] p-8 text-center">
          <div className="w-16 h-16 bg-[#ef4444]/10 dark:bg-[#f87171]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-[#ef4444] dark:text-[#f87171]" size={32} />
          </div>
          <h2 className="text-[#1e1e1e] dark:text-white mb-2">Invalid Reset Link</h2>
          <p className="text-[#666] dark:text-[#a0a8b8] mb-6">{error}</p>
          <button
            onClick={onNavigateToSignIn}
            className="w-full py-3 px-6 bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white rounded-lg hover:shadow-lg transition-all duration-200 cursor-pointer"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f7f7f7] via-white to-[#e5e5e5] dark:from-[#0a0e1a] dark:via-[#161b26] dark:to-[#1a1f2e] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Lock className="text-white" size={28} />
          </div>
          <h1 className="text-[#2c3968] dark:text-[#4a7cf6] mb-2">Reset Your Password</h1>
          <p className="text-[#666] dark:text-[#a0a8b8]">
            Enter a new password for <span className="font-medium text-[#2c3968] dark:text-[#4a7cf6]">{email}</span>
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-[#161b26] rounded-2xl shadow-xl border border-[#e5e5e5] dark:border-[#2d3548] p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label className="block text-[#1e1e1e] dark:text-white mb-2">New Password</label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] dark:placeholder:text-[#707070] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] dark:text-[#a0a8b8] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-[#999] dark:text-[#707070] text-sm mt-1">Must be at least 6 characters long</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-[#1e1e1e] dark:text-white mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#1a1f2e] text-[#1e1e1e] dark:text-white placeholder:text-[#b3b3b3] dark:placeholder:text-[#707070] focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 dark:focus:ring-[#4a7cf6]/20 transition-all"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] dark:text-[#a0a8b8] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-[#ef4444]/10 dark:bg-[#f87171]/10 border border-[#ef4444]/20 dark:border-[#f87171]/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-[#ef4444] dark:text-[#f87171] shrink-0 mt-0.5" size={20} />
                <p className="text-[#ef4444] dark:text-[#f87171] text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 bg-gradient-to-r from-[#2c3968] to-[#3d4b7d] dark:from-[#4a7cf6] dark:to-[#5b8df7] text-white rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100 hover:scale-[1.02] cursor-pointer"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Resetting Password...
                </span>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>

          {/* Back to Sign In */}
          <div className="mt-6 pt-6 border-t border-[#e5e5e5] dark:border-[#2d3548] text-center">
            <p className="text-[#666] dark:text-[#a0a8b8]">
              Remember your password?{" "}
              <button
                onClick={onNavigateToSignIn}
                className="text-[#2c3968] dark:text-[#4a7cf6] hover:underline font-medium cursor-pointer"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        {/* Security Note */}
        <div className="mt-6 text-center">
          <p className="text-[#999] dark:text-[#707070] text-sm">
            For your security, this link will expire after one use or 24 hours
          </p>
        </div>
      </div>
    </div>
  );
}
