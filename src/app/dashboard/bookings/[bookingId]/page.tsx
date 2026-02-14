'use client';

import { mockBookings, mockCars } from "@/lib/data";
import { notFound, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Calendar, Car, CircleDollarSign, Wrench } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Booking } from "@/lib/types";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useState, useEffect } from "react";


export default function BookingDetailsPage() {
    const params = useParams();
    const { bookingId } = params;
    const [formattedDate, setFormattedDate] = useState<string | null>(null);

    const booking = mockBookings.find((b) => b.id === bookingId);

    useEffect(() => {
        if (booking) {
            setFormattedDate(format(new Date(booking.date), "PPP, p"));
        }
    }, [booking]);

    if (!booking) {
        notFound();
    }

    const car = mockCars.find((c) => c.id === booking.carId);
    const image = car ? PlaceHolderImages.find((img) => img.id === car.imageId) : null;

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
                            <CardTitle>{booking.serviceType}</CardTitle>
                            <CardDescription>at {booking.garageName}</CardDescription>
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
                                <p className="font-semibold">{booking.serviceType}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-muted-foreground">Date & Time</p>
                                <p className="font-semibold">{formattedDate || 'Loading date...'}</p>
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
                                        src={image.imageUrl}
                                        alt={`${car.make} ${car.model}`}
                                        width={200}
                                        height={120}
                                        className="w-full sm:w-48 aspect-video object-cover"
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
