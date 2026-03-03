'use client';
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Car } from "@/lib/types";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Car as CarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

function CarCardSkeleton() {
  return (
    <Card className="overflow-hidden h-full">
      <Skeleton className="w-full aspect-video" />
      <CardContent className="p-4 space-y-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  )
}

export function CarList() {
  const { firestore, user } = useFirebase();

  const carsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars, isLoading } = useCollection<Car>(carsCollection);
  
  if (isLoading) {
    return (
       <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
         {[...Array(3)].map((_, i) => <CarCardSkeleton key={i} />)}
       </div>
    )
  }

  if (!cars || cars.length === 0) {
    return (
        <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="text-center text-muted-foreground py-16">
                <CarIcon className="mx-auto h-12 w-12 mb-4 text-primary/50" />
                <h3 className="text-lg font-semibold">No Cars Added</h3>
                <p>You haven't added any cars to your profile yet.</p>
                 <Button asChild className="mt-4">
                  <Link href="/dashboard/my-cars/add">Add Your First Car</Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => {
        // Find a placeholder image, maybe based on make or just cycle through them
        const image = PlaceHolderImages.find((img) => car.make.toLowerCase().includes(img.imageHint.split(' ')[1])) || PlaceHolderImages[1];
        return (
          <Link href={`/dashboard/my-cars/${car.id}`} key={car.id} className="block h-full group">
            <Card className="overflow-hidden h-full border transition-shadow duration-300 hover:shadow-lg hover:border-primary">
              <CardHeader className="p-0">
                {image && (
                  <div className="overflow-hidden">
                    <Image
                      src={car.imageUrl || image.imageUrl}
                      alt={car.make + " " + car.model}
                      width={300}
                      height={200}
                      className="w-full aspect-video object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={image.imageHint}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg">{car.year} {car.make} {car.model}</CardTitle>
                <p className="text-sm text-muted-foreground font-mono">{car.vin}</p>
                <p className="text-sm mt-2"><strong>Mileage:</strong> {car.currentMileage.toLocaleString()} km</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
