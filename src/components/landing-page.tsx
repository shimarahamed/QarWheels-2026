
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { ArrowRight, Car, Cpu, Wrench, ShieldCheck, Search, CalendarDays, LayoutDashboard, Building, Users } from 'lucide-react';
import { Logo } from './logo';
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const BentoCard = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <Card className={cn("p-6 flex flex-col justify-between", className)}>
    {children}
  </Card>
);

const Feature = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="flex flex-col gap-2">
    <div className="text-primary">{icon}</div>
    <h3 className="text-lg font-bold font-headline">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export function LandingPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'car-placeholder-2');
  const vendorImage = PlaceHolderImages.find(img => img.id === 'garage-interior');

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 z-50 bg-background/60 backdrop-blur-xl">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <Logo />
        </Link>
        <nav className="ml-auto flex gap-2 sm:gap-4">
          <Button asChild variant="ghost">
            <Link href="/vendor/login">For Garages</Link>
          </Button>
          <Button asChild variant="outline" className="hidden sm:inline-flex">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild className="shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
            <Link href="/signup">Get Started</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40">
          <div className="container px-4 md:px-6 grid md:grid-cols-2 gap-10 items-center">
            <div className="flex flex-col items-start space-y-6">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
                The Future of Car Ownership. <br />Powered by AI.
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                QarWheels 2026 brings predictive maintenance, intelligent diagnostics, and a seamless connection to Qatar's best garages, right to your fingertips.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                  <Link href="/signup">
                    Add Your Vehicle <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative group">
              {heroImage && 
                <Image
                  src={heroImage.imageUrl}
                  alt="Modern white SUV"
                  width={1200}
                  height={800}
                  className="rounded-2xl shadow-2xl shadow-black/20"
                  data-ai-hint="white suv"
                />
              }
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
              <Card className="absolute -bottom-8 right-8 w-60 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="font-bold text-sm">AI Health Check</p>
                <p className="text-xs text-muted-foreground">Tire pressure optimal. Battery health at 98%.</p>
              </Card>
            </div>
          </div>
        </section>

        {/* Bento Grid Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm font-medium">Platform Features</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Automotive Intelligence Platform</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                A complete ecosystem for the modern car owner. Every tool you need, powered by intelligence.
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <BentoCard className="lg:col-span-1">
                    <Feature 
                        icon={<Cpu size={32} />}
                        title="Predictive Maintenance"
                        description="Our AI analyzes your driving habits and vehicle data to forecast issues before they happen, saving you time and money."
                    />
                </BentoCard>
                 <BentoCard className="lg:col-span-2">
                    <Feature 
                        icon={<Search size={32} />}
                        title="Trusted Garage Network"
                        description="Discover and book appointments with Qatar's top-rated, certified garages. Compare real-time quotes, read reviews, and find the right specialist for your car."
                    />
                </BentoCard>
                <BentoCard className="lg:col-span-2">
                    <Feature 
                        icon={<ShieldCheck size={32} />}
                        title="Digital Service Passport"
                        description="Every service, every part, every invoice—digitized and stored securely. Your car’s complete history, accessible anytime, anywhere."
                    />
                </BentoCard>
                 <BentoCard className="lg:col-span-1">
                    <Feature 
                        icon={<Wrench size={32} />}
                        title="AI-Powered Summaries"
                        description="Can't make sense of a long service record? Our AI reads your car's history and gives you a clear, concise summary of what's been done and what to watch out for."
                    />
                </BentoCard>
            </div>
          </div>
        </section>
        
        {/* For Vendors Section */}
        <section id="vendors" className="w-full py-12 md:py-24 lg:py-32">
            <div className="container px-4 md:px-6 grid md:grid-cols-2 gap-10 items-center">
                 <div className="relative group">
                    {vendorImage && 
                        <Image
                        src={vendorImage.imageUrl}
                        alt="Modern auto garage"
                        width={1200}
                        height={800}
                        className="rounded-2xl shadow-2xl shadow-black/20"
                        data-ai-hint="auto repair"
                        />
                    }
                </div>
                <div className="flex flex-col items-start space-y-6">
                    <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm font-medium">For Garage Owners</div>
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Supercharge Your Workshop</h2>
                    <p className="max-w-[600px] text-muted-foreground md:text-xl">
                        Join the QarWheels network to connect with new customers, streamline your bookings, and manage your entire workshop from one powerful dashboard.
                    </p>
                    <ul className="grid gap-4">
                        <li className="flex items-center gap-3">
                            <Building className="h-5 w-5 text-primary" />
                            <span>Fill your service bays with qualified leads.</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            <span>Manage bookings, staff, and inventory seamlessly.</span>
                        </li>
                         <li className="flex items-center gap-3">
                            <Users className="h-5 w-5 text-primary" />
                            <span>Build your reputation with verified customer reviews.</span>
                        </li>
                    </ul>
                    <Button asChild size="lg" variant="outline">
                        <Link href="/vendor/login">
                            Learn More About the Vendor Portal
                        </Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="w-full py-20 md:py-32">
             <div className="container px-4 md:px-6">
                <div className="flex flex-col items-center space-y-4 text-center p-8 rounded-2xl bg-gradient-to-br from-primary/80 to-primary">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline text-primary-foreground">
                        Begin Your Smart Car Journey
                    </h2>
                    <p className="mx-auto max-w-[600px] text-primary-foreground/80 md:text-xl">
                        Sign up in seconds and get your first AI-powered vehicle health report. Take the first step towards worry-free car ownership.
                    </p>
                    <Button asChild size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90">
                        <Link href="/signup">
                            Create Your Free Account <ArrowRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background/60 backdrop-blur-xl">
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
