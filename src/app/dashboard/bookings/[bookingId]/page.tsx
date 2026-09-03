'use client';

import { useState } from "react";
import { notFound, useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorState, LoadingPanel } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { ArrowLeft, Calendar, CircleDollarSign, Wrench, Loader2, XCircle } from "lucide-react";
import { format, isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Booking, Car as CarType, WithId } from "@/lib/types";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useFirebase, useDoc, useMemoFirebase, safeUpdateDoc } from "@/firebase";
import { doc, Timestamp } from "firebase/firestore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function BookingDetailsPage() {
    const params = useParams();
    const { bookingId } = params as { bookingId: string };
    const { firestore, user, isUserLoading } = useFirebase();
    const { toast } = useToast();
    const [isCancelling, setIsCancelling] = useState(false);

    const bookingRef = useMemoFirebase(
      () => (bookingId ? doc(firestore, 'bookings', bookingId) : null),
      [firestore, bookingId]
    );
    const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useDoc<WithId<Booking>>(bookingRef);
    
    const carRef = useMemoFirebase(
      () => (user && booking?.carId ? doc(firestore, 'users', user.uid, 'cars', booking.carId) : null),
      [firestore, user, booking?.carId]
    );
    const { data: car, isLoading: isLoadingCar, error: carError } = useDoc<WithId<CarType>>(carRef);
    
    const isLoading = isUserLoading || isLoadingBooking || isLoadingCar;
    const error = bookingError || carError;

    if (isLoading) {
      return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
          <LoadingPanel rows={4} />
        </div>
      )
    }

    if (error) {
        return (
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
                <ErrorState
                    title="Failed to load booking details"
                    description="There was an error fetching the data for this booking. This might be a temporary issue or a problem with permissions."
                />
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
                <ErrorState
                    title="Booking not found"
                    description="The booking you are looking for could not be found. It may have been deleted or the link may be incorrect."
                />
            </div>
        );
    }
    
    // Security check: ensure the booking belongs to the current user.
    // This is a legitimate use case for a 404, as we don't want to leak that the booking exists.
    if (user && booking.userId !== user.uid) {
        notFound();
    }

    const image = car ? (PlaceHolderImages.find((img) => car.make.toLowerCase().includes(img.imageHint.split(' ')[1])) || PlaceHolderImages[1]) : null;

    const getBookingDate = () => {
        if (!booking.bookingDate) return null;
        const date = booking.bookingDate instanceof Timestamp 
            ? booking.bookingDate.toDate() 
            : new Date(booking.bookingDate);
        return isValid(date) ? date : null;
    }

    const bookingDate = getBookingDate();
    const canCancel = booking.status === 'Pending' || booking.status === 'Confirmed';

    async function onCancel() {
        if (!bookingRef) return;
        setIsCancelling(true);
        try {
            await safeUpdateDoc(bookingRef, { status: 'Cancelled', updatedAt: Timestamp.now() });
            toast({ title: 'Booking cancelled' });
        } catch (e) {
            console.error(e);
        } finally {
            setIsCancelling(false);
        }
    }

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 sm:gap-6">
            <div>
                <Button variant="ghost" asChild className="-ml-4">
                    <Link href="/dashboard/bookings">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Bookings
                    </Link>
                </Button>
            </div>

            <PageHeader
                eyebrow="Booking detail"
                icon={<Wrench className="h-3.5 w-3.5" />}
                title="Booking Details"
                description="Review your appointment information."
                action={<StatusBadge status={booking.status} className="h-8 px-3 text-xs" />}
            />

            <Card className="rounded-2xl border bg-card shadow-sm">
                <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                        <div>
                            <CardTitle>{booking.serviceName}</CardTitle>
                            <CardDescription>at {booking.branchName}</CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <StatusBadge status={booking.status} />
                            {canCancel && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm" disabled={isCancelling}>
                                            {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                                            Cancel Booking
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will cancel your {booking.serviceName} appointment at {booking.branchName}. This cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                            <AlertDialogAction onClick={onCancel}>Yes, Cancel</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <p className="section-label">Service</p>
                                <span className="icon-pill h-9 w-9 shrink-0 bg-primary/10 text-primary">
                                    <Wrench className="h-4 w-4" />
                                </span>
                            </div>
                            <p className="mt-3 truncate text-base font-bold tracking-tight">{booking.serviceName}</p>
                        </div>
                        <div className="rounded-2xl border bg-card p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <p className="section-label">Date &amp; Time</p>
                                <span className="icon-pill h-9 w-9 shrink-0 bg-violet-500/10 text-violet-600">
                                    <Calendar className="h-4 w-4" />
                                </span>
                            </div>
                            <p className="mt-3 text-base font-bold tracking-tight">{bookingDate ? format(bookingDate, "PPP, p") : 'Date not available'}</p>
                        </div>
                        {booking.cost ? (
                            <div className="rounded-2xl border bg-card p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <p className="section-label">Total Cost</p>
                                    <span className="icon-pill h-9 w-9 shrink-0 bg-emerald-500/10 text-emerald-600">
                                        <CircleDollarSign className="h-4 w-4" />
                                    </span>
                                </div>
                                <p className="mt-3 text-base font-bold tracking-tight">QAR {booking.cost.toFixed(2)}</p>
                            </div>
                        ) : null}
                    </div>
                    {car && (
                        <div>
                             <h3 className="mb-4 text-lg font-bold">Vehicle Information</h3>
                             <Card className="flex flex-col items-center gap-4 overflow-hidden rounded-2xl border bg-card shadow-sm sm:flex-row">
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
