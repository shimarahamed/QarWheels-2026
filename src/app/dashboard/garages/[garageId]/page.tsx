'use client';
import { notFound, useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Star, MapPin, ArrowLeft, Wrench, Clock, CircleDollarSign, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Vendor, Service, Review, WithId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';


function StarRating({ rating, className, reviewCount }: { rating: number, className?: string, reviewCount?: number }) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
        <div className="flex items-center gap-2">
            <div className={cn("flex items-center gap-0.5", className)}>
                {[...Array(fullStars)].map((_, i) => (
                    <Star key={`full-${i}`} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
                {halfStar && <Star key="half" className="h-5 w-5 fill-amber-200 text-amber-400" />}
                {[...Array(emptyStars)].map((_, i) => (
                    <Star key={`empty-${i}`} className="h-5 w-5 fill-gray-200 text-gray-300" />
                ))}
            </div>
            {reviewCount !== undefined && <span className="text-sm text-muted-foreground">({reviewCount} reviews)</span>}
        </div>
    );
}

function ServicesList({vendorId}: {vendorId: string}) {
    const { firestore } = useFirebase();
    const servicesRef = useMemoFirebase(() => collection(firestore, 'vendors', vendorId, 'services'), [firestore, vendorId]);
    const { data: services, isLoading } = useCollection<WithId<Service>>(servicesRef);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    if (!services || services.length === 0) {
        return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    <Wrench className="h-10 w-10 mx-auto mb-2 text-primary/50" />
                    <p>No services listed for this garage yet.</p>
                </CardContent>
            </Card>
        )
    }
    
    return (
        <div className="space-y-4">
            {services.map(service => (
                <Card key={service.id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-grow">
                            <h3 className="font-semibold">{service.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                <span className="flex items-center gap-1"><Clock className="h-4 w-4"/> {service.duration} mins</span>
                                <span className="flex items-center gap-1"><CircleDollarSign className="h-4 w-4"/> QAR {service.price.toFixed(2)}</span>
                            </div>
                        </div>
                        <Button asChild className="w-full sm:w-auto shrink-0">
                            <Link href={`/dashboard/book?garageId=${vendorId}&service=${encodeURIComponent(service.name)}`}>
                                <Wrench className="mr-2 h-4 w-4"/>Book Now
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function ReviewsList({vendorId}: {vendorId: string}) {
    const { firestore } = useFirebase();
    const reviewsRef = useMemoFirebase(() => collection(firestore, 'vendors', vendorId, 'reviews'), [firestore, vendorId]);
    const { data: reviews, isLoading } = useCollection<WithId<Review>>(reviewsRef);
    
    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        )
    }

    if (!reviews || reviews.length === 0) {
         return (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                     <Star className="h-10 w-10 mx-auto mb-2 text-primary/50" />
                    <p>No reviews yet.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {reviews.map(review => (
                    <Card key={review.id}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${review.customerName}`} />
                                <AvatarFallback>{review.customerName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-semibold text-sm">{review.customerName}</p>
                                <StarRating rating={review.rating} />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground italic">&quot;{review.comment}&quot;</p>
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground justify-between">
                        <span>{review.service}</span>
                        <span>{format(new Date(review.date), 'PPP')}</span>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}


export default function GarageDetailsPage() {
    const params = useParams();
    const { garageId } = params as { garageId: string };
    const { firestore } = useFirebase();

    const vendorRef = useMemoFirebase(
      () => (firestore && garageId ? doc(firestore, 'vendors', garageId) : null),
      [firestore, garageId]
    );
    const { data: vendor, isLoading } = useDoc<WithId<Vendor>>(vendorRef);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!vendor) {
        notFound();
    }

    const image = PlaceHolderImages.find((img) => img.id === vendor.imageId);

    return (
        <div className="space-y-8">
            <Button variant="ghost" asChild className="-ml-4">
                <Link href="/dashboard/garages">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Garages
                </Link>
            </Button>

            <Card className="overflow-hidden">
                {image && (
                    <Image
                        src={image.imageUrl}
                        alt={vendor.name}
                        width={1200}
                        height={400}
                        className="w-full h-48 md:h-64 object-cover"
                        data-ai-hint={image.imageHint}
                    />
                )}
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <h1 className="text-3xl font-bold font-headline">{vendor.name}</h1>
                            <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span>{vendor.address}</span>
                            </div>
                        </div>
                        <div className="shrink-0">
                             <StarRating rating={vendor.rating || 0} reviewCount={vendor.reviewCount}/>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold font-headline">Available Services</h2>
                    <ServicesList vendorId={vendor.id} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                     <h2 className="text-2xl font-bold font-headline">Customer Reviews</h2>
                     <ReviewsList vendorId={vendor.id} />
                </div>
            </div>

        </div>
    );
}
