"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { ArrowRight, Car, Cpu, Wrench } from "lucide-react";
import { Logo } from "./logo";

const heroImage = PlaceHolderImages.find((img) => img.id === "hero-image");

const features = [
  {
    icon: <Car className="h-8 w-8 text-primary" />,
    title: "VIN-Based Car Management",
    description:
      "Easily add your car by entering its VIN. We'll fetch the details for you, making management a breeze.",
  },
  {
    icon: <Cpu className="h-8 w-8 text-primary" />,
    title: "AI-Powered Predictions",
    description:
      "Our smart AI analyzes your car's data and Qatar's climate to predict future maintenance needs before they happen.",
  },
  {
    icon: <Wrench className="h-8 w-8 text-primary" />,
    title: "Find Garages & Parts",
    description:
      "Search for trusted garages and compatible spare parts. Book services and get quotes all in one place.",
  },
];

export function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <Logo />
          <span className="sr-only">QarWheels</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link
            href="/login"
            className="text-sm font-medium hover:underline underline-offset-4"
            prefetch={false}
          >
            Login
          </Link>
          <Button asChild>
            <Link href="/dashboard">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full pt-12 md:pt-24 lg:pt-32">
          <div className="container px-4 md:px-6 space-y-10 xl:space-y-16">
            <div className="grid max-w-[1300px] mx-auto gap-4 px-4 sm:px-6 md:px-10 md:grid-cols-2 md:gap-16">
              <div className="flex flex-col justify-center space-y-4">
                <h1 className="lg:leading-tighter text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl xl:text-[3.4rem] 2xl:text-[3.75rem] font-headline">
                  Intelligent Car Care for Qatar's Roads
                </h1>
                <p className="mx-auto max-w-[700px] text-foreground/80 md:text-xl">
                  QarWheels is your smart automotive assistant. From AI-powered
                  maintenance predictions to finding the best local garages, we've got
                  you covered.
                </p>
                <div className="space-x-4">
                  <Button asChild size="lg" className="bg-accent hover:bg-accent/90">
                    <Link href="/dashboard">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="relative">
                {heroImage && (
                  <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    width={1200}
                    height={800}
                    className="mx-auto aspect-[4/3] overflow-hidden rounded-xl object-cover"
                    data-ai-hint={heroImage.imageHint}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white/50">
          <div className="container space-y-12 px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                  Key Features
                </div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                  Smarter, Simpler, Smoother
                </h2>
                <p className="max-w-[900px] text-foreground/80 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  We've built a platform to take the guesswork out of car ownership.
                  Focus on the drive, we'll handle the rest.
                </p>
              </div>
            </div>
            <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-1 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
              {features.map((feature, index) => (
                <div key={index} className="grid gap-2 p-6 rounded-lg bg-card shadow-sm transition-transform hover:scale-105 hover:shadow-lg">
                  <div className="flex items-center gap-4">
                    {feature.icon}
                    <h3 className="text-lg font-bold font-headline">{feature.title}</h3>
                  </div>
                  <p className="text-sm text-foreground/80">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-foreground/60">
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
