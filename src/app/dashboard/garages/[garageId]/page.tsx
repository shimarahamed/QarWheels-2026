'use client';
import { useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { useFirebase, useDoc, useCollection, useMemoFirebase, safeAddDoc } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import type { Vendor, Service, Review, Promotion, Booking, WithId } from '@/lib/types';
import { Star, MapPin, Phone, Globe, Wrench, MessageSquare, Loader2, ArrowLeft, AlertTriangle, Percent, Tag, Send } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Link from 'next/link';
import { format, isValid } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';


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
      {review.vendorReply && (
        <div className="mt-2 rounded-lg border bg-muted/40 p-2">
          <p className="text-xs font-semibold text-muted-foreground">Response from garage</p>
          <p className="mt-0.5 text-xs text-foreground/80">{review.vendorReply}</p>
        </div>
      )}
    </div>
  );
}

function WriteReviewCard({ garageId }: { garageId: string }) {
  const { firestore, user } = useFirebase();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const completedBookingsQuery = useMemoFirebase(
    () =>
      user
        ? query(
            collection(firestore, 'bookings'),
            where('userId', '==', user.uid),
            where('vendorId', '==', garageId),
            where('status', '==', 'Completed')
          )
        : null,
    [firestore, user, garageId]
  );
  const { data: completedBookings, isLoading } = useCollection<WithId<Booking>>(completedBookingsQuery);

  if (!user || user.isAnonymous || isLoading) return null;
  if (!completedBookings || completedBookings.length === 0) return null;

  if (submitted) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Thanks — your review has been submitted.
        </CardContent>
      </Card>
    );
  }

  async function onSubmit() {
    if (!user || !completedBookings || rating < 1 || comment.trim().length < 10) return;
    setIsSubmitting(true);
    try {
      await safeAddDoc(collection(firestore, 'vendors', garageId, 'reviews'), {
        userId: user.uid,
        customerName: user.displayName || user.email || 'QarWheel Customer',
        rating,
        comment: comment.trim(),
        service: completedBookings[0].serviceName,
        date: new Date().toISOString(),
      });
      toast({ title: 'Review submitted', description: 'Thanks for sharing your feedback!' });
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Could not submit review', description: 'Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Write a Review</CardTitle>
        <CardDescription>Share your experience with this garage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`Rate ${n} stars`}>
              <Star className={cn('h-6 w-6', n <= rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-300')} />
            </button>
          ))}
        </div>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you think of the service? (min. 10 characters)"
          maxLength={1000}
        />
        <Button onClick={onSubmit} disabled={isSubmitting || rating < 1 || comment.trim().length < 10}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Submit Review
        </Button>
      </CardContent>
    </Card>
  );
}


export default function GarageDetailsPage() {
    const params = useParams();
    const garageId = params.garageId as string;
    const { firestore, isUserLoading } = useFirebase();

    const garageRef = useMemoFirebase(() => garageId ? doc(firestore, 'vendors', garageId) : null, [firestore, garageId]);
    const servicesRef = useMemoFirebase(() => garageId ? collection(firestore, 'vendors', garageId, 'services') : null, [firestore, garageId]);
    const reviewsRef = useMemoFirebase(() => garageId ? collection(firestore, 'vendors', garageId, 'reviews') : null, [firestore, garageId]);
    const promotionsRef = useMemoFirebase(() => garageId ? collection(firestore, 'vendors', garageId, 'promotions') : null, [firestore, garageId]);

    const { data: garage, isLoading: isLoadingGarage, error: garageError } = useDoc<WithId<Vendor>>(garageRef);
    const { data: services, isLoading: isLoadingServices, error: servicesError } = useCollection<WithId<Service>>(servicesRef);
    const { data: reviews, isLoading: isLoadingReviews, error: reviewsError } = useCollection<WithId<Review>>(reviewsRef);
    const { data: allPromotions } = useCollection<WithId<Promotion>>(promotionsRef);

    const now = new Date();
    const activePromotions = (allPromotions || []).filter(p => {
        const start = parseISO(p.startDate);
        const end = parseISO(p.endDate);
        end.setHours(23, 59, 59, 999);
        return now >= start && now <= end;
    });

    const isLoading = isUserLoading || isLoadingGarage;
    const error = garageError;

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
    
    const image = PlaceHolderImages.find(p => p.id === garage.imageId) ?? PlaceHolderImages.find(p => p.id === 'garage-interior');

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

                    {activePromotions.length > 0 && (
                        <Card className="border-primary/30 bg-primary/5">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Tag className="h-4 w-4 text-primary" />
                                    Active Promotions
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-3 sm:grid-cols-2">
                                {activePromotions.map((promo) => (
                                    <div key={promo.id} className="rounded-xl border bg-background p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-sm">{promo.title}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{promo.description}</p>
                                            </div>
                                            <Badge className="shrink-0">{promo.discount} OFF</Badge>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
                                            <Percent className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span className="font-mono text-xs font-semibold tracking-wider">{promo.code}</span>
                                        </div>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Valid until {format(parseISO(promo.endDate), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    <Card id="services">
                        <CardHeader>
                            <CardTitle>Services Offered</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingServices ? (
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <div key={i} className="flex justify-between items-start gap-4">
                                            <div className="space-y-2 flex-1">
                                                <Skeleton className="h-5 w-40" />
                                                <Skeleton className="h-4 w-64" />
                                                <Skeleton className="h-4 w-20" />
                                            </div>
                                            <div className="space-y-2 text-right">
                                                <Skeleton className="h-6 w-24" />
                                                <Skeleton className="h-8 w-24" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : services && services.length > 0 ? (
                                <div className="space-y-4">
                                    {services.map((service, index) => {
                                        const price = Number(service.price ?? 0);
                                        const duration = Number(service.duration ?? 0);
                                        return (
                                            <div key={service.id}>
                                                <div className="flex justify-between items-start gap-4">
                                                    <div className="min-w-0">
                                                        <h3 className="font-semibold">{service.name}</h3>
                                                        <p className="text-sm text-muted-foreground">{service.description}</p>
                                                        <p className="text-sm font-medium text-primary mt-1">~{duration} mins</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="font-bold text-lg">QAR {price.toFixed(2)}</p>
                                                        <Button asChild size="sm" className="mt-1">
                                                            <Link href={`/dashboard/book?garageId=${garage.id}&garageName=${encodeURIComponent(garage.name)}&serviceName=${encodeURIComponent(service.name)}&price=${price}`}>
                                                                Book Now
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                                {index < services.length - 1 && <Separator className="my-4" />}
                                            </div>
                                        );
                                    })}
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
                     <WriteReviewCard garageId={garage.id} />
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
