"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  MapPin,
  Percent,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  UserCog,
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
import { ThemeToggle } from "../theme-toggle";

const navItems = [
  { href: "/admin/dashboard",            icon: LayoutDashboard, label: "Overview",   hint: "Platform summary",   iconBg: "bg-primary/10 text-primary",        activeGradient: "from-primary/20 to-sky-500/10" },
  { href: "/admin/dashboard/users",      icon: Users,           label: "Users",      hint: "All customers",      iconBg: "bg-violet-500/10 text-violet-600",   activeGradient: "from-violet-500/20 to-indigo-500/10" },
  { href: "/admin/dashboard/businesses", icon: Building2,       label: "Businesses", hint: "Tenants & KYC",      iconBg: "bg-emerald-500/10 text-emerald-600", activeGradient: "from-emerald-500/20 to-teal-500/10" },
  { href: "/admin/dashboard/branches",   icon: MapPin,          label: "Branches",   hint: "All locations",      iconBg: "bg-sky-500/10 text-sky-600",         activeGradient: "from-sky-500/20 to-cyan-500/10" },
  { href: "/admin/dashboard/staff",      icon: Users,           label: "Staff",      hint: "Every membership",   iconBg: "bg-indigo-500/10 text-indigo-600",   activeGradient: "from-indigo-500/20 to-violet-500/10" },
  { href: "/admin/dashboard/kyc",        icon: ShieldCheck,     label: "KYC",        hint: "Review queue",       iconBg: "bg-amber-500/10 text-amber-600",     activeGradient: "from-amber-500/20 to-yellow-500/10" },
  { href: "/admin/dashboard/bookings",   icon: CalendarCheck,   label: "Bookings",   hint: "All appointments",   iconBg: "bg-amber-500/10 text-amber-600",     activeGradient: "from-amber-500/20 to-orange-500/10" },
  { href: "/admin/dashboard/promotions", icon: Percent,         label: "Promotions", hint: "Active campaigns",   iconBg: "bg-rose-500/10 text-rose-600",       activeGradient: "from-rose-500/20 to-pink-500/10" },
  { href: "/admin/dashboard/analytics",  icon: BarChart3,       label: "Analytics",  hint: "Platform metrics",   iconBg: "bg-teal-500/10 text-teal-600",       activeGradient: "from-teal-500/20 to-emerald-500/10" },
  { href: "/admin/dashboard/audit",      icon: ScrollText,      label: "Audit",      hint: "Activity log",       iconBg: "bg-slate-500/10 text-slate-600",     activeGradient: "from-slate-500/20 to-zinc-500/10" },
  { href: "/admin/dashboard/admins",     icon: UserCog,         label: "Admins",     hint: "Platform access",    iconBg: "bg-rose-500/10 text-rose-600",       activeGradient: "from-rose-500/20 to-red-500/10" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { auth, user } = useFirebase();

  const initials = (user?.displayName || user?.email || "A")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-full flex-col overflow-hidden border-r border-border/50 bg-background/95 backdrop-blur-xl">
      <SidebarHeader className="border-b border-border/50 px-4 py-4">
        <div className="flex items-center justify-between rounded-2xl border bg-card/80 p-3 shadow-sm">
          <Logo />
          <ThemeToggle className="shrink-0" />
        </div>

        <div className="relative mt-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 via-transparent to-transparent" />
          <div className="relative flex items-center gap-3">
            <span className="icon-pill h-10 w-10 bg-rose-500/10 text-rose-600">
              <Shield className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">Super Admin</p>
              <p className="text-[11px] text-muted-foreground">Full platform access</p>
            </div>
            <Badge className="ml-auto shrink-0 bg-rose-500 text-[10px] hover:bg-rose-500">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-rose-200" />
              Active
            </Badge>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto px-3 py-4 no-scrollbar" style={{ gap: 0 }}>
        <div className="mb-2 flex items-center gap-3 px-3">
          <p className="section-label">Admin Panel</p>
          <span className="h-px flex-1 bg-border/60" />
        </div>

        <SidebarMenu className="mb-5 gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/admin/dashboard"
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
                    <span className={`relative icon-pill h-9 w-9 ${isActive ? "bg-primary-foreground/15 text-primary-foreground" : item.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold">{item.label}</span>
                      <span className={`block truncate text-[11px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {item.hint}
                      </span>
                    </span>
                    {isActive && <span className="relative h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-border/50 p-3">
        {user && (
          <div className="overflow-hidden rounded-2xl border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-rose-500/20 ring-2 ring-rose-500/5">
                <AvatarImage src={user.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${user.displayName || user.email}`} />
                <AvatarFallback className="bg-rose-500/10 text-rose-600 font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{user.displayName || "Admin"}</p>
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1 border-t border-border/50 pt-3">
              <Button asChild variant="ghost" className="h-9 w-full justify-start gap-3 rounded-xl px-2 text-sm hover:bg-primary/5 hover:text-primary">
                <Link href="/admin/dashboard/settings"><Settings size={16} />Settings</Link>
              </Button>
              <Button onClick={() => auth.signOut()} variant="ghost" className="h-9 w-full justify-start gap-3 rounded-xl px-2 text-sm text-destructive hover:bg-destructive/8 hover:text-destructive">
                <LogOut size={16} />Sign Out
              </Button>
            </div>
          </div>
        )}
      </SidebarFooter>
    </div>
  );
}
