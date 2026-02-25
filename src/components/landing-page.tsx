
"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Car, Cpu, Wrench, History, Search, CalendarDays, LayoutDashboard, ShieldCheck, BadgePercent, Globe } from "lucide-react";
import { Logo } from "./logo";
import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlaceHolderImages } from "@/lib/placeholder-images";


const features = [
  {
    icon: <Car className="h-8 w-8 text-primary" />,
    title: "VIN-Powered Vehicle Hub",
    description:
      "Just enter your VIN, and we'll automatically fetch your car's details. Your vehicle's profile, specs, and history are organized in one central hub.",
  },
  {
    icon: <Cpu className="h-8 w-8 text-primary" />,
    title: "AI-Powered Predictions",
    description:
      "Our smart AI analyzes your car's data, service history, and Qatar's climate to predict upcoming maintenance needs, helping you prevent issues before they arise.",
  },
  {
    icon: <Wrench className="h-8 w-8 text-primary" />,
    title: "Find Trusted Garages",
    description:
      "Discover a curated network of reliable garages in Qatar. Compare services, read reviews, and book appointments directly through the platform.",
  },
  {
    icon: <History className="h-8 w-8 text-primary" />,
    title: "Digital Service History",
    description:
      "Keep a complete and accurate digital log of all your service records. Access your history anytime, anywhere, and get AI-powered summaries of your maintenance.",
  }
];

const howItWorks = [
    {
        icon: <Search className="h-10 w-10 text-primary" />,
        title: "1. Find & Compare",
        description: "Search our network of verified garages. Filter by service, location, and ratings to find the perfect fit for your car's needs."
    },
    {
        icon: <CalendarDays className="h-10 w-10 text-primary" />,
        title: "2. Book Instantly",
        description: "Select your desired service and choose a convenient time slot from the garage's live availability. Confirm your booking in just a few clicks."
    },
    {
        icon: <LayoutDashboard className="h-10 w-10 text-primary" />,
        title: "3. Manage with Ease",
        description: "Your booking is confirmed. Manage all your appointments, view service history, and get AI-driven insights from your personal dashboard."
    }
];

const whyChooseUs = [
    {
        icon: <ShieldCheck className="h-8 w-8 text-primary" />,
        title: "Trusted Network",
        description: "Every garage on our platform is vetted for quality, reliability, and fair pricing. Drive with confidence knowing your car is in good hands."
    },
    {
        icon: <BadgePercent className="h-8 w-8 text-primary" />,
        title: "Smart Savings",
        description: "Our AI helps you stay ahead of costly repairs with predictive maintenance. Plus, get access to exclusive offers and promotions from our partner garages."
    },
    {
        icon: <Globe className="h-8 w-8 text-primary" />,
        title: "Qatar-Focused",
        description: "Built specifically for the driving conditions in Qatar. Our AI considers the local climate and environment to give you the most relevant advice."
    }
];


export function LandingPage() {
  const ctaImage = PlaceHolderImages.find(img => img.id === 'cta-background');
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <Link
          href="#"
          className="flex items-center justify-center"
          prefetch={false}
        >
          <Logo />
          <span className="sr-only">QarWheels</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button asChild variant="ghost">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 space-y-10 xl:space-y-16">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h1 className="lg:leading-tighter text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl xl:text-[3.4rem] 2xl:text-[3.75rem] font-headline">
                Intelligent Car Care for Qatar's Roads
              </h1>
              <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                QarWheels is your smart automotive assistant. Manage your vehicles, predict maintenance with AI, and connect with the best garages in Qatar.
              </p>
               <div className="space-x-4">
                <Button asChild size="lg">
                    <Link href="/dashboard">
                      I'm a Car Owner <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                 <Button asChild variant="secondary" size="lg">
                    <Link href="/vendor/dashboard">
                      I'm a Garage Vendor
                    </Link>
                  </Button>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
            <div className="container space-y-12 px-4 md:px-6">
                <div className="flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="space-y-2">
                        <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">How It Works</div>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                            Car Care in 3 Simple Steps
                        </h2>
                        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                           From finding the right service to managing your car's health, we've streamlined everything.
                        </p>
                    </div>
                </div>
                <div className="mx-auto grid items-start gap-8 sm:grid-cols-1 md:gap-12 lg:grid-cols-3">
                    {howItWorks.map((step, index) => (
                        <div key={index} className="grid gap-4 text-center">
                            <div className="mx-auto bg-card p-4 rounded-full w-fit border">
                                {step.icon}
                            </div>
                            <h3 className="text-lg font-bold font-headline">{step.title}</h3>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Key Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container space-y-12 px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                  Smarter, Simpler, Smoother
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  We've built a platform to take the guesswork out of car
                  ownership. Focus on the drive, we'll handle the rest.
                </p>
              </div>
            </div>
            <div className="mx-auto grid items-start gap-8 sm:max-w-4xl md:grid-cols-2 md:gap-12 lg:max-w-5xl">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="grid gap-2 p-6 rounded-lg bg-card shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/10"
                >
                  <div className="flex items-center gap-4">
                    {feature.icon}
                    <h3 className="text-lg font-bold font-headline">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Why Choose Us Section */}
        <section id="why-choose-us" className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
            <div className="container px-4 md:px-6">
                <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
                    <div className="space-y-4">
                        <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Why Choose Us?</div>
                        <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                            The Clear Choice for Drivers in Qatar
                        </h2>
                         <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
                           Our platform is engineered from the ground up to meet the unique challenges of car ownership in Qatar, giving you peace of mind on the road.
                        </p>
                    </div>
                     <div className="flex flex-col gap-8">
                        {whyChooseUs.map((benefit, index) => (
                             <div key={index} className="flex items-start gap-4">
                                <div className="bg-card p-3 rounded-full border">
                                    {benefit.icon}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold font-headline">{benefit.title}</h3>
                                    <p className="text-muted-foreground">{benefit.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 relative">
             {ctaImage && <Image src={ctaImage.imageUrl} alt="Car Interior" layout="fill" objectFit="cover" className="opacity-10" data-ai-hint={ctaImage.imageHint} />}
             <div className="container relative px-4 md:px-6">
                <div className="flex flex-col items-center space-y-4 text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl font-headline">
                        Take Control of Your Car's Health
                    </h2>
                    <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
                        Join QarWheels today and experience a smarter way to manage your vehicle. Sign up now and get your first AI-powered health report for free.
                    </p>
                    <Button asChild size="lg">
                        <Link href="/dashboard">
                            Sign Up for Free <ArrowRight className="ml-2 h-5 w-5" />
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
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4"
            prefetch={false}
          >
            Terms of Service
          </Link>
          <Link
            href="#"
            className="text-xs hover:underline underline-offset-4"
            prefetch={false}
          >
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
