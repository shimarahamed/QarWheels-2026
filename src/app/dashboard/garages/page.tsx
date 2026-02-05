import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { mockGarages } from '@/lib/data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Search, Star, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

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

export default function GaragesPage() {
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
            <Input placeholder="Search by name, service, or location..." className="pl-10 text-base py-6" />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockGarages.map((garage) => {
                const image = PlaceHolderImages.find((img) => img.id === garage.imageId);
                return (
                    <Card key={garage.id} className="flex flex-col">
                        {image && (
                            <Image
                                src={image.imageUrl}
                                alt={garage.name}
                                width={400}
                                height={225}
                                className="w-full aspect-video object-cover rounded-t-lg"
                                data-ai-hint={image.imageHint}
                            />
                        )}
                        <CardHeader>
                            <CardTitle>{garage.name}</CardTitle>
                            <div className="flex items-center gap-2">
                                <StarRating rating={garage.rating} />
                                <span className="text-sm text-muted-foreground">({garage.reviewCount} reviews)</span>
                            </div>
                            <CardDescription className="flex items-start gap-2 pt-2">
                                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                                <span>{garage.address}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <h4 className="font-semibold mb-2 text-sm">Services include:</h4>
                             <div className="flex flex-wrap gap-2">
                                {garage.services.slice(0, 3).map(service => (
                                    <Badge key={service} variant="secondary">{service}</Badge>
                                ))}
                                {garage.services.length > 3 && <Badge variant="outline">+{garage.services.length - 3} more</Badge>}
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href="#">View Profile & Book</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                );
            })}
        </div>
    </div>
  );
}
