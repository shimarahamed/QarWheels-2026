"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AreaChart,
  Book,
  Building2,
  LayoutDashboard,
  LogOut,
  Package,
  Percent,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useFirebase } from "@/firebase";
import { Logo } from "../logo";
import { useVendor } from "./vendor-provider";

const navItems = [
  { href: "/vendor/dashboard",            icon: LayoutDashboard, label: "Overview",   hint: "Command center",  iconBg: "bg-primary/10 text-primary",        activeGradient: "from-primary/20 to-sky-500/10" },
  { href: "/vendor/dashboard/bookings",   icon: Book,            label: "Bookings",   hint: "Jobs and visits", iconBg: "bg-amber-500/10 text-amber-600",     activeGradient: "from-amber-500/20 to-orange-500/10" },
  { href: "/vendor/dashboard/customers",  icon: Users,           label: "Customers",  hint: "Client profiles", iconBg: "bg-violet-500/10 text-violet-600",   activeGradient: "from-violet-500/20 to-indigo-500/10" },
  { href: "/vendor/dashboard/services",   icon: Wrench,          label: "Services",   hint: "Menu and pricing",iconBg: "bg-emerald-500/10 text-emerald-600", activeGradient: "from-emerald-500/20 to-teal-500/10" },
  { href: "/vendor/dashboard/inventory",  icon: Package,         label: "Inventory",  hint: "Parts and stock", iconBg: "bg-sky-500/10 text-sky-600",         activeGradient: "from-sky-500/20 to-cyan-500/10" },
  { href: "/vendor/dashboard/staff",      icon: Users,           label: "Staff",      hint: "Team roles",      iconBg: "bg-indigo-500/10 text-indigo-600",   activeGradient: "from-indigo-500/20 to-violet-500/10" },
  { href: "/vendor/dashboard/promotions", icon: Percent,         label: "Promotions", hint: "Offers",          iconBg: "bg-rose-500/10 text-rose-600",       activeGradient: "from-rose-500/20 to-pink-500/10" },
  { href: "/vendor/dashboard/reviews",    icon: Star,            label: "Reviews",    hint: "Reputation",      iconBg: "bg-amber-500/10 text-amber-600",     activeGradient: "from-amber-500/20 to-yellow-500/10" },
  { href: "/vendor/dashboard/analytics",  icon: AreaChart,       label: "Analytics",  hint: "Performance",     iconBg: "bg-teal-500/10 text-teal-600",       activeGradient: "from-teal-500/20 to-emerald-500/10" },
];

export function VendorSidebar() {
  const pathname = usePathname();
  const { auth, user } = useFirebase();
  const { business, activeBranch } = useVendor();

  const branchStatus = activeBranch?.status || "Pending Approval";
  const isApproved = branchStatus === "Approved";

  const initials = (user?.displayName || business.displayName || "Vendor")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-border/50 bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <SidebarHeader className="border-b border-border/50 px-4 py-4">
        <div className="rounded-2xl border bg-card/80 p-3 shadow-sm">
          <Logo />
        </div>

        {/* Workspace card */}
        <div className="relative mt-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent" />

          <div className="relative flex items-start justify-between gap-3">
            <span className="icon-pill h-10 w-10 bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <Badge
              variant={isApproved ? "default" : "outline"}
              className={`shrink-0 text-[11px] ${isApproved ? "bg-emerald-500 hover:bg-emerald-500" : "border-amber-500/30 bg-amber-500/8 text-amber-600"}`}
            >
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${isApproved ? "bg-emerald-200" : "bg-amber-500"}`} />
              {branchStatus}
            </Badge>
          </div>

          <div className="relative mt-4">
            <h2 className="truncate text-base font-bold">{business.displayName || "Vendor workspace"}</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {activeBranch ? `${activeBranch.city}, ${activeBranch.country}` : "Complete your branch profile"}
            </p>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border bg-background/70 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Rating</p>
              <p className="mt-1 text-sm font-bold text-amber-600">{(activeBranch?.rating || 0).toFixed(1)}</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Reviews</p>
              <p className="mt-1 text-sm font-bold">{activeBranch?.reviewCount || 0}</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto px-3 py-4 no-scrollbar" style={{ gap: 0 }}>
        {/* AI insights shortcut */}
        <Link
          href="/vendor/dashboard/analytics"
          className="group mx-1 mb-4 flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-all duration-300 hover:border-amber-500/40 hover:shadow-md"
        >
          <span className="icon-pill h-9 w-9 bg-amber-500/10 text-amber-600">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">AI business insights</p>
            <p className="truncate text-xs text-muted-foreground">Demand, revenue, retention</p>
          </div>
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-glow-breathe" />
        </Link>

        {/* Workspace nav */}
        <div className="mb-2 flex items-center gap-3 px-3">
          <p className="section-label">Workspace</p>
          <span className="h-px flex-1 bg-border/60" />
        </div>

        <SidebarMenu className="mb-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/vendor/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <SidebarMenuItem key={item.href} className="px-1">
                <SidebarMenuButton
                  asChild
                  size="lg"
                  isActive={isActive}
                  tooltip={item.label}
                  className={`relative h-14 overflow-hidden rounded-2xl px-3 transition-all duration-300
                    ${isActive ? "bg-primary text-primary-foreground nav-glow" : "hover:bg-muted/70"}`}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    {isActive && (
                      <span className={`absolute inset-0 bg-gradient-to-r ${item.activeGradient} opacity-40`} />
                    )}
                    <span
                      className={`relative icon-pill h-9 w-9 ${
                        isActive ? "bg-primary-foreground/15 text-primary-foreground" : item.iconBg
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{item.label}</span>
                      <span className={`block truncate text-[11px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {item.hint}
                      </span>
                    </span>
                    {isActive && (
                      <span className="relative h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* 2026 readiness card */}
        <div className="mx-1 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="icon-pill h-9 w-9 bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">2026 readiness</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Add services, staff, inventory, and promotions for better visibility.
              </p>
            </div>
          </div>
          <div className="mt-4 progress-bar">
            <div className="progress-fill bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: "66%" }} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Profile complete</span>
            <span className="text-[11px] font-bold text-emerald-600">66%</span>
          </div>
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="mt-auto border-t border-border/50 p-3">
        {user && (
          <div className="overflow-hidden rounded-2xl border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-primary/20 ring-2 ring-primary/5">
                <AvatarImage
                  src={user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${user.displayName || business.displayName || "Vendor"}`}
                />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials || "V"}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user.displayName || "Vendor Admin"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
              <Button asChild variant="ghost" className="h-9 w-full justify-start gap-3 rounded-xl px-2 text-sm hover:bg-primary/5 hover:text-primary">
                <Link href="/vendor/dashboard/settings">
                  <Settings size={16} />
                  Settings
                </Link>
              </Button>
              <Button
                onClick={() => auth.signOut()}
                variant="ghost"
                className="h-9 w-full justify-start gap-3 rounded-xl px-2 text-sm text-destructive hover:bg-destructive/8 hover:text-destructive"
              >
                <LogOut size={16} />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </div>
  );
}
