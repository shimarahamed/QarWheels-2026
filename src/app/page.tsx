'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarCheck,
  Car,
  ChevronRight,
  Clock3,
  Compass,
  CreditCard,
  Droplets,
  Globe,
  Heart,
  Home,
  MapPin,
  Package,
  Paintbrush,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Tag,
  User,
  Wind,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';

const img = (id: string) => PlaceHolderImages.find((p) => p.id === id);

// ── Static data ──────────────────────────────────────────────────

const categories = [
  { label: 'AC & Heating',   labelAr: 'تكييف وتدفئة',    icon: Wind,          color: 'bg-sky-500/15 text-sky-500' },
  { label: 'Electrical',     labelAr: 'كهربائي',          icon: Zap,           color: 'bg-amber-400/15 text-amber-400' },
  { label: 'Tires & Wheels', labelAr: 'الإطارات',         icon: Settings,      color: 'bg-slate-400/15 text-slate-400' },
  { label: 'Body & Paint',   labelAr: 'هيكل ودهان',       icon: Paintbrush,    color: 'bg-orange-500/15 text-orange-500' },
  { label: 'Car Wash',       labelAr: 'غسيل السيارة',     icon: Droplets,      color: 'bg-cyan-500/15 text-cyan-500' },
  { label: 'Diagnostics',    labelAr: 'تشخيص',            icon: Activity,      color: 'bg-violet-500/15 text-violet-500' },
  { label: 'Detailing',      labelAr: 'تلميع',            icon: Sparkles,      color: 'bg-emerald-500/15 text-emerald-500' },
  { label: 'Accessories',    labelAr: 'إكسسوارات',        icon: Package,       color: 'bg-indigo-500/15 text-indigo-500' },
  { label: 'Roadside',       labelAr: 'خدمة الطريق',      icon: AlertTriangle, color: 'bg-red-500/15 text-red-500' },
];

const quickActions = [
  { label: 'Book Service', icon: CalendarCheck, href: '/dashboard/garages' },
  { label: 'My Garage',   icon: Car,           href: '/dashboard' },
  { label: 'Roadside',    icon: AlertTriangle, href: '/dashboard/garages' },
  { label: 'Sell My Car', icon: Tag,           href: '/signup' },
];

const garages = [
  { id: 'g1', name: 'German Auto Care',       specialty: 'Specialist in German Cars',  rating: 4.8, reviews: 812, response: '12 min', price: 'AED 150–200', isOpen: true,  isVerified: true,  tags: ['GCC Specs'],         imageId: 'garage-interior' },
  { id: 'g2', name: 'Al Futtaim Auto Svcs',   specialty: 'Multi-brand Service Center', rating: 4.8, reviews: 462, response: '15 min', price: 'AED 100–150', isOpen: true,  isVerified: false, tags: ['Free AC Checkup'],   imageId: 'garage-exterior' },
  { id: 'g3', name: 'Pro PitStop Garage',      specialty: 'One Stop Auto Care',         rating: 4.5, reviews: 321, response: '18 min', price: 'AED 120–180', isOpen: true,  isVerified: true,  tags: ['Gas Top-up'],        imageId: 'car-placeholder-2' },
  { id: 'g4', name: 'My Care Garage',          specialty: 'Basic AC Service',           rating: 4.8, reviews: 199, response: '22 min', price: 'AED 159',     isOpen: false, isVerified: false, tags: [],                    imageId: 'garage-interior' },
  { id: 'g5', name: 'Speedy Auto Care',        specialty: 'Quick. Reliable. Affordable.', rating: 4.5, reviews: 201, response: '20 min', price: 'AED 179', isOpen: true, isVerified: true, tags: ['24/7'], imageId: 'garage-exterior' },
];

const featuredServices = [
  { label: 'AC Service',  price: 'From AED 159', imageId: 'garage-interior' },
  { label: 'Oil Change',  price: 'From AED 99',  imageId: 'car-placeholder-2' },
  { label: 'Brake Repair',price: 'From AED 149', imageId: 'garage-exterior' },
  { label: 'Battery',     price: 'From AED 199', imageId: 'feature-vin' },
  { label: 'Tire Change', price: 'From AED 249', imageId: 'garage-interior' },
];

const garagesByCategory = [
  { name: 'German Auto Care',  specialty: 'BMW · Mercedes',    rating: 4.8, reviews: 512, response: '12 min', price: 'AED 150–200', imageId: 'garage-interior',   isVerified: true },
  { name: 'Euro Meister Garage',specialty: 'BMW · Mercedes Spec.', rating: 4.6, reviews: 342, response: '14 min', price: 'AED 130–190', imageId: 'garage-exterior', isVerified: false },
  { name: 'Auto Haus Dubai',   specialty: 'Audi · VW Specialist', rating: 4.5, reviews: 289, response: '16 min', price: 'AED 130–190', imageId: 'car-placeholder-2', isVerified: false },
];

const topOffers = [
  { service: 'Oil Change',  discount: '15% OFF', until: 'Valid till 30 May', imageId: 'car-placeholder-2' },
  { service: 'Brake Pads',  discount: '10% OFF', until: 'Valid till 30 May', imageId: 'garage-interior' },
  { service: 'Full Service',discount: 'AED 99',  until: 'Limited Time',       imageId: 'garage-exterior' },
];

const trendingServices = ['AC Service near me', 'German specialist garages', 'Oil change under AED 199', 'Best rated garages in Dubai', '24/7 Garages near me'];
const brandFilters = ['All', 'BMW', 'Mercedes', 'Audi', 'Porsche'];

const trustItems = [
  { icon: ShieldCheck, label: 'Verified Garages', labelAr: 'كراجات موثقة',       color: 'bg-primary/10 text-primary' },
  { icon: CreditCard,  label: 'Secure Payments',  labelAr: 'مدفوعات آمنة',       color: 'bg-emerald-500/10 text-emerald-500' },
  { icon: Globe,       label: 'GCC Standard',     labelAr: 'معيار الخليج',        color: 'bg-sky-500/10 text-sky-500' },
  { icon: Phone,       label: '24/7 Support',     labelAr: 'دعم على مدار الساعة', color: 'bg-amber-500/10 text-amber-500' },
];

const keyFeatures = [
  'Smart search with suggestions',
  'Advanced filters & sorting',
  'Compare up to 3 garages',
  'Save favorites (garages, services, offers)',
  'Map view with real-time availability',
  'Exclusive offers & featured services',
];

// ── Sub-components ───────────────────────────────────────────────

function GarageListCard({ garage }: { garage: typeof garages[0] }) {
  const image = img(garage.imageId);
  return (
    <Link
      href="/dashboard/garages"
      className="group mkt-card motion-surface flex items-start gap-3 p-3 hover:bg-primary/5"
    >
      <div className="relative h-[68px] w-[68px] shrink-0 overflow-hidden rounded-xl bg-muted">
        {image && (
          <Image
            src={image.imageUrl}
            alt={garage.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="68px"
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">{garage.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{garage.specialty}</p>
          </div>
          <button
            aria-label="Save garage"
            className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
            onClick={(e) => e.preventDefault()}
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-semibold text-foreground">{garage.rating}</span>
            <span>({garage.reviews})</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {garage.response}
          </span>
          <span className="font-medium text-foreground">{garage.price}</span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              garage.isOpen
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', garage.isOpen ? 'bg-emerald-500' : 'bg-muted-foreground')} />
            {garage.isOpen ? 'Open' : 'Closed'}
          </span>

          {garage.isVerified && (
            <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              <ShieldCheck className="h-2.5 w-2.5" />
              Verified
            </span>
          )}

          {garage.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function NavItem({
  icon: Icon,
  label,
  active,
  href,
}: {
  icon: typeof Home;
  label: string;
  active?: boolean;
  href: string;
}) {
  return (
    <Link href={href} className="flex h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1">
      <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
      <span className={cn('text-[10px] font-semibold', active ? 'text-primary' : 'text-muted-foreground')}>
        {label}
      </span>
      {active && <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />}
    </Link>
  );
}

// ── Main Page ────────────────────────────────────────────────────

export default function LandingPage() {
  const heroImg   = img('hero-image');
  const carImg    = img('car-placeholder-2');
  const garageImg = img('garage-interior');

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">

      {/* ════════════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Logo />

          {/* Desktop center nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {[
              { label: 'Explore',   href: '/dashboard/garages' },
              { label: 'Categories',href: '/dashboard/garages' },
              { label: 'For Vendors', href: '/vendor/login' },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            </button>
            <Button size="sm" variant="ghost" className="hidden rounded-xl sm:inline-flex" asChild>
              <Link href="/vendor/login">
                <Store className="mr-1.5 h-4 w-4" />
                Vendors
              </Link>
            </Button>
            <Button size="sm" className="h-9 rounded-xl px-4 font-semibold" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════════════════════
          CONTENT WRAPPER
      ════════════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-5xl">
        <main className="page-motion">

          {/* ══════════════════════════════════════════════════
              01. HERO — Dashboard style
          ══════════════════════════════════════════════════ */}
          <section className="px-4 pt-5 pb-2">
            {/* Greeting */}
            <div className="mb-4">
              <p className="text-xl font-bold text-foreground">Good morning 👋</p>
              <p className="text-sm text-muted-foreground">What's your next move?&nbsp;&nbsp;
                <span className="text-[11px] text-muted-foreground/60">ما هي خطوتك القادمة؟</span>
              </p>
            </div>

            {/* Search bar */}
            <Link
              href="/dashboard/garages"
              className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-3.5 transition-colors hover:bg-muted/70 border border-border"
            >
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm text-muted-foreground">Search garages, services, parts...</span>
              <span className="hidden text-[11px] text-muted-foreground/50 sm:block">ابحث عن الكراجات</span>
            </Link>

            {/* Hero banner card */}
            <div className="relative mt-4 overflow-hidden rounded-3xl bg-[var(--qw-dark)]">
              {/* Car image */}
              {heroImg && (
                <div className="absolute inset-0">
                  <Image
                    src={heroImg.imageUrl}
                    alt="QarWheel hero"
                    fill
                    className="object-cover opacity-40"
                    sizes="(max-width: 1024px) 100vw, 1024px"
                    priority
                  />
                </div>
              )}
              {/* Gradient overlay — scarlet wash grounds the identity in both themes */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 55% 85% at 0% 100%, var(--qw-primary-mid), transparent 62%)',
                }}
              />

              <div className="relative px-5 py-6 sm:py-8 max-w-[58%] sm:max-w-xs">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--qw-gold)]">
                  Book with confidence
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
                  Verified garages.
                  <br />
                  Best prices.
                </h2>
                <p className="mt-1 text-[11px] text-white/50">كراجات موثقة. أفضل الأسعار.</p>

                <div className="mt-5 flex gap-2">
                  <Button
                    className="motion-press h-9 rounded-xl px-5 text-xs font-bold shadow-lg shadow-primary/30"
                    asChild
                  >
                    <Link href="/dashboard/garages">Explore Now</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="motion-press h-9 rounded-xl border-white/20 bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur hover:bg-white/20 hover:text-white"
                    asChild
                  >
                    <Link href="/signup">Join Free</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              02. SEARCH SUGGESTIONS (Search bar context strip)
          ══════════════════════════════════════════════════ */}
          <section className="px-4 py-3">
            <p className="section-label mb-2">Trending Services</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {trendingServices.map((s) => (
                <Link
                  key={s}
                  href="/dashboard/garages"
                  className="flex-shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  {s}
                </Link>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              QUICK ACTIONS
          ══════════════════════════════════════════════════ */}
          <section className="px-4 py-3">
            <div className="grid grid-cols-4 gap-3">
              {quickActions.map(({ icon: Icon, label, href }) => (
                <Link key={label} href={href} className="group flex flex-col items-center gap-2">
                  <div className="motion-surface flex h-[56px] w-[56px] items-center justify-center rounded-2xl border border-border bg-card shadow-sm hover:border-primary/40 hover:bg-primary/5">
                    <Icon className="h-6 w-6 text-foreground transition-colors group-hover:text-primary" />
                  </div>
                  <span className="text-center text-[11px] font-medium leading-tight text-muted-foreground">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              DESKTOP SPLIT: Left content | Right sidebar
          ══════════════════════════════════════════════════ */}
          <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-5 lg:px-4 lg:pt-2">

            {/* ── Left column ───────────────────────────────── */}
            <div>

              {/* ══════════════════════════════════════════════
                  03. CATEGORY EXPLORATION
              ══════════════════════════════════════════════ */}
              <section className="px-4 py-3 lg:px-0">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-base font-bold">All Categories</h2>
                  <Link
                    href="/dashboard/garages"
                    className="flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline"
                  >
                    See all <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {categories.map(({ label, labelAr, icon: Icon, color }) => (
                    <Link
                      key={label}
                      href="/dashboard/garages"
                      className="mkt-card flex flex-col items-center gap-2 p-3 text-center transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="text-[11px] font-bold leading-tight text-foreground">{label}</p>
                      <p className="text-[9px] leading-tight text-muted-foreground">{labelAr}</p>
                    </Link>
                  ))}
                </div>
              </section>

              {/* ══════════════════════════════════════════════
                  04. GARAGE LISTINGS — Garages Near You
              ══════════════════════════════════════════════ */}
              <section className="px-4 py-3 lg:px-0">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">Garages Near You</h2>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 text-primary" />
                      Doha, Qatar
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/dashboard/garages"
                      className="flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline"
                    >
                      See map <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {garages.map((garage) => (
                    <GarageListCard key={garage.id} garage={garage} />
                  ))}
                </div>
              </section>

              {/* ══════════════════════════════════════════════
                  12. GARAGES BY CATEGORY (German Specialist)
              ══════════════════════════════════════════════ */}
              <section className="px-4 py-3 lg:px-0">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold">German Car Specialist</h2>
                    <p className="text-[10px] text-muted-foreground">متخصصون في السيارات الألمانية</p>
                  </div>
                </div>
                {/* Brand filter pills */}
                <div className="mb-3 flex gap-2 overflow-x-auto no-scrollbar">
                  {brandFilters.map((brand, i) => (
                    <button
                      key={brand}
                      className={cn(
                        'flex-shrink-0 rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors',
                        i === 0
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary',
                      )}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
                <div className="space-y-2.5">
                  {garagesByCategory.map((g) => {
                    const image = img(g.imageId);
                    return (
                      <Link
                        key={g.name}
                        href="/dashboard/garages"
                        className="group mkt-card motion-surface flex items-center gap-3 p-3"
                      >
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                          {image && (
                            <Image src={image.imageUrl} alt={g.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="56px" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-bold">{g.name}</p>
                            {g.isVerified && (
                              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{g.specialty}</p>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span className="font-semibold text-foreground">{g.rating}</span>
                              <span>({g.reviews})</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock3 className="h-3 w-3" />
                              {g.response}
                            </span>
                            <span className="font-medium text-foreground">{g.price}</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Link>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* ── Right sidebar (desktop only) ──────────────── */}
            <aside className="hidden space-y-4 pt-3 lg:block">

              {/* Featured services */}
              <div className="bento-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Featured Services</h3>
                  <Link href="/dashboard/garages" className="text-xs font-semibold text-primary hover:underline">
                    View all
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {featuredServices.map((svc) => {
                    const svcImg = img(svc.imageId);
                    return (
                      <Link
                        key={svc.label}
                        href="/dashboard/garages"
                        className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted"
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {svcImg && (
                            <Image src={svcImg.imageUrl} alt={svc.label} fill className="object-cover" sizes="40px" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold">{svc.label}</p>
                          <p className="text-[10px] text-muted-foreground">{svc.price}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Promo banner */}
              <div className="relative overflow-hidden rounded-2xl bg-[var(--qw-dark)] p-5">
                <div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--qw-primary-dark), transparent 65%), radial-gradient(ellipse 70% 90% at 100% 0%, var(--qw-primary-mid), transparent 60%)',
                  }}
                />
                {heroImg && (
                  <div className="absolute right-0 top-0 h-full w-1/2 opacity-25">
                    <Image src={heroImg.imageUrl} alt="Promo" fill className="object-cover" sizes="150px" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--qw-gold)]">Summer AC Special</p>
                  <p className="text-[9px] text-white/60">On All AC Services</p>
                  <p className="mt-2 text-4xl font-black leading-none text-white">20%</p>
                  <p className="text-base font-black text-white/90">OFF</p>
                  <Button
                    className="motion-press mt-4 h-8 rounded-xl bg-white px-5 text-xs font-bold text-[var(--qw-primary)] hover:bg-white/90"
                    asChild
                  >
                    <Link href="/dashboard/garages">Book Now</Link>
                  </Button>
                </div>
              </div>

              {/* Trust & Safety */}
              <div className="bento-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold">Trust & Safety</h3>
                  <p className="text-[10px] text-muted-foreground">الأمان والثقة</p>
                </div>
                <div className="space-y-3">
                  {trustItems.map(({ icon: Icon, label, labelAr, color }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-tight text-foreground">{label}</p>
                        <p className="text-[10px] leading-tight text-muted-foreground">{labelAr}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key features */}
              <div className="bento-card p-4">
                <h3 className="mb-3 text-sm font-bold">Key Features</h3>
                <div className="space-y-2">
                  {keyFeatures.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

            </aside>
          </div>

          {/* ══════════════════════════════════════════════════
              05/11. FEATURED SERVICES (horizontal scroll, mobile)
          ══════════════════════════════════════════════════ */}
          <section className="py-3 lg:hidden">
            <div className="mb-3 flex items-center justify-between px-4">
              <h2 className="text-base font-bold">Featured Services</h2>
              <Link
                href="/dashboard/garages"
                className="flex items-center gap-0.5 text-sm font-semibold text-primary"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar">
              {featuredServices.map((svc) => {
                const svcImg = img(svc.imageId);
                return (
                  <Link
                    key={svc.label}
                    href="/dashboard/garages"
                    className="group mkt-card w-[130px] flex-shrink-0 overflow-hidden"
                  >
                    <div className="relative h-[88px] w-full bg-muted">
                      {svcImg && (
                        <Image
                          src={svcImg.imageUrl}
                          alt={svc.label}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="130px"
                        />
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-[11px] font-bold text-foreground">{svc.label}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{svc.price}</p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Book Any Service CTA */}
            <div className="relative mx-4 mt-3 overflow-hidden rounded-3xl bg-primary p-5">
              <div className="absolute right-0 top-0 h-full w-2/5 opacity-20">
                {carImg && (
                  <Image src={carImg.imageUrl} alt="Car" fill className="object-cover" sizes="130px" />
                )}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
              <div className="relative max-w-[60%]">
                <p className="text-sm font-bold text-white">Book Any Service</p>
                <p className="text-[11px] text-white/85">Fast. Trusted. Affordable.</p>
                <p className="text-[10px] text-white/60">سريع. موثوق. بأسعار مناسبة.</p>
                <Button
                  className="motion-press mt-4 h-9 rounded-xl bg-white px-5 text-xs font-bold text-[var(--qw-primary)] hover:bg-white/90"
                  asChild
                >
                  <Link href="/dashboard/garages">Book Now</Link>
                </Button>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              10. PROMOTIONAL OFFERS
          ══════════════════════════════════════════════════ */}
          <section className="px-4 py-3 lg:hidden">
            {/* Summer AC promo — main banner */}
            <div className="relative overflow-hidden rounded-3xl bg-[var(--qw-dark)]">
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(115deg, var(--qw-primary-dark), transparent 62%), radial-gradient(ellipse 60% 90% at 100% 0%, var(--qw-primary-mid), transparent 58%)',
                }}
              />
              {heroImg && (
                <div className="absolute right-0 top-0 h-full w-2/5 opacity-35">
                  <Image src={heroImg.imageUrl} alt="Promo" fill className="object-cover" sizes="200px" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
              <div className="relative p-5 max-w-[60%]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--qw-gold)]">Summer AC Special</p>
                <p className="text-[10px] text-white/60">On All AC Services</p>
                <p className="mt-2 text-5xl font-black leading-none text-white">20%</p>
                <p className="text-xl font-black text-white/90">OFF</p>
                <Button
                  className="motion-press mt-4 h-9 rounded-xl bg-white px-5 text-xs font-bold text-[var(--qw-primary)] hover:bg-white/90"
                  asChild
                >
                  <Link href="/dashboard/garages">Book Now</Link>
                </Button>
              </div>
            </div>

            {/* Top Offers grid */}
            <div className="mt-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">Top Offers For You</h3>
              <Link href="/dashboard/garages" className="text-xs font-semibold text-primary">
                View all →
              </Link>
            </div>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {topOffers.map((offer) => {
                const offerImg = img(offer.imageId);
                return (
                  <Link
                    key={offer.service}
                    href="/dashboard/garages"
                    className="mkt-card overflow-hidden"
                  >
                    <div className="relative h-16 w-full bg-muted">
                      {offerImg && (
                        <Image
                          src={offerImg.imageUrl}
                          alt={offer.service}
                          fill
                          className="object-cover opacity-60"
                          sizes="120px"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                      <p className="absolute bottom-1.5 left-2 text-[10px] font-black text-white">
                        {offer.discount}
                      </p>
                    </div>
                    <div className="p-2">
                      <p className="text-[10px] font-bold text-foreground">{offer.service}</p>
                      <p className="text-[9px] text-muted-foreground">{offer.until}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              TRUST & SAFETY (mobile)
          ══════════════════════════════════════════════════ */}
          <section className="px-4 py-3 lg:hidden">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Trust & Safety</h2>
              <p className="text-[10px] text-muted-foreground">الأمان والثقة</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {trustItems.map(({ icon: Icon, label, labelAr, color }) => (
                <div
                  key={label}
                  className="mkt-card flex items-center gap-3 p-3"
                >
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', color)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight text-foreground">{label}</p>
                    <p className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{labelAr}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust tagline */}
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              QarWheel — Your Car. Our Care.
              <span className="block text-[10px] text-muted-foreground/60">فارويلز — سيارتك، رعايتنا.</span>
            </p>
          </section>

          {/* ══════════════════════════════════════════════════
              KEY FEATURES (mobile strip)
          ══════════════════════════════════════════════════ */}
          <section className="px-4 py-3 lg:hidden">
            <div className="bento-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold">Key Features</h3>
                <p className="text-[10px] text-muted-foreground">المميزات الرئيسية</p>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                {keyFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              VENDOR CTA
          ══════════════════════════════════════════════════ */}
          <section className="px-4 py-3">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-sm">
              <div className="ambient-blob -right-10 -top-10 h-40 w-40 bg-primary/10 animate-glow-breathe" />
              <div className="relative">
                <p className="section-label text-primary">For Vendors</p>
                <h2 className="mt-1.5 text-base font-bold leading-snug">
                  Turn your garage into a bookable mobile storefront.
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  حوّل كراجك إلى واجهة متجر قابلة للحجز.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button className="motion-press h-9 rounded-xl px-5 text-xs font-bold" asChild>
                    <Link href="/vendor/signup">List your garage</Link>
                  </Button>
                  <Button variant="outline" className="motion-press h-9 rounded-xl px-4 text-xs hover:border-primary/40 hover:bg-primary/5" asChild>
                    <Link href="/vendor/login">Vendor login</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

        </main>

        {/* ════════════════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════════════════ */}
        <footer className="border-t border-border bg-background px-4 py-6">
          <div className="flex items-center justify-between">
            <Logo />
            <ThemeToggle />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Qatar's car service marketplace — discover, compare, and book trusted garages.
          </p>
          <p className="text-[11px] text-muted-foreground/60">فارويلز — سيارتك، رعايتنا.</p>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {[
              { label: 'Browse',    href: '/dashboard/garages' },
              { label: 'Sign up',   href: '/signup' },
              { label: 'Sign in',   href: '/login' },
              { label: 'Vendors',   href: '/vendor/signup' },
              { label: 'Vendor login', href: '/vendor/login' },
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
            ].map((l) => (
              <Link key={l.label} href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </div>

          <p className="mt-5 text-[11px] text-muted-foreground/50">
            © 2026 QarWheel. All rights reserved.
          </p>
        </footer>
      </div>

      {/* ════════════════════════════════════════════════════════
          MOBILE BOTTOM NAV (fixed, hidden on sm+)
      ════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 pb-[max(env(safe-area-inset-bottom),0px)] backdrop-blur sm:hidden">
        <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center px-2">
          <NavItem icon={Home}        label="Home"     active href="/" />
          <NavItem icon={Compass}     label="Explore"         href="/dashboard/garages" />
          <div className="flex h-16 flex-col items-center justify-start">
            <Link
              href="/dashboard/garages"
              aria-label="Book a service"
              className="flex h-14 w-14 -translate-y-4 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/40 ring-4 ring-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/25"
            >
              <Plus className="h-6 w-6 text-primary-foreground" />
            </Link>
            <span className="-mt-3 text-[10px] font-semibold text-primary">Book</span>
          </div>
          <NavItem icon={CalendarCheck} label="Bookings"       href="/dashboard/bookings" />
          <NavItem icon={User}         label="Account"         href="/login" />
        </div>
      </div>

    </div>
  );
}
