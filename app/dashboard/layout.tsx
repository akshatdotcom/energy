"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Box,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`;
    router.push("/login");
    router.refresh();
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn("flex items-center gap-3 border-b border-slate-800/70 px-4 py-4", collapsed && "max-md:justify-start md:justify-center md:px-0")}>
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
          <Zap className="h-4 w-4 text-emerald-400" />
        </div>
        {(!collapsed || mobileOpen) && (
          <div>
            <p className="text-sm font-semibold tracking-tight text-slate-100">AeroCharge</p>
            <p className="text-[10px] text-slate-500">Pacific Coast Logistics</p>
          </div>
        )}
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-[68px] hidden h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200 md:flex"
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
              title={collapsed && !mobileOpen ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                active
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200",
                collapsed && !mobileOpen && "md:justify-center md:px-0"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {(!collapsed || mobileOpen) && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Live indicator */}
      {(!collapsed || mobileOpen) && (
        <div className="mx-2 mb-2 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-xs text-emerald-400">Live — Oakland DC</span>
        </div>
      )}

      {/* Bottom actions */}
      <div className={cn("flex flex-col gap-1 border-t border-slate-800/70 p-2", collapsed && !mobileOpen && "md:items-center")}>
        <button
          onClick={handleLogout}
          title={collapsed && !mobileOpen ? "Log out" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 transition-all hover:bg-slate-800/60 hover:text-slate-300",
            collapsed && !mobileOpen && "md:justify-center md:px-0"
          )}
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          {(!collapsed || mobileOpen) && <span>Log out</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#030712]">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — desktop: static, mobile: fixed overlay */}
      <aside
        className={cn(
          "relative flex-col border-r border-slate-800/70 bg-slate-950/80 backdrop-blur transition-all duration-300",
          collapsed ? "w-16" : "w-60",
          "hidden md:flex",
        )}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar — mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800/70 bg-slate-950 transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-auto">
        {/* Mobile top bar */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-800/70 bg-[#030712]/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-400 hover:text-slate-200"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20">
              <Zap className="h-3 w-3 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-slate-100">AeroCharge</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
