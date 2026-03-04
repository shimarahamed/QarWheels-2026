'use client';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Search, Star, MapPin, List, Map as MapIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { GaragesMap } from '@/components/dashboard/garages-map';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Vendor, WithId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


function StarRating({ rating, className }: { rating: number, className?: string }) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
        <div className={cn("flex items-center gap-0.5", className)}>
            {[...Array(fullStars)].map((_, i) => (
                <Star key={`full-${i}`} className="h-4 w-4 fill-amber-400 text-amber-400" />
            ))}
            {halfStar && <Star key="half" className="h-4 w-4 fill-amber-200 text-amber-400" />}
            {[...Array(emptyStars)].map((_, i) => (
                <Star key={`empty-${i}`} className="h-4 w-4 fill-gray-200 text-gray-300" />
            ))}
        </div>
    );
}

function GarageList({ vendors, isLoading }: { vendors: WithId<Vendor>[] | null, isLoading: boolean }) {
    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="flex flex-col group overflow-hidden">
                        <Skeleton className="w-full aspect-video" />
                        <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                        <CardContent className="space-y-2">
                             <Skeleton className="h-4 w-1/2" />
                             <Skeleton className="h-4 w-full" />
                        </CardContent>
                        <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                    </Card>
                ))}
            </div>
        )
    }

    if (!vendors || vendors.length === 0) {
        return (
             <div className="text-center text-muted-foreground py-12">
                <Search className="mx-auto h-12 w-12 mb-4" />
                <p>No approved garages found.</p>
                <p className="text-xs mt-2">The database might be seeding. Please wait a moment and refresh.</p>
            </div>
        )
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
            {vendors.map((vendor) => {
                const image = PlaceHolderImages.find((img) => img.id === vendor.imageId);
                return (
                    <Card key={vendor.id} className="flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary">
                        <Link href={`/dashboard/garages/${vendor.id}`} className="block">
                            <div className="overflow-hidden rounded-t-lg">
                                {image && (
                                    <Image
                                        src={image.imageUrl}
                                        alt={vendor.name}
                                        width={400}
                                        height={225}
                                        className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
                                        data-ai-hint={image.imageHint}
                                    />
                                )}
                            </div>
                        </Link>
                        <CardHeader>
                            <CardTitle>
                                <Link href={`/dashboard/garages/${vendor.id}`}>{vendor.name}</Link>
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <StarRating rating={vendor.rating || 0} />
                                <span className="text-sm text-muted-foreground">({vendor.reviewCount || 0} reviews)</span>
                            </div>
                            <CardDescription className="flex items-start gap-2 pt-2">
                                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{vendor.address}</span>
                            </CardDescription>
                        </CardHeader>
                        {/* 
                        We can't show services here anymore as it's a subcollection. 
                        This could be fetched separately if needed, but for now we remove it for performance.
                        */}
                        <CardContent className="flex-grow">
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href={`/dashboard/garages/${vendor.id}`}>View Profile & Book</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    )
}

export default function GaragesPage() {
  const { firestore } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');

  // Security rules require filtering by 'Approved' status for public access
  const vendorsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'vendors'), where('status', '==', 'Approved')) : null),
    [firestore]
  );
  const { data: vendors, isLoading } = useCollection<WithId<Vendor>>(vendorsQuery);

  const filteredVendors = useMemo(() => {
    if (!vendors) return null;
    if (!searchTerm) return vendors;
    return vendors.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.address.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vendors, searchTerm]);
  
  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold font-headline">Find Garages</h1>
            <p className="text-muted-foreground">
                Search for trusted automotive service centers in Qatar.
            </p>
        </header>

        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder="Search by name or location..." 
                className="pl-10" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Desktop View */}
        <div className="hidden lg:grid grid-cols-5 gap-8" style={{height: 'calc(100vh - 280px)'}}>
            <ScrollArea className="col-span-2 h-full pr-4 -mr-4">
               <GarageList vendors={filteredVendors} isLoading={isLoading} />
            </ScrollArea>
            <div className="col-span-3 h-full">
                <GaragesMap vendors={filteredVendors} isLoading={isLoading} />
            </div>
        </div>

        {/* Mobile View */}
        <div className="lg:hidden">
            <Tabs defaultValue="list" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list"><List className="mr-2 h-4 w-4" />List View</TabsTrigger>
                    <TabsTrigger value="map"><MapIcon className="mr-2 h-4 w-4" />Map View</TabsTrigger>
                </TabsList>
                <TabsContent value="list" className="mt-6">
                    <GarageList vendors={filteredVendors} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="map" className="mt-6">
                     <div className="h-[400px]">
                        <GaragesMap vendors={filteredVendors} isLoading={isLoading} />
                     </div>
                </TabsContent>
            </Tabs>
        </div>
    </div>
  );
}
