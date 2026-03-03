'use client';

import { notFound, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Calendar, Car, CircleDollarSign, Wrench, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Booking, Car as CarType } from "@/lib/types";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useFirebase, useDoc, useMemoFirebase } from "@/firebase";
import { doc, Timestamp } from "firebase/firestore";

export default function BookingDetailsPage() {
    const params = useParams();
    const { bookingId } = params as { bookingId: string };
    const { firestore, user } = useFirebase();

    const bookingRef = useMemoFirebase(
      () => (bookingId ? doc(firestore, 'bookings', bookingId) : null),
      [firestore, bookingId]
    );
    const { data: booking, isLoading: isLoadingBooking } = useDoc<Booking>(bookingRef);
    
    // We need to fetch the car associated with this booking
    const carRef = useMemoFirebase(
      () => (user && booking?.carId ? doc(firestore, 'users', user.uid, 'cars', booking.carId) : null),
      [firestore, user, booking?.carId]
    );
    const { data: car, isLoading: isLoadingCar } = useDoc<CarType>(carRef);
    
    if (isLoadingBooking || isLoadingCar) {
      return (
        <div className="flex h-64 w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
    }

    if (!booking) {
        notFound();
    }
    
    // Security check: ensure the booking belongs to the current user
    if (user && booking.userId !== user.uid) {
        notFound();
    }

    const image = car ? (PlaceHolderImages.find((img) => car.make.toLowerCase().includes(img.imageHint.split(' ')[1])) || PlaceHolderImages[1]) : null;

    const bookingDate = booking.bookingDate instanceof Timestamp 
        ? booking.bookingDate.toDate() 
        : new Date(booking.bookingDate);

    const getStatusVariant = (status: Booking["status"]) => {
        switch (status) {
        case "Confirmed":
            return "default";
        case "Completed":
            return "secondary";
        case "Cancelled":
            return "destructive";
        default:
            return "outline";
        }
    };

    return (
        <div className="space-y-6">
            <Button variant="ghost" asChild className="-ml-4">
                <Link href="/dashboard/bookings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Bookings
                </Link>
            </Button>

            <header>
                <h1 className="text-3xl font-bold font-headline tracking-tight">
                    Booking Details
                </h1>
                <p className="text-muted-foreground">Review your appointment information.</p>
            </header>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{booking.serviceName}</CardTitle>
                            <CardDescription>at {booking.vendorName}</CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(booking.status)}>
                            {booking.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                        <div className="flex items-center gap-3">
                             <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg">
                                <Wrench className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-muted-foreground">Service</p>
                                <p className="font-semibold">{booking.serviceName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-muted-foreground">Date & Time</p>
                                <p className="font-semibold">{format(bookingDate, "PPP, p")}</p>
                            </div>
                        </div>
                         {booking.cost && (
                             <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg">
                                    <CircleDollarSign className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Total Cost</p>
                                    <p className="font-semibold">QAR {booking.cost.toFixed(2)}</p>
                                </div>
                            </div>
                         )}
                    </div>
                    {car && (
                        <div>
                             <h3 className="font-bold font-headline text-lg mb-4">Vehicle Information</h3>
                             <Card className="overflow-hidden flex flex-col sm:flex-row items-center gap-4">
                                {image && (
                                    <Image 
                                        src={car.imageUrl || image.imageUrl}
                                        alt={`${car.make} ${car.model}`}
                                        width={200}
                                        height={120}
                                        className="w-full sm:w-48 aspect-video object-cover"
                                        data-ai-hint={image.imageHint}
                                    />
                                )}
                                <div className="p-4">
                                    <h4 className="font-semibold">{car.year} {car.make} {car.model}</h4>
                                    <p className="text-sm text-muted-foreground font-mono">{car.vin}</p>
                                </div>
                             </Card>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    