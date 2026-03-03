"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getMaintenancePredictions } from "@/lib/actions";
import type { PredictiveMaintenanceOutput } from "@/ai/flows/predictive-maintenance-suggestions";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Car, WithId } from "@/lib/types";

const formSchema = z.object({
  vin: z.string().min(1, "Please select a car."),
  mileage: z.coerce.number().min(1, "Mileage is required."),
  serviceHistory: z.string(),
  qatarClimate: z.string().min(1, "Climate information is required."),
});

export function MaintenancePredictions() {
  const [prediction, setPrediction] = useState<PredictiveMaintenanceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { firestore, user } = useFirebase();

  const carsCollection = useMemoFirebase(
    () => (user ? collection(firestore, 'users', user.uid, 'cars') : null),
    [firestore, user]
  );
  const { data: cars, isLoading: isLoadingCars } = useCollection<WithId<Car>>(carsCollection);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vin: "",
      mileage: 0,
      serviceHistory: "[]",
      qatarClimate: `Hot and arid desert climate. Summer (May-Sep) temperatures average 42°C, can exceed 50°C. High humidity along the coast. Winter (Dec-Feb) is milder, around 23°C. Sand and dust storms are common.`,
    },
  });

  useEffect(() => {
    if (cars && cars.length > 0 && !form.getValues('vin')) {
      const firstCar = cars[0];
      form.reset({
        vin: firstCar.vin,
        mileage: firstCar.currentMileage,
        serviceHistory: JSON.stringify(firstCar.serviceHistory, null, 2),
        qatarClimate: form.getValues('qatarClimate'),
      });
    }
  }, [cars, form]);

  const selectedVin = form.watch("vin");

  useEffect(() => {
    if (selectedVin && cars) {
        const selectedCar = cars.find(car => car.vin === selectedVin);
        if (selectedCar) {
            form.setValue("mileage", selectedCar.currentMileage);
            form.setValue("serviceHistory", JSON.stringify(selectedCar.serviceHistory, null, 2));
        }
    }
  }, [selectedVin, form, cars]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setPrediction(null);
    try {
      const result = await getMaintenancePredictions(values);
      setPrediction(result);
    } catch (error) {
      console.error("Failed to get predictions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to get maintenance predictions. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Get Predictions</CardTitle>
          <CardDescription>
            Fill in your car's details to get AI-powered maintenance suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Car (VIN)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCars}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingCars ? "Loading cars..." : "Select a car"} />
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
                      <Textarea placeholder="Enter service history..." {...field} rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="qatarClimate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Climate Info</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter climate info..." {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading || isLoadingCars || !cars || cars.length === 0} className="w-full">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Predict Now
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="min-h-[300px] flex items-center justify-center">
        {isLoading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Our AI is analyzing your data...</p>
                <p className="text-xs">This might take a moment.</p>
            </div>
        )}
        {!isLoading && !prediction && (
            <div className="text-center text-muted-foreground p-8">
                <Sparkles className="mx-auto h-12 w-12 mb-4" />
                <p>Your AI-powered predictions will appear here.</p>
            </div>
        )}
        {prediction && (
            <div className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="text-accent" />
                        <span>Maintenance Forecast</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <h4 className="font-semibold mb-2">Predicted Needs:</h4>
                        <p className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">{prediction.predictedMaintenanceNeeds}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Confidence Level:</h4>
                        <p className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">{prediction.confidenceLevel}</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">This is an AI-generated prediction. Always consult with a qualified technician.</p>
                </CardFooter>
            </div>
        )}
      </Card>
    </div>
  );
}
