'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Star, MessageSquare, Loader2 } from "lucide-react";
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
  import { format } from "date-fns";
  import { cn } from "@/lib/utils";
  import { useVendor } from "@/components/vendor/vendor-provider";
  import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
  import { collection } from "firebase/firestore";
  import type { Review, WithId } from "@/lib/types";
  import { Skeleton } from "@/components/ui/skeleton";


function StarRating({ rating, className }: { rating: number, className?: string }) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    return (
        <div className={cn("flex items-center gap-0.5", className)}>
            {[...Array(fullStars)].map((_, i) => (
                <Star key={`full-${i}`} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
            {halfStar && <Star key="half" className="h-5 w-5 fill-amber-200 text-amber-400" />}
            {[...Array(emptyStars)].map((_, i) => (
                <Star key={`empty-${i}`} className="h-5 w-5 fill-gray-200 text-gray-300" />
            ))}
        </div>
    );
}
  
  export default function VendorReviewsPage() {
    const { firestore } = useFirebase();
    const { vendor } = useVendor();

    const reviewsRef = useMemoFirebase(() => vendor ? collection(firestore, 'vendors', vendor.id, 'reviews') : null, [firestore, vendor]);
    const { data: reviews, isLoading } = useCollection<WithId<Review>>(reviewsRef);

    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-headline">Reviews & Feedback</h1>
          <p className="text-muted-foreground">
            View and manage customer reviews.
          </p>
        </header>
        
        <div className="space-y-6">
            {isLoading && [...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div></div></CardHeader>
                    <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                    <CardFooter><Skeleton className="h-8 w-32" /></CardFooter>
                </Card>
            ))}
            {!isLoading && reviews && reviews.map((review) => (
                <Card key={review.id}>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${review.customerName}`} />
                                    <AvatarFallback>{review.customerName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{review.customerName}</p>
                                    <p className="text-sm text-muted-foreground">on {review.service}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <StarRating rating={review.rating} />
                                <span className="text-sm text-muted-foreground">{format(new Date(review.date), "PPP")}</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-foreground/80">{review.comment}</p>
                    </CardContent>
                    <CardFooter>
                        <Button variant="ghost" size="sm" disabled>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Reply to Review
                        </Button>
                    </CardFooter>
                </Card>
            ))}
             {!isLoading && (!reviews || reviews.length === 0) && (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        <Star className="h-10 w-10 mx-auto mb-2 text-primary/50" />
                        <p>No reviews have been submitted yet.</p>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    );
  }
  