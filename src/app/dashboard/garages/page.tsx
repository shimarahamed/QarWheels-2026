'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import type { Branch, WithId } from '@/lib/types';
import {
  ArrowRight,
  Building,
  Filter,
  Frown,
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

function GarageCard({ garage }: { garage: WithId<Branch> }) {
  const image = PlaceHolderImages.find((p) => p.id === garage.imageId) ?? PlaceHolderImages.find((p) => p.id === 'garage-exterior');

  return (
    <Link href={`/dashboard/garages/${garage.id}`} className="group block">
      <Card className="overflow-hidden border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md">
        <CardContent className="grid gap-0 p-0 sm:grid-cols-[180px_1fr]">
          <div className="relative min-h-[190px] overflow-hidden bg-muted sm:min-h-full">
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
          </div>

          <div className="flex min-w-0 flex-col gap-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold">{garage.name}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{garage.address}, {garage.city}</span>
                </p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
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
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function GaragesPage() {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const [pickupFilter, setPickupFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('rating');

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
        return matchesSearch && matchesPickup && matchesCity;
      })
      .sort((a, b) => {
        if (sortBy === 'reviews') return (b.reviewCount || 0) - (a.reviewCount || 0);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return (b.rating || 0) - (a.rating || 0);
      });
  }, [cityFilter, searchTerm, sortBy, pickupFilter, vendors]);

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

      <section className="sticky top-[65px] z-20 rounded-2xl border bg-background/95 p-3 shadow-sm backdrop-blur-xl md:top-3">
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
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <GaragesMap vendors={filteredVendors} />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Verified results</h2>
              <p className="text-sm text-muted-foreground">{filteredVendors.length} partner{filteredVendors.length === 1 ? '' : 's'} match your filters.</p>
            </div>
            <Badge variant="secondary" className="h-8 gap-2">
              <Building className="h-3.5 w-3.5" />
              Approved network
            </Badge>
          </div>

          {isLoading && (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-36 w-full" />
                </Card>
              ))}
            </div>
          )}

          {!isLoading && filteredVendors.length > 0 && (
            <div className="grid gap-4">
              {filteredVendors.map((garage) => <GarageCard key={garage.id} garage={garage} />)}
            </div>
          )}

          {!isLoading && filteredVendors.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Frown className="mx-auto mb-4 h-12 w-12 text-primary/50" />
                <p className="font-semibold text-foreground">No garages found</p>
                <p className="mt-1 text-sm">Try a wider city, service type, or keyword.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
