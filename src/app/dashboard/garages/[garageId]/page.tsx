'use client';
import { notFound, useParams } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Vendor, Service, Review, WithId } from '@/lib/types';
import { Star, MapPin, Phone, Globe, Wrench, MessageSquare, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


function StarRating({ rating, reviewCount, className }: { rating: number, reviewCount?: number, className?: string }) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
        <div className={cn("flex items-center gap-x-2", className)}>
            <div className="flex items-center gap-0.5">
                {[...Array(fullStars)].map((_, i) => (
                    <Star key={`full-${i}`} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
                {halfStar && <Star key="half" className="h-5 w-5 fill-amber-200 text-amber-400" />}
                {[...Array(emptyStars)].map((_, i) => (
                    <Star key={`empty-${i}`} className="h-5 w-5 fill-gray-200 text-gray-300" />
                ))}
            </div>
             {reviewCount !== undefined && <span className='text-sm text-muted-foreground'>({reviewCount} reviews)</span>}
        </div>
    );
}

function ReviewItem({ review }: { review: WithId<Review> }) {
  // Validate date before formatting
  const isDateValid = review.date && isValid(new Date(review.date));
  const reviewDate = isDateValid ? new Date(review.date) : null;

  return (
    <div className="text-sm">
      <div className="flex justify-between items-center mb-1">
        <p className="font-semibold">{review.customerName}</p>
        <StarRating rating={review.rating} />
      </div>
      <p className="text-muted-foreground italic">&quot;{review.comment}&quot;</p>
      {reviewDate ? (
        <p className="text-xs text-muted-foreground/70 mt-1">
          {format(reviewDate, 'PPP')}
        </p>
      ) : (
         <p className="text-xs text-muted-foreground/70 mt-1">
          Date not available
        </p>
      )}
    </div>
  );
}


export default function GarageDetailsPage() {
    const params = useParams();
    const garageId = params.garageId as string;
    const { firestore, isUserLoading } = useFirebase();

    const garageRef = useMemoFirebase(() => garageId ? doc(firestore, 'vendors', garageId) : null, [firestore, garageId]);
    const servicesRef = useMemoFirebase(() => garageId ? collection(firestore, 'vendors', garageId, 'services') : null, [firestore, garageId]);
    const reviewsRef = useMemoFirebase(() => garageId ? collection(firestore, 'vendors', garageId, 'reviews') : null, [firestore, garageId]);

    const { data: garage, isLoading: isLoadingGarage, error: garageError } = useDoc<WithId<Vendor>>(garageRef);
    const { data: services, isLoading: isLoadingServices, error: servicesError } = useCollection<WithId<Service>>(servicesRef);
    const { data: reviews, isLoading: isLoadingReviews, error: reviewsError } = useCollection<WithId<Review>>(reviewsRef);
    
    const isLoading = isUserLoading || isLoadingGarage || isLoadingServices || isLoadingReviews;
    const error = garageError || servicesError || reviewsError;

    if (isLoading) {
        return (
             <div className="space-y-6">
                <Skeleton className="h-9 w-40" />
                 <div className="grid lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2 space-y-8">
                        <Card><Skeleton className="aspect-video w-full" /><CardHeader><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-3/4 mt-2" /></CardHeader></Card>
                        <Card><CardHeader><Skeleton className="h-6 w-32" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent></Card>
                     </div>
                     <div className="lg:col-span-1 space-y-8">
                        <Card><CardHeader><Skeleton className="h-6 w-24" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-full" /></CardContent></Card>
                        <Card><CardHeader><Skeleton className="h-6 w-24" /></CardHeader><CardContent className="space-y-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
                     </div>
                 </div>
            </div>
        )
    }
    
    if (error) {
        return (
             <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Failed to Load Garage Details</AlertTitle>
                <AlertDescription>
                    <p>There was an error fetching the data for this garage. It might be a temporary issue or a problem with permissions.</p>
                     <pre className="mt-4 whitespace-pre-wrap font-mono text-xs bg-destructive-foreground/10 p-2 rounded">
                        {error.message}
                    </pre>
                </AlertDescription>
            </Alert>
        );
    }

    if (!garage) {
        return (
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Garage Not Found</AlertTitle>
                <AlertDescription>
                   The garage you are looking for could not be found. It may have been deleted or the link may be incorrect.
                </AlertDescription>
            </Alert>
        );
    }
    
    const image = garage.imageId ? PlaceHolderImages.find(p => p.id === garage.imageId) : PlaceHolderImages.find(p => p.id === 'garage-interior');

    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild className="-ml-4">
                <Link href="/dashboard/garages">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to All Garages
                </Link>
            </Button>
            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="overflow-hidden">
                        {image && (
                            <Image
                                src={image.imageUrl}
                                alt={garage.name}
                                width={800}
                                height={400}
                                className="w-full aspect-video object-cover"
                                data-ai-hint={image.imageHint}
                            />
                        )}
                        <CardHeader>
                            <CardTitle>{garage.name}</CardTitle>
                            <CardDescription>{garage.description}</CardDescription>
                             <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm text-muted-foreground">
                                <StarRating rating={garage.rating || 0} reviewCount={garage.reviewCount || 0} />
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <span>{garage.address}</span>
                                </div>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Services Offered</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {services && services.length > 0 ? (
                                <div className="space-y-4">
                                    {services.map((service, index) => (
                                        <div key={service.id}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold">{service.name}</h3>
                                                    <p className="text-sm text-muted-foreground">{service.description}</p>
                                                    <p className="text-sm font-medium text-primary mt-1">~{service.duration} mins</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg">QAR {service.price.toFixed(2)}</p>
                                                    <Button asChild size="sm" className="mt-1">
                                                        <Link href={`/dashboard/book?garageId=${garage.id}&garageName=${encodeURIComponent(garage.name)}&serviceName=${encodeURIComponent(service.name)}&price=${service.price}`}>
                                                            Book Now
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>
                                            {index < services.length - 1 && <Separator className="my-4" />}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Wrench className="h-10 w-10 mx-auto mb-2 text-primary/50" />
                                    <p>No services listed for this garage yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1 space-y-8 sticky top-24">
                     <Card>
                        <CardHeader>
                            <CardTitle>Contact & Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                             <div className="flex items-start gap-3">
                                <Phone className="h-4 w-4 mt-1 text-primary"/>
                                <span>{garage.phoneNumber}</span>
                             </div>
                              <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 mt-1 text-primary"/>
                                <span>{garage.address}, {garage.city}</span>
                             </div>
                             {garage.websiteUrl && (
                                <div className="flex items-start gap-3">
                                    <Globe className="h-4 w-4 mt-1 text-primary"/>
                                    <a href={garage.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80 break-all">{garage.websiteUrl}</a>
                                </div>
                             )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Customer Reviews</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {reviews && reviews.length > 0 ? (
                                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 no-scrollbar">
                                    {reviews.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(review => (
                                       <ReviewItem key={review.id} review={review} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MessageSquare className="h-10 w-10 mx-auto mb-2 text-primary/50" />
                                    <p>No reviews yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
