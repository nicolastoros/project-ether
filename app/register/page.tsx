"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, Mail, User, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { STARTER_CREATURES, STARTER_CHOICE_IDS, type StarterChoiceId } from "@/lib/gameData";
import { ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { PixelButton } from "@/components/ui/PixelButton";
import { CreatureSprite } from "@/components/ui/CreatureSprite";
import { RarityCardAura } from "@/components/ui/MythicCardAura";
import { RarityBadge } from "@/components/ui/RarityBadge";
import { loadAccountIntoStore } from "@/lib/loadAccount";
import { useT } from "@/lib/i18n/useT";
import type { TranslationKey } from "@/lib/i18n/translations";
import { cn } from "@/lib/utils";

type Gender = "male" | "female";
type Step = 1 | 2 | 3;

const STARTER_OPTIONS = STARTER_CHOICE_IDS.map(
  (id) => STARTER_CREATURES.find((c) => c.id === id)!
);

const GENDER_OPTIONS: { value: Gender; labelKey: TranslationKey }[] = [
  { value: "male", labelKey: "auth.gender_male" },
  { value: "female", labelKey: "auth.gender_female" },
];

export default function RegisterPage() {
  const { status } = useSession();
  const router = useRouter();
  const t = useT();

  const [step, setStep] = useState<Step>(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secretQuestion, setSecretQuestion] = useState("");
  const [secretAnswer, setSecretAnswer] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [starterCreatureId, setStarterCreatureId] = useState<StarterChoiceId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Single source of truth for "authenticated -> load account, then go to /hub" — see app/page.tsx
  // for why this must be the only place that navigates (avoids racing loadAccountIntoStore()).
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      const loaded = await loadAccountIntoStore();
      if (!cancelled && loaded) router.replace("/hub");
    })();
    return () => {
      cancelled = true;
    };
  }, [status, router]);

  const goToStep2 = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (username.trim().length < 3) {
      setError(t("auth.error_username_length"));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(t("auth.error_invalid_email"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.error_password_length"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.error_passwords_mismatch"));
      return;
    }
    if (secretQuestion.trim().length < 5) {
      setError(t("auth.error_invalid_secret_question"));
      return;
    }
    if (secretAnswer.trim().length < 3) {
      setError(t("auth.error_secret_answer_length"));
      return;
    }
    setStep(2);
  };

  const handleCreateAccount = async () => {
    if (!gender || !starterCreatureId || submitting) return;
    setError(null);
    setSubmitting(true);

    const registerRes = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, gender, starterCreatureId, secretQuestion, secretAnswer }),
    });
    const registerBody = await registerRes.json().catch(() => ({}));

    if (!registerRes.ok) {
      setError(registerBody.error ?? t("auth.error_could_not_create_account"));
      setSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", { username, password, redirect: false });
    if (!signInResult || signInResult.error) {
      setError(t("auth.error_created_but_login_failed"));
      setSubmitting(false);
      return;
    }
    // The effect above takes it from here once `status` flips to "authenticated".
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-arcade-bg bg-arcade-grid px-4 py-10">
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <h1 className="font-arcade text-xl leading-tight glow-text-gold sm:text-2xl">
          {t("auth.create_character_title")}
        </h1>

        <div className="mt-4 flex items-center gap-2">
          {([1, 2, 3] as Step[]).map((s) => (
            <span
              key={s}
              className={cn(
                "h-1.5 w-8 rounded-full transition-colors",
                s <= step ? "bg-gold" : "bg-arcade-border"
              )}
            />
          ))}
        </div>

        <div className="mt-6 w-full">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step-1"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                onSubmit={goToStep2}
                className="flex w-full flex-col gap-3 text-left"
              >
                <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
                  <User className="h-4 w-4 shrink-0 text-zinc-500" />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("auth.username_placeholder")}
                    autoComplete="username"
                    required
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
                  />
                </label>

                <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
                  <Mail className="h-4 w-4 shrink-0 text-zinc-500" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder={t("auth.email_placeholder")}
                    autoComplete="email"
                    required
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
                  />
                </label>

                <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
                  <Lock className="h-4 w-4 shrink-0 text-zinc-500" />
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    placeholder={t("auth.password_placeholder")}
                    autoComplete="new-password"
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
                    placeholder={t("auth.confirm_password_placeholder")}
                    autoComplete="new-password"
                    required
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
                  />
                </label>

                <div className="mt-2 text-left">
                  <p className="px-1 mb-2 text-[10px] uppercase text-zinc-500 font-bold tracking-wider">{t("auth.account_recovery_label")}</p>
                  <label className="flex mb-3 items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
                    <User className="h-4 w-4 shrink-0 text-zinc-500" />
                    <input
                      value={secretQuestion}
                      onChange={(e) => setSecretQuestion(e.target.value)}
                      placeholder={t("auth.secret_question_placeholder")}
                      required
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
                    />
                  </label>
                  <label className="flex items-center gap-2.5 rounded-full border border-arcade-border bg-arcade-panel px-4 py-3">
                    <Lock className="h-4 w-4 shrink-0 text-zinc-500" />
                    <input
                      value={secretAnswer}
                      onChange={(e) => setSecretAnswer(e.target.value)}
                      placeholder={t("auth.secret_answer_placeholder")}
                      required
                      className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
                    />
                  </label>
                </div>

                {error && <p className="px-1 text-xs text-red-500">{error}</p>}

                <PixelButton type="submit" className="mt-1 flex items-center justify-center gap-2">
                  {t("auth.next")} <ArrowRight className="h-4 w-4" />
                </PixelButton>
              </motion.form>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                className="flex w-full flex-col gap-3"
              >
                <p className="text-xs text-zinc-500">{t("auth.choose_character")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {GENDER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGender(opt.value)}
                      className={cn(
                        "pixel-frame flex flex-col items-center gap-2 rounded-2xl bg-arcade-panel/95 px-4 py-6 shadow-sm backdrop-blur-sm transition-transform hover:scale-[1.02]",
                        gender === opt.value ? "glow-border-gold bg-gold/10" : "border border-arcade-border"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-14 w-14 items-center justify-center rounded-full border text-lg font-arcade",
                          gender === opt.value
                            ? "border-gold text-gold-bright"
                            : "border-arcade-border text-zinc-500"
                        )}
                      >
                        {opt.value === "male" ? "M" : "F"}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{t(opt.labelKey)}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex gap-3">
                  <PixelButton
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="flex flex-1 items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                  </PixelButton>
                  <PixelButton
                    type="button"
                    disabled={!gender}
                    onClick={() => setStep(3)}
                    className="flex flex-1 items-center justify-center gap-2"
                  >
                    {t("auth.next")} <ArrowRight className="h-4 w-4" />
                  </PixelButton>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12, transition: { duration: 0.15 } }}
                className="flex w-full flex-col gap-3"
              >
                <p className="text-xs text-zinc-500">{t("auth.choose_first_creature")}</p>
                <div className="flex flex-col gap-3">
                  {STARTER_OPTIONS.map((creature, i) => {
                    const selected = starterCreatureId === creature.id;
                    return (
                      <motion.button
                        key={creature.id}
                        type="button"
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.3, ease: "easeOut" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setStarterCreatureId(creature.id as StarterChoiceId)}
                        className={cn(
                          "pixel-frame relative flex items-center gap-3 overflow-hidden rounded-2xl bg-arcade-panel/95 p-3 text-left shadow-sm backdrop-blur-sm transition-transform hover:scale-[1.015]",
                          selected ? "glow-border-gold bg-gold/10" : "border border-arcade-border"
                        )}
                      >
                        <RarityCardAura rarity={creature.rarity} />
                        <div
                          className={cn(
                            "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-gradient-to-b pixel-frame",
                            ELEMENT_GRADIENT[creature.element],
                            selected ? "border-gold" : "border-arcade-border"
                          )}
                        >
                          <CreatureSprite creature={creature} className="h-4/5 w-4/5 text-gold-bright" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate text-base font-bold text-foreground">{creature.name}</p>
                            <RarityBadge rarity={creature.rarity} />
                          </div>
                          <p className="mt-1 truncate text-[11px] text-zinc-500">
                            {creature.element} · HP {creature.baseStats.hp} · ATK {creature.baseStats.atk}
                          </p>
                        </div>
                        {selected && (
                          <span className="absolute right-3 top-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold text-white shadow-[0_0_10px_rgba(255,184,77,0.7)]">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {error && <p className="px-1 text-xs text-red-500">{error}</p>}

                <div className="mt-1 flex gap-3">
                  <PixelButton
                    type="button"
                    variant="ghost"
                    disabled={submitting}
                    onClick={() => setStep(2)}
                    className="flex flex-1 items-center justify-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> {t("common.back")}
                  </PixelButton>
                  <PixelButton
                    type="button"
                    disabled={!starterCreatureId || submitting}
                    onClick={handleCreateAccount}
                    className="flex flex-1 items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? t("auth.creating") : t("nav.start")}
                  </PixelButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          {t("auth.already_have_account")}{" "}
          <Link href="/play" className="font-semibold text-neon hover:underline">
            {t("auth.log_in")}
          </Link>
        </p>
      </div>
    </div>
  );
}
