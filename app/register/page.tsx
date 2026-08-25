"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, Mail, User, ArrowLeft, ArrowRight, Check } from "lucide-react";
import { STARTER_CREATURES, STARTER_CHOICE_IDS, type StarterChoiceId } from "@/lib/gameData";
import { ELEMENT_ICON, ELEMENT_GRADIENT } from "@/lib/elementVisuals";
import { PixelButton } from "@/components/ui/PixelButton";
import { loadAccountIntoStore } from "@/lib/loadAccount";
import { cn } from "@/lib/utils";

type Gender = "male" | "female";
type Step = 1 | 2 | 3;

const STARTER_OPTIONS = STARTER_CHOICE_IDS.map(
  (id) => STARTER_CREATURES.find((c) => c.id === id)!
);

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
];

export default function RegisterPage() {
  const { status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      setError("El usuario debe tener al menos 3 caracteres.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ingresá un correo válido.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
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
      body: JSON.stringify({ username, email, password, gender, starterCreatureId }),
    });
    const registerBody = await registerRes.json().catch(() => ({}));

    if (!registerRes.ok) {
      setError(registerBody.error ?? "No se pudo crear la cuenta.");
      setSubmitting(false);
      return;
    }

    const signInResult = await signIn("credentials", { username, password, redirect: false });
    if (!signInResult || signInResult.error) {
      setError("Cuenta creada, pero no pudimos iniciar sesión. Probá entrar manualmente.");
      setSubmitting(false);
      return;
    }
    // The effect above takes it from here once `status` flips to "authenticated".
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-arcade-bg bg-arcade-grid px-4 py-10">
      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <h1 className="font-arcade text-xl leading-tight glow-text-gold sm:text-2xl">
          CREAR PERSONAJE
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
                    placeholder="Usuario"
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
                    placeholder="Correo"
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
                    placeholder="Contraseña"
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
                    placeholder="Repetir contraseña"
                    autoComplete="new-password"
                    required
                    className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-zinc-500"
                  />
                </label>

                {error && <p className="px-1 text-xs text-red-500">{error}</p>}

                <PixelButton type="submit" className="mt-1 flex items-center justify-center gap-2">
                  Siguiente <ArrowRight className="h-4 w-4" />
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
                <p className="text-xs text-zinc-500">Elegí tu personaje</p>
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
                      <span className="text-sm font-semibold text-foreground">{opt.label}</span>
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
                    <ArrowLeft className="h-4 w-4" /> Atrás
                  </PixelButton>
                  <PixelButton
                    type="button"
                    disabled={!gender}
                    onClick={() => setStep(3)}
                    className="flex flex-1 items-center justify-center gap-2"
                  >
                    Siguiente <ArrowRight className="h-4 w-4" />
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
                <p className="text-xs text-zinc-500">Elegí tu primera criatura</p>
                <div className="flex flex-col gap-2.5">
                  {STARTER_OPTIONS.map((creature) => {
                    const Icon = ELEMENT_ICON[creature.element];
                    const selected = starterCreatureId === creature.id;
                    return (
                      <button
                        key={creature.id}
                        type="button"
                        onClick={() => setStarterCreatureId(creature.id as StarterChoiceId)}
                        className={cn(
                          "pixel-frame flex items-center gap-3 rounded-2xl bg-arcade-panel/95 px-3 py-2.5 text-left shadow-sm backdrop-blur-sm transition-transform hover:scale-[1.01]",
                          selected ? "glow-border-gold bg-gold/10" : "border border-arcade-border"
                        )}
                      >
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gold bg-gradient-to-b glow-border-gold",
                            ELEMENT_GRADIENT[creature.element]
                          )}
                        >
                          <Icon className="h-6 w-6 text-gold-bright" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{creature.name}</p>
                          <p className="truncate text-[10px] text-zinc-500">
                            {creature.element} · HP {creature.baseStats.hp} · ATK {creature.baseStats.atk}
                          </p>
                        </div>
                        {selected && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
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
                    <ArrowLeft className="h-4 w-4" /> Atrás
                  </PixelButton>
                  <PixelButton
                    type="button"
                    disabled={!starterCreatureId || submitting}
                    onClick={handleCreateAccount}
                    className="flex flex-1 items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {submitting ? "Creando..." : "Empezar"}
                  </PixelButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          ¿Ya tenés cuenta?{" "}
          <Link href="/" className="font-semibold text-neon hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
