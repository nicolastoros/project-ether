"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, User, Lock, KeyRound } from "lucide-react";
import Link from "next/link";
import { PixelButton } from "@/components/ui/PixelButton";
import { getSecretQuestionAction, resetPasswordWithAnswerAction } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();

  // step 1: enter username
  // step 2: answer question + enter new password
  // step 3: success
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [username, setUsername] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchQuestion = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || loading) return;
    
    setError(null);
    setLoading(true);
    const res = await getSecretQuestionAction(username.trim());
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.question) {
      setQuestion(res.question);
      setStep(2);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !newPassword.trim() || loading) return;

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);
    const res = await resetPasswordWithAnswerAction(username.trim(), answer.trim(), newPassword);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.success) {
      setStep(3);
    }
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-arcade-bg bg-arcade-grid px-4 py-10">
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <h1 className="font-arcade text-xl leading-tight glow-text-gold sm:text-2xl">
          ACCOUNT RECOVERY
        </h1>
        <p className="mt-2 text-xs text-zinc-500 sm:text-sm">
          {step === 1 && "Enter your username to begin."}
          {step === 2 && "Answer your secret question to reset."}
          {step === 3 && "Password updated successfully!"}
        </p>

        <div className="mt-8 w-full">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step-1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                onSubmit={handleFetchQuestion}
                className="flex w-full flex-col gap-3 text-left"
              >
                <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
                  <User className="h-4 w-4 shrink-0 text-zinc-500" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    autoComplete="username"
                    required
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
                  />
                </label>

                {error && <p className="px-1 text-xs text-red-500">{error}</p>}

                <PixelButton type="submit" disabled={loading} className="mt-2 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Searching..." : "Find Account"}
                </PixelButton>

                <div className="mt-2 text-center">
                  <Link href="/" className="text-xs text-zinc-500 hover:text-white transition-colors flex items-center justify-center gap-1">
                    <ArrowLeft className="h-3 w-3" /> Back to Login
                  </Link>
                </div>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form
                key="step-2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                onSubmit={handleResetPassword}
                className="flex w-full flex-col gap-3 text-left"
              >
                <div className="rounded-xl border border-arcade-border bg-arcade-panel/50 p-4 mb-2">
                  <p className="text-xs text-zinc-400 uppercase font-bold tracking-wide mb-1">Secret Question</p>
                  <p className="text-sm text-foreground">{question}</p>
                </div>

                <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
                  <KeyRound className="h-4 w-4 shrink-0 text-zinc-500" />
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Your Answer"
                    required
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
                  />
                </label>

                <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3 mt-2">
                  <Lock className="h-4 w-4 shrink-0 text-zinc-500" />
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type="password"
                    placeholder="New Password"
                    required
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
                  />
                </label>

                <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
                  <Lock className="h-4 w-4 shrink-0 text-zinc-500" />
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type="password"
                    placeholder="Confirm New Password"
                    required
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
                  />
                </label>

                {error && <p className="px-1 text-xs text-red-500">{error}</p>}

                <PixelButton type="submit" disabled={loading} className="mt-2 flex items-center justify-center gap-2">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Resetting..." : "Reset Password"}
                </PixelButton>

                <div className="mt-2 text-center">
                  <button type="button" onClick={() => { setStep(1); setError(null); }} className="text-xs text-zinc-500 hover:text-white transition-colors">
                    Try another username
                  </button>
                </div>
              </motion.form>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex w-full flex-col gap-4 text-center items-center py-6"
              >
                <div className="h-16 w-16 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center mb-2">
                  <Lock className="h-8 w-8 text-green-400" />
                </div>
                <p className="text-sm text-zinc-300">
                  Your password has been changed successfully. You can now log in with your new password.
                </p>
                <Link href="/" className="w-full">
                  <PixelButton className="w-full mt-4">
                    Go to Login
                  </PixelButton>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
