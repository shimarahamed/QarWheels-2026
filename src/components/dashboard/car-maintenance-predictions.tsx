"use client";

import { useState, useEffect } from "react";
import { getMaintenancePredictions } from "@/lib/actions";
import type { PredictiveMaintenanceOutput } from "@/ai/flows/predictive-maintenance-suggestions";
import { Loader2, Sparkles, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Car } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function CarMaintenancePredictions({ car }: { car: Car }) {
  const [prediction, setPrediction] =
    useState<PredictiveMaintenanceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchPredictions() {
      setIsLoading(true);
      setPrediction(null);
      try {
        // Add a small delay to simulate network latency for skeleton loader
        await new Promise(resolve => setTimeout(resolve, 1500));
        const result = await getMaintenancePredictions({
          vin: car.vin,
          mileage: car.mileage,
          serviceHistory: JSON.stringify(car.serviceHistory),
          qatarClimate: `Hot and arid desert climate. Summer (May-Sep) temperatures average 42°C, can exceed 50°C. High humidity along the coast. Winter (Dec-Feb) is milder, around 23°C. Sand and dust storms are common.`,
        });
        setPrediction(result);
      } catch (error) {
        console.error("Failed to get predictions:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            "Failed to get maintenance predictions. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPredictions();
  }, [car, toast]);

  return (
    <Card className="min-h-[300px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-primary" />
          <span>AI Maintenance Forecast</span>
        </CardTitle>
        <CardDescription>
            AI-powered predictions for upcoming service needs.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex items-center justify-center">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 text-muted-foreground text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-semibold mt-2">Our AI is analyzing your data...</p>
            <p className="text-xs">This might take a moment.</p>
          </div>
        )}
        {!isLoading && !prediction && (
          <div className="text-center text-muted-foreground p-8">
            <Wrench className="mx-auto h-12 w-12 mb-4 text-primary/50" />
             <h3 className="font-semibold text-lg">Unable to Forecast</h3>
            <p>Could not load AI-powered predictions at this time.</p>
          </div>
        )}
        {prediction && (
          <div className="w-full space-y-4">
            <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Predicted Needs</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">
                    {prediction.predictedMaintenanceNeeds}
                </AlertDescription>
            </Alert>
             <Alert variant="secondary">
                <AlertTitle>Confidence Level</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">
                    {prediction.confidenceLevel}
                </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      {prediction && (
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            This is an AI-generated prediction. Always consult with a qualified
            technician.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}
