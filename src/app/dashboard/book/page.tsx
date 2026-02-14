'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { mockGarages, mockCars, mockBookings } from '@/lib/data';
import { mockVendorServices } from '@/lib/vendor-data';
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
import { ArrowLeft, Car, Calendar as CalendarIcon, Clock, Wrench, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const availableTimeSlots = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
];

function BookingWizard() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const garageId = searchParams.get('garageId');
  const serviceName = searchParams.get('service');

  const garage = useMemo(() => mockGarages.find(g => g.id === garageId), [garageId]);
  const service = useMemo(() => mockVendorServices.find(s => s.name === serviceName), [serviceName]);

  const [step, setStep] = useState(1);
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);

  if (!garage || !service) {
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

  const handleBookingConfirm = () => {
    setIsBooking(true);
    // In a real app, you would save this to the database.
    // Here we just simulate it.
    const newBooking = {
      id: `booking-${mockBookings.length + 1}`,
      carId: selectedCarId!,
      garageName: garage.name,
      serviceType: service.name,
      date: new Date(`${format(selectedDate!, 'yyyy-MM-dd')}T${selectedTime!.split(' ')[0]}:00`).toISOString(),
      status: 'Confirmed' as const,
      cost: service.price,
    };
    
    console.log("Creating new booking:", newBooking);

    setTimeout(() => {
        // mockBookings.push(newBooking); // This won't work with mock data persistence.
        setIsBooking(false);
        toast({
            title: "Booking Confirmed!",
            description: "Your appointment has been successfully scheduled.",
        });
        setStep(4); // Move to success step
    }, 1500);

  };

  const selectedCar = mockCars.find(c => c.id === selectedCarId);

  return (
    <div className="max-w-4xl mx-auto">
        {step < 4 && (
             <header className="mb-8">
                <Button variant="ghost" onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="-ml-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                <div className="flex items-center gap-4 mt-4">
                    {[
                        {num: 1, title: "Vehicle"},
                        {num: 2, title: "Date & Time"},
                        {num: 3, title: "Confirm"}
                    ].map(s => (
                        <div key={s.num} className="flex-1 text-center">
                            <div className={cn("py-2 border-b-4", step >= s.num ? 'border-primary' : 'border-border')}>
                                <span className="hidden sm:inline">Step {s.num}: </span>{s.title}
                            </div>
                        </div>
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
            <Select onValueChange={setSelectedCarId} value={selectedCarId || undefined}>
              <SelectTrigger className="w-full h-12 text-base">
                <SelectValue placeholder="Select a car..." />
              </SelectTrigger>
              <SelectContent>
                {mockCars.map(car => (
                  <SelectItem key={car.id} value={car.id}>
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <span>{car.year} {car.make} {car.model}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setStep(2)} disabled={!selectedCarId} className="w-full" size="lg">Next: Choose Date & Time</Button>
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
                    disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                    initialFocus
                    className="rounded-md border"
                />
            </div>
            <div className="space-y-4">
                <h3 className="font-semibold">Available Slots for {selectedDate ? format(selectedDate, 'PPP') : 'selected date'}</h3>
                {selectedDate ? (
                     <div className="grid grid-cols-2 gap-2">
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
            <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center gap-3"><Wrench className="h-5 w-5 text-primary"/> <span className="font-semibold">{service.name} at {garage.name}</span></div>
                <div className="flex items-center gap-3"><Car className="h-5 w-5 text-primary"/> <span>{selectedCar.year} {selectedCar.make} {selectedCar.model}</span></div>
                <div className="flex items-center gap-3"><CalendarIcon className="h-5 w-5 text-primary"/> <span>{format(selectedDate, 'PPP')}</span></div>
                <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-primary"/> <span>{selectedTime}</span></div>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="font-semibold">Estimated Cost</span>
                <span className="font-bold text-lg">QAR {service.price.toFixed(2)}</span>
            </div>
            <Button onClick={handleBookingConfirm} disabled={isBooking} className="w-full" size="lg">
                {isBooking ? 'Confirming...' : 'Confirm Booking'}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card className="text-center py-12">
            <CardHeader>
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <CardTitle className="text-3xl">Booking Confirmed!</CardTitle>
                <CardDescription>Your appointment has been successfully scheduled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p>A confirmation has been sent to your email.</p>
                 <div className="flex flex-col sm:flex-row gap-2 justify-center">
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
        <Suspense fallback={<div>Loading...</div>}>
            <BookingWizard />
        </Suspense>
    )
}
