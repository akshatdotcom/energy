"use client";

import { Activity, ArrowRight, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DEMO_SESSION_COOKIE } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (document.cookie.includes(`${DEMO_SESSION_COOKIE}=1`)) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleLogin = async () => {
    setIsLoading(true);
    document.cookie = `${DEMO_SESSION_COOKIE}=1; path=/; max-age=43200; samesite=lax`;
    await fetch("/api/log-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "demo_login", payload: { timestamp: new Date().toISOString() } }),
    }).catch(() => null);
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#030712] px-4 overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="absolute -right-40 -bottom-40 h-96 w-96 rounded-full bg-cyan-600/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
            <Zap className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-100">AeroCharge</h1>
          <p className="mt-2 text-sm text-slate-400">AI-powered EV fleet load management</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-8 backdrop-blur">
          <p className="mb-6 text-center text-sm text-slate-400">
            Sign in to the Pacific Coast Logistics demo environment
          </p>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-emerald-400 disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Activity className="h-4 w-4 animate-spin" />
                Starting session...
              </>
            ) : (
              <>
                Enter Demo Dashboard
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </>
            )}
          </button>

          <div className="mt-6 space-y-2">
            {[
              { label: "Organization", value: "Pacific Coast Logistics" },
              { label: "Role", value: "Fleet Operations Admin" },
              { label: "Sites", value: "Oakland · San Jose · Fremont" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{r.label}</span>
                <span className="text-slate-300">{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          Demo session · No account required
        </p>
      </div>
    </div>
  );
}
