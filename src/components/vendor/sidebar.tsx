"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MaterialIcon } from "@/components/ui/material-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { Logo } from "../logo";
import { useVendor } from "./vendor-provider";
import { BranchSwitcher } from "./branch-switcher";
import type { Booking, WithId } from "@/lib/types";
import type { VendorSection } from "@/lib/auth/permissions";

const navItems: { href: string; icon: string; label: string; hint: string; iconBg: string; activeGradient: string; section: VendorSection }[] = [
  { href: "/vendor/dashboard",            icon: "speed",          label: "Overview",   hint: "Command center",  iconBg: "bg-primary/10 text-primary",        activeGradient: "from-primary/20 to-sky-500/10",   section: "overview" },
  { href: "/vendor/dashboard/requests",   icon: "inbox",          label: "Requests",   hint: "New job requests",iconBg: "bg-rose-500/10 text-rose-600",       activeGradient: "from-rose-500/20 to-amber-500/10", section: "bookings" },
  { href: "/vendor/dashboard/bookings",   icon: "event_note",     label: "Bookings",   hint: "Jobs and visits", iconBg: "bg-amber-500/10 text-amber-600",     activeGradient: "from-amber-500/20 to-orange-500/10", section: "bookings" },
  { href: "/vendor/dashboard/customers",  icon: "group",          label: "Customers",  hint: "Client profiles", iconBg: "bg-violet-500/10 text-violet-600",   activeGradient: "from-violet-500/20 to-indigo-500/10", section: "customers" },
  { href: "/vendor/dashboard/services",   icon: "build",          label: "Services",   hint: "Menu and pricing",iconBg: "bg-emerald-500/10 text-emerald-600", activeGradient: "from-emerald-500/20 to-teal-500/10", section: "services" },
  { href: "/vendor/dashboard/inventory",  icon: "inventory_2",    label: "Inventory",  hint: "Parts and stock", iconBg: "bg-sky-500/10 text-sky-600",         activeGradient: "from-sky-500/20 to-cyan-500/10",  section: "inventory" },
  { href: "/vendor/dashboard/technicians",icon: "engineering",    label: "Technicians",hint: "Who's on what",   iconBg: "bg-teal-500/10 text-teal-600",       activeGradient: "from-teal-500/20 to-emerald-500/10", section: "staff" },
  { href: "/vendor/dashboard/staff",      icon: "badge",          label: "Staff",      hint: "Team roles",      iconBg: "bg-indigo-500/10 text-indigo-600",   activeGradient: "from-indigo-500/20 to-violet-500/10", section: "staff" },
  { href: "/vendor/dashboard/messages",   icon: "chat",           label: "Messages",   hint: "Customer chat",   iconBg: "bg-blue-500/10 text-blue-600",       activeGradient: "from-blue-500/20 to-sky-500/10",  section: "messages" },
  { href: "/vendor/dashboard/invoices",   icon: "receipt_long",   label: "Invoices",   hint: "Billing",         iconBg: "bg-cyan-500/10 text-cyan-600",       activeGradient: "from-cyan-500/20 to-sky-500/10",  section: "invoices" },
  { href: "/vendor/dashboard/payouts",    icon: "account_balance_wallet", label: "Payouts", hint: "Earnings",   iconBg: "bg-lime-500/10 text-lime-600",       activeGradient: "from-lime-500/20 to-emerald-500/10", section: "payouts" },
  { href: "/vendor/dashboard/promotions", icon: "sell",           label: "Promotions", hint: "Offers",          iconBg: "bg-rose-500/10 text-rose-600",       activeGradient: "from-rose-500/20 to-pink-500/10", section: "promotions" },
  { href: "/vendor/dashboard/reviews",    icon: "star",           label: "Reviews",    hint: "Reputation",      iconBg: "bg-amber-500/10 text-amber-600",     activeGradient: "from-amber-500/20 to-yellow-500/10", section: "reviews" },
  { href: "/vendor/dashboard/analytics",  icon: "monitoring",     label: "Analytics",  hint: "Performance",     iconBg: "bg-teal-500/10 text-teal-600",       activeGradient: "from-teal-500/20 to-emerald-500/10", section: "analytics" },
];

export function VendorSidebar() {
  const pathname = usePathname();
  const { auth, user, firestore } = useFirebase();
  const { business, activeBranch, canSeeAllBranches, canAccess } = useVendor();
  const visibleNavItems = navItems.filter((item) => canAccess(item.section));

  const branchStatus = activeBranch?.status || "Pending Approval";
  const isApproved = branchStatus === "Approved";

  const pendingBookingsQuery = useMemoFirebase(
    () =>
      canSeeAllBranches
        ? query(collection(firestore, "bookings"), where("businessId", "==", business.id), where("status", "==", "Pending"))
        : activeBranch
        ? query(collection(firestore, "bookings"), where("branchId", "==", activeBranch.id), where("status", "==", "Pending"))
        : null,
    [firestore, business, activeBranch, canSeeAllBranches],
  );
  const { data: pendingBookings } = useCollection<WithId<Booking>>(pendingBookingsQuery);
  const pendingCount = pendingBookings?.length ?? 0;

  const initials = (user?.displayName || business.displayName || "Vendor")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-border/50 bg-background/95 backdrop-blur-xl">
      {/* Header */}
      <SidebarHeader className="border-b border-border/50 px-3 py-3">
        <div className="flex items-center justify-between gap-2 rounded-xl border bg-card/80 p-2.5 shadow-sm">
          <Logo />
          <ThemeToggle className="h-8 w-8 shrink-0" />
        </div>

        {/* Workspace card */}
        <div className="relative mt-3 overflow-hidden rounded-xl border bg-card p-3.5 shadow-sm">
          <div className="card-accent-top from-primary via-primary/60 to-transparent opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent" />

          <div className="relative flex items-start justify-between gap-3">
            <span className="icon-pill h-9 w-9 bg-primary/10 text-primary">
              <MaterialIcon name="storefront" className="text-lg" />
            </span>
            <Badge
              variant={isApproved ? "default" : "outline"}
              className={`shrink-0 text-[10px] uppercase tracking-[0.08em] ${isApproved ? "bg-emerald-500 hover:bg-emerald-500" : "border-amber-500/30 bg-amber-500/8 text-amber-600"}`}
            >
              <span className={`status-dot mr-1.5 ${isApproved ? "bg-emerald-200" : "bg-amber-500"}`} />
              {branchStatus}
            </Badge>
          </div>

          <div className="relative mt-3">
            <h2 className="truncate text-sm font-bold">{business.displayName || "Vendor workspace"}</h2>
          </div>

          <div className="relative mt-2.5">
            <BranchSwitcher />
          </div>

          <div className="relative mt-2.5 grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-background/70 p-2">
              <p className="section-label">Rating</p>
              <p className="kpi-number mt-1 text-sm text-amber-600">{(activeBranch?.rating || 0).toFixed(1)}</p>
            </div>
            <div className="rounded-lg border bg-background/70 p-2">
              <p className="section-label">Reviews</p>
              <p className="kpi-number mt-1 text-sm">{activeBranch?.reviewCount || 0}</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto px-2.5 py-3 no-scrollbar" style={{ gap: 0 }}>
        {/* AI insights shortcut */}
        <Link
          href="/vendor/dashboard/analytics"
          className="group mx-0.5 mb-3 flex items-center gap-2.5 rounded-xl border bg-card p-2.5 shadow-sm transition-all duration-300 hover:border-[var(--qw-ai)]/40 hover:shadow-md"
        >
          <span className="icon-pill h-8 w-8" style={{ backgroundColor: 'var(--qw-ai-bg)', color: 'var(--qw-ai)' }}>
            <MaterialIcon name="auto_awesome" className="text-base" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">AI business insights</p>
            <p className="truncate text-xs text-muted-foreground">Demand, revenue, retention</p>
          </div>
          <span className="status-dot" style={{ backgroundColor: 'var(--qw-ai)' }} />
        </Link>

        {/* Workspace nav */}
        <div className="mb-2 flex items-center gap-3 px-2.5">
          <p className="section-label">Workspace</p>
          <span className="h-px flex-1 bg-border/60" />
        </div>

        <SidebarMenu className="mb-4 gap-1">
          {visibleNavItems.map((item) => {
            const isActive =
              item.href === "/vendor/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);

            return (
              <SidebarMenuItem key={item.href} className="px-0.5">
                <SidebarMenuButton
                  asChild
                  size="lg"
                  isActive={isActive}
                  tooltip={item.label}
                  className={`relative h-12 overflow-hidden rounded-xl px-2.5 transition-all duration-300
                    ${isActive ? "bg-primary text-primary-foreground nav-glow" : "hover:bg-muted/70"}`}
                >
                  <Link href={item.href} className="flex items-center gap-2.5">
                    {isActive && (
                      <span className={`absolute inset-0 bg-gradient-to-r ${item.activeGradient} opacity-40`} />
                    )}
                    <span
                      className={`relative icon-pill h-8 w-8 ${
                        isActive ? "bg-primary-foreground/15 text-primary-foreground" : item.iconBg
                      }`}
                    >
                      <MaterialIcon name={item.icon} className="text-base" filled={isActive} />
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{item.label}</span>
                      <span className={`block truncate text-[10px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {item.hint}
                      </span>
                    </span>
                    {item.href === "/vendor/dashboard/requests" && pendingCount > 0 && (
                      <span
                        className={`relative flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold kpi-number ${
                          isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-destructive-foreground"
                        }`}
                      >
                        {pendingCount}
                      </span>
                    )}
                    {isActive && (
                      <span className="status-dot relative bg-primary-foreground/70" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* 2026 readiness card */}
        <div className="mx-0.5 overflow-hidden rounded-xl border bg-card p-3.5 shadow-sm">
          <div className="flex items-start gap-2.5">
            <span className="icon-pill h-8 w-8 bg-emerald-500/10 text-emerald-600">
              <MaterialIcon name="verified" className="text-base" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">2026 readiness</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Add services, staff, inventory, and promotions for better visibility.
              </p>
            </div>
          </div>
          <div className="mt-3 progress-bar">
            <div className="progress-fill bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: "66%" }} />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Profile complete</span>
            <span className="kpi-number text-[11px] text-emerald-600">66%</span>
          </div>
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="mt-auto border-t border-border/50 p-2.5">
        {user && (
          <div className="overflow-hidden rounded-xl border bg-card p-2.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-10 w-10 border-2 border-primary/20 ring-2 ring-primary/5">
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

            <div className="mt-2.5 space-y-1 border-t border-border/50 pt-2.5">
              <Button asChild variant="ghost" className="h-9 w-full justify-start gap-2.5 rounded-lg px-2 text-sm hover:bg-primary/5 hover:text-primary">
                <Link href="/vendor/dashboard/settings">
                  <MaterialIcon name="settings" className="text-base" />
                  Settings
                </Link>
              </Button>
              <Button
                onClick={() => auth.signOut()}
                variant="ghost"
                className="h-9 w-full justify-start gap-2.5 rounded-lg px-2 text-sm text-destructive hover:bg-destructive/8 hover:text-destructive"
              >
                <MaterialIcon name="logout" className="text-base" />
                Sign Out
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </div>
  );
}
