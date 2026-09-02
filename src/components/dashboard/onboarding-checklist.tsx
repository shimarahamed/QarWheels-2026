'use client';

import Link from 'next/link';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type OnboardingItem = {
  label: string;
  href: string;
  done?: boolean;
};

export function OnboardingChecklist({ title, items }: { title: string; items: OnboardingItem[] }) {
  const completed = items.filter((item) => item.done).length;
  const next = items.find((item) => !item.done) || items[0];

  return (
    <Card className="overflow-hidden border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <span className="text-sm font-semibold text-muted-foreground">{completed}/{items.length}</span>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-xl border bg-background/70 p-3 text-sm transition-colors hover:border-primary/40">
            {item.done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
            <span className={item.done ? 'text-muted-foreground line-through' : 'font-medium'}>{item.label}</span>
          </Link>
        ))}
        {next && (
          <Button asChild className="w-full justify-start">
            <Link href={next.href}>{next.done ? 'Review setup' : `Continue: ${next.label}`}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
