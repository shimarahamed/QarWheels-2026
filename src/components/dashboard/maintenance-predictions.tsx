'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Car, MaintenancePredictionResult, WithId } from '@/lib/types';

const formSchema = z.object({
  vin: z.string().min(1, 'Please select a car.'),
  mileage: z.coerce.number().int().min(1, 'Mileage is required.'),
  serviceHistory: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function MaintenancePredictions() {
  const [prediction, setPrediction] = useState<MaintenancePredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const carsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars, isLoading: isLoadingCars } = useCollection<WithId<Car>>(carsCollection);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vin: '',
      mileage: 0,
      serviceHistory: '[]',
    },
  });

  // Auto-fill from the first car
  useEffect(() => {
    if (cars && cars.length > 0 && !form.getValues('vin')) {
      const first = cars[0];
      form.reset({
        vin: first.vin,
        mileage: first.currentMileage,
        serviceHistory: '[]',
      });
    }
  }, [cars, form]);

  // Update mileage when car selection changes
  const selectedVin = form.watch('vin');
  useEffect(() => {
    if (selectedVin && cars) {
      const car = cars.find((c) => c.vin === selectedVin);
      if (car) form.setValue('mileage', car.currentMileage);
    }
  }, [selectedVin, cars, form]);

  async function onSubmit(values: FormValues) {
    setIsLoading(true);
    setApiError(null);
    setPrediction(null);

    try {
      const response = await fetch('/api/ai/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.status === 429) {
        setApiError('You have reached the daily limit for maintenance predictions. Try again tomorrow.');
        return;
      }
      if (response.status === 401) {
        setApiError('Please sign in to use maintenance predictions.');
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Request failed');
      }

      const body = await response.json() as { data: MaintenancePredictionResult };
      setPrediction(body.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get predictions';
      setApiError(message);
      toast({ variant: 'destructive', title: 'Error', description: message });
    } finally {
      setIsLoading(false);
    }
  }

  const noCars = !isLoadingCars && (!cars || cars.length === 0);

  return (
    <div className="grid items-start gap-5 sm:gap-6 md:grid-cols-2">
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Get Predictions</CardTitle>
          <CardDescription>
            Fill in your car&apos;s details to get AI-powered maintenance suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {noCars && (
            <Alert className="mb-4">
              <AlertDescription>
                Add a car to your garage before running maintenance predictions.
              </AlertDescription>
            </Alert>
          )}
          {apiError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{apiError}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car (VIN)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isLoadingCars || noCars}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={isLoadingCars ? 'Loading cars…' : 'Select a car'}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cars?.map((car) => (
                          <SelectItem key={car.id} value={car.vin}>
                            {car.year} {car.make} {car.model}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Mileage (km)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 75000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="serviceHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service History (JSON)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter service history…" {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isLoading || noCars}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Predicting…' : 'Predict Now'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="flex min-h-[300px] items-center justify-center rounded-2xl border bg-card shadow-sm">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Analyzing your vehicle data…</p>
            <p className="text-xs">This may take 10–20 seconds.</p>
          </div>
        )}
        {!isLoading && !prediction && (
          <div className="w-full p-4">
            <EmptyState
              icon={<Sparkles className="h-8 w-8" />}
              title="No predictions yet"
              description="Your AI-powered predictions will appear here once you run a forecast."
            />
          </div>
        )}
        {prediction && (
          <div className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="text-accent" />
                Maintenance Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Predicted Needs</h4>
                <p className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                  {prediction.predictedMaintenanceNeeds}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Confidence Level</h4>
                <p className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                  {prediction.confidenceLevel}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">
                AI-generated prediction — always consult a qualified technician.
              </p>
            </CardFooter>
          </div>
        )}
      </Card>
    </div>
  );
}
