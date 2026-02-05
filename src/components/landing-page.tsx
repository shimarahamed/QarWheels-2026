"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Car, Cpu, Wrench } from "lucide-react";
import { Logo } from "./logo";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b">
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
            <Link href="/dashboard">Dashboard</Link>
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
                QarWheels is your smart automotive assistant. Select your role to
                get started.
              </p>
            </div>
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
              <Card className="flex flex-col text-center items-center">
                <CardHeader className="flex-1">
                  <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                    <Car className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="pt-4">For Car Owners</CardTitle>
                  <CardDescription>
                    Manage your vehicles, get AI-powered maintenance
                    predictions, and connect with the best garages in Qatar.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="w-full">
                  <Button asChild className="w-full">
                    <Link href="/dashboard">
                      Owner Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              <Card className="flex flex-col text-center items-center">
                <CardHeader className="flex-1">
                  <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                    <Wrench className="h-10 w-10 text-primary" />
                  </div>
                  <CardTitle className="pt-4">For Garage Vendors</CardTitle>
                  <CardDescription>
                    List your garage, manage bookings, and grow your business by
                    reaching thousands of car owners.
                  </CardDescription>
                </CardHeader>
                <CardFooter className="w-full">
                  <Button asChild className="w-full" variant="secondary">
                    <Link href="/vendor/dashboard">
                      Vendor Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-card">
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
            <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-1 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="grid gap-2 p-6 rounded-lg bg-background shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
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
