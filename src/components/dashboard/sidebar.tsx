"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { collection, doc } from "firebase/firestore";
import {
  ArrowRight,
  Book,
  Building,
  Car,
  CircleGauge,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PlusCircle,
  Receipt,
  Search,
  Sparkles,
  Stethoscope,
  User as UserIcon,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useDoc, useFirebase, useMemoFirebase } from "@/firebase";
import type { Car as CarType, UserProfile, WithId } from "@/lib/types";
import { Logo } from "../logo";

const navItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Overview",
    hint: "Command center",
    activeGradient: "from-primary/20 to-sky-500/10",
    iconBg: "bg-primary/10 text-primary",
    activeIconBg: "bg-primary/12 text-primary",
  },
  {
    href: "/dashboard/my-cars",
    icon: Car,
    label: "My Cars",
    hint: "Digital passports",
    activeGradient: "from-emerald-500/20 to-teal-500/10",
    iconBg: "bg-emerald-500/10 text-emerald-600",
    activeIconBg: "bg-emerald-500/12 text-emerald-600",
  },
  {
    href: "/dashboard/garages",
    icon: Building,
    label: "Smart Search",
    hint: "Garages and parts",
    activeGradient: "from-violet-500/20 to-indigo-500/10",
    iconBg: "bg-violet-500/10 text-violet-600",
    activeIconBg: "bg-violet-500/12 text-violet-600",
  },
  {
    href: "/dashboard/ai-mechanic",
    icon: Stethoscope,
    label: "AI Mechanic",
    hint: "Diagnose a symptom",
    activeGradient: "from-fuchsia-500/20 to-purple-500/10",
    iconBg: "bg-fuchsia-500/10 text-fuchsia-600",
    activeIconBg: "bg-fuchsia-500/12 text-fuchsia-600",
  },
  {
    href: "/dashboard/bookings",
    icon: Book,
    label: "Bookings",
    hint: "Appointments",
    activeGradient: "from-amber-500/20 to-orange-500/10",
    iconBg: "bg-amber-500/10 text-amber-600",
    activeIconBg: "bg-amber-500/12 text-amber-600",
  },
  {
    href: "/dashboard/messages",
    icon: MessageSquare,
    label: "Messages",
    hint: "Chat with garages",
    activeGradient: "from-blue-500/20 to-sky-500/10",
    iconBg: "bg-blue-500/10 text-blue-600",
    activeIconBg: "bg-blue-500/12 text-blue-600",
  },
  {
    href: "/dashboard/invoices",
    icon: Receipt,
    label: "Invoices",
    hint: "Bills and receipts",
    activeGradient: "from-cyan-500/20 to-sky-500/10",
    iconBg: "bg-cyan-500/10 text-cyan-600",
    activeIconBg: "bg-cyan-500/12 text-cyan-600",
  },
  {
    href: "/dashboard/service-history",
    icon: History,
    label: "History",
    hint: "Service records",
    activeGradient: "from-rose-500/20 to-pink-500/10",
    iconBg: "bg-rose-500/10 text-rose-600",
    activeIconBg: "bg-rose-500/12 text-rose-600",
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { auth, user, firestore } = useFirebase();

  const userProfileRef = useMemoFirebase(
    () => (user && !user.isAnonymous ? doc(firestore, "users", user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userProfileRef);

  const carsCollection = useMemoFirebase(
    () => (user ? collection(firestore, "users", user.uid, "cars") : null),
    [firestore, user]
  );
  const { data: cars } = useCollection<WithId<CarType>>(carsCollection);
  const activeCar = cars?.[0];
  const totalMileage = cars?.reduce((sum, car) => sum + (car.currentMileage || 0), 0) || 0;
  const healthPct = Math.min(100, (cars?.length ? 75 : 25));

  const displayName = userProfile
    ? `${userProfile.firstName} ${userProfile.lastName}`
    : user?.isAnonymous
      ? "Anonymous User"
      : user?.email || "User";
  const displayEmail = userProfile?.email || user?.email || "Guest Account";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="liquid-glass flex h-full flex-col overflow-hidden border-r-0 text-foreground md:m-3 md:h-[calc(100%-1.5rem)] md:rounded-[1.75rem]">
      {/* Header */}
      <SidebarHeader className="border-b border-white/20 px-4 py-4">
        <div className="liquid-glass rounded-2xl p-3 shadow-none">
          <Logo />
        </div>

        {/* Active vehicle card */}
        <Link
          href={activeCar ? `/dashboard/my-cars/${activeCar.id}` : "/dashboard/my-cars/add"}
          className="liquid-glass group relative mt-4 block rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5"
        >
          {/* Ambient gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-primary/15 p-1.5 text-primary">
                  <Car className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="status-dot bg-emerald-500" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Active vehicle</p>
                </div>
              </div>
              <p className="mt-3 truncate text-sm font-bold">
                {activeCar ? `${activeCar.year} ${activeCar.make} ${activeCar.model}` : "Add your first car"}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="h-6 max-w-full truncate bg-background/30 px-2 text-[10px] backdrop-blur-xl">
                  {activeCar?.licensePlate || activeCar?.vin || "Create passport"}
                </Badge>
              </div>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/30 bg-background/30 p-2.5 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Cars</p>
              <p className="mt-1 text-sm font-bold">{cars?.length || 0}</p>
            </div>
            <div className="rounded-xl border border-white/30 bg-background/30 p-2.5 backdrop-blur-xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Mileage</p>
              <p className="mt-1 truncate text-sm font-bold">{totalMileage.toLocaleString()} km</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto px-3 py-4 no-scrollbar" style={{ gap: 0 }}>
        {/* Smart search quick link */}
        <Link
          href="/dashboard/garages"
          className="liquid-glass group mx-1 mb-4 flex items-center gap-3 rounded-2xl p-3 transition-all duration-300 hover:-translate-y-0.5"
        >
          <span className="icon-pill h-9 w-9 bg-primary/10 text-primary">
            <Search className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">Smart search</p>
            <p className="truncate text-xs text-muted-foreground">Garage, service, city</p>
          </div>
          <Sparkles className="h-4 w-4 text-amber-500 animate-glow-breathe" />
        </Link>

        {/* Navigate section */}
        <div className="mb-2 flex items-center gap-3 px-3">
          <p className="section-label">Navigate</p>
          <span className="h-px flex-1 bg-border/60" />
        </div>

        <SidebarMenu className="mb-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <SidebarMenuItem key={item.href} className="px-1">
                <SidebarMenuButton
                  asChild
                  size="lg"
                  isActive={isActive}
                  tooltip={item.label}
                  data-active={isActive}
                  className={`liquid-glass-nav-item relative h-14 overflow-hidden rounded-2xl px-3 transition-all duration-300
                    ${isActive
                      ? `nav-glow`
                      : ""
                    }`}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    {isActive && (
                      <span className={`absolute inset-0 bg-gradient-to-r ${item.activeGradient} opacity-40`} />
                    )}
                    <span
                      className={`relative icon-pill h-9 w-9
                        ${isActive ? item.activeIconBg : item.iconBg}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{item.label}</span>
                      <span className={`block truncate text-[11px] ${isActive ? "text-foreground/70" : "text-muted-foreground"}`}>
                        {item.hint}
                      </span>
                    </span>
                    {isActive && (
                      <span className="relative h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.7)]" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        {/* Garage health card */}
        <div className="liquid-glass mx-1 mb-4 overflow-hidden rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <span className="icon-pill h-9 w-9 bg-emerald-500/10 text-emerald-600">
              <CircleGauge className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">Garage health</p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Keep records current for better AI insights.
              </p>
            </div>
          </div>
          <div className="mt-4 progress-bar">
            <div
              className="progress-fill bg-gradient-to-r from-emerald-500 to-teal-400"
              style={{ width: `${healthPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Profile quality</span>
            <span className="text-[11px] font-bold text-emerald-600">{healthPct}%</span>
          </div>
          <Button asChild size="sm" variant="outline" className="mt-4 w-full justify-between rounded-xl">
            <Link href="/dashboard/my-cars">
              Update garage
              <PlusCircle className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Quick shortcuts */}
        <div className="mx-1 grid grid-cols-2 gap-2">
          <Button asChild variant="secondary" className="h-auto flex-col gap-2 rounded-2xl py-3 hover:bg-primary/10 hover:text-primary transition-colors">
            <Link href="/dashboard/my-cars/add">
              <PlusCircle className="h-4 w-4" />
              <span className="text-xs font-semibold">Add Car</span>
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-auto flex-col gap-2 rounded-2xl py-3 hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors">
            <Link href="/dashboard/service-history">
              <Wrench className="h-4 w-4" />
              <span className="text-xs font-semibold">Records</span>
            </Link>
          </Button>
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="mt-auto border-t border-white/20 p-3">
        <div className="liquid-glass overflow-hidden rounded-2xl p-3">
          {user && (
            <>
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border-2 border-primary/20 ring-2 ring-primary/5">
                  <AvatarImage
                    src={user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${displayName}`}
                    alt={displayName}
                  />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials || "U"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  {isLoading
                    ? <Skeleton className="mb-1 h-4 w-24" />
                    : <span className="block truncate text-sm font-bold">{displayName}</span>}
                  {isLoading
                    ? <Skeleton className="h-3 w-32" />
                    : <span className="block truncate text-[11px] text-muted-foreground">{displayEmail}</span>}
                </div>
              </div>

              <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
                <Button asChild variant="ghost" className="h-9 w-full justify-start gap-3 rounded-xl px-2 text-sm hover:bg-primary/5 hover:text-primary">
                  <Link href="/dashboard/profile">
                    <UserIcon size={16} />
                    Account
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
            </>
          )}
        </div>
      </SidebarFooter>
    </div>
  );
}
