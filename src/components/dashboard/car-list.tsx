import { mockCars } from "@/lib/data";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

export function CarList() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {mockCars.map((car) => {
        const image = PlaceHolderImages.find((img) => img.id === car.imageId);
        return (
          <Link href={`/dashboard/my-cars/${car.id}`} key={car.id} className="block h-full">
            <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
              <CardHeader className="p-0">
                {image && (
                  <Image
                    src={image.imageUrl}
                    alt={car.make + " " + car.model}
                    width={300}
                    height={200}
                    className="w-full aspect-video object-cover"
                    data-ai-hint={image.imageHint}
                  />
                )}
              </CardHeader>
              <CardContent className="p-4">
                <CardTitle className="text-lg font-headline">{car.year} {car.make} {car.model}</CardTitle>
                <p className="text-sm text-muted-foreground">{car.vin}</p>
                <p className="text-sm mt-2"><strong>Mileage:</strong> {car.mileage.toLocaleString()} km</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
