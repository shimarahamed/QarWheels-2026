'use client';
import { notFound, useParams } from 'next/navigation';
import { mockGarages, mockUser } from '@/lib/data';
import { mockReviews, mockVendorServices } from '@/lib/vendor-data';
import Image from 'next/image';
import Link from 'next/link';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Star, MapPin, ArrowLeft, Wrench, Clock, CircleDollarSign, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';

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
            {reviewCount && <span className="text-sm text-muted-foreground">({reviewCount} reviews)</span>}
        </div>
    );
}

export default function GarageDetailsPage() {
    const params = useParams();
    const { garageId } = params;

    const garage = mockGarages.find((g) => g.id === garageId);

    if (!garage) {
        notFound();
    }

    const image = PlaceHolderImages.find((img) => img.id === garage.imageId);
    const garageServices = mockVendorServices.filter(vs => garage.services.includes(vs.name));
    // Showing all mock reviews as an example
    const garageReviews = mockReviews.slice(0,3);

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
                        alt={garage.name}
                        width={1200}
                        height={400}
                        className="w-full h-48 md:h-64 object-cover"
                        data-ai-hint={image.imageHint}
                    />
                )}
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                        <div>
                            <h1 className="text-3xl font-bold font-headline">{garage.name}</h1>
                            <div className="flex items-center gap-2 text-muted-foreground mt-1">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span>{garage.address}</span>
                            </div>
                        </div>
                        <div className="shrink-0">
                             <StarRating rating={garage.rating} reviewCount={garage.reviewCount}/>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-bold font-headline">Available Services</h2>
                    <div className="space-y-4">
                        {garageServices.map(service => (
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
                                        <Link href={`/dashboard/book?garageId=${garage.id}&service=${encodeURIComponent(service.name)}`}>
                                            <Wrench className="mr-2 h-4 w-4"/>Book Now
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
                <div className="lg:col-span-1 space-y-6">
                     <h2 className="text-2xl font-bold font-headline">Customer Reviews</h2>
                     <div className="space-y-4">
                        {garageReviews.map(review => (
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
                </div>
            </div>

        </div>
    );
}
