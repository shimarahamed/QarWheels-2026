'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { useFavorites } from '@/hooks/use-favorites';
import {
  CompareTray,
  GarageCompareDialog,
  MAX_COMPARE,
} from '@/components/dashboard/garage-compare';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import type { Branch, WithId } from '@/lib/types';
import {
  ArrowRight,
  Building,
  Filter,
  Frown,
  Heart,
  List,
  MapPin,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
} from 'lucide-react';

const GaragesMap = dynamic(() => import('@/components/dashboard/garages-map').then((mod) => mod.GaragesMap), {
  ssr: false,
  loading: () => <Skeleton className="h-[320px] w-full rounded-2xl" />,
});

function GarageCard({
  garage,
  isFavorite,
  onToggleFavorite,
  isComparing,
  onToggleCompare,
  compareDisabled,
}: {
  garage: WithId<Branch>;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  isComparing: boolean;
  onToggleCompare: () => void;
  compareDisabled: boolean;
}) {
  const image = PlaceHolderImages.find((p) => p.id === garage.imageId) ?? PlaceHolderImages.find((p) => p.id === 'garage-exterior');

  return (
    <Card className="overflow-hidden border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
      <CardContent className="grid gap-0 p-0 sm:grid-cols-[180px_1fr]">
        <Link
          href={`/dashboard/garages/${garage.id}`}
          className="group relative min-h-[190px] overflow-hidden bg-muted sm:min-h-full"
        >
          {image && (
            <Image
              src={image.imageUrl}
              alt={garage.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, 180px"
              data-ai-hint={image.imageHint}
            />
          )}
          <div className="absolute left-3 top-3">
            <Badge className="bg-background/90 text-foreground shadow-sm backdrop-blur">{garage.city}</Badge>
          </div>
        </Link>

        <div className="flex min-w-0 flex-col gap-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/dashboard/garages/${garage.id}`} className="group min-w-0 flex-1">
              <h2 className="truncate text-lg font-bold group-hover:text-primary">{garage.name}</h2>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">{garage.address}, {garage.city}</span>
              </p>
            </Link>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-label={isFavorite ? `Remove ${garage.name} from saved` : `Save ${garage.name}`}
              aria-pressed={isFavorite}
              className={cn(
                'shrink-0 rounded-full border p-2 transition-colors',
                isFavorite
                  ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'text-muted-foreground hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600'
              )}
            >
              <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
            </button>
          </div>

          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {garage.tags?.join(' · ') || 'Trusted service center with verified profile details and customer feedback.'}
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Rating</p>
              <p className="mt-1 flex items-center gap-1 font-bold">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {garage.rating?.toFixed(1) || 'N/A'}
              </p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Reviews</p>
              <p className="mt-1 font-bold">{garage.reviewCount || 0}</p>
            </div>
            <div className="rounded-xl border bg-background/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Status</p>
              <p className="mt-1 flex items-center gap-1 font-bold text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
                Live
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant={isComparing ? 'secondary' : 'ghost'}
              size="sm"
              onClick={onToggleCompare}
              disabled={compareDisabled && !isComparing}
              className="h-8"
            >
              <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
              {isComparing ? 'In comparison' : 'Compare'}
            </Button>
            <Button asChild variant="ghost" size="sm" className="h-8 group">
              <Link href={`/dashboard/garages/${garage.id}`}>
                View
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function GaragesPage() {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { isFavorite, toggleFavorite, favorites } = useFavorites();

  const [searchTerm, setSearchTerm] = useState('');
  const [pickupFilter, setPickupFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('rating');
  const [savedOnly, setSavedOnly] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  // The marketplace lists individual approved branches, not businesses.
  const vendorsQuery = useMemoFirebase(
    () => query(collection(firestore, 'branches'), where('status', '==', 'Approved')),
    [firestore]
  );

  const { data: vendors, isLoading } = useCollection<WithId<Branch>>(vendorsQuery);

  const cities = useMemo(() => {
    const allCities = new Set((vendors || []).map((vendor) => vendor.city).filter(Boolean));
    return ['All', ...Array.from(allCities).sort()];
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return [...(vendors || [])]
      .filter((vendor) => {
        const matchesSearch =
          !term ||
          vendor.name.toLowerCase().includes(term) ||
          vendor.address.toLowerCase().includes(term) ||
          vendor.city.toLowerCase().includes(term) ||
          (vendor.tags || []).some((tag) => tag.toLowerCase().includes(term));
        const matchesPickup =
          pickupFilter === 'All' ||
          (pickupFilter === 'Pickup' ? Boolean(vendor.pickupAvailable) : !vendor.pickupAvailable);
        const matchesCity = cityFilter === 'All' || vendor.city === cityFilter;
        const matchesSaved = !savedOnly || isFavorite(vendor.id);
        return matchesSearch && matchesPickup && matchesCity && matchesSaved;
      })
      .sort((a, b) => {
        if (sortBy === 'reviews') return (b.reviewCount || 0) - (a.reviewCount || 0);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return (b.rating || 0) - (a.rating || 0);
      });
  }, [cityFilter, searchTerm, sortBy, pickupFilter, savedOnly, isFavorite, vendors]);

  // Resolved from the full vendor list, not the filtered one, so a branch
  // stays in the comparison when the user changes filters around it.
  const compareBranches = useMemo(
    () =>
      compareIds
        .map((id) => (vendors || []).find((vendor) => vendor.id === id))
        .filter((vendor): vendor is WithId<Branch> => Boolean(vendor)),
    [compareIds, vendors]
  );

  const toggleCompare = useCallback(
    (branchId: string) => {
      setCompareIds((prev) => {
        if (prev.includes(branchId)) return prev.filter((id) => id !== branchId);
        if (prev.length >= MAX_COMPARE) {
          toast({
            title: `Compare up to ${MAX_COMPARE} garages`,
            description: 'Remove one from the comparison bar to add another.',
          });
          return prev;
        }
        return [...prev, branchId];
      });
    },
    [toast]
  );

  const savedCount = favorites.length;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
      <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="mb-4 h-8 gap-2 bg-primary/5 px-3 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Smart Search
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Find the right service partner.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Search approved garages and parts providers by specialty, city, reputation, and service fit.
            </p>
          </div>
          <Button asChild className="justify-start">
            <Link href="/dashboard/book">
              Book Directly
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="sticky top-[65px] z-20 space-y-3 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur-xl md:top-3">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, city, specialty, or service need"
              className="h-11 pl-10 text-base"
            />
          </div>
          <Select value={pickupFilter} onValueChange={setPickupFilter}>
            <SelectTrigger className="h-11">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Pickup" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All services</SelectItem>
              <SelectItem value="Pickup">Pickup available</SelectItem>
              <SelectItem value="NoPickup">Drop-off only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="h-11">
              <MapPin className="mr-2 h-4 w-4" />
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-11">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Highest rated</SelectItem>
              <SelectItem value="reviews">Most reviewed</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant={savedOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSavedOnly((prev) => !prev)}
            className="h-9"
          >
            <Heart className={cn('mr-2 h-4 w-4', savedOnly && 'fill-current')} />
            Saved{savedCount > 0 ? ` (${savedCount})` : ''}
          </Button>

          <Tabs value={view} onValueChange={(value) => setView(value as 'list' | 'map')}>
            <TabsList className="h-9">
              <TabsTrigger value="list" className="gap-1.5 text-xs">
                <List className="h-3.5 w-3.5" />
                List
              </TabsTrigger>
              <TabsTrigger value="map" className="gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5" />
                Map
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">
              {savedOnly ? 'Saved garages' : 'Verified results'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredVendors.length} partner{filteredVendors.length === 1 ? '' : 's'} match your filters.
            </p>
          </div>
          <Badge variant="secondary" className="h-8 gap-2">
            <Building className="h-3.5 w-3.5" />
            Approved network
          </Badge>
        </div>

        {isLoading && (
          <div className="grid gap-4 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-36 w-full" />
              </Card>
            ))}
          </div>
        )}

        {!isLoading && view === 'map' && (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <GaragesMap vendors={filteredVendors} />
          </div>
        )}

        {!isLoading && view === 'list' && filteredVendors.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredVendors.map((garage) => (
              <GarageCard
                key={garage.id}
                garage={garage}
                isFavorite={isFavorite(garage.id)}
                onToggleFavorite={() => void toggleFavorite(garage.id, garage.name)}
                isComparing={compareIds.includes(garage.id)}
                onToggleCompare={() => toggleCompare(garage.id)}
                compareDisabled={compareIds.length >= MAX_COMPARE}
              />
            ))}
          </div>
        )}

        {!isLoading && filteredVendors.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <Frown className="mx-auto mb-4 h-12 w-12 text-primary/50" />
              <p className="font-semibold text-foreground">
                {savedOnly ? 'No saved garages yet' : 'No garages found'}
              </p>
              <p className="mt-1 text-sm">
                {savedOnly
                  ? 'Tap the heart on any garage to save it here for later.'
                  : 'Try a wider city, service type, or keyword.'}
              </p>
              {savedOnly && (
                <Button variant="outline" className="mt-4" onClick={() => setSavedOnly(false)}>
                  Browse all garages
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </section>

      <CompareTray
        branches={compareBranches}
        onClear={() => setCompareIds([])}
        onRemove={(id) => setCompareIds((prev) => prev.filter((existing) => existing !== id))}
        onOpen={() => setCompareOpen(true)}
      />

      <GarageCompareDialog
        branches={compareBranches}
        open={compareOpen && compareBranches.length >= 2}
        onOpenChange={setCompareOpen}
        onRemove={(id) => setCompareIds((prev) => prev.filter((existing) => existing !== id))}
      />
    </div>
  );
}
