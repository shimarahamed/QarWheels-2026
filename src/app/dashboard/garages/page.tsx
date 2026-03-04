'use client';
import { useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Vendor, WithId } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MapPin, Search, Frown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { GaragesMap } from '@/components/dashboard/garages-map';
import { PlaceHolderImages } from '@/lib/placeholder-images';

function GarageCard({ garage }: { garage: WithId<Vendor> }) {
  const image = garage.imageId ? PlaceHolderImages.find(p => p.id === garage.imageId) : PlaceHolderImages.find(p => p.id === 'garage-exterior');
  return (
    <Link href={`/dashboard/garages/${garage.id}`} className="block h-full group">
        <Card className="h-full overflow-hidden transition-all duration-300 hover:border-primary hover:shadow-lg">
            <CardHeader className="p-0">
                {image && (
                    <Image
                        src={image.imageUrl}
                        alt={garage.name}
                        width={400}
                        height={200}
                        className="aspect-video object-cover w-full transition-transform duration-300 group-hover:scale-105"
                        data-ai-hint={image.imageHint}
                    />
                )}
            </CardHeader>
            <CardContent className="p-4">
                <CardTitle className="text-lg mb-1">{garage.name}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4" />
                    <span>{garage.address}, {garage.city}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <span className="font-semibold">{garage.rating?.toFixed(1) || 'N/A'}</span>
                    <span className="text-muted-foreground">({garage.reviewCount || 0} reviews)</span>
                </div>
            </CardContent>
        </Card>
    </Link>
  );
}


export default function GaragesPage() {
    const { firestore } = useFirebase();
    const [searchTerm, setSearchTerm] = useState('');

    const vendorsQuery = useMemoFirebase(
        () => query(collection(firestore, 'vendors'), where('status', '==', 'Approved')),
        [firestore]
    );

    const { data: vendors, isLoading } = useCollection<WithId<Vendor>>(vendorsQuery);

    const filteredVendors = vendors?.filter(vendor => 
        vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-bold font-headline">Find a Garage</h1>
                <p className="text-muted-foreground">
                    Search for trusted service centers and specialists in Qatar.
                </p>
            </header>

            <div className="sticky top-16 md:top-0 z-10 bg-background/80 backdrop-blur-lg -mx-4 px-4 -mt-4 pt-4 pb-4 border-b">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input 
                        placeholder="Search by name or specialty (e.g., 'German cars')"
                        className="pl-10 text-base"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            
            <GaragesMap vendors={filteredVendors || []} />

            <div>
                <h2 className="text-2xl font-bold font-headline mb-4">{searchTerm ? "Search Results" : "All Garages"}</h2>
                 {isLoading && (
                     <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                           <Card key={i}>
                                <Skeleton className="aspect-video w-full" />
                                <CardContent className="p-4 space-y-2">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-1/3" />
                                </CardContent>
                           </Card>
                        ))}
                     </div>
                 )}
                 {!isLoading && filteredVendors && filteredVendors.length > 0 && (
                     <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                         {filteredVendors.map(garage => (
                             <GarageCard key={garage.id} garage={garage} />
                         ))}
                     </div>
                 )}
                 {!isLoading && (!filteredVendors || filteredVendors.length === 0) && (
                     <Card>
                         <CardContent className="p-12 text-center text-muted-foreground">
                            <Frown className="h-12 w-12 mx-auto mb-4 text-primary/50"/>
                             <p className="font-semibold">No garages found</p>
                             <p>Try adjusting your search term.</p>
                         </CardContent>
                     </Card>
                 )}
            </div>
        </div>
    );
}