"use client";

import { useState, useEffect } from "react";
import { getMaintenancePredictions } from "@/lib/actions";
import type { PredictiveMaintenanceOutput } from "@/ai/flows/predictive-maintenance-suggestions";
import { Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Car } from "@/lib/types";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <Card className="min-h-[300px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-primary" />
          <span>AI Maintenance Forecast</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
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
            <p>Could not load AI-powered predictions.</p>
          </div>
        )}
        {prediction && (
          <div className="w-full space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Predicted Needs:</h4>
              <p className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                {prediction.predictedMaintenanceNeeds}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Confidence Level:</h4>
              <p className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                {prediction.confidenceLevel}
              </p>
            </div>
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
