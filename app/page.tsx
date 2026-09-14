import { LandingPage } from "@/components/landing/LandingPage";

// The root route is the public marketing landing — shown to every visitor regardless of session
// state, logged-in or not, so a returning player still sees the pitch/layout instead of getting
// bounced straight past it. "Play Now" links here all point at /play, which is the one place that
// auto-logs an already-authenticated session straight into /hub (see its own comment) — that's
// where the "account is saved, skip the login form" behavior belongs, not here.
export default function RootPage() {
  return <LandingPage />;
}
