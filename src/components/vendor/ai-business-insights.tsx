'use client';

import { useState, useCallback } from 'react';
import {
  LineChart,
  TrendingUp,
  MessageSquare,
  Lightbulb,
  Loader2,
  Sparkles,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Booking, Vendor, BusinessInsightsResult, WithId } from '@/lib/types';

interface Props {
  vendor: Vendor;
  bookings: WithId<Booking>[];
}

export function AIBusinessInsights({ vendor, bookings }: Props) {
  const [insights, setInsights] = useState<BusinessInsightsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!bookings.length) {
      setError('Add some bookings first to generate business insights.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: vendor.name,
          bookings: bookings.slice(-20).map((b) => ({
            serviceName: b.serviceName,
            cost: b.cost ?? 0,
            status: b.status,
            date: b.bookingDate.toString(),
          })),
          reviews: [],
        }),
      });

      if (response.status === 429) {
        setError('Daily AI insights limit reached. Try again tomorrow.');
        return;
      }
      if (response.status === 401) {
        setError('Authentication required. Please refresh and sign in again.');
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to generate insights');
      }

      const body = await response.json() as { data: BusinessInsightsResult };
      setInsights(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setIsLoading(false);
    }
  }, [vendor.name, bookings]);

  if (isLoading) {
    return (
      <Card className="glass-card border-primary/20">
        <CardContent className="h-[300px] flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Consulting AI Business Advisor…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="glass-card border-primary/20">
        <CardContent className="h-[300px] flex flex-col items-center justify-center space-y-4 text-center p-6">
          <Sparkles className="w-10 h-10 text-primary/20" />
          <h3 className="font-bold">Intelligence Not Yet Generated</h3>
          <p className="text-sm text-muted-foreground">
            Unlock business forecasts, trending service alerts, and growth tips.
          </p>
          {error && (
            <Alert variant="destructive" className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={fetchInsights} className="rounded-xl" disabled={isLoading}>
            Generate Insights
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-primary/20 overflow-hidden">
      <CardHeader className="bg-primary/5 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg text-primary-foreground">
              <Sparkles className="w-4 h-4" />
            </div>
            <CardTitle className="text-lg">AI Business Intelligence</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={fetchInsights}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <LineChart className="w-4 h-4" />
            <h4 className="text-sm font-bold uppercase tracking-wider">30-Day Forecast</h4>
          </div>
          <p className="text-sm leading-relaxed">{insights.forecast}</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-orange-500">
              <TrendingUp className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Trending</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {insights.trendingServices.map((s, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-orange-500/10 text-orange-600 px-2 py-1 rounded-full font-bold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-500">
              <MessageSquare className="w-4 h-4" />
              <h4 className="text-xs font-bold uppercase tracking-wider">Sentiment</h4>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {insights.customerSentiment}
            </p>
          </div>
        </div>

        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Lightbulb className="w-4 h-4" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Growth Opportunity</h4>
          </div>
          <p className="text-sm font-medium italic">&quot;{insights.optimizationTip}&quot;</p>
          <div className="mt-3 flex justify-end">
            <Button variant="link" className="text-xs h-auto p-0 gap-1 text-primary" asChild>
              <a href="/vendor/dashboard/analytics">
                View Analytics <ArrowUpRight className="w-3 h-3" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
