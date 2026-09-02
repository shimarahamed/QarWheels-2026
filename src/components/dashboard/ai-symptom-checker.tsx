'use client';

import { useState } from 'react';
import {
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Wrench,
  Info,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Car, DiagnoseResult } from '@/lib/types';

interface Props {
  car: Car;
}

type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';

const URGENCY_STYLES: Record<UrgencyLevel, string> = {
  Low: 'bg-blue-100 text-blue-800 border-blue-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  High: 'bg-orange-100 text-orange-800 border-orange-200',
  Critical: 'bg-red-100 text-red-800 border-red-200',
};

export function AISymptomChecker({ car }: Props) {
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiagnose = async () => {
    const trimmed = symptoms.trim();
    if (!trimmed || trimmed.length < 10) {
      setError('Please describe the problem in at least 10 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: trimmed,
          carDetails: {
            make: car.make,
            model: car.model,
            year: car.year,
            mileage: car.currentMileage,
          },
        }),
      });

      if (response.status === 429) {
        setError('You have reached the hourly limit for AI diagnoses. Please try again later.');
        return;
      }
      if (response.status === 401) {
        setError('Please sign in to use the AI Symptom Checker.');
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError((body as { error?: string }).error ?? 'Diagnosis failed. Please try again.');
        return;
      }

      const body = await response.json() as { data: DiagnoseResult };
      setResult(body.data);
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSymptoms('');
    setError(null);
  };

  const urgency = result?.urgency as UrgencyLevel | undefined;

  return (
    <Card className="glass-card overflow-hidden border-primary/20">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary rounded-lg text-primary-foreground">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-lg">AI Symptom Checker</CardTitle>
            <CardDescription className="text-xs">
              Describe what&apos;s wrong, and let AI analyze it.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!result ? (
          <div className="space-y-4">
            <Textarea
              placeholder="Example: My car makes a high-pitched squealing sound when I brake, especially at low speeds…"
              className="min-h-[100px] bg-background/50 border-border/50 focus:border-primary/50"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              maxLength={1000}
              disabled={isLoading}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3" />
                Min 10 characters
              </span>
              <span>{symptoms.length}/1000</span>
            </div>
            <Button
              className="w-full rounded-xl"
              onClick={handleDiagnose}
              disabled={isLoading || symptoms.trim().length < 10}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Analyze Symptoms
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              {urgency && (
                <Badge className={URGENCY_STYLES[urgency]}>
                  {urgency} Urgency
                </Badge>
              )}
              {typeof result.confidence === 'number' && (
                <span className="text-xs text-muted-foreground">
                  Confidence: {Math.round(result.confidence * 100)}%
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-8"
                onClick={handleReset}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Start Over
              </Button>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                AI Diagnosis
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {result.diagnosis}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Potential Causes
                </h4>
                <ul className="space-y-1">
                  {result.potentialCauses.map((cause, i) => (
                    <li key={i} className="text-xs flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-primary shrink-0" />
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Recommended
                </h4>
                <ul className="space-y-1">
                  {result.recommendedServices.map((service, i) => (
                    <li key={i} className="text-xs flex items-center gap-2 text-primary font-medium">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      {service}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground border-t pt-3">
              {result.disclaimer}
            </p>

            <Button asChild className="w-full rounded-xl bg-primary shadow-lg shadow-primary/20">
              <a href="/dashboard/garages">
                <Wrench className="mr-2 h-4 w-4" />
                Book Recommended Service
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
