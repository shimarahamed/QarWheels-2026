'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Car, Cpu, Wrench } from 'lucide-react';
import { Logo } from './logo';

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 z-50 bg-background/95 backdrop-blur-sm">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <Logo />
        </Link>
        <nav className="ml-auto flex gap-2 sm:gap-4">
          <Button asChild variant="ghost">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Sign Up</Link>
          </Button>
           <Button asChild variant="outline">
            <Link href="/vendor/login">Vendor Portal</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40">
          <div className="container px-4 md:px-6 flex flex-col items-center text-center space-y-6">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
              Intelligent Car Management
            </h1>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              QarWheels brings predictive maintenance, a digital service passport, and a network of trusted garages to your fingertips. Take control of your car's health.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg">
                <Link href="/signup">
                  Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">A Smarter Way to Own a Car</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                Our platform provides everything you need to manage your vehicle with confidence.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
              <div className="grid gap-1 text-center">
                <Cpu className="h-10 w-10 mx-auto text-primary" />
                <h3 className="text-lg font-bold">AI Predictions</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI analyzes your car's data to predict maintenance needs before they become major problems.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <Car className="h-10 w-10 mx-auto text-primary" />
                <h3 className="text-lg font-bold">Digital Passport</h3>
                <p className="text-sm text-muted-foreground">
                  Keep a complete, digital history of all service records, invoices, and vehicle details in one secure place.
                </p>
              </div>
              <div className="grid gap-1 text-center">
                <Wrench className="h-10 w-10 mx-auto text-primary" />
                <h3 className="text-lg font-bold">Trusted Garages</h3>
                <p className="text-sm text-muted-foreground">
                  Find and book appointments with a network of approved and reviewed service centers across Qatar.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Final CTA */}
        <section className="w-full py-20 md:py-32">
             <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center space-y-4 text-center p-8 rounded-lg border bg-card">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                        Take Control of Your Car's Maintenance
                    </h2>
                    <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
                        Sign up in seconds and add your vehicle to get your first AI-powered health report.
                    </p>
                    <Button asChild size="lg">
                        <Link href="/signup">
                            Create Your Free Account <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} QarWheels. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
