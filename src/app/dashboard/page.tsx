import { AICallsToAction } from "@/components/dashboard/ai-cta";
import { CarList } from "@/components/dashboard/car-list";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { UpcomingBookings } from "@/components/dashboard/upcoming-bookings";
import { UserStats } from "@/components/dashboard/user-stats";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Building,
  CalendarPlus,
  ChevronRight,
  Gauge,
  PlusCircle,
  Search,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";

const quickActions = [
  {
    href: "/dashboard/garages",
    label: "Find trusted garages",
    meta: "Search specialists by need, city, and rating",
    icon: Search,
    iconBg: "bg-violet-500/10 group-hover:bg-violet-500/15",
    iconColor: "text-violet-600",
    accentLine: "from-violet-500 via-indigo-400 to-transparent",
    num: "01",
  },
  {
    href: "/dashboard/garages",
    label: "Book a service",
    meta: "Reserve maintenance in a few taps",
    icon: CalendarPlus,
    iconBg: "bg-primary/10 group-hover:bg-primary/15",
    iconColor: "text-primary",
    accentLine: "from-primary via-sky-400 to-transparent",
    num: "02",
  },
  {
    href: "/dashboard/service-history",
    label: "Audit service history",
    meta: "Review spend, invoices, and patterns",
    icon: Wrench,
    iconBg: "bg-emerald-500/10 group-hover:bg-emerald-500/15",
    iconColor: "text-emerald-600",
    accentLine: "from-emerald-500 via-teal-400 to-transparent",
    num: "03",
  },
];

const statusPills = [
  {
    label: "Road-readiness",
    value: "Live",
    icon: Activity,
    dotColor: "bg-emerald-500",
    valueColor: "text-emerald-600",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  {
    label: "Mileage tracker",
    value: "Synced",
    icon: Gauge,
    dotColor: "bg-primary",
    valueColor: "text-primary",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    label: "Smart reminders",
    value: "Enabled",
    icon: Sparkles,
    dotColor: "bg-amber-500",
    valueColor: "text-amber-600",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        {/* Ambient background decorations */}
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/6 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-sky-500/5 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 right-1/3 h-40 w-40 rounded-full bg-violet-500/4 blur-2xl" />

        <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.2fr_0.8fr] lg:items-stretch">
          {/* Left: Headline + CTAs */}
          <div className="flex flex-col justify-between gap-8">
            <div>
              <Badge
                variant="outline"
                className="mb-5 h-8 gap-2 border-primary/20 bg-gradient-to-r from-primary/10 to-sky-500/8 px-3"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary animate-glow-breathe" />
                <span className="text-xs font-semibold text-primary">QarWheel command center</span>
              </Badge>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
                Your car life,{" "}
                <span className="text-gradient-blue">organized</span>
                {" "}for Qatar roads.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Monitor vehicles, schedule services, compare garages, and keep a digital maintenance passport ready for resale or inspection.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="justify-start shadow-md shadow-primary/20 hover:shadow-primary/30 transition-shadow">
                <Link href="/dashboard/garages">
                  <Building className="mr-2 h-4 w-4" />
                  Find a Garage
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="justify-start hover:border-primary/40 hover:bg-primary/5">
                <Link href="/dashboard/my-cars/add">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Vehicle
                </Link>
              </Button>
            </div>
          </div>

          {/* Right: Status pills */}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {statusPills.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border/60 bg-background/80 p-4 backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-background hover:shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`status-dot ${item.dotColor}`} />
                      <p className="section-label">{item.label}</p>
                    </div>
                    <div className={`icon-pill h-8 w-8 ${item.iconBg}`}>
                      <Icon className={`h-4 w-4 ${item.iconColor}`} />
                    </div>
                  </div>
                  <p className={`mt-3 text-2xl font-bold tracking-tight ${item.valueColor}`}>{item.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Stat Cards ────────────────────────────────────────── */}
      <section>
        <UserStats />
      </section>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">Quick Actions</h2>
            <p className="text-sm text-muted-foreground">Jump into the most-used workflows.</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md"
              >
                {/* Gradient top accent */}
                <div className={`card-accent-top bg-gradient-to-r ${action.accentLine}`} />

                <div className="flex items-start justify-between gap-4">
                  <span className={`icon-pill h-11 w-11 transition-all duration-300 ${action.iconBg}`}>
                    <Icon className={`h-5 w-5 ${action.iconColor}`} />
                  </span>
                  <span className="font-mono text-[11px] font-bold text-muted-foreground/40">{action.num}</span>
                </div>

                <h2 className="mt-4 text-base font-bold transition-colors duration-200 group-hover:text-primary">
                  {action.label}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{action.meta}</p>

                <div className="mt-5 flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors duration-200 group-hover:text-primary">
                  <span>Get started</span>
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Garage Snapshot ───────────────────────────────────── */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">Garage Snapshot</h2>
            <p className="text-sm text-muted-foreground">A compact preview of your active vehicle passports.</p>
          </div>
          <Button asChild size="sm" variant="outline" className="rounded-full px-4 hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
            <Link href="/dashboard/my-cars">
              View all
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <CarList />
      </section>

      {/* ── Bookings + AI + Onboarding ────────────────────────── */}
      <section>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <UpcomingBookings />
          <div className="flex flex-col gap-4">
            <AICallsToAction />
            <OnboardingChecklist
              title="Customer setup"
              items={[
                { label: "Add your first car", href: "/dashboard/my-cars/add" },
                { label: "Find a trusted garage", href: "/dashboard/garages" },
                { label: "Book your first service", href: "/dashboard/book" },
                { label: "Create a service record", href: "/dashboard/service-history" },
              ]}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
