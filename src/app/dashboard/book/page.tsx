'use client';

import { useState, useMemo, Suspense, Fragment } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, Car, Calendar as CalendarIcon, Clock, Wrench, CheckCircle, Building, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useFirebase, useCollection, useMemoFirebase, safeAddDoc, useDoc } from "@/firebase";
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import type { Car as CarType, Vendor, WithId } from "@/lib/types";

const availableTimeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
];

const bookingSteps = [
    {num: 1, title: "Vehicle", icon: Car},
    {num: 2, title: "Date & Time", icon: CalendarIcon},
    {num: 3, title: "Confirm", icon: Wrench}
];

function BookingWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  
  const { firestore, user } = useFirebase();
  const carsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars, isLoading: isLoadingCars } = useCollection<WithId<CarType>>(carsCollection);

  const garageId = searchParams.get('garageId');
  const serviceName = searchParams.get('service');
  
  const vendorRef = useMemoFirebase(() => garageId ? doc(firestore, 'vendors', garageId) : null, [firestore, garageId]);
  const { data: garage, isLoading: isLoadingGarage } = useDoc<WithId<Vendor>>(vendorRef);
  
  // For now, service details are passed via URL params. In a real app, this might also be fetched.
  const servicePrice = searchParams.get('price');
  const service = useMemo(() => ({ name: serviceName, price: Number(servicePrice) }), [serviceName, servicePrice]);

  const [step, setStep] = useState(1);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  if (isLoadingGarage) {
    return <div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!garage || garage.status !== 'Approved' || !service || !service.name || !service.price) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold">Booking information not found.</h2>
        <p className="text-muted-foreground">The garage or service you selected is not available.</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/garages">Return to Garages</Link>
        </Button>
      </div>
    );
  }

  const handleBookingConfirm = async () => {
    if (!firestore || !user || !selectedCarId || !selectedDate || !selectedTime) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing required information to create a booking.",
      });
      return;
    }

    setIsBooking(true);
    
    // Parse time correctly for ISO string
    const [time, modifier] = selectedTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (modifier === 'PM' && hours !== 12) {
        hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
        hours = 0;
    }

    const bookingDateTime = new Date(selectedDate);
    bookingDateTime.setHours(hours, minutes, 0, 0);

    const newBooking = {
      userId: user.uid,
      vendorId: garage.id,
      vendorName: garage.name,
      carId: selectedCarId,
      serviceName: service.name,
      bookingDate: bookingDateTime.toISOString(),
      status: 'Confirmed' as const,
      cost: service.price,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const bookingsCollectionRef = collection(firestore, 'bookings');
    
    try {
      const docRef = await safeAddDoc(bookingsCollectionRef, newBooking);
      setBookingDetails({ ...newBooking, id: docRef.id });
      toast({
          title: "Booking Confirmed!",
          description: "Your appointment has been successfully scheduled.",
      });
      setStep(4); // Move to success step
    } catch (err) {
       console.error("Booking failed: ", err);
       // The global error handler will catch permission errors, but we can handle others here.
       toast({
          variant: "destructive",
          title: "Booking Failed",
          description: "Could not save your appointment. Please try again.",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const selectedCar = cars?.find(c => c.id === selectedCarId);

  return (
    <div className="max-w-4xl mx-auto">
        {step < 4 && (
             <header className="mb-8">
                <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="-ml-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {step === 1 ? 'Back to Garage' : 'Back'}
                </Button>
                <div className="flex items-center justify-between mt-6 max-w-2xl mx-auto">
                    {bookingSteps.map((s, index) => (
                        <Fragment key={s.num}>
                            <div className="flex flex-col items-center gap-2 w-24">
                                <div className={cn("h-12 w-12 rounded-full flex items-center justify-center border-2 transition-all duration-300", 
                                    step > s.num ? "bg-primary border-primary text-primary-foreground" : 
                                    step === s.num ? "border-primary scale-110" : "border-border bg-card"
                                )}>
                                    <s.icon className={cn("h-6 w-6", step === s.num ? "text-primary" : step > s.num ? "text-primary-foreground" : "text-muted-foreground")} />
                                </div>
                                <p className={cn("text-sm text-center font-medium", step >= s.num ? 'text-primary' : 'text-muted-foreground')}>{s.title}</p>
                            </div>
                            {index < bookingSteps.length - 1 && (
                                <div className={cn("flex-auto border-t-2 transition-colors duration-300", step > s.num ? 'border-primary' : 'border-border')} />
                            )}
                        </Fragment>
                    ))}
                </div>
            </header>
        )}
      
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Your Vehicle</CardTitle>
            <CardDescription>Choose the car you want to book the service for.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted flex items-start gap-4">
                <div className="bg-primary/10 p-3 rounded-full"><Wrench className="h-6 w-6 text-primary" /></div>
                <div>
                    <p className="font-semibold">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{garage.name}</p>
                </div>
            </div>
            <Select onValueChange={setSelectedCarId} value={selectedCarId || undefined} disabled={isLoadingCars}>
              <SelectTrigger className="w-full h-12 text-base">
                <SelectValue placeholder={isLoadingCars ? "Loading cars..." : "Select a car..."} />
              </SelectTrigger>
              <SelectContent>
                {cars?.map(car => (
                  <SelectItem key={car.id} value={car.id}>
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <span>{car.year} {car.make} {car.model}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setStep(2)} disabled={!selectedCarId || isLoadingCars} className="w-full" size="lg">Next: Choose Date & Time</Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Choose Date & Time</CardTitle>
            <CardDescription>Select a convenient day and time for your appointment.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-8 items-start">
            <div className="flex justify-center">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="rounded-md border"
                />
            </div>
            <div className="space-y-4">
                <h3 className="font-semibold">Available Slots for {selectedDate ? format(selectedDate, 'PPP') : 'selected date'}</h3>
                {selectedDate ? (
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {availableTimeSlots.map(time => (
                            <Button key={time} variant={selectedTime === time ? "default" : "outline"} onClick={() => setSelectedTime(time)}>
                                {time}
                            </Button>
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-sm">Please select a date first.</p>
                )}
            </div>
          </CardContent>
           <CardContent>
            <Button onClick={() => setStep(3)} disabled={!selectedDate || !selectedTime} className="w-full" size="lg">Next: Review & Confirm</Button>
           </CardContent>
        </Card>
      )}

      {step === 3 && selectedCar && selectedDate && selectedTime && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Confirm Your Booking</CardTitle>
            <CardDescription>Please review the details below before confirming your appointment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Card className="bg-muted/50">
                <CardContent className="p-6 grid gap-6">
                    <div className="grid gap-1.5">
                        <p className="text-sm text-muted-foreground flex items-center"><Building className="h-4 w-4 mr-2"/>Garage</p>
                        <p className="font-semibold">{garage.name}</p>
                    </div>
                    <div className="grid gap-1.5">
                        <p className="text-sm text-muted-foreground flex items-center"><Wrench className="h-4 w-4 mr-2"/>Service</p>
                        <p className="font-semibold">{service.name}</p>
                    </div>
                    <div className="grid gap-1.5">
                        <p className="text-sm text-muted-foreground flex items-center"><Car className="h-4 w-4 mr-2"/>Vehicle</p>
                        <p className="font-semibold">{selectedCar.year} {selectedCar.make} {selectedCar.model}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-1.5">
                            <p className="text-sm text-muted-foreground flex items-center"><CalendarIcon className="h-4 w-4 mr-2"/>Date</p>
                            <p className="font-semibold">{format(selectedDate, 'PPP')}</p>
                        </div>
                        <div className="grid gap-1.5">
                            <p className="text-sm text-muted-foreground flex items-center"><Clock className="h-4 w-4 mr-2"/>Time</p>
                            <p className="font-semibold">{selectedTime}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="font-semibold">Estimated Cost</span>
                <span className="font-bold text-lg">QAR {service.price.toFixed(2)}</span>
            </div>
            <Button onClick={handleBookingConfirm} disabled={isBooking} className="w-full" size="lg">
                {isBooking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirming...</> : 'Confirm Booking'}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && bookingDetails && selectedCar && (
        <Card className="text-center py-12">
            <CardHeader>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-3xl">Booking Confirmed!</CardTitle>
                <CardDescription>Your appointment has been successfully scheduled. A confirmation has been sent to your email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md mx-auto">
                <Card className="text-left bg-muted/50">
                    <CardContent className="p-4 grid gap-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Garage</span>
                            <span className="font-semibold">{bookingDetails.vendorName}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Service</span>
                            <span className="font-semibold">{bookingDetails.serviceName}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Vehicle</span>
                            <span className="font-semibold">{selectedCar.year} {selectedCar.make} {selectedCar.model}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Date & Time</span>
                            <span className="font-semibold">{format(new Date(bookingDetails.bookingDate), "PPP, p")}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Cost</span>
                            <span className="font-semibold">QAR {bookingDetails.cost.toFixed(2)}</span>
                        </div>
                    </CardContent>
                </Card>
                 <div className="flex flex-col sm:flex-row gap-2 justify-center pt-4">
                    <Button asChild size="lg">
                        <Link href="/dashboard/bookings">View My Bookings</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg">
                        <Link href="/dashboard">Back to Dashboard</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
}


export default function BookPage() {
    return (
        <Suspense fallback={<div className="flex h-64 w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <BookingWizard />
        </Suspense>
    )
}
