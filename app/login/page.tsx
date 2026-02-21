"use client";

import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_SESSION_COOKIE } from "@/lib/auth";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDemoLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      if (supabase) {
        await supabase.auth.signInAnonymously();
      }

      document.cookie = `${DEMO_SESSION_COOKIE}=1; path=/; max-age=43200; samesite=lax`;

      await fetch("/api/log-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          eventType: "demo_login",
          payload: {
            timestamp: new Date().toISOString()
          }
        })
      }).catch(() => null);

      router.push("/");
      router.refresh();
    } catch (loginError) {
      const message =
        loginError instanceof Error ? loginError.message : "Unable to start demo session.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg border-slate-700/80 bg-slate-950/80 backdrop-blur">
        <CardHeader>
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
            <Zap className="h-6 w-6" />
          </div>
          <CardTitle className="text-3xl font-semibold tracking-tight text-slate-100">
            AeroCharge
          </CardTitle>
          <CardDescription className="text-base text-slate-300">
            AI load-balancing agent for EV fleets. Start the demo environment instantly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button className="h-11 w-full text-base" onClick={handleDemoLogin} disabled={isLoading}>
            {isLoading ? "Starting Demo..." : "Login as Demo User"}
          </Button>
          <p className="text-xs text-slate-400">
            This creates a temporary demo session and bypasses full authentication.
          </p>
          {error ? (
            <p className="rounded-md border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
