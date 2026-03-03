"use client";

import { useState, useEffect } from "react";
import { summarizeServiceHistory as summarize } from "@/lib/actions";
import type { SummarizeServiceHistoryOutput } from "@/ai/flows/summarize-service-history";
import { Loader2, Sparkles, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Car, ServiceRecord, WithId } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCollection, useFirebase, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";

export function ServiceHistorySummary({ car, serviceHistory: initialServiceHistory }: { car: WithId<Car>, serviceHistory?: WithId<ServiceRecord>[] }) {
  const { firestore, user } = useFirebase();
  const [summary, setSummary] = useState<SummarizeServiceHistoryOutput | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const serviceHistoryRef = useMemoFirebase(() => 
    (user && !initialServiceHistory) ? collection(firestore, `users/${user.uid}/cars/${car.id}/serviceRecords`) : null,
    [firestore, user, car.id, initialServiceHistory]
  );
  const { data: fetchedServiceHistory, isLoading: isLoadingHistory } = useCollection<WithId<ServiceRecord>>(serviceHistoryRef);

  const serviceHistory = initialServiceHistory || fetchedServiceHistory;

  useEffect(() => {
    async function fetchSummary() {
      if (!serviceHistory || serviceHistory.length === 0) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setSummary(null);
      try {
        const result = await summarize({
          vin: car.vin,
          serviceHistory: JSON.stringify(serviceHistory),
          make: car.make,
          model: car.model,
          year: car.year,
        });
        setSummary(result);
      } catch (error) {
        console.error("Failed to get summary:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to get service history summary. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    if (!isLoadingHistory) {
      fetchSummary();
    }

  }, [car, toast, serviceHistory, isLoadingHistory]);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-primary"/>
            <span>AI Service Analysis</span>
        </CardTitle>
        <CardDescription>
          An AI-generated summary of maintenance records.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {(isLoading || isLoadingHistory) && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="font-semibold">Analyzing service history...</p>
          </div>
        )}
        {!(isLoading || isLoadingHistory) && (!serviceHistory || serviceHistory.length === 0) && (
            <div className="text-center text-muted-foreground py-8 px-4 rounded-lg bg-muted/50">
                <Terminal className="mx-auto h-12 w-12 mb-4 text-primary/50" />
                <h3 className="font-semibold text-lg">No History to Analyze</h3>
                <p>Add service records to enable AI analysis.</p>
            </div>
        )}
         {!(isLoading || isLoadingHistory) && !summary && serviceHistory && serviceHistory.length > 0 && (
          <p className="text-muted-foreground">Could not load summary.</p>
        )}
        {summary && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Summary:</h4>
              <p className="text-sm text-muted-foreground">{summary.summary}</p>
            </div>
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Potential Issues Identified</AlertTitle>
              <AlertDescription>{summary.potentialIssues}</AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
        {summary && (
        <CardFooter>
            <p className="text-xs text-muted-foreground">
                AI analysis may not be fully accurate.
            </p>
        </CardFooter>
        )}
    </Card>
  );
}

  