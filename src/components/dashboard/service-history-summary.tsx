"use client";

import { useState, useEffect } from "react";
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
import { EmptyState } from "@/components/ui/empty-state";

export function ServiceHistorySummary({ car, serviceHistory }: { car: WithId<Car>, serviceHistory: WithId<ServiceRecord>[] | null }) {
  const [summary, setSummary] = useState<SummarizeServiceHistoryOutput | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSummary() {
      if (!serviceHistory || serviceHistory.length === 0) {
        setIsLoading(false);
        setSummary(null);
        return;
      }
      setIsLoading(true);
      setSummary(null);
      try {
        const response = await fetch('/api/ai/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vin: car.vin,
            serviceHistory: JSON.stringify(serviceHistory),
            make: car.make,
            model: car.model,
            year: car.year,
          }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? 'Service summary failed');
        }

        const body = await response.json() as { data: SummarizeServiceHistoryOutput };
        setSummary(body.data);
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

  }, [car, toast, serviceHistory]);

  return (
    <Card className="flex flex-col rounded-2xl border bg-card shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <span className="icon-pill h-8 w-8 bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>AI Service Analysis</span>
        </CardTitle>
        <CardDescription>
          An AI-generated summary of maintenance records.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {isLoading && (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p className="font-semibold">Analyzing service history...</p>
          </div>
        )}
        {!isLoading && (!serviceHistory || serviceHistory.length === 0) && (
            <EmptyState
                icon={<Terminal className="h-8 w-8" />}
                title="No History to Analyze"
                description="Add service records to enable AI analysis."
            />
        )}
         {!isLoading && !summary && serviceHistory && serviceHistory.length > 0 && (
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
