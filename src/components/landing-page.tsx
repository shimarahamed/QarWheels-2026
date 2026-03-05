'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Car, Cpu, Wrench, Search, BookOpen, ShieldCheck, Banknote, Map, Users } from 'lucide-react';
import { Logo } from './logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function LandingPage() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-image');
  const howItWorks1 = PlaceHolderImages.find(p => p.id === 'how-it-works-1');
  const howItWorks2 = PlaceHolderImages.find(p => p.id === 'how-it-works-2');
  const howItWorks3 = PlaceHolderImages.find(p => p.id === 'how-it-works-3');
  const whyChooseUs1 = PlaceHolderImages.find(p => p.id === 'why-choose-us-1');
  const whyChooseUs2 = PlaceHolderImages.find(p => p.id === 'why-choose-us-2');
  const whyChooseUs3 = PlaceHolderImages.find(p => p.id === 'why-choose-us-3');
  const ctaBg = PlaceHolderImages.find(p => p.id === 'cta-background');

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
        <section className="w-full py-20 md:py-32 lg:py-40 relative">
            <div className="absolute inset-0">
                {heroImage && <Image src={heroImage.imageUrl} alt="Hero background" fill className="object-cover" data-ai-hint={heroImage.imageHint}/>}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
                <div className="absolute inset-0 bg-background/30"></div>
            </div>
          <div className="container px-4 md:px-6 flex flex-col items-center text-center space-y-6 relative">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
              Intelligent Car Management, <br /> Redesigned for Qatar.
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
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/50">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">A Smarter Way to Own a Car</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                Our platform provides everything you need to manage your vehicle with confidence.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3">
              <div className="grid gap-2">
                <Cpu className="h-10 w-10 text-primary" />
                <h3 className="text-lg font-bold">AI Predictions</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI analyzes your car's data to predict maintenance needs before they become major problems.
                </p>
              </div>
              <div className="grid gap-2">
                <BookOpen className="h-10 w-10 text-primary" />
                <h3 className="text-lg font-bold">Digital Passport</h3>
                <p className="text-sm text-muted-foreground">
                  Keep a complete, digital history of all service records, invoices, and vehicle details in one secure place.
                </p>
              </div>
              <div className="grid gap-2">
                <Search className="h-10 w-10 text-primary" />
                <h3 className="text-lg font-bold">Find Trusted Garages</h3>
                <p className="text-sm text-muted-foreground">
                  Search, compare, and book appointments with a network of approved and reviewed service centers across Qatar.
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* How it Works Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container grid items-center gap-6 px-4 md:px-6 lg:grid-cols-2 lg:gap-12">
                <div className="space-y-4">
                    <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">How It Works</div>
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">Simple Steps to Vehicle Peace of Mind</h2>
                    <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
                        Getting started with QarWheels is quick and easy.
                    </p>
                    <ul className="grid gap-4">
                        <li className="flex items-start gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</div>
                            <div className="flex-1"><p className="font-semibold">Add Your Car</p><p className="text-sm text-muted-foreground">Enter your VIN and let our AI pre-fill your car's details instantly.</p></div>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
                            <div className="flex-1"><p className="font-semibold">Upload Service History</p><p className="text-sm text-muted-foreground">Add past maintenance records to get an instant AI analysis and summary.</p></div>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
                            <div className="flex-1"><p className="font-semibold">Book with Confidence</p><p className="text-sm text-muted-foreground">Find the best local garages, see their services and prices, and book online.</p></div>
                        </li>
                    </ul>
                </div>
                 <div className="grid gap-4">
                    {howItWorks1 && <Image src={howItWorks1.imageUrl} alt="Add your car" width={550} height={310} className="mx-auto aspect-video overflow-hidden rounded-xl object-cover" data-ai-hint={howItWorks1.imageHint}/>}
                    {howItWorks2 && <Image src={howItWorks2.imageUrl} alt="Upload history" width={550} height={310} className="mx-auto aspect-video overflow-hidden rounded-xl object-cover" data-ai-hint={howItWorks2.imageHint} />}
                </div>
            </div>
        </section>

        {/* Why Choose Us */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-secondary/50">
             <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
                <div className="space-y-3">
                    <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight font-headline">Why QarWheels is the Right Choice</h2>
                    <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed">
                        We're built for car owners in Qatar, with features designed for our unique environment.
                    </p>
                </div>
                <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 pt-8 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border bg-card p-6 text-left shadow-sm">
                        <ShieldCheck className="mb-4 h-8 w-8 text-primary" />
                        <h3 className="text-lg font-bold">Vetted & Trusted</h3>
                        <p className="text-sm text-muted-foreground">Every garage on our platform is approved to ensure quality and reliability.</p>
                    </div>
                     <div className="rounded-lg border bg-card p-6 text-left shadow-sm">
                        <Banknote className="mb-4 h-8 w-8 text-primary" />
                        <h3 className="text-lg font-bold">Transparent Pricing</h3>
                        <p className="text-sm text-muted-foreground">Compare service prices from different garages before you book. No surprises.</p>
                    </div>
                     <div className="rounded-lg border bg-card p-6 text-left shadow-sm">
                        <Map className="mb-4 h-8 w-8 text-primary" />
                        <h3 className="text-lg font-bold">Local Focus</h3>
                        <p className="text-sm text-muted-foreground">Our AI takes Qatar's unique climate into account for more accurate predictions.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="w-full py-20 md:py-32 relative">
             {ctaBg && <Image src={ctaBg.imageUrl} alt="CTA background" fill className="object-cover" data-ai-hint={ctaBg.imageHint} />}
             <div className="absolute inset-0 bg-primary/80"></div>
             <div className="container relative px-4 md:px-6">
                <div className="flex flex-col items-center space-y-4 text-center p-8">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline text-primary-foreground">
                        Take Control of Your Car's Maintenance
                    </h2>
                    <p className="mx-auto max-w-[600px] text-primary-foreground/80 md:text-xl">
                        Sign up in seconds and add your vehicle to get your first AI-powered health report.
                    </p>
                    <Button asChild size="lg" variant="secondary" className="mt-4">
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
