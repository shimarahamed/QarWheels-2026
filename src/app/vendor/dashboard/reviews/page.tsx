import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Star, MessageSquare } from "lucide-react";
  import { mockReviews } from "@/lib/vendor-data";
  import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
  import { format } from "date-fns";
  import { cn } from "@/lib/utils";

function StarRating({ rating, className }: { rating: number, className?: string }) {
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;

    return (
        <div className={cn("flex items-center gap-0.5", className)}>
            {[...Array(fullStars)].map((_, i) => (
                <Star key={`full-${i}`} className="h-5 w-5 fill-amber-400 text-amber-400" />
            ))}
            {[...Array(emptyStars)].map((_, i) => (
                <Star key={`empty-${i}`} className="h-5 w-5 fill-gray-200 text-gray-300" />
            ))}
        </div>
    );
}
  
  export default function VendorReviewsPage() {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-headline">Reviews & Feedback</h1>
          <p className="text-muted-foreground">
            View and manage customer reviews.
          </p>
        </header>
        
        <div className="space-y-6">
            {mockReviews.map((review) => (
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
                        <Button variant="ghost" size="sm">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Reply to Review
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      </div>
    );
  }
  
