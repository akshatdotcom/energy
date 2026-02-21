"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Box,
  Building2,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Settings,
  Sparkles,
  Truck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DEMO_SESSION_COOKIE } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/site", label: "Site View", icon: Box },
  { href: "/dashboard/fleet", label: "Fleet", icon: Truck },
  { href: "/dashboard/chargers", label: "Chargers & Sites", icon: Zap },
  { href: "/dashboard/ai", label: "AI Insights", icon: Sparkles },
  { href: "/dashboard/rebates", label: "Rebates", icon: DollarSign },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-[#030712]">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col border-r border-slate-800/70 bg-slate-950/80 backdrop-blur transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-3 border-b border-slate-800/70 px-4 py-4", collapsed && "justify-center px-0")}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold tracking-tight text-slate-100">AeroCharge</p>
              <p className="text-[10px] text-slate-500">Pacific Coast Logistics</p>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="absolute -right-3 top-[68px] flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-hidden p-2 pt-4">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  active
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                  collapsed && "justify-center px-0"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Live indicator */}
        {!collapsed && (
          <div className="mx-2 mb-2 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400">Live — Oakland DC</span>
          </div>
        )}

        {/* Bottom actions */}
        <div className={cn("flex flex-col gap-1 border-t border-slate-800/70 p-2", collapsed && "items-center")}>
          <button
            onClick={handleLogout}
            title={collapsed ? "Log out" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition-all hover:bg-slate-800/60 hover:text-slate-300",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-auto">{children}</main>
    </div>
  );
}
