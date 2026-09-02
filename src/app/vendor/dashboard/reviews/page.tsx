'use client';

import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Star, MessageSquare, Loader2, Send } from "lucide-react";
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
  import { Textarea } from "@/components/ui/textarea";
  import { format } from "date-fns";
  import { cn } from "@/lib/utils";
  import { useVendor } from "@/components/vendor/vendor-provider";
  import { useFirebase, useCollection, useMemoFirebase, safeUpdateDoc } from "@/firebase";
  import { collection, doc } from "firebase/firestore";
  import type { Review, WithId } from "@/lib/types";
  import { Skeleton } from "@/components/ui/skeleton";
  import { useToast } from "@/hooks/use-toast";


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
  
  function ReplyForm({ vendorId, review }: { vendorId: string; review: WithId<Review> }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [text, setText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (review.vendorReply) {
      return (
        <div className="mt-4 w-full rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-semibold text-muted-foreground">Your reply</p>
          <p className="mt-1 text-sm text-foreground/80">{review.vendorReply}</p>
        </div>
      );
    }

    if (!isOpen) {
      return (
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Reply to Review
        </Button>
      );
    }

    async function onSubmit() {
      const trimmed = text.trim();
      if (!trimmed) return;
      setIsSubmitting(true);
      try {
        await safeUpdateDoc(doc(firestore, 'vendors', vendorId, 'reviews', review.id), {
          vendorReply: trimmed,
          vendorReplyDate: new Date().toISOString(),
        });
        toast({ title: 'Reply posted' });
        setIsOpen(false);
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Could not post reply', description: 'Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    }

    return (
      <div className="w-full space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a reply to this customer..."
          maxLength={1000}
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={onSubmit} disabled={isSubmitting || !text.trim()}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Post Reply
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
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
                        {vendor && <ReplyForm vendorId={vendor.id} review={review} />}
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
  