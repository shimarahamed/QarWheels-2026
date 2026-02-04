"use client";

import { useState, useEffect } from "react";
import { summarizeServiceHistory } from "@/lib/actions";
import type { SummarizeServiceHistoryOutput } from "@/ai/flows/summarize-service-history";
import { Loader2, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Car } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ServiceHistorySummary({ car }: { car: Car }) {
  const [summary, setSummary] = useState<SummarizeServiceHistoryOutput | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSummary() {
      setIsLoading(true);
      setSummary(null);
      try {
        const result = await summarizeServiceHistory({
          vin: car.vin,
          // A default service history for now
          serviceHistory: `[{"date": "2023-01-15", "service": "Oil Change", "description": "Standard 5W-30 synthetic oil for ${car.make} ${car.model}."},\n{"date": "2023-07-20", "service": "Brake Pad Replacement", "description": "Replaced front brake pads."}]`,
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

    fetchSummary();
  }, [car, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Service History Analysis</CardTitle>
        <CardDescription>
          An AI-generated summary of the vehicle's maintenance records.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p>Analyzing service history...</p>
          </div>
        )}
        {!isLoading && !summary && (
          <p className="text-muted-foreground">Could not load summary.</p>
        )}
        {summary && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Summary:</h4>
              <p className="text-sm">{summary.summary}</p>
            </div>
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Potential Issues Identified</AlertTitle>
              <AlertDescription>{summary.potentialIssues}</AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
